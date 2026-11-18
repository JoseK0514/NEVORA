import{beforeEach,afterEach,rs}from'@rstest/core';
export const sourceFixture={NEVORA_NEON_SOURCE_SHA:'f'.repeat(40)};
beforeEach(()=>{ rs.stubGlobal('__NEVORA_NEON_BUILD_SOURCE_SHA__',sourceFixture.NEVORA_NEON_SOURCE_SHA); });
afterEach(()=>{ rs.unstubAllGlobals(); });
