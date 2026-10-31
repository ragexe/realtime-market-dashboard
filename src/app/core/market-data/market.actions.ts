import type { ProducerSettings } from '../../../domain/producer-settings.model';
import type { WorkerEvent } from '../../../domain/worker-event.model';

export type MarketAction =
  | WorkerEvent
  | { type: 'runStarted'; settings?: ProducerSettings }
  | { type: 'workerFailed'; message: string };
