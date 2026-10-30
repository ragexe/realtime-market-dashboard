/// <reference lib="webworker" />

import type { WorkerAction } from '../domain/worker-action.model';

self.addEventListener('message', ({ data }: MessageEvent<WorkerAction>) => {
  // TODO: tbd start / pause / resume
  console.debug('[market.worker] received', data.type);
});
