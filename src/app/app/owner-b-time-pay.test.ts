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

describe('Clocked in now on two lines (Nov 23, 2026)', () => {
  const large = block('@container tc-b (max-width: 20em)');
  it('puts the live dot beside the first line', () => {
    expect(large).toMatch(/\.c-tc-sub > \.b-status:not\(#gq1\):not\(#gq2\):not\(#gq3\) \{ align-items: flex-start !important; \}/);
    expect(large).toMatch(/\.c-tc-sub > \.b-status > \.b-ldot[^{]*\{ margin-top: calc\(\(1\.35em - var\(--b-chip-dot\)\) \/ 2\) !important; \}/);
  });
});

describe('Timecards text in rem from 768px (G90)', () => {
  const g90 = css.slice(css.indexOf('.c-page.c-tc > header.c-title h1:not(#gq1)') - 200);
  it('sets the title, the period words, the tabs and the table in rem with the kit roles', () => {
    expect(css.indexOf('.c-page.c-tc > header.c-title h1:not(#gq1)')).toBeGreaterThan(-1);
    expect(g90).toMatch(/\.c-page\.c-tc > header\.c-title h1[^{]*\{ font-size: 2rem !important; line-height: 2\.375rem !important; \}/);
    expect(g90).toMatch(/:is\(\.c-tc-seg, \.c-tc-tabs\) > button[^{]*\{ font-size: var\(--b-fs-body-sm\) !important; line-height: var\(--b-lh-body-sm\) !important; \}/);
    expect(g90).toMatch(/\.c-tc-table[^{]*\{ font-size: var\(--b-fs-body\) !important; line-height: var\(--b-lh-body\) !important; \}/);
    expect(g90).toMatch(/\.c-tc-table thead th[^{]*\{ font-size: var\(--b-fs-meta\) !important;/);
  });
  it('lets the person\'s week wrap once its text is large for the sheet', () => {
    expect(css).toMatch(/\.c-tc-sheet:not\(#gq1\) \{ container: tc-sheet \/ inline-size !important; font-size: var\(--b-fs-body\) !important;/);
    const sheet = block('@container tc-sheet (max-width: 22rem)');
    expect(sheet).toMatch(/\.c-stats[^{]*\{ grid-auto-flow: row !important;/);
    expect(sheet).toMatch(/\.c-tc-day > \.c-row__main[^{]*\{ order: 3 !important; flex: 1 0 100% !important;/);
  });
});

describe('Timecards gate check (Nov 23, 2026)', () => {
  const desktop = readFileSync(join(__dirname, 'owner-b-desktop.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  it('draws Select on the band as the glass action, never teal on teal', () => {
    expect(desktop).toMatch(/\.c-page\.c-tc > header\.c-title \.c-tc-select:not\(#gq1\):not\(#gq2\):not\(#gq3\) \{[^}]*height: var\(--b-btn-h-band\) !important;[^}]*background: var\(--b-glass\) !important;[^}]*color: var\(--b-on-band\) !important;/);
  });
  it('gives the Show tabs and the sheet\'s note link a 44px target', () => {
    expect(css).toMatch(/\.c-tc-tabs > button:not\(#gq1\):not\(#gq2\):not\(#gq3\)::before \{ content: "" !important; position: absolute !important; inset: -4px 0 !important; \}/);
    expect(css).toMatch(/\.c-tc-sheet \.b-callout a:not\(#gq1\):not\(#gq2\):not\(#gq3\) \{[^}]*min-height: var\(--b-target\) !important;/);
  });
});

describe('the period table at a large text size (G90 follow-up)', () => {
  const table = block('@container tc-table (max-width: 36rem)');
  it('lets names and statuses wrap and steps the Breaks column aside only when the card is narrow for its text', () => {
    expect(css).toMatch(/\.c-tc-tablecard:not\(#gq1\) \{ container: tc-table \/ inline-size !important; \}/);
    expect(table).toMatch(/td\[data-col="person"\][^{]*\{ max-width: none !important; min-width: 7em !important;/);
    expect(table).toMatch(/\.c-tc-person > span:not\(\.c-av\)[^{]*\{ white-space: normal !important;/);
    expect(table).toMatch(/\[data-col="breaks"\][^{]*\{ display: none !important; \}/);
    expect(table).toMatch(/\.c-tc-st > :is\(\.b-status, \.b-chip\)[^{]*\{ flex: 0 1 auto !important; min-width: 0 !important; \}/);
  });
});

describe('the phone select and review view at a large text size (Nov 23, 2026 follow-up)', () => {
  const C = '.c-page.c-tc:not(.c-tc-desk)';
  const rule = (selector: string) => {
    const start = css.indexOf(`${C} ${selector}:not(#gq1)`);
    return start < 0 ? '' : css.slice(start, css.indexOf('}', start) + 1);
  };
  it('sets the title, week words, review button, count and hours in rem at their default sizes', () => {
    expect(rule('> header.c-title h1')).toContain('font-size: 1.5rem !important; line-height: 1.875rem !important;');
    expect(rule('> header.c-title .c-title__sub')).toContain('font-size: 0.8125rem !important; line-height: 1.125rem !important;');
    expect(rule('.c-tc-seg > button')).toContain('font-size: 0.8125rem !important;');
    expect(rule('.c-tc-flow__foot .c-btn')).toContain('font-size: 0.9375rem !important; line-height: 1.25rem !important;');
    expect(rule('.c-rows :is(.c-row__value, .c-row__value .c-num)')).toContain('font-size: 0.9375rem !important; line-height: 1.25rem !important;');
  });
  it('keeps the default heights as minimums so the controls stay at least 44px and grow with the text', () => {
    expect(rule('.c-tc-seg')).toContain('min-height: 44px !important;');
    expect(rule('.c-tc-seg > button')).toContain('min-height: 36px !important;');
    expect(rule('.c-tc-flow__foot .c-btn')).toContain('min-height: 48px !important;');
  });
  it('lets the review footer wrap with Cancel whole and the button at the right edge', () => {
    expect(rule('.c-tc-flow__foot')).toContain('flex-wrap: wrap !important;');
    expect(rule('.c-tc-flow__foot > .c-tc-flow__cancel')).toContain('flex: none !important;');
    expect(rule('.c-tc-flow__foot > .c-btn')).toContain('margin-left: auto !important;');
  });
});

describe("Jose's review of the person's week and the review panel (Nov 23, 2026)", () => {
  it('puts the attention note on the card inset with its dividing line', () => {
    expect(css).toMatch(/\.c-tc-sheet \.c-card > \.c-tc-sheet__attn:not\(#gq1\)[^{]*\{ margin: 0 !important; padding: 14px 22px 16px !important; box-shadow: inset 0 1px 0 var\(--c-line\) !important; \}/);
  });
  it('spaces the two footer actions 8px apart', () => {
    expect(css).toMatch(/dialog\.q-sheet \.c-tc-sheet \.c-tc-sheet__foot:not\(#gq1\)[^{]*\{ gap: var\(--b-space-8\) !important; \}/);
  });
  it('lets the review panel use the card width from 768px', () => {
    expect(css).not.toMatch(/c-tc-flow[^{]*\{[^}]*max-width: 560px/);
    expect(css).toMatch(/\.c-tc-flow :is\(\.c-tc-flow__step, \.c-tc-flow__rows, \.c-tc-flow__all\)[^{]*\{ width: 100% !important; max-width: none !important; \}/);
  });
});
