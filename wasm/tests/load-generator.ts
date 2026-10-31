import { readFile } from 'node:fs/promises';

import {
  createMarketGeneratorImports,
  type MarketGeneratorExports,
} from '../../src/domain/market-generator.model';

const COMPILED_MODULE = new URL('../../public/wasm/market-generator.wasm', import.meta.url);

/** Fresh instance per call, so tests never share generator state */
export async function loadGenerator(): Promise<MarketGeneratorExports> {
  const { instance } = await WebAssembly.instantiate(
    await readFile(COMPILED_MODULE),
    createMarketGeneratorImports(),
  );

  return instance.exports as unknown as MarketGeneratorExports;
}
