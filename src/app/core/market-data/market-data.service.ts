import { inject, Injectable } from '@angular/core';
import { ProducerSettings } from '../../../domain/producer-settings.model';
import type { RunId } from '../../../domain/run-id.model';
import { MARKET_WORKER_FACTORY, type MarketWorker } from './market-worker';
import { BehaviorSubject, filter, switchMap } from 'rxjs';
import { DEFAULT_SETTINGS } from '../../../domain/producer-settings.const';

@Injectable({
  providedIn: 'root',
})
export class MarketDataService {
  private readonly worker$ = new BehaviorSubject<MarketWorker | null>(null);
  private readonly marketWorkerFactory = inject(MARKET_WORKER_FACTORY);

  private runId = 1;

  constructor() {
    this.start(this.runId++, DEFAULT_SETTINGS);
  }

  readonly events$ = this.worker$.pipe(
    filter(Boolean),
    switchMap(({ events$ }) => events$),
  );

  readonly failures$ = this.worker$.pipe(
    filter(Boolean),
    switchMap(({ failures$ }) => failures$),
  );

  private start(runId: RunId, settings: ProducerSettings): void {
    this.prepareWorker();
    const worker = this.worker$.value;

    if (!worker) throw new Error('Worker initialization error');

    worker.post({ type: 'start', runId, settings });
  }

  private prepareWorker() {
    this.worker$.value?.terminate();
    this.worker$.next(this.marketWorkerFactory());
  }
}
