import{beforeEach,afterEach,vi}from'vitest';
export const sourceFixture={NEVORA_NEON_SOURCE_SHA:'f'.repeat(40)};
beforeEach(()=>vi.stubGlobal('__NEVORA_NEON_BUILD_SOURCE_SHA__',sourceFixture.NEVORA_NEON_SOURCE_SHA));
afterEach(()=>vi.unstubAllGlobals());
