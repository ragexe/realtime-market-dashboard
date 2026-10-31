import { TestBed } from '@angular/core/testing';

import type { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { DEFAULT_SETTINGS } from '../../../domain/producer-settings.const';
import type { ProducerSettings } from '../../../domain/producer-settings.model';
import { MarketDataService } from './market-data.service';
import { MARKET_WORKER_FACTORY } from './market-worker.utils';
import { FakeMarketWorker } from './testing/fake-market-worker';

const CUSTOM_SETTINGS = {
  instrumentCount: 10,
  updatesPerBatch: 1000,
  batchIntervalMs: 50,
} as const satisfies ProducerSettings;

function instrument(symbol: string, volume: number): InstrumentSnapshot {
  return {
    symbol,
    lastPriceCents: 10200,
    bidCents: 10196,
    askCents: 10200,
    bidQuantity: 600,
    askQuantity: 400,
    volume,
    notionalCents: volume * 10200,
  };
}

describe('MarketDataService', () => {
  let service: MarketDataService;
  let workers: FakeMarketWorker[];

  const currentWorker = () => workers[workers.length - 1];

  beforeEach(() => {
    workers = [];

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MARKET_WORKER_FACTORY,
          useValue: () => {
            const worker = new FakeMarketWorker();
            workers.push(worker);
            return worker;
          },
        },
      ],
    });

    service = TestBed.inject(MarketDataService);
  });

  describe('on creation', () => {
    it('starts the first run with default settings', () => {
      expect(workers).toHaveLength(1);
      expect(currentWorker().posted).toEqual([
        { type: 'start', runId: 1, settings: DEFAULT_SETTINGS },
      ]);
      expect(service.runId()).toBe(1);
      expect(service.settings()).toEqual(DEFAULT_SETTINGS);
    });

    it('stays in "starting" until the worker reports it is running', () => {
      expect(service.status()).toBe('starting');

      currentWorker().emit({ type: 'status', runId: 1, status: 'running' });

      expect(service.status()).toBe('running');
    });
  });

  it('exposes instruments from snapshots of the current run', () => {
    const instruments = [instrument('ALFA', 40), instrument('BETA', 5)];

    currentWorker().emit({ type: 'snapshot', runId: 1, instruments });

    expect(service.instruments()).toEqual(instruments);
  });

  describe('pause and resume', () => {
    beforeEach(() => {
      currentWorker().emit({ type: 'status', runId: 1, status: 'running' });
    });

    it('sends pause and resume commands to the worker', () => {
      service.pauseWorker();
      service.resumeWorker();

      expect(currentWorker().posted.slice(1)).toEqual([{ type: 'pause' }, { type: 'resume' }]);
    });

    it('follows the status confirmed by the worker', () => {
      service.pauseWorker();
      currentWorker().emit({ type: 'status', runId: 1, status: 'paused' });
      expect(service.status()).toBe('paused');

      service.resumeWorker();
      currentWorker().emit({ type: 'status', runId: 1, status: 'running' });
      expect(service.status()).toBe('running');
    });

    it('preserves values and totals across a pause', () => {
      const instruments = [instrument('ALFA', 40)];
      currentWorker().emit({ type: 'snapshot', runId: 1, instruments });

      service.pauseWorker();
      currentWorker().emit({ type: 'status', runId: 1, status: 'paused' });
      service.resumeWorker();
      currentWorker().emit({ type: 'status', runId: 1, status: 'running' });

      expect(service.instruments()).toEqual(instruments);
    });
  });

  describe('applySettings', () => {
    beforeEach(() => {
      currentWorker().emit({ type: 'status', runId: 1, status: 'running' });
      currentWorker().emit({ type: 'snapshot', runId: 1, instruments: [instrument('ALFA', 40)] });
    });

    it('replaces the worker and terminates the previous one', () => {
      const previous = currentWorker();

      service.applySettings(CUSTOM_SETTINGS);

      expect(workers).toHaveLength(2);
      expect(previous.terminated).toBe(true);
      expect(currentWorker().terminated).toBe(false);
    });

    it('starts a new run with the applied settings', () => {
      service.applySettings(CUSTOM_SETTINGS);

      expect(currentWorker().posted).toEqual([
        { type: 'start', runId: 2, settings: CUSTOM_SETTINGS },
      ]);

      expect(service.runId()).toBe(2);
      expect(service.settings()).toEqual(CUSTOM_SETTINGS);
      expect(service.status()).toBe('starting');
    });

    it('clears values and totals of the previous run', () => {
      service.applySettings(CUSTOM_SETTINGS);

      expect(service.instruments()).toEqual([]);
    });

    it('starts generation even when the previous run was paused', () => {
      currentWorker().emit({ type: 'status', runId: 1, status: 'paused' });

      service.applySettings(CUSTOM_SETTINGS);

      expect(currentWorker().posted[0]).toMatchObject({ type: 'start', runId: 2 });
    });
  });

  describe('results from a previous run', () => {
    beforeEach(() => {
      service.applySettings(CUSTOM_SETTINGS);
      currentWorker().emit({ type: 'status', runId: 2, status: 'running' });
    });

    it('are ignored when they arrive from the replaced worker', () => {
      workers[0].emit({ type: 'snapshot', runId: 1, instruments: [instrument('OLD', 999)] });
      workers[0].emit({ type: 'status', runId: 1, status: 'paused' });

      expect(service.instruments()).toEqual([]);
      expect(service.status()).toBe('running');
    });

    it('are ignored when the current worker sends a stale run id', () => {
      currentWorker().emit({ type: 'snapshot', runId: 1, instruments: [instrument('OLD', 999)] });
      currentWorker().emit({ type: 'error', runId: 1, message: 'Stale failure' });

      expect(service.instruments()).toEqual([]);
      expect(service.status()).toBe('running');
      expect(service.error()).toBeNull();
    });
  });

  describe('errors', () => {
    it('shows a run error reported by the worker', () => {
      currentWorker().emit({ type: 'error', runId: 1, message: 'Wasm failed to load' });

      expect(service.status()).toBe('error');
      expect(service.error()).toBe('Wasm failed to load');
    });

    it('shows a worker failure and terminates the failed worker', () => {
      currentWorker().fail('Market worker failed to load');

      expect(service.status()).toBe('error');
      expect(service.error()).toBe('Market worker failed to load');
      expect(currentWorker().terminated).toBe(true);
    });

    it('recovers on the next apply', () => {
      currentWorker().fail('Market worker failed to load');

      service.applySettings(CUSTOM_SETTINGS);

      expect(service.status()).toBe('starting');
      expect(service.error()).toBeNull();
    });
  });

  it('terminates the worker when the service is destroyed', () => {
    const worker = currentWorker();

    TestBed.resetTestingModule();

    expect(worker.terminated).toBe(true);
  });
});

describe('MarketDataService when the worker cannot be created', () => {
  it('reports the failure instead of throwing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: MARKET_WORKER_FACTORY,
          useValue: () => {
            throw new Error('Worker is not supported');
          },
        },
      ],
    });

    const service = TestBed.inject(MarketDataService);

    expect(service.status()).toBe('error');
    expect(service.error()).toBe('Failed to create worker');
  });
});
