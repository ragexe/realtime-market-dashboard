/** Exports of the compiled AssemblyScript market generator (wasm/assembly/index.ts) */
export interface MarketGeneratorExports {
  /** Linear memory of the module; the batch buffer lives here */
  readonly memory: WebAssembly.Memory;

  /** Resets the PRNG and creates state for `instrumentCount` instruments; once per run */
  init(instrumentCount: number, seed: number): void;

  /** Writes `size` updates into the batch buffer, returns how many were written */
  generateBatch(size: number): number;

  /** Byte offset of the batch buffer in `memory`; stable after `init` */
  batchPointer(): number;

  /** Number of i32 fields per update in the batch buffer (layout check against the worker) */
  updateFieldCount(): number;

  /** Capacity of the batch buffer, in updates */
  maxBatchSize(): number;
}

export function createMarketGeneratorImports(): WebAssembly.Imports {
  return {
    env: {
      abort: (_message: number, _file: number, line: number, column: number) => {
        throw new Error(`Market generator aborted at ${line}:${column}`);
      },
    },
  };
}
