import type { WorkerEvent } from './worker-event.model';

export type WorkerStatus = (WorkerEvent & { type: 'status' })['status'];
