import { it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
it('verifies HTTP submissions, local delivery and owned reset between cases', async () => {
  await import('../../../scripts/premium-submissions.mjs');
});
