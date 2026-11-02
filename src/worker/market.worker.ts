/// <reference lib="webworker" />
import { asyncScheduler, from, fromEvent, map } from 'rxjs';
import type { WorkerAction } from '../domain/worker-action.model';
import type { WorkerEvent } from '../domain/worker-event.model';
import { createLogger, type LogLevel } from './logger';
import { loadMarketGenerator } from './market-generator.loader';
import { createProducer$ } from './market-producer';

const LOG_LEVEL = 'warn' as const satisfies LogLevel;
const logger = createLogger('market.worker', LOG_LEVEL);

const commands$ = fromEvent<MessageEvent<WorkerAction>>(self, 'message').pipe(
  map(({ data }) => data),
);

createProducer$(commands$, {
  loadGenerator: () => from(loadMarketGenerator()),
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0],
  scheduler: asyncScheduler,
  logger: createLogger('producer', LOG_LEVEL),
}).subscribe({
  next: (event: WorkerEvent) => postMessage(event),
  error: (error: unknown) => logger.error('Producer crashed', error),
});
