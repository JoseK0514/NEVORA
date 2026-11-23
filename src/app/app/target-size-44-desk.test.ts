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
    expect(css).toContain('.b-explain > summary:not(#fa-x1):not(#fa-x2)::after { content: "" !important; position: absolute !important; top: 50% !important; bottom: auto !important; left: -4px !important; right: -4px !important; width: auto !important; height: calc(100% + 8px) !important; translate: 0 -50% !important;');
    expect(css).toMatch(/\.b-explain--compact > summary:not\(#fa-x1\):not\(#fa-x2\) \{ width: var\(--b-btn-h-compact\) !important; height: var\(--b-btn-h-compact\) !important; \}/);
  });

  it('the Timecards review checkbox label is 44px wide on desktop, the box where it was', () => {
    expect(read('../../components/timecards-corp.css')).toContain('.c-tc-desk .c-tc-hit { box-sizing: border-box; display: grid; place-items: center start; width: 44px; min-height: 44px; margin-left: -12px; padding-left: 12px; cursor: pointer; }');
  });

  it('on phones the review checkbox is inside its row label, so the whole row is its tap area', () => {
    const tsx = readFileSync(new URL('../../components/timecards.tsx', import.meta.url), 'utf8');
    expect(tsx).toContain('<label className="c-row c-tc-pick" data-off={pickDisabled(item)||undefined}>\n                <input type="checkbox" className="c-tc-box"');
    expect(tsx).toContain('<label className="c-row c-row--one c-tc-pick"><input type="checkbox" className="c-tc-box" aria-label="Select all eligible timecards"');
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
});
