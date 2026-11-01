import {
  catchError,
  distinctUntilChanged,
  endWith,
  filter,
  ignoreElements,
  interval,
  map,
  merge,
  of,
  shareReplay,
  skipWhile,
  startWith,
  switchMap,
  take,
  takeUntil,
  throwError,
  withLatestFrom,
  type Observable,
  type SchedulerLike,
} from 'rxjs';

import type { MarketGeneratorExports } from '../domain/market-generator.model';
import type { WorkerAction } from '../domain/worker-action.model';
import type { WorkerEvent } from '../domain/worker-event.model';

import { InstrumentSnapshot } from '../domain/instrument-snapshot.model';
import { createEmptyInstruments } from '../domain/instrument-symbol.utils';
import { applyBatchInPlace } from '../domain/market-aggregator.utils';
import { MARKET_UPDATE_FIELD_COUNT } from '../domain/market-update.model';
import { ProducerSettings } from '../domain/producer-settings.model';
import type { WorkerErrorEvent } from '../domain/worker-event.model';

class LoadGeneratorError extends Error {
  runId: number;

  constructor(runId: number, cause: unknown) {
    super();
    this.runId = runId;
    this.cause = cause;
  }
}

export interface ProducerDependencies {
  loadGenerator: () => Observable<MarketGeneratorExports>;
  seed: () => number;
  scheduler: SchedulerLike;
}

export function createProducer$(
  workerAction$: Observable<WorkerAction>,
  { loadGenerator, seed, scheduler }: ProducerDependencies,
): Observable<WorkerEvent> {
  const actions$ = workerAction$.pipe(
    skipWhile((action) => action.type !== 'start'),
    distinctUntilChanged((previous, current) => {
      if (current.type === 'pause') {
        return !['start', 'resume'].includes(previous.type);
      }

      if (current.type === 'resume') {
        return !(previous.type === 'pause');
      }

      return true;
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  const start$ = actions$.pipe(
    filter((action): action is Extract<WorkerAction, { type: 'start' }> => action.type === 'start'),
    take(1),
    switchMap(({ runId, settings }) =>
      loadGenerator().pipe(
        map((marketGenerator) => {
          marketGenerator.init(settings.instrumentCount, seed());
          const instruments = createEmptyInstruments(settings.instrumentCount);

          const view = new Int32Array(
            marketGenerator.memory.buffer,
            marketGenerator.batchPointer(),
            marketGenerator.maxBatchSize() * MARKET_UPDATE_FIELD_COUNT,
          );

          return {
            instruments,
            view,
            marketGenerator,
            runId,
            settings,
          } as const;
        }),
        catchError((error) => throwError(() => new LoadGeneratorError(runId, error))),
      ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  const resume$ = actions$.pipe(
    filter(
      (action): action is Extract<WorkerAction, { type: 'resume' }> => action.type === 'resume',
    ),
    withLatestFrom(start$),
    map(([, composed]) => composed),
  );

  const pause$ = actions$.pipe(
    filter((action): action is Extract<WorkerAction, { type: 'pause' }> => action.type === 'pause'),
  );

  const events$ = merge(start$, resume$).pipe(
    switchMap<
      {
        readonly instruments: InstrumentSnapshot[];
        readonly view: Int32Array<ArrayBuffer>;
        readonly marketGenerator: MarketGeneratorExports;
        readonly runId: number;
        readonly settings: ProducerSettings;
      },
      Observable<WorkerEvent>
    >(({ settings, runId, instruments, view, marketGenerator }) =>
      interval(settings.batchIntervalMs, scheduler).pipe(
        map((): WorkerEvent => {
          const count = marketGenerator.generateBatch(settings.updatesPerBatch);
          applyBatchInPlace(instruments, view, count);

          return {
            type: 'snapshot',
            runId,
            instruments: instruments.map((instrument) => ({ ...instrument })),
          };
        }),
        takeUntil(pause$),
        startWith({
          type: 'status',
          runId,
          status: 'running',
        } as const),
        endWith({
          type: 'status',
          runId,
          status: 'paused',
        } as const),
        catchError((error: unknown) => {
          const event: WorkerErrorEvent = {
            type: 'error',
            runId,
            message: error instanceof Error ? error.message : String(error),
          };

          return of(event);
        }),
      ),
    ),
    catchError((error: unknown) => {
      if (error instanceof LoadGeneratorError) {
        const event: WorkerErrorEvent = {
          type: 'error',
          runId: error.runId,
          message: 'Market generator failed to load (HTTP 404)',
        };

        return of(event);
      }

      return throwError(() => error);
    }),
  );

  return merge(actions$.pipe(ignoreElements()), events$);
}
