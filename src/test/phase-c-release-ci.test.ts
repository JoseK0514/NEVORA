import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('defines an exact release PostgreSQL gate for non-Clocker integration suites', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8')) as { scripts?: Record<string, string> };
  expect(pkg.scripts?.['test:release:postgres']).toBe('node scripts/phase-c-release-postgres.mjs');

  const workflow = await readFile('.github/workflows/ci.yml', 'utf8');
  expect(workflow).toContain('release-postgres:');
  expect(workflow).toContain('npm run test:release:postgres');
  expect(workflow).toContain("startsWith(github.ref, 'refs/heads/phase-c/')");
  expect(workflow).toContain("startsWith(github.head_ref, 'phase-c/')");
  expect(workflow).toContain("startsWith(github.base_ref, 'phase-c/')");
  expect(workflow).toContain("startsWith(github.base_ref, 'release/')");
  expect(workflow).toContain('branches: [development, main, "phase-c/**", "release/**"]');
  expect(workflow).toContain("github.ref == 'refs/heads/main'");
  expect(workflow).toContain("github.ref == 'refs/heads/development'");
  expect(workflow).toContain("github.base_ref == 'main'");
  expect(workflow).toContain("github.base_ref == 'development'");
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
