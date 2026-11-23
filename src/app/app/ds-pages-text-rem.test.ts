// Desktop at 200% text, page rows DS-4 to DS-9 and DS-11 (Nov 23, 2026). Page text that stayed at fixed px while the
// reader's text grew is now in rem at the same pixels at a 16px root, so the default size is unchanged. Settings and
// Team rows keep their one-line ellipsis at the default size and wrap once text is enlarged.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');
// Every font-size, line-height and font shorthand in a sheet, with no px left in them (var() and calc() aside).
const pxText = (sheet: string) => [...sheet.matchAll(/(?:^|[;{\s])(font-size|line-height|font)\s*:\s*([^;}]*)/g)]
  .map(m => m[2]).filter(v => !v.includes('var(') && !v.includes('calc(') && /\d(?:\.\d+)?px\b/.test(v));

describe('Schedule (DS-6, DS-7)', () => {
  it('the week grid, the band and the sheets set no text in px', () => {
    for (const sheet of ['app/app/schedule/schedule-corp.css', 'app/app/schedule/publish/publish.css', 'components/coverage-minutes/coverage-minutes.css']) {
      expect(pxText(css(sheet))).toEqual([]);
    }
  });
  it('the grid day head, corner, location menu and week state are the same px in rem', () => {
    const sched = css('app/app/schedule/schedule-corp.css');
    expect(sched).toMatch(/\.cm-grid thead th > \.cm-grid__dayhours \{[^}]*font: 400 0\.8125rem\/1\.125rem Inter/);
    expect(sched).toMatch(/\.c-select-btn\.c-sched-loc \{[^}]*font-size: 0\.9375rem; line-height: 1\.25rem;/);
    expect(sched).toMatch(/:is\(\.c-sched-state, \.c-sched-weekstate\) \{[^}]*font-size: 0\.8125rem; line-height: 1\.125rem;/);
    expect(css('app/app/owner-b-schedule.css')).toMatch(/\.cm-block \.c-time:not\(#p8a\):not\(#p8b\) \{[^}]*font-size: 0\.75rem !important;/);
  });
  it('Add shift and Build and publish: the title and the kit buttons grow with text', () => {
    expect(css('app/app/owner-b-desktop.css')).toMatch(/\.c-shift__head \.c-shift__title \{[^}]*font-size: 2rem !important;/);
    expect(css('components/schedule-shift-form.css')).toContain(':is(#c-root, html) .c-shift-page .c-btn { font-size: 0.9375rem; line-height: 1.25rem; }');
    expect(css('app/app/schedule/publish/publish.css')).toContain(':is(#c-root, html) .c-pub .c-btn { font-size: 0.9375rem; line-height: 1.25rem; }');
    expect(css('app/app/schedule/schedule-corp.css')).toContain(':is(#c-root, html) .c-sched .c-btn { font-size: 0.9375rem; line-height: 1.25rem; }');
  });
});

describe('Time corrections (DS-8)', () => {
  it('the was and now comparison, the change pill and the reason set no text in px', () => {
    const sheet = css('app/app/timecards/corrections/corrections.css');
    expect(pxText(sheet)).toEqual([]);
    expect(sheet).toMatch(/\.c-tcx \.correction-comparison__chg \{[^}]*font-size: 0\.75rem; line-height: 1\.25rem;/);
    expect(sheet).toMatch(/\.c-tcx \.manager-correction-reason__k \{ font-size: 0\.8125rem; line-height: 1\.125rem;/);
  });
});

describe('Swap and Call out (DS-9)', () => {
  it('the card meta line and the confirm button are the same px in rem', () => {
    const sheet = css('components/employee-b/schedule.css');
    expect(sheet).toContain(':is(#c-root, html) .app-shell[data-nv-b] .b-card__meta.es-wide { font-size: 0.875rem; }');
    expect(sheet).toContain('font: 600 0.875rem/1.25rem Inter, "Inter Fallback", sans-serif !important;');
  });
});

describe('Profile values (DS-11)', () => {
  it('the quiet row values are 15/20px in rem', () => {
    expect(css('app/app/corp-quiet-bridge.css')).toContain(':is(.q-rv, .q-rv--l, .q-rv--ph, .q-rv--ink, .q-rv--go) { font-size: 0.9375rem; line-height: 1.25rem;');
  });
});

describe('Settings and Team rows at large text (DS-4, DS-5)', () => {
  it('keep the one-line ellipsis at the default size and wrap once text is enlarged', () => {
    const sheet = css('app/app/owner-b-pages.css');
    expect(sheet).toContain("@property --nv-rem { syntax: '<length>'; inherits: true; initial-value: 16px; }");
    expect(sheet).toContain('body { --nv-rem: 1rem; }');
    const block = sheet.slice(sheet.indexOf('@container not style(--nv-rem: 16px) {'));
    expect(block).toMatch(/\.c-page:is\(\.c-team, \.c-setb\) :is\(\.c-row__title, \.c-row__detail > span:first-child\) \{ white-space: normal !important; overflow: visible !important; text-overflow: clip !important;/);
    // The kit's one-line rule stays as designed at the default size.
    expect(css('components/corp/corp.css')).toMatch(/\.c-row__title \{[^}]*text-overflow: ellipsis; white-space: nowrap;/);
  });
});
