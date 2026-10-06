import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';

it('records current Phase C architecture without rewriting the historical charter', async () => {
  const charter = await readFile('docs/architecture/fuel-automation-charter.md', 'utf8');
  expect(charter).toContain('## Current Phase C status (2026-10-05)');
  expect(charter).toContain('0011_clocker_devices.sql');
  expect(charter).toContain('Employee Home and My Time read persisted actual punches');
  const release = await readFile('docs/execution/phase-c-release-control.md', 'utf8');
  expect(release).toContain('Frozen SHA → exact CI → isolated Preview');
  expect(release).toContain('branch protection');
});

it('removes the unreachable pre-Phase-C local-state Clocker implementation', async () => {
  expect(existsSync('src/components/clocker-kiosk.tsx')).toBe(false);
  expect(existsSync('src/lib/clocker-kiosk.ts')).toBe(false);
  expect(existsSync('src/lib/clocker-kiosk.test.ts')).toBe(false);

  for (const file of [
    'src/app/clocker/clocker-page.test.tsx',
    'src/app/globals.css',
    'scripts/verify-fuel-phase-3.mjs',
    'scripts/verify-nevora-foundation.mjs',
  ]) {
    expect((await readFile(file, 'utf8'))).not.toMatch(/ClockerKiosk|clocker-kiosk|clocker-terminal-/);
  }
});

it('uses shared tokens for exact approved NEVORA palette equivalents in active Clocker CSS', async () => {
  const css = [
    await readFile('src/components/clocker-punch.module.css', 'utf8'),
    await readFile('src/components/clocker-pin.module.css', 'utf8'),
    await readFile('src/components/clocker-setup.module.css', 'utf8'),
  ].join('\n');
  expect(css).not.toMatch(/#0756d9|#18191f|#676a73|#f0fbff|#f6f6f8|#eaf5ea|#1d6f42|#fff\b/i);
  expect(css).toContain('var(--nevora-blue)');
  expect(css).toContain('var(--color-brand-primary)');
  expect(css).not.toMatch(/var\([^)]*\)-space/);
  expect(css).toContain('white-space: normal');
});
