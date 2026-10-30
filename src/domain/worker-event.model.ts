import type { InstrumentSnapshot } from './instrument-snapshot.model';
import type { RunId } from './run-id.model'; // TODO: App linter preferred typed import rule

interface WorkerSnapshotEvent {
  type: 'snapshot';
  runId: RunId;
  instruments: InstrumentSnapshot[]; // TODO: Optimize memory usage
}

interface WorkerStatusEvent {
  type: 'status';
  runId: RunId;
  status: 'running' | 'paused';
}

interface WorkerErrorEvent {
  type: 'error';
  runId: RunId;
  message: string;
}

export type WorkerEvent = WorkerSnapshotEvent | WorkerStatusEvent | WorkerErrorEvent;
