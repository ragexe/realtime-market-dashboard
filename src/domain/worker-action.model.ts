import { ProducerSettings } from './producer-settings.model';
import { RunId } from './run-id.model';

interface WorkerStartAction {
  type: 'start';
  runId: RunId;
  settings: ProducerSettings;
}

interface WorkerPauseAction {
  type: 'pause';
}

interface WorkerResumeAction {
  type: 'resume';
}

export type WorkerAction = WorkerStartAction | WorkerPauseAction | WorkerResumeAction;
