import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@rstest/core';

const files = ['owner-b-schedule.css', 'b-thirty-day.css', 'employee-b-work.css', 'owner-b-settings.css', 'owner-b-requests.css'];
const patch = (file: string) => {
  const css = readFileSync(join(__dirname, file), 'utf8');
  const start = css.indexOf('/* Phase 3 Spanish');
  expect(start).toBeGreaterThan(-1);
  return css.slice(start).replace(/\/\*[\s\S]*?\*\//g, '');
};

describe('Phase 3 Spanish layout boundaries', () => {
  it('gives whole-day agreement statuses their own line when a Spanish phone row runs out of space', () => {
    const css = readFileSync(join(__dirname, 'b-restrictions.css'), 'utf8');
    const row = '.rs-week__d:is([data-state="any"], [data-state="none"])';
    const start = css.indexOf(row);
    expect(start).toBeGreaterThan(-1);
    const mobile = css.slice(css.lastIndexOf('@media', start), start);
    expect(mobile).toContain('@media (max-width: 767px)');
    expect(mobile).toContain(':lang(es)');
    expect(css.slice(start).split('}')[0]).toContain('flex-wrap: wrap');
    expect(css).toContain(row + ' > .rs-week__tx {\n    flex: 1 0 min-content;');
    expect(css).toMatch(/:lang\(es\)[^{}]+:is\(\.rs-week__any, \.rs-week__none\)\s*\{[^}]*\bhyphens: none;/);
  });

  for (const file of files) {
    it(`${file}: every new selector is Spanish-only or deliberately shared, and preserves type size and visibility`, () => {
      const css = patch(file);
      const selectors = [...css.matchAll(/([^{}]+)\{/g)].map(match => match[1].trim()).filter(selector => !selector.startsWith('@'));
      expect(selectors.length).toBeGreaterThan(0);
      // English UI flags (Nov 26, 2026): an approved Spanish fix extended to English is marked :not(.nv-any-lang), the same
      // specificity as :lang(es), so the cascade is unchanged.
      for (const selector of selectors) expect(selector).toMatch(/:lang\(es\)|:not\(\.nv-any-lang\)/);
      expect(css).not.toMatch(/font-size:|letter-spacing:|display:\s*none|text-overflow:\s*ellipsis|line-clamp:\s*\d/);
    });
  }

  it('Edit shift reflows only inside the narrow text-relative phone container', () => {
    const css = patch('owner-b-schedule.css');
    expect(css).toContain('@media (max-width: 767px)');
    expect(css).toContain('.c-shift-page:lang(es):has(#edit-shift-form)');
    expect(css).toContain('container: es-shift / inline-size');
    // Reserve the pending label at 390 px with doubled text. At normal size the phone keeps its single header row.
    expect(css).toContain('@container es-shift (max-width: 15rem)');
    expect(css).toMatch(/> \.c-shift__titles \{ grid-column: 1 \/ -1 !important; grid-row: 1 !important;/);
    expect(css).toMatch(/> \.c-shift__cancel \{ grid-column: 1 !important; grid-row: 2 !important;/);
    expect(css).toMatch(/> \.c-shift__save \{ grid-column: 2 !important; grid-row: 2 !important;/);
  });

  it('Add employee preserves its default arrangement and puts the enlarged title above actions', () => {
    const css = patch('b-thirty-day.css');
    expect(css).toContain('@container not style(--nv-rem: 16px)');
    expect(css).toMatch(/> \.c-formhead__t \{ grid-column: 1 \/ -1 !important; grid-row: 1 !important;/);
    expect(css).toMatch(/> \.c-formhead__l \{ grid-column: 1 !important; grid-row: 2 !important;/);
    expect(css).toMatch(/> \.c-nav__right \{ grid-column: 2 !important; grid-row: 2 !important;/);
  });

  it('Publish and Availability enlarged values have separate rows from their labels', () => {
    expect(patch('owner-b-schedule.css')).toMatch(/> \.c-row__value \{ grid-column: 1 !important; grid-row: 2 !important;/);
    expect(patch('employee-b-work.css')).toMatch(/\.c-avail__hours \{ grid-column: 1 !important; grid-row: 2 !important;/);
  });

  it('Availability title and posted-shift link can fit their containers without shrinking text', () => {
    const css = patch('employee-b-work.css');
    expect(css).toContain('min-width: 0 !important; max-width: 100% !important;');
    expect(css).toMatch(/#b-avail-title:lang\(es\) \{ overflow-wrap: anywhere !important; hyphens: auto !important;/);
    expect(css).toMatch(/\.eb-cardfoot:lang\(es\) > \.b-link\[href="\/app\/exchange\/open-shifts"\] \{[^}]*flex: 0 1 auto !important;[^}]*white-space: normal !important;/);
  });

  it('Team shortcut descriptions unclamp at enlarged text with full-width titles on narrow phones', () => {
    const css = patch('owner-b-settings.css');
    expect(css).toContain('@container not style(--nv-rem: 16px)');
    expect(css).toContain('@media (max-width: 359px)');
    expect(css).toMatch(/\.b-row__s \{ display: block !important; -webkit-line-clamp: unset !important; overflow: visible !important;/);
    expect(css).toMatch(/> \.b-row__tx \{ grid-column: 1 \/ -1 !important; grid-row: 2 !important;/);
    expect(css).toMatch(/\.b-row__tt \{ overflow-wrap: normal !important;/);
  });
});


it('Spanish Availability deadline link has a contiguous 44px target even when its text wraps', () => {
  const css = patch('owner-b-schedule.css');
  expect(css).toMatch(/\.c-avteam__people:lang\(es\) \.b-rem-need > a[^{}]+\{ display: inline-flex !important; align-items: center !important; min-height: var\(--b-target\) !important; max-width: 100% !important;/);
  expect(css).toMatch(/\.c-avteam__people:lang\(es\) \.b-rem-need > a[^{}]+::after \{ inset: 0 !important;/);
});


it('Spanish Add shift reflows its bare title independently from Edit shift', () => {
  const css = patch('owner-b-schedule.css');
  expect(css).toContain('.c-shift-page:lang(es):has(#create-shift-form)');
  expect(css).toContain('@container es-create-shift (max-width: 12rem)');
  expect(css).toMatch(/> \.c-shift__title \{ grid-column: 1 \/ -1 !important; grid-row: 1 !important;/);
});

it('Spanish exchange filters preserve labels and counts without squeezing three columns at enlarged text', () => {
  for (const css of [patch('employee-b-work.css'), patch('owner-b-requests.css')]) {
    expect(css).toContain('grid-auto-flow: row !important; grid-template-columns: minmax(0, 1fr) !important;');
    expect(css).toContain('min-height: var(--b-target) !important;');
  }
  expect(patch('employee-b-work.css')).toContain('.b-screen:lang(es):has(#b-exchange-title) .eb-day > b { line-height: var(--b-lh-title) !important;');
});

it('Spanish creation reasons wrap and optional-note metadata can move to a new line', () => {
  const css = patch('employee-b-work.css');
  expect(css).toMatch(/\.c-xs-option--one \.c-xs-option__main b \{ white-space: normal !important; overflow: visible !important;/);
  expect(css).toMatch(/\.c-field__label:has\(> \.c-xs-optional\) \{ flex-wrap: wrap !important;/);
  expect(css).toMatch(/a\.c-xs-alt \{ max-width: 100% !important; min-width: 0 !important; white-space: normal !important;/);
});

it('Spanish Team filter hit regions retain transparent stacking priority down all four rows', () => {
  const css = patch('owner-b-settings.css');
  for (const [child, level] of [['first-child', 3], ['nth-child(2)', 2], ['nth-child(3)', 1]] as const) {
    expect(css).toMatch(new RegExp(`button:${child.replace(/[()]/g, '\\$&')}[^{}]*\\{ position: relative !important; z-index: ${level} !important;`));
  }
});

it('Spanish Team live status and recovery help can use their own readable lines', () => {
  const css = patch('owner-b-settings.css');
  expect(css).toMatch(/> \.c-row__trail \{ grid-column: 2 !important; grid-row: 2 !important;/);
  expect(css).toMatch(/\.wc-recovery:not\(\.nv-any-lang\) \.wc-recovery__pins \.q-rt > i \{ white-space: normal !important;/);
});

it('Spanish swap title and field labels stay inside their available width', () => {
  const css = patch('employee-b-work.css');
  expect(css).toMatch(/\.c-xsheet:lang\(es\) \.b-title__text > h1 \{ overflow-wrap: anywhere !important; hyphens: auto !important;/);
  expect(css).toContain(':is(.c-xs-shift__time, .c-xs-shift__place, .c-field__label)');
  expect(css).toContain('.b-hero:lang(es):has(#b-exchange-title) > .b-seg:not([data-slide]):has(> :nth-child(3))');
});

it('preserves the approved Spanish week arrow gap and Shift requests tap height', () => {
  const schedule = patch('owner-b-schedule.css');
  expect(schedule).toContain('@media (max-width: 767px) and (not (max-width: 359px))');
  expect(schedule).toMatch(/\.c-sched:lang\(es\) \.b-week \.b-week__h > span:last-child[^{}]+\{ gap: var\(--b-space-4\) !important;/);
  const tabs = patch('owner-b-requests.css');
  expect(tabs).toContain('@container style(--nv-rem: 16px)');
  expect(tabs).toContain('.c-shreq:lang(es) > nav.c-seg { --b-seg-item-h: var(--b-target); }');
});

it('extends only the Spanish cost disclosure hit area at enlarged tablet text', () => {
  const css = patch('owner-b-schedule.css');
  const start = css.lastIndexOf('@media (min-width: 768px) and (max-width: 1023px)');
  expect(start).toBeGreaterThanOrEqual(0);
  const tablet = css.slice(start);
  expect(tablet).toContain('@container not style(--nv-rem: 16px)');
  expect(tablet).toMatch(/\.c-sched:lang\(es\) \.lc-basis > summary::after\s*\{[^}]*inset: 0 0 -1px;/);
});
