import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Deliberately explicit: no glob can silently select an unrelated/empty suite.
const suites: Record<string, string> = {
  assignments: 'src/test/integration/phase-e-published-assignments.integration.ts',
  attention: 'src/test/integration/phase-e-attention.integration.ts',
  'communications-schema': 'src/test/integration/phase-e-communications-schema.integration.ts',
  communications: 'src/test/integration/phase-e-communications.integration.ts',
  'communication-ack': 'src/test/integration/phase-e-communication-ack.integration.ts',
  'communication-notifications': 'src/test/integration/phase-e-communication-notifications.integration.ts',
  home: 'src/test/integration/phase-e-home.integration.ts',
  'calendar-tokens': 'src/test/integration/phase-e-calendar-tokens.integration.ts',
  'calendar-feed': 'src/test/integration/phase-e-calendar-feed.integration.ts',
};
const suite = process.env.PHASE_E_SQL_SUITE;
if (!suite || !Object.hasOwn(suites, suite)) throw new Error('PHASE_E_SQL_SUITE must identify an allowlisted owned suite');
const { assertOwnedFixture } = await import(new URL('./scripts/phase-e-owned.mjs', import.meta.url).href);
assertOwnedFixture();
export default defineConfig({
  resolve: { alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
    'server-only': fileURLToPath(new URL('./node_modules/next/dist/compiled/server-only/empty.js', import.meta.url)),
  } },
  test: { include: [suites[suite]], passWithNoTests: false, fileParallelism: false, testTimeout: 15_000, hookTimeout: 30_000 },
});
