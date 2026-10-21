import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('defines an exact release PostgreSQL gate for non-Clocker integration suites', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { scripts?: Record<string, string> };
  expect(pkg.scripts?.['test:release:postgres']).toBe('node scripts/phase-c-release-postgres.mjs');

  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  expect(workflow).toContain('release-postgres:');
  expect(workflow).toContain('npm run test:release:postgres');
  // Unconditional routing covers every accepted candidate rather than naming
  // branch prefixes that can silently omit the next feature or fix branch.
  const gate = workflow.split('  release-postgres:')[1].split('  phase-e-postgres:')[0];
  expect(gate).not.toMatch(/^    if:/m);
  expect(gate).toContain('ref: ${{ github.sha }}');
  expect(workflow).toContain('branches: [development, main, "phase-c/**", "release/**", "codex/verify-preview-33"]');
});

it('release PostgreSQL runner includes every omitted critical SQL suite', async () => {
  const source = await readFile('scripts/phase-c-release-postgres.mjs', 'utf8').catch(() => '');
  for (const marker of [
    'test:foundation:integration',
    'vitest.phase-b-c-authority.config.mts',
    'test:generation:integration',
    'test:exchanges:integration',
    'test:notifications:integration',
  ]) {
    expect(source).toContain(marker);
  }
});
