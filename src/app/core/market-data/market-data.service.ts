import { computed, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, EMPTY, filter, merge, Subject, switchMap, tap } from 'rxjs';

import type { ProducerSettings } from '../../../domain/producer-settings.model';
import { MARKET_WORKER_FACTORY, type MarketWorker } from './market-worker';
import type { MarketAction } from './market.actions';
import { marketReducer } from './market.reducer';
import { INITIAL_STATE, type MarketState } from './market.state';

@Injectable({
  providedIn: 'root',
})
export class MarketDataService implements OnDestroy {
  private readonly marketWorkerFactory = inject(MARKET_WORKER_FACTORY);
  private readonly state = signal<MarketState>(INITIAL_STATE);
  private readonly actions$ = new Subject<MarketAction>();
  private readonly marketWorker$ = new BehaviorSubject<MarketWorker>(this.createMarketWorker());

  readonly status = computed(() => this.state().status);
  readonly instruments = computed(() => this.state().instruments);
  readonly runId = computed(() => this.state().runId);
  readonly settings = computed(() => this.state().settings);
  readonly error = computed(() => this.state().error);

  constructor() {
    const marketWorkerEventsEffect$ = this.marketWorker$.pipe(
      switchMap((worker) =>
        worker.events$.pipe(
          tap((event) => {
            this.dispatch(event);
          }),
        ),
      ),
    );

    const marketWorkerFailuresEffect$ = this.marketWorker$.pipe(
      switchMap((worker) =>
        worker.failures$.pipe(
          tap((message) => {
            this.dispatch({ type: 'workerFailed', message } as const);
          }),
        ),
      ),
    );

    const runStartedActionEffect$ = this.actions$.pipe(
      filter(
        (action: MarketAction): action is MarketAction & { type: 'runStarted' } =>
          action.type === 'runStarted',
      ),
      tap(() => {
        const marketWorker = this.marketWorker$.value;

        this.marketWorker$.value.post({
          type: 'start',
          runId: this.runId(),
          settings: this.settings(),
        });

        if (!marketWorker.success) {
          this.dispatch({
            type: 'workerFailed',
            message: 'Failed to create worker',
          });
        }
      }),
    );

    const workerFailedActionEffect$ = this.actions$.pipe(
      filter(
        (action: MarketAction): action is MarketAction & { type: 'workerFailed' } =>
          action.type === 'workerFailed',
      ),
      tap(() => {
        this.marketWorker$.value.terminate();
      }),
    );

    merge(
      marketWorkerEventsEffect$,
      marketWorkerFailuresEffect$,
      runStartedActionEffect$,
      workerFailedActionEffect$,
    )
      .pipe(takeUntilDestroyed())
      .subscribe();

    this.dispatch({
      type: 'runStarted',
    });
  }

  resumeWorker() {
    this.marketWorker$.value.post({ type: 'resume' });
  }

  pauseWorker() {
    this.marketWorker$.value.post({ type: 'pause' });
  }

  applySettings(settings: ProducerSettings) {
    this.marketWorker$.value.terminate();
    this.marketWorker$.next(this.createMarketWorker());

    this.dispatch({
      type: 'runStarted',
      settings,
    });
  }

  ngOnDestroy(): void {
    this.marketWorker$.value.terminate();
  }

  private createMarketWorker(): MarketWorker {
    try {
      return this.marketWorkerFactory();
    } catch (error: unknown) {
      console.error('Failed to create worker', error);

      const workerStub = {
        events$: EMPTY,
        failures$: EMPTY,
        success: false,

        post: () => {
          /* empty */
        },

        terminate: () => {
          /* empty */
        },
      };

      return workerStub;
    }
  }

  private dispatch(action: MarketAction): void {
    this.state.update((current) => marketReducer(current, action));
    this.actions$.next(action);
  }
}
