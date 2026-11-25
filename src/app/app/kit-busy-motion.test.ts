// Kit fixes (Nov 25, 2026): a busy (saving) button keeps its look, and reduced motion takes every movement off a button.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');
// Busy: aria-busy on the button, or its busy label showing (BBusyLabel, Settings' ButtonLabel).
const SHOWING = ':has(.b-busy__on:not([data-b-off]), .wc-swap[data-state="pending"])';
const BUSY = `:not([aria-busy="true"], ${SHOWING})`;

describe('a busy button keeps its fill (Jose, Nov 25)', () => {
  it('the kit greys only a button that truly is disabled, and a busy one keeps its teal shadow and shows progress', () => {
    const kit = css('components/owner-b/owner-b.css');
    expect(kit).toContain(`.b-btn:is(:disabled, [aria-disabled="true"])${BUSY} { opacity: 1; background: var(--b-disabled-bg); color: var(--b-disabled-ink);`);
    expect(kit).toContain(`.b-btn:disabled${BUSY} { box-shadow: none; }`);
    expect(kit).toContain(`.b-btn:is([aria-busy="true"], ${SHOWING}) { opacity: 1; scale: 1; cursor: progress; }`);
    expect(kit).toContain(`.b-btn--teal:is(:not(:disabled, [aria-disabled="true"]), [aria-busy="true"], ${SHOWING}) { box-shadow:`);
    // No grey rule for a kit button is left without the busy exclusion.
    expect(kit).not.toMatch(/\.b-btn:is\(:disabled, \[aria-disabled="true"\]\) \{/);
  });
  it('the corp and quiet buttons follow the same rule', () => {
    expect(css('app/app/b-foundation.css')).toContain(`html body .app-shell[data-nv-b] :is(.b-btn, .c-btn, .q-btn, .q-bs, .wc-btn):is(:disabled, [aria-disabled="true"])${BUSY} {\n    opacity: 1 !important; background-color: var(--b-disabled-bg) !important;`);
    expect(css('app/app/b-foundation.css')).toContain(`:is(.c-btn, .q-btn, .q-bs, .wc-btn):is(:disabled, [aria-disabled="true"])${BUSY} {`);
    expect(css('components/corp/corp.css')).toContain(`.c-btn:disabled${BUSY}, :is(#c-root, html) .c-btn[aria-disabled="true"]${BUSY} { background: var(--c-neutral-bg);`);
    expect(css('app/app/owner-b-desktop.css')).toContain(`:is(.q-btn, .c-btn, .wc-btn):is(:disabled, [aria-disabled="true"])${BUSY}:not(header.c-title *) {`);
    expect(css('components/clocker-owner-b.css')).toContain(`.ck-owner .b-btn.ck-text:is(:disabled, [aria-disabled="true"])${BUSY}:not(#ck1)`);
    expect(css('components/employee-b/time.css')).toContain(`.c-avail__form > .c-btn:is(:disabled, [aria-disabled="true"])${BUSY} {`);
    expect(css('components/employee-b/requests.css')).toContain(`.c-btn.c-btn.c-btn:is(:disabled, [aria-disabled="true"])${BUSY} { background: var(--b-disabled-bg) !important;`);
  });
});

describe('reduced motion on buttons (Nov 25)', () => {
  it('under reduced motion a button transitions colour only, with no scale or transform', () => {
    const sheet = css('app/app/b-foundation.css');
    const at = sheet.indexOf('@media (prefers-reduced-motion: reduce) {\n  :is(#c-root, html) body .app-shell[data-nv-b] :is(.b-btn, .c-btn, .q-btn, .q-bs, .wc-btn, .nv-btn) { transition-property: background-color, color; }');
    expect(at).toBeGreaterThan(0);
    // It comes after the shared list that names scale, so it wins at the same specificity.
    expect(at).toBeGreaterThan(sheet.indexOf('{ transition-property: scale, background-color, color;'));
    const block = sheet.slice(at, sheet.indexOf('\n}', at));
    expect(block).not.toMatch(/scale|transform|::/);
  });
});
