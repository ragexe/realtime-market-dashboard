import {
  asyncScheduler,
  map,
  type Observable,
  Subject,
  type Subscription,
  switchMap,
  throwError,
  timer,
} from 'rxjs';

import type { MarketGeneratorExports } from '../domain/market-generator.model';
import type { ProducerSettings } from '../domain/producer-settings.model';
import type { WorkerAction } from '../domain/worker-action.model';
import type { WorkerEvent, WorkerSnapshotEvent } from '../domain/worker-event.model';
import { createProducer$ } from './market-producer';
import { FakeMarketGenerator } from './testing/fake-market-generator';

const SETTINGS: ProducerSettings = { instrumentCount: 2, updatesPerBatch: 2, batchIntervalMs: 50 };
const SEED = 7;
const LOAD_TIME_MS = 10;

const START = { type: 'start', runId: 1, settings: SETTINGS } as const satisfies WorkerAction;
const PAUSE = { type: 'pause' } as const satisfies WorkerAction;
const RESUME = { type: 'resume' } as const satisfies WorkerAction;

describe('createProducer$', () => {
  let generator: FakeMarketGenerator;
  let commands: Subject<WorkerAction>;
  let received: { time: number; event: WorkerEvent }[];
  let subscription: Subscription | undefined;

  beforeEach(() => {
    vi.useFakeTimers({ now: 0 });
    generator = new FakeMarketGenerator();
    commands = new Subject();
    received = [];
  });

  afterEach(() => {
    subscription?.unsubscribe();
    vi.useRealTimers();
  });

  function loadsAfter(ms: number): Observable<MarketGeneratorExports> {
    return timer(ms, asyncScheduler).pipe(map(() => generator));
  }

  function failsAfter(ms: number, message: string): Observable<MarketGeneratorExports> {
    return timer(ms, asyncScheduler).pipe(switchMap(() => throwError(() => new Error(message))));
  }

  function subscribeProducer(loadGenerator = () => loadsAfter(LOAD_TIME_MS)): void {
    subscription = createProducer$(commands, {
      loadGenerator,
      seed: () => SEED,
      scheduler: asyncScheduler,
    }).subscribe((event) => received.push({ time: Date.now(), event }));
  }

  /** Events as "<ms> <status | snapshot | error>" */
  function timeline(): string[] {
    return received.map(
      ({ time, event }) => `${time} ${event.type === 'status' ? event.status : event.type}`,
    );
  }

  /** Expected snapshot lines: one per batch, `batchIntervalMs` apart */
  function snapshotsFrom(firstMs: number, count: number): string[] {
    return Array.from(
      { length: count },
      (_, i) => `${firstMs + i * SETTINGS.batchIntervalMs} snapshot`,
    );
  }

  it('reports running once the generator is loaded and initialized', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(50);

    expect(timeline()).toEqual(['10 running']);
    expect(generator.initCalls).toEqual([{ instrumentCount: 2, seed: SEED }]);
  });

  it('emits a snapshot after every batch', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(1000);

    expect(timeline()).toEqual(['10 running', ...snapshotsFrom(60, 19)]);
    expect(generator.batchesGenerated).toBe(19);
  });

  it('stops generation on pause and resumes without catching up', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(120);
    commands.next(PAUSE);
    vi.advanceTimersByTime(300);
    commands.next(RESUME);
    vi.advanceTimersByTime(110);

    expect(timeline()).toEqual([
      '10 running',
      '60 snapshot',
      '110 snapshot',
      '120 paused',
      '420 running',
      '470 snapshot',
      '520 snapshot',
    ]);
    expect(generator.batchesGenerated).toBe(4);
  });

  it('starts paused when pause arrives while the generator is loading', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(4);
    commands.next(PAUSE);
    vi.advanceTimersByTime(1000);

    expect(timeline()).toEqual(['10 running', '10 paused']);
    expect(generator.batchesGenerated).toBe(0);
  });

  it('starts running when pause and resume both arrive while loading', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(2);
    commands.next(PAUSE);
    vi.advanceTimersByTime(2);
    commands.next(RESUME);
    vi.advanceTimersByTime(100);

    expect(timeline()).toEqual(['10 running', '60 snapshot']);
  });

  it('reports an error when the generator fails to load', () => {
    subscribeProducer(() => failsAfter(LOAD_TIME_MS, 'Market generator failed to load (HTTP 404)'));

    commands.next(START);
    vi.advanceTimersByTime(1000);

    expect(received).toEqual([
      {
        time: 10,
        event: { type: 'error', runId: 1, message: 'Market generator failed to load (HTTP 404)' },
      },
    ]);
  });

  it('reports an error and stops when generating a batch fails', () => {
    generator.failOnBatch = 3;
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(1000);

    expect(timeline()).toEqual(['10 running', '60 snapshot', '110 snapshot', '160 error']);
    expect(received.at(-1)?.event).toEqual({
      type: 'error',
      runId: 1,
      message: 'Market generator aborted at 1:1',
    });
    expect(generator.batchesGenerated).toBe(3);
  });

  it('emits snapshots as copies of the aggregated state', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(110);

    const [first, second] = received
      .map(({ event }) => event)
      .filter((event): event is WorkerSnapshotEvent => event.type === 'snapshot');
    // each batch has one trade per instrument, batch N at price 100 + N
    expect(first.instruments[0]).toMatchObject({
      symbol: 'ALPH',
      lastPriceCents: 101,
      volume: 1,
      notionalCents: 101,
    });
    expect(first.instruments[1].volume).toBe(1);
    // later batches must not change what was already sent
    expect(second.instruments[0]).toMatchObject({ lastPriceCents: 102, volume: 2 });
    expect(first.instruments[0].volume).toBe(1);
  });

  it('ignores a second start: one producer per worker', () => {
    subscribeProducer();

    commands.next(START);
    vi.advanceTimersByTime(100);
    commands.next(START);
    vi.advanceTimersByTime(200);

    expect(timeline()).toEqual(['10 running', ...snapshotsFrom(60, 5)]);
    expect(generator.initCalls).toHaveLength(1);
  });
});
