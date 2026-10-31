import { describe, expect, it } from 'vitest';

import { loadGenerator } from './load-generator';

describe('market generator module', () => {
  it('loads from the compiled .wasm file', async () => {
    const generator = await loadGenerator();

    expect(generator.generatorVersion()).toBe(1);
    expect(generator.memory).toBeInstanceOf(WebAssembly.Memory);
  });
});
