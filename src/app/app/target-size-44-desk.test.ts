import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@rstest/core';

// Target size, first release (Nov 23, 2026): the small targets the production check measured at 1440 (and the icon-only
// explain at 390). Each grows its tap area to 44px with a transparent pseudo-element, so nothing drawn changes.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

describe('44px targets on tablets and desktop', () => {
  it('band tabs (Payroll tabs, the Timecards week control, band segments) reach the 44px track with a 4px ring', () => {
    const css = read('./owner-b-desktop.css');
    const tabs = ':is(nav.c-pay-tabs, nav.c-seg, .c-tc-seg):is(.c-page > header.c-title ~ *, .q-page > .q-hd + *) > :is(a, button)';
    expect(css).toContain(`${tabs} { position: relative !important; }`);
    expect(css).toContain(`${tabs}::after { content: "" !important; display: block !important; position: absolute !important; inset: calc(-1 * var(--b-seg-pad)) 0 !important;`);
    expect(css).not.toContain(`${tabs}::after { display: none !important; }`);
    // 36px item + 2 × 4px padding = the 44px track.
    expect(read('../b-tokens.css')).toContain('--b-seg-h: 44px; --b-seg-pad: 4px; --b-seg-r: var(--b-radius-pill); --b-seg-item-h: 36px;');
  });

  it('the form head back link ("‹ Team", drawn 32px) has a 44px tall tap area at every pointer', () => {
    const css = read('./owner-b-desktop.css');
    expect(css).toMatch(/\.c-formhead \.c-formhead__up(?::not\(#nvd-none\d?\))+ \{ height: 32px !important;/);
    expect(css).toMatch(/\.c-formhead \.c-formhead__up(?::not\(#nvd-none\d?\))+::after \{ content: "" !important;[^}]*height: 44px !important; translate: 0 -50% !important;/);
  });

  it('"What this measures" (drawn 36px) has a 44px ring centred on it, not shifted above it', () => {
    const css = read('./b-review-details.css');
    expect(css).toContain('.b-explain > summary:not(#fa-x1):not(#fa-x2)::after { content: "" !important; position: absolute !important; top: 50% !important; bottom: auto !important; left: -4px !important; right: -4px !important; width: auto !important; height: calc(100% + 8px) !important; translate: 0 -50% !important; transform: none !important; border-radius: 0 !important; }');
    expect(css).toMatch(/\.b-explain--compact > summary:not\(#fa-x1\):not\(#fa-x2\) \{ width: var\(--b-btn-h-compact\) !important; height: var\(--b-btn-h-compact\) !important; \}/);
  });

  it('the Timecards review checkbox label is 44px wide on desktop, the box where it was', () => {
    expect(read('../../components/timecards-corp.css')).toContain('.c-tc-desk .c-tc-hit { box-sizing: border-box; display: grid; place-items: center start; width: 44px; min-height: 44px; margin-left: -12px; padding-left: 12px; cursor: pointer; }');
  });

  it('on phones the review checkbox is inside its row label, so the whole row is its tap area', () => {
    const tsx = readFileSync(new URL('../../components/timecards.tsx', import.meta.url), 'utf8');
    expect(tsx).toContain('<label className="c-row c-tc-pick" data-off={pickDisabled(item)||undefined}>\n                <input type="checkbox" className="c-tc-box"');
    // Signed-in Spanish (integration): the label's words come from Timecards' copy (T.selectAllEligibleLabel).
    expect(tsx).toContain('<label className="c-row c-row--one c-tc-pick"><input type="checkbox" className="c-tc-box" aria-label={T.selectAllEligibleLabel}');
  });

  it('the week grid\'s open-shift chip and the empty cell\'s "+ Add" reach 44px inside their own cell from 768px', () => {
    const css = read('./owner-b-schedule.css');
    const at = css.indexOf(':is(.sb-openchip, td > .cm-add):not(#t44a):not(#t44b):not(#t44c)::after { content: "" !important; display: block !important; position: absolute !important; left: 0 !important; right: 0 !important; top: min(0px, calc(50% - 22px)) !important; bottom: min(0px, calc(50% - 22px)) !important;');
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(0, at).match(/@media [^{]*\{/g)?.at(-1)).toBe('@media (min-width: 768px) {');
    expect(css).toContain(':is(.sb-openchip, td > .cm-add):not(#t44a):not(#t44b):not(#t44c) { position: relative !important; }');
  });

  it('"Payroll history" sits above the row that overlapped its lowest 3px', () => {
    expect(read('../../components/payroll/payroll-corp.css')).toContain(':is(#c-root, html) .c-pay .c-pay__sec-aside > .c-link { position: relative; z-index: 1; }');
  });

  it('release batch: the small controls get a centred 44px ring that never shrinks a side already 44px or more', () => {
    const css = read('./owner-b-pages.css');
    const at = css.indexOf('aside.sidebar .nav-link:not(#r44a)');
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at);
    for (const target of ['aside.sidebar .nav-link', '.portal-notification-bell', '.b-week__arrow', '.c-sched-week__today', '.c-sched-actions :is(button, a)', '.eb-avail-req', '.c-shift__cancel', ':is(.c-card__aside, .q-sec__aside) .c-link', '.b-search__go', '.b-card__a', '.b-row__hit', '.q-nav > .q-nav__l']) {
      expect(block).toContain(`${target}:not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h)::after`);
    }
    expect(block).toContain('top: min(0px, calc(50% - 22px)) !important; bottom: min(0px, calc(50% - 22px)) !important; left: min(0px, calc(50% - 22px)) !important; right: min(0px, calc(50% - 22px)) !important;');
    expect(block).toContain('background: none !important; box-shadow: none !important; opacity: 0 !important;');
    // The back link keeps its own positioning on desktop.
    expect(block).not.toContain('.q-nav > .q-nav__l:not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h) {');
  });
});

describe('placeholder contrast (release batch)', () => {
  it('field placeholders on white use a kit grey of 4.5:1 or more, not the faint grey', () => {
    expect(read('../../components/employee-mobile/hours.css')).toContain(':is(#c-root, html) .c-hours .c-in::placeholder { color: var(--c-grey); }');
    expect(read('../../components/quiet/quiet.css')).toContain(':is(#q-root, html) .q-input-row input::placeholder { color: var(--q-tab); }');
    expect(read('../../components/mobile-access/mobile-access.css')).toContain('.q-in:focus::placeholder{color:#6B7075}');
    for (const sheet of ['../../components/employee-mobile/hours.css', '../../components/quiet/quiet.css', '../../components/corp/corp.css']) {
      expect(read(sheet)).not.toMatch(/::placeholder \{ color: var\(--(c|q)-faint\)/);
    }
  });

  it('the Employee and Lead week arrows are centred for the -50% translate their own rule keeps', () => {
    expect(read('./owner-b-pages.css')).toContain('[data-employee-mobile] .b-week__arrow:not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h):not(#r44i)::after { top: 50% !important; left: 50% !important; right: auto !important; bottom: auto !important; width: max(100%, 44px) !important; height: max(100%, 44px) !important; translate: -50% -50% !important; }');
    expect(read('./owner-b-pages.css')).toContain('aside.sidebar nav.sidebar-nav:not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h) { box-sizing: border-box !important; width: calc(100% + 4px) !important; max-width: none !important; padding-inline: 2px !important; margin-inline: -2px !important; }');
  });

  it("Team's first row of filters sits above the second, so both rows' 4px rings reach 44px", () => {
    expect(read('./owner-b-home.css')).toContain('.c-page.c-team .b-filters:has(> :nth-child(4)) > button:nth-child(-n+2):not(#fa1):not(#fa2):not(#fa3):not(#fa4):not(#fa5):not(#fa6):not(#ds2) { position: relative !important; z-index: 1 !important; }');
  });

  it('the Time off empty card keeps the kit gap below the segments, and the Publish explain sits above its neighbours', () => {
    const css = read('./owner-b-pages.css');
    expect(read('./owner-b-requests.css')).toContain('.q-page > .q-emptycard:not(:is(nav.c-seg, .c-seg, .q-seg) + *):not(#pg1):not(#pg2):not(#pg3):not(#pg4):not(#pg5):not(#pg6):not(#pg7) { margin-top:0 !important; }');
    expect(css).toContain('.c-pub .b-explain > summary:not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h) { z-index: 2 !important; }');
  });

  it('closed, "Start from" on Build and publish keeps its build controls out of layout, so no hidden summary measures under the Publish form', () => {
    expect(read('./owner-b-pages.css')).toContain('.c-pub details.c-pub__start:not([open]) > :not(summary):not(#r44a):not(#r44b):not(#r44c):not(#r44d):not(#r44e):not(#r44f):not(#r44g):not(#r44h) { display: none !important; }');
  });
});

