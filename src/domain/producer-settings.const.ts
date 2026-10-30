import { ProducerSettings } from './producer-settings.model';

export const DEFAULT_SETTINGS = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
} as const satisfies ProducerSettings;

export const SETTINGS_LIMITS = {
  instrumentCount: { min: 1, max: 50 },
  updatesPerBatch: { min: 1, max: 1000 },
  batchIntervalMs: { min: 50, max: 2000 },
} as const satisfies Record<
  keyof ProducerSettings,
  {
    min: number;
    max: number;
  }
>;
