import type { InstrumentSnapshot } from '../../../domain/instrument-snapshot.model';
import { DEFAULT_SETTINGS } from '../../../domain/producer-settings.const';
import type { ProducerSettings } from '../../../domain/producer-settings.model';
import type { ProducerStatus } from '../../../domain/producer-status.model';
import type { RunId } from '../../../domain/run-id.model';

export interface MarketState {
  readonly runId: RunId;
  readonly settings: Readonly<ProducerSettings>;
  readonly status: ProducerStatus | 'starting' | 'error';
  readonly error: string | null;
  readonly instruments: readonly InstrumentSnapshot[];
}

export const INITIAL_STATE = {
  runId: 0,
  settings: DEFAULT_SETTINGS,
  status: 'starting',
  error: null,
  instruments: [],
} as const satisfies MarketState;
