/** Exports of the compiled AssemblyScript market generator (wasm/assembly/index.ts) */
export interface MarketGeneratorExports {
  /** Linear memory of the module; the batch buffer lives here */
  readonly memory: WebAssembly.Memory;

  /** Resets the PRNG, creates state for `instrumentCount` instruments and a buffer for `batchSize` updates; once per run */
  init(instrumentCount: number, seed: number, batchSize: number): void;

  /** Fills the whole batch buffer, returns how many updates were written (= `batchSize`) */
  generateBatch(): number;

  /** Byte offset of the batch buffer in `memory`; stable after `init` */
  batchPointer(): number;
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
