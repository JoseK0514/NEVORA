import { it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
// Vite uses the app's ESM transforms, including the deliberate production-DCE
// top-level imports; raw tsx/CJS is not the application module environment.
it('measures the production-built owned server at concurrency 10 and 20', async () => {
  await import('../../../scripts/premium-load-probe.mjs');
});
