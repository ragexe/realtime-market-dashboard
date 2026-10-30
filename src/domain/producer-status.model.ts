import type { WorkerEvent } from './worker-event.model';

export type ProducerStatus = (WorkerEvent & { type: 'status' })['status'];
