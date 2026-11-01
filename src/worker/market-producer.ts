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
  tap,
  throwError,
  withLatestFrom,
  type Observable,
  type SchedulerLike,
} from 'rxjs';

import { InstrumentSnapshot } from '../domain/instrument-snapshot.model';
import { createEmptyInstruments } from '../domain/instrument-symbol.utils';
import { applyBatchInPlace } from '../domain/market-aggregator.utils';
import type { MarketGeneratorExports } from '../domain/market-generator.model';
import { MARKET_UPDATE_FIELD_COUNT } from '../domain/market-update.model';
import { ProducerSettings } from '../domain/producer-settings.model';
import type { WorkerAction } from '../domain/worker-action.model';
import type { WorkerErrorEvent, WorkerEvent } from '../domain/worker-event.model';
import type { Logger } from './logger';

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
  logger: Logger;
}

export function createProducer$(
  workerAction$: Observable<WorkerAction>,
  { loadGenerator, seed, scheduler, logger }: ProducerDependencies,
): Observable<WorkerEvent> {
  const actions$ = workerAction$.pipe(
    tap((action) => {
      logger.debug(`action received: ${action.type}`);
    }),
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
    tap((action) => {
      logger.debug(`action handled: ${action.type}`);
    }),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  const start$ = actions$.pipe(
    filter((action): action is Extract<WorkerAction, { type: 'start' }> => action.type === 'start'),
    take(1),
    switchMap(({ runId, settings }) =>
      loadGenerator().pipe(
        tap(() => {
          logger.debug('wasm generator loaded');
        }),
        map((marketGenerator) => {
          marketGenerator.init(settings.instrumentCount, seed(), settings.updatesPerBatch);
          const instruments = createEmptyInstruments(settings.instrumentCount);

          const view = new Int32Array(
            marketGenerator.memory.buffer,
            marketGenerator.batchPointer(),
            settings.updatesPerBatch * MARKET_UPDATE_FIELD_COUNT,
          );

          return {
            instruments,
            view,
            marketGenerator,
            runId,
            settings,
          } as const;
        }),
        catchError((error) => {
          logger.warn(error);
          return throwError(() => new LoadGeneratorError(runId, error));
        }),
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
        tap(() => {
          logger.debug(`generate batch...`);
        }),
        map((): WorkerEvent => {
          const count = marketGenerator.generateBatch();
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
          logger.warn(error);

          const event: WorkerErrorEvent = {
            type: 'error',
            runId,
            message: error instanceof Error ? error.message : String(error),
          };

          return of(event);
        }),
        tap((event) => {
          logger.debug(`sending event: ${event.type}`);
        }),
      ),
    ),
    catchError((error: unknown) => {
      if (error instanceof LoadGeneratorError) {
        const event: WorkerErrorEvent = {
          type: 'error',
          runId: error.runId,
          message: error.cause instanceof Error ? error.cause.message : String(error.cause),
        };

        return of(event);
      }

      return throwError(() => error);
    }),
  );

  return merge(actions$.pipe(ignoreElements()), events$);
}
