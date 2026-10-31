import type { InstrumentSnapshot } from './instrument-snapshot.model';
import type { RunId } from './run-id.model'; // TODO: App linter preferred typed import rule

export interface WorkerSnapshotEvent {
  type: 'snapshot';
  runId: RunId;
  instruments: InstrumentSnapshot[]; // TODO: Optimize memory usage
}

export interface WorkerStatusEvent {
  type: 'status';
  runId: RunId;
  status: 'running' | 'paused';
}

export interface WorkerErrorEvent {
  type: 'error';
  runId: RunId;
  message: string;
}

export type WorkerEvent = WorkerSnapshotEvent | WorkerStatusEvent | WorkerErrorEvent;
