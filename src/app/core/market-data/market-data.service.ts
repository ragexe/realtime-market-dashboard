import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, filter, map, shareReplay, switchMap, tap } from 'rxjs';
import { DEFAULT_SETTINGS } from '../../../domain/producer-settings.const';
import type { ProducerSettings } from '../../../domain/producer-settings.model';
import { ProducerStatus } from '../../../domain/producer-status.model';
import type { RunId } from '../../../domain/run-id.model';
import { WorkerSnapshotEvent } from '../../../domain/worker-event.model';
import { MARKET_WORKER_FACTORY, type MarketWorker } from './market-worker';

@Injectable({
  providedIn: 'root',
})
export class MarketDataService {
  private readonly composedStore$ = new BehaviorSubject<{
    runId: RunId;
    settings: ProducerSettings;
    worker: MarketWorker;
  } | null>(null);

  private readonly marketWorkerFactory = inject(MARKET_WORKER_FACTORY);

  constructor() {
    this.prepareWorker();

    this.composedStore$
      .pipe(
        filter(Boolean),
        tap(({ worker, runId, settings }) => {
          worker.post({ type: 'start', runId, settings });
          this.statusStore$.next({ status: 'starting' });
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  readonly instrumentsStore$ = this.composedStore$.pipe(
    filter(Boolean),
    switchMap(({ runId, worker }) =>
      worker.events$.pipe(
        tap((event) => {
          if (event.type === 'status') {
            this.statusStore$.next({ status: event.status });
          }

          if (event.type === 'error') {
            this.statusStore$.next({ status: 'error', message: event.message });
          }
        }),
        filter(
          (event): event is WorkerSnapshotEvent =>
            event.runId === runId && event.type === 'snapshot',
        ),
      ),
    ),
    shareReplay(1),
  );

  readonly runId$ = this.composedStore$.pipe(
    filter(Boolean),
    map(({ runId }) => runId),
    shareReplay(1),
  );

  readonly statusStore$ = new BehaviorSubject<
    { status: ProducerStatus | 'starting' | 'idle' } | { status: 'error'; message: string }
  >({ status: 'idle' });

  resume() {
    const run = this.composedStore$.value;

    if (!run) return;

    run.worker.post({ type: 'resume' });
  }

  pause() {
    const run = this.composedStore$.value;

    if (!run) return;

    run.worker.post({ type: 'pause' });
  }

  applySettings(settings: ProducerSettings) {
    this.prepareWorker(settings);
  }

  private prepareWorker(settings?: ProducerSettings) {
    this.composedStore$.value?.worker.terminate();

    this.composedStore$.next({
      runId: (this.composedStore$.value?.runId ?? 0) + 1,
      worker: this.marketWorkerFactory(),
      settings: settings ?? DEFAULT_SETTINGS,
    });
  }
}
