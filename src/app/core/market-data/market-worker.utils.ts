import { InjectionToken } from '@angular/core';
import { fromEvent, map, merge, Observable } from 'rxjs';

import type { WorkerAction } from '../../../domain/worker-action.model';
import type { WorkerEvent } from '../../../domain/worker-event.model';

export interface MarketWorker {
  events$: Observable<WorkerEvent>;
  failures$: Observable<string>;
  post(action: WorkerAction): void;
  terminate(): void;
}

export type MarketWorkerFactory = () => MarketWorker;

export function createBrowserMarketWorker(): MarketWorker {
  const worker = new Worker(new URL('../../../worker/market.worker', import.meta.url), {
    type: 'module',
  });

  const events$ = fromEvent<MessageEvent<WorkerEvent>>(worker, 'message').pipe(
    map((event) => event.data),
  );

  const failures$ = merge(
    fromEvent<ErrorEvent>(worker, 'error').pipe(
      map((event) => event.message || 'Market worker failed to load'),
    ),
    fromEvent(worker, 'messageerror').pipe(map(() => 'Market worker sent an unreadable message')),
  );

  return {
    events$,
    failures$,
    post: (action) => worker.postMessage(action),
    terminate: () => worker.terminate(),
  };
}

export const MARKET_WORKER_FACTORY = new InjectionToken<MarketWorkerFactory>(
  'Market worker factory',
  {
    providedIn: 'root',
    factory: () => createBrowserMarketWorker,
  },
);
