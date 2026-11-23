// Gaps G53 (Nov 23, 2026): Employee Home from 768px at 200% text, as stylesheet contracts. The browser evidence (no
// overlapping lines, nothing cut short) is in the package's captures at 768, 390 and 320 with 200% text.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

const root = join(__dirname, '..', '..');
const css = (path: string) => readFileSync(join(root, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

it('G53: Home and Schedule text that wraps has line heights in rem, never px', () => {
  const desk = css('app/app/employee-b-desktop.css'), base = css('components/employee-b/employee-b.css');
  expect(desk).toContain('.b-screen .b-row__s { line-height: 1.1875rem !important; }');
  expect(desk).not.toMatch(/\.b-row__s \{ line-height: \d+px/);
  expect(desk).toMatch(/\.eb-shift__time \{ font-size: 1\.625rem !important; line-height: 2rem !important; \}/);
  for (const rule of ['.eb-shift__time {', '.eb-shift__where {', '.eb-empty__s {']) {
    const at = base.indexOf(rule);
    expect(at).toBeGreaterThan(-1);
    expect(base.slice(at, base.indexOf('}', at))).not.toMatch(/(font-size|line-height): \d+px/);
  }
});

it('G53: from 768px the shortcuts, Your week and the band figures stack when larger text no longer fits', () => {
  const work = css('app/app/employee-b-work.css');
  // The last plain 768px block (a later 768–1023px block, the to-do deadline rule, sits after it).
  const wide = work.slice(work.lastIndexOf('@media (min-width: 768px) {'));
  expect(wide).toMatch(/\.eb-qa > ul \{ grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, max\(10rem, calc\(\(100% - var\(--b-space-12\)\) \/ 2\)\)\), 1fr\)\) !important; \}/);
  expect(wide).toContain('@container (max-width: 14rem)');
  expect(wide).toMatch(/\.b-hero:has\(> \.b-live\) \{ container: eb-band \/ inline-size !important; \}/);
  expect(wide).toContain('@container eb-band (max-width: 36rem)');
  expect(wide).toMatch(/:is\(\.b-live__l, \.b-live__v, \.b-live__m\) \{[^}]*white-space: normal !important;/);
  expect(wide).toMatch(/\.b-hero > \.b-live \{ grid-auto-flow: row !important; grid-template-columns: minmax\(0, 1fr\) !important; \}/);
  // The week's key never shrinks under its own words, so its dates wrap to the next line instead of over it.
  expect(css('components/employee-b/employee-b.css')).toMatch(/\.eb-hw__keys \{[^}]*min-width: min-content; \}/);
});
