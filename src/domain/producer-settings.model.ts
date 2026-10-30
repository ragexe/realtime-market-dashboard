export interface ProducerSettings {
  /** Number of fictional instruments to generate data for */
  instrumentCount: number;

  /** Total market updates in each batch, across all instruments */
  updatesPerBatch: number;

  /** Requested time between batches, in milliseconds */
  batchIntervalMs: number;
}
