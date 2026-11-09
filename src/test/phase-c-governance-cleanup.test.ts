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

// Direction B (Nov 8, 2026) replaced the Signature Clocker sheets (punch, PIN, setup modules read the legacy
// --nevora-blue / --color-brand-primary aliases) with one kiosk sheet on Direction B's own palette. The guard keeps its
// intent: no retired raw legacy colours, text wraps, and the old modules are gone.
it('keeps the active Clocker CSS on the Direction B palette without retired legacy colours', async () => {
  const css = await readFile('src/components/clocker.module.css', 'utf8');
  expect(css).not.toMatch(/#0756d9|#18191f|#676a73|#f0fbff|#f6f6f8|#eaf5ea|#1d6f42/i);
  expect(css).toContain('var(--clocker-accent, #0C726C)');
  expect(css).not.toMatch(/var\([^)]*\)-space/);
  expect(css).toContain('white-space: normal');
  for (const retired of ['clocker-punch.module.css', 'clocker-pin.module.css', 'clocker-setup.module.css', 'clocker-shell.module.css', 'clocker-v2.module.css'])
    expect(existsSync('src/components/' + retired)).toBe(false);
});
