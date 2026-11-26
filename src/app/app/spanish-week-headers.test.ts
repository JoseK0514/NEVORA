import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from '@rstest/core';

it('reflows the enlarged Spanish weekly title and availability actions without changing their type size', () => {
  const cases = [
    ['schedule/schedule-corp.css', '/* Keep the Spanish page title whole', '#schedule-title', 'min-inline-size: max-content'],
    ['employee-b-desktop.css', '/* Give the enlarged Spanish availability', '#b-avail-title', 'position: static'],
  ];
  for (const [file, marker, titleId, rule] of cases) {
    const css = readFileSync(join(__dirname, file), 'utf8').split(marker)[1];
    expect(css).toBeDefined();
    expect(css).toContain('@container not style(--nv-rem: 16px)');
    expect(css).toContain('(min-width: 768px)');
    expect(css).toContain(':lang(es)');
    expect(css).toContain(titleId);
    expect(css).toContain(rule);
    expect(css).not.toContain('font-size:');
  }
});

it('uses the narrow recovery field arrangement at enlarged Spanish phone text', () => {
  const css = readFileSync(join(__dirname, 'owner-b-settings.css'), 'utf8').split('/* Recovery uses the narrow-phone arrangement')[1];
  expect(css).toContain('@media (max-width: 767px)');
  expect(css).toContain('@container not style(--nv-rem: 16px)');
  expect(css).toContain('.wc-recovery:lang(es) .q-select-row > .q-rt');
  expect(css).toContain('flex: 1 0 100% !important');
  expect(css).toContain('.wc-recovery:lang(es) .q-select-row > .q-select-row__control');
});
