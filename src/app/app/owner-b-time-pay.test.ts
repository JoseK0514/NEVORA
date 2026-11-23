// G52 (Nov 23, 2026): Owner Timecards at 200% text. At 320px the band's figures ran into each other, names and statuses
// were cut ("Dani…", "Clocked in now" clipped by a 22px line) and the subtitle ran off the screen; from 768px the
// subtitle's lines overlapped. The browser capture is the evidence for the layout; these guards keep the rules that fixed it.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = readFileSync(join(__dirname, 'owner-b-time-pay.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const block = (prelude: string) => {
  const start = css.indexOf(prelude);
  if (start < 0) return '';
  let depth = 0;
  for (let index = css.indexOf('{', start); index < css.length; index++) {
    if (css[index] === '{') depth++;
    else if (css[index] === '}' && --depth === 0) return css.slice(start, index + 1);
  }
  return '';
};

describe('Timecards at a large text size (G52)', () => {
  const large = block('@container tc-b (max-width: 20em)');
  it('measures the phone screen in its own text, inside the Direction B layer', () => {
    expect(css).toMatch(/\.c-page\.c-tc > \.b-screen:not\(#gq1\) \{ container: tc-b \/ inline-size !important; \}/);
    expect(large).not.toBe('');
    // The container rule and its query sit in @layer nv-b like every other rule of the sheet.
    expect(css.lastIndexOf('@layer nv-b {', css.indexOf('@container tc-b'))).toBeGreaterThan(-1);
  });
  it('stacks the band figures one per row', () => {
    expect(large).toMatch(/\.b-hero \.b-live:not\(#gq1\):not\(#gq2\):not\(#gq3\) \{ grid-auto-flow: row !important; grid-template-columns: minmax\(0, 1fr\) !important;/);
    expect(large).toMatch(/\.b-hero :is\(\.b-live__l, \.b-live__v\)[^{]*\{[^}]*white-space: normal !important;/);
  });
  it('lets a Team row grow instead of cutting its name or status', () => {
    expect(large).toMatch(/#b-tc-team \.b-row:not\(#gq1\):not\(#gq2\):not\(#gq3\) \{ display: grid !important;[^}]*height: auto !important; min-height: 72px !important;/);
    expect(large).toMatch(/#b-tc-team \.b-row__tt[^{]*\{[^}]*overflow: visible !important; text-overflow: clip !important; white-space: normal !important;/);
    expect(large).toMatch(/#b-tc-team \.c-tc-sub:not\(#gq1\)[^{]*\{ height: auto !important; overflow: visible !important;/);
    expect(large).toMatch(/#b-tc-team \.c-tc-sub > :is\(span, \.b-chip, \.b-status\)[^{]*\{[^}]*white-space: normal !important;/);
    // The hours move under the status; the face and the chevron keep the row's sides.
    expect(large).toMatch(/\.b-row > \.b-row__end[^{]*\{ grid-column: 2 !important; grid-row: 2 !important;/);
    expect(large).not.toContain('ellipsis');
  });
  it('grows the wide subtitle line with the text, 21px at the default size', () => {
    expect(block('@media (min-width: 768px) {\n    :is(#c-root, html) :is(#c-root, body) :is(#c-root, .app-shell)[data-nv-b][data-nv-b][data-nv-b] .c-page.c-tc > header.c-title'))
      .toContain('.c-title__sub:not(#gq1):not(#gq2):not(#gq3) { line-height: 1.3125rem !important; }');
  });
});
