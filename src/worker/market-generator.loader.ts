import {
  createMarketGeneratorImports,
  type MarketGeneratorExports,
} from '../domain/market-generator.model';

const GENERATOR_PATH = 'wasm/market-generator.wasm';
const LOAD_FAILED = 'Market generator failed to load';

/** Resolves next to the worker script, so it works under any deploy base href */
export async function loadMarketGenerator(): Promise<MarketGeneratorExports> {
  const url = new URL(GENERATOR_PATH, self.location.href);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`${LOAD_FAILED} (HTTP ${response.status})`);
  }

  try {
    const { instance } = await WebAssembly.instantiate(
      await response.arrayBuffer(),
      createMarketGeneratorImports(),
    );

    return instance.exports as unknown as MarketGeneratorExports;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`${LOAD_FAILED}: ${reason}`, { cause: error });
  }
}
