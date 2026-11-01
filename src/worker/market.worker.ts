/// <reference lib="webworker" />

import type { InstrumentSnapshot } from '../domain/instrument-snapshot.model';
import { createEmptyInstruments } from '../domain/instrument-symbol.utils';
import { applyBatchInPlace } from '../domain/market-aggregator.utils';
import type { MarketGeneratorExports } from '../domain/market-generator.model';
import { MARKET_UPDATE_FIELD_COUNT } from '../domain/market-update.model';
import type { ProducerSettings } from '../domain/producer-settings.model';
import type { RunId } from '../domain/run-id.model';
import type { WorkerAction } from '../domain/worker-action.model';
import type {
  WorkerErrorEvent,
  WorkerSnapshotEvent,
  WorkerStatusEvent,
} from '../domain/worker-event.model';
import { createLogger, type LogLevel } from './logger';
import { loadMarketGenerator } from './market-generator.loader';

// Declare self to get proper IntelliSense for DedicatedWorkerGlobalScope
declare const self: DedicatedWorkerGlobalScope;

/** Raise to 'info' or 'warn' to silence per-snapshot debug output */
const LOG_LEVEL: LogLevel = 'debug'; // TODO: Raise to `warn` before releasing v1.0.0
const log = createLogger('market.worker', LOG_LEVEL);

let intervalId: number | null = null;
let isPaused = false;
let currentRunId: number;
let instruments: InstrumentSnapshot[] | undefined;
let marketGenerator: MarketGeneratorExports | undefined;
let batchView: Int32Array<ArrayBuffer> | undefined;

async function startWork({ runId, settings }: { runId: RunId; settings: ProducerSettings }) {
  if (intervalId !== null) return;

  isPaused = false;
  currentRunId = runId;
  instruments = undefined;
  marketGenerator = undefined;
  batchView = undefined;

  try {
    marketGenerator = await loadMarketGenerator();
    log.debug('generator loaded');

    marketGenerator.init(settings.instrumentCount, 42 /* TODO: Use random value */);
    instruments = createEmptyInstruments(settings.instrumentCount);

    batchView = new Int32Array(
      marketGenerator.memory.buffer,
      marketGenerator.batchPointer(),
      marketGenerator.maxBatchSize() * MARKET_UPDATE_FIELD_COUNT,
    );

    const statusMessage: WorkerStatusEvent = {
      type: 'status',
      runId: currentRunId,
      status: isPaused ? 'paused' : 'running',
    };

    self.postMessage(statusMessage);
  } catch (error) {
    log.warn(error);

    instruments = undefined;
    marketGenerator = undefined;
    batchView = undefined;

    const errorMessage: WorkerErrorEvent = {
      type: 'error',
      runId,
      message: error instanceof Error ? error.message : 'Market generator failed to load',
    };

    self.postMessage(errorMessage);

    return;
  }

  intervalId = self.setInterval(() => {
    if (isPaused) return;
    if (!marketGenerator) return;
    if (!batchView) return;
    if (!instruments) return;

    try {
      const count = marketGenerator.generateBatch(settings.updatesPerBatch);
      applyBatchInPlace(instruments, batchView, count);
    } catch (error) {
      log.warn(error);

      // TODO: Remove duplicated code
      instruments = undefined;
      marketGenerator = undefined;
      batchView = undefined;
      stopTimers();

      const errorMessage: WorkerErrorEvent = {
        type: 'error',
        runId,
        message:
          error instanceof Error ? error.message : 'Market generator failed to generate batch',
      };

      self.postMessage(errorMessage);

      return;
    }

    const snapshotMessage: WorkerSnapshotEvent = {
      type: 'snapshot',
      runId,
      instruments,
    };

    log.debug('post snapshot');
    self.postMessage(snapshotMessage);
  }, settings.batchIntervalMs);
}

function pauseWork() {
  if (isPaused) return;
  isPaused = true;
  log.debug('paused.');

  if (!marketGenerator) return;

  const statusMessage: WorkerStatusEvent = {
    type: 'status',
    runId: currentRunId,
    status: 'paused',
  };

  self.postMessage(statusMessage);
}

function resumeWork() {
  if (!isPaused) return;

  isPaused = false;
  log.debug('resumed.');

  if (!marketGenerator) return;

  const statusMessage: WorkerStatusEvent = {
    type: 'status',
    runId: currentRunId,
    status: 'running',
  };

  self.postMessage(statusMessage);
}

self.addEventListener('message', ({ data }: MessageEvent<WorkerAction>) => {
  log.debug('received', data.type);

  const commandType = data.type;

  switch (commandType) {
    case 'start':
      void startWork(data);
      return;

    case 'pause':
      pauseWork();
      return;

    case 'resume':
      resumeWork();
      return;

    default: {
      const exhaustiveCheck: never = commandType;
      log.warn(`Unknown command type: ${exhaustiveCheck}`);
    }
  }
});

function stopTimers() {
  if (intervalId !== null) {
    self.clearInterval(intervalId);
    intervalId = null;
  }
}

// Forces the file to be treated as a module, preventing global type bleeding
export {};
