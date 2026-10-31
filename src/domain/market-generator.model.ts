/** Exports of the compiled AssemblyScript market generator (wasm/assembly/index.ts) */
export interface MarketGeneratorExports {
  readonly memory: WebAssembly.Memory;
  generatorVersion(): number;
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
