/// <reference lib="webworker" />

import type { RunId } from '../domain/run-id.model';
import type { WorkerAction } from '../domain/worker-action.model';
import type {
  WorkerErrorEvent,
  WorkerSnapshotEvent,
  WorkerStatusEvent,
} from '../domain/worker-event.model';
import type { ProducerSettings } from '../domain/producer-settings.model';
import type { InstrumentSnapshot } from '../domain/instrument-snapshot.model';
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

const MOCK_INSTRUMENTS: () => InstrumentSnapshot[] = () => [
  {
    symbol: 'AAPL',
    lastPriceCents: 10200 * (1 + Math.random() * 0.2 - 0.1),
    bidCents: 10196 * (1 + Math.random() * 0.2 - 0.1),
    askCents: 10200 * (1 + Math.random() * 0.2 - 0.1),
    bidQuantity: 600 * (1 + Math.random() * 0.2 - 0.1),
    askQuantity: 400 * (1 + Math.random() * 0.2 - 0.1),
    volume: 40 * (1 + Math.random() * 0.2 - 0.1),
    notionalCents: 406000 * (1 + Math.random() * 0.2 - 0.1),
  },
  {
    symbol: 'BA',
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQuantity: null,
    askQuantity: null,
    volume: 0 * (1 + Math.random() * 0.2 - 0.1),
    notionalCents: 0 * (1 + Math.random() * 0.2 - 0.1),
  },
  {
    symbol: 'C',
    lastPriceCents: 5010 * (1 + Math.random() * 0.2 - 0.1),
    bidCents: 5005 * (1 + Math.random() * 0.2 - 0.1),
    askCents: 5010 * (1 + Math.random() * 0.2 - 0.1),
    bidQuantity: 0 * (1 + Math.random() * 0.2 - 0.1),
    askQuantity: 0 * (1 + Math.random() * 0.2 - 0.1),
    volume: 120 * (1 + Math.random() * 0.2 - 0.1),
    notionalCents: 601000 * (1 + Math.random() * 0.2 - 0.1),
  },
];

async function startWork({ runId, settings }: { runId: RunId; settings: ProducerSettings }) {
  if (intervalId !== null) return;

  isPaused = false;
  currentRunId = runId;

  try {
    await loadMarketGenerator();
    log.debug('generator loaded');
  } catch (error) {
    const errorMessage: WorkerErrorEvent = {
      type: 'error',
      runId,
      message: error instanceof Error ? error.message : 'Market generator failed to load',
    };

    self.postMessage(errorMessage);

    return;
  }

  const statusMessage: WorkerStatusEvent = { status: 'running', type: 'status', runId };
  self.postMessage(statusMessage);

  intervalId = self.setInterval(() => {
    if (isPaused) return;

    const snapshotMessage: WorkerSnapshotEvent = {
      type: 'snapshot',
      runId,
      instruments: MOCK_INSTRUMENTS(),
    };
    log.debug('post snapshot');
    self.postMessage(snapshotMessage);
  }, settings.batchIntervalMs);
}

function pauseWork() {
  if (!isPaused && intervalId !== null) {
    isPaused = true;
    log.debug('paused.');
    const statusMessage: WorkerStatusEvent = {
      status: 'paused',
      type: 'status',
      runId: currentRunId,
    };
    self.postMessage(statusMessage);
  }
}

function resumeWork() {
  if (isPaused) {
    isPaused = false;
    log.debug('resumed.');

    const statusMessage: WorkerStatusEvent = {
      status: 'running',
      type: 'status',
      runId: currentRunId,
    };

    self.postMessage(statusMessage);
  }
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

// Forces the file to be treated as a module, preventing global type bleeding
export {};
