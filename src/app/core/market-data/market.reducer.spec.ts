import type { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { emptyInstrument } from '../../../domain/instrument-symbol.utils';
import { DEFAULT_SETTINGS } from '../../../domain/producer-settings.const';
import type { ProducerSettings } from '../../../domain/producer-settings.model';
import { marketReducer } from './market.reducer';
import { INITIAL_STATE, type MarketState } from './market.state';

const CUSTOM_SETTINGS: ProducerSettings = {
  instrumentCount: 10,
  updatesPerBatch: 1000,
  batchIntervalMs: 50,
} as const satisfies ProducerSettings;

function instrument(symbol: string, volume = 40): InstrumentSnapshot {
  return {
    symbol,
    lastPriceCents: 10200,
    bidCents: 10196,
    askCents: 10200,
    bidQuantity: 600,
    askQuantity: 400,
    volume,
    notionalCents: 406000,
  };
}

function emptyRows(count: number): InstrumentSnapshot[] {
  return Array.from({ length: count }, (_, index) => emptyInstrument(index));
}

function runningState(overrides: Partial<MarketState> = {}): MarketState {
  return {
    ...INITIAL_STATE,
    runId: 2,
    status: 'running',
    instruments: [instrument('ALFA')],
    ...overrides,
  };
}

function isEmptyRow(row: InstrumentSnapshot): boolean {
  return (
    row.lastPriceCents === null &&
    row.bidCents === null &&
    row.askCents === null &&
    row.bidQuantity === null &&
    row.askQuantity === null &&
    row.volume === 0 &&
    row.notionalCents === 0
  );
}

describe('marketReducer', () => {
  describe('runStarted', () => {
    it('starts the next run with the given settings', () => {
      const state = marketReducer(runningState(), {
        type: 'runStarted',
        settings: CUSTOM_SETTINGS,
      });

      expect(state.runId).toBe(3);
      expect(state.settings).toEqual(CUSTOM_SETTINGS);
      expect(state.status).toBe('starting');
    });

    it('falls back to default settings when none are given', () => {
      const state = marketReducer(INITIAL_STATE, { type: 'runStarted' });

      expect(state.runId).toBe(1);
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
    });

    it('clears values, totals and error of the previous run', () => {
      const previous = runningState({ status: 'error', error: 'Boom' });

      const state = marketReducer(previous, { type: 'runStarted', settings: CUSTOM_SETTINGS });

      expect(state.instruments).toEqual(emptyRows(CUSTOM_SETTINGS.instrumentCount));

      expect(state.error).toBeNull();
    });

    it('shows one empty row per instrument before any data arrives', () => {
      const state = marketReducer(INITIAL_STATE, { type: 'runStarted' });

      expect(state.instruments.map(({ symbol }) => symbol)).toEqual([
        'ALPH',
        'BETA',
        'GAMM',
        'DELT',
        'EPSI',
      ]);

      expect(state.instruments.every(isEmptyRow)).toBe(true);
    });

    it('sizes the empty rows by the applied instrument count', () => {
      const state = marketReducer(runningState(), {
        type: 'runStarted',
        settings: CUSTOM_SETTINGS,
      });

      expect(state.instruments).toHaveLength(CUSTOM_SETTINGS.instrumentCount);
    });

    it('starts a new run even when the previous one was paused', () => {
      const state = marketReducer(runningState({ status: 'paused' }), { type: 'runStarted' });

      expect(state.status).toBe('starting');
    });
  });

  describe('snapshot', () => {
    it('replaces instruments for the current run', () => {
      const instruments = [instrument('ALFA', 70), instrument('BETA', 5)];

      const state = marketReducer(runningState(), { type: 'snapshot', runId: 2, instruments });

      expect(state.instruments).toBe(instruments);
    });

    it('does not change the status, so a late snapshot cannot undo a pause', () => {
      const state = marketReducer(runningState({ status: 'paused' }), {
        type: 'snapshot',
        runId: 2,
        instruments: [instrument('ALFA', 99)],
      });

      expect(state.status).toBe('paused');
    });

    it('ignores a snapshot from a previous run', () => {
      const current = runningState();

      const state = marketReducer(current, {
        type: 'snapshot',
        runId: 1,
        instruments: [instrument('OLD', 999)],
      });

      expect(state).toBe(current);
    });
  });

  describe('status', () => {
    it.each(['running', 'paused'] as const)('applies "%s" for the current run', (status) => {
      const state = marketReducer(runningState({ status: 'starting' }), {
        type: 'status',
        runId: 2,
        status,
      });

      expect(state.status).toBe(status);
    });

    it('ignores a status from a previous run', () => {
      const current = runningState();

      const state = marketReducer(current, { type: 'status', runId: 1, status: 'paused' });

      expect(state).toBe(current);
    });
  });

  describe('error', () => {
    it('moves the current run into the error state', () => {
      const state = marketReducer(runningState(), {
        type: 'error',
        runId: 2,
        message: 'Wasm failed to load',
      });

      expect(state.status).toBe('error');
      expect(state.error).toBe('Wasm failed to load');
    });

    it('ignores an error from a previous run', () => {
      const current = runningState();

      const state = marketReducer(current, { type: 'error', runId: 1, message: 'Stale failure' });

      expect(state).toBe(current);
    });
  });

  describe('workerFailed', () => {
    it('moves the service into the error state regardless of run', () => {
      const state = marketReducer(runningState(), {
        type: 'workerFailed',
        message: 'Market worker failed to load',
      });

      expect(state.status).toBe('error');
      expect(state.error).toBe('Market worker failed to load');
      expect(state.runId).toBe(2);
    });
  });
});
