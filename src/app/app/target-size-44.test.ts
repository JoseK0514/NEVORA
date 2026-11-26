import { readFileSync } from 'node:fs';
import { describe, expect, it } from '@rstest/core';

// Target size (Nov 23, 2026): the three controls the Z2 phone sweep measured under 44px at 320.
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const mediaBefore = (css: string, at: number) => css.slice(0, at).match(/@media [^{]*\{/g)?.at(-1);

describe('44px targets on narrow phones', () => {
  it('anchors the Spanish PIN and recovery back-link hit area to the link itself', () => {
    const css = read('./owner-b-pages.css');
    const rule = 'html:lang(es) body .app-shell[data-nv-b] .q-page:is(.ck-pin, .wc-recovery) > .q-nav > .q-nav__l';
    const at = css.indexOf(rule);
    expect(at).toBeGreaterThan(-1);
    expect(mediaBefore(css, at)).toBe('@media (max-width: 767px) {');
    expect(css.slice(at, css.indexOf('}', at))).toMatch(/position: relative !important;\s*inset: auto !important;/);
  });

  it('lets a hero tab clip its label but not its 4px hit area below 360px (C12, E1)', () => {
    const css = read('./owner-b-pages.css');
    const at = css.indexOf('overflow: clip !important; overflow-clip-margin: var(--b-seg-pad) !important; text-overflow: ellipsis !important');
    expect(at).toBeGreaterThan(-1);
    expect(mediaBefore(css, at)).toBe('@media (max-width: 359px) {');
    expect(css).not.toMatch(/min-width: 0 !important; overflow: hidden !important; text-overflow: ellipsis/);
  });

  it('keeps every segment of a three-or-more track at least 44px wide below 360px (B4 All)', () => {
    const css = read('./b-foundation.css');
    const rule = ':is(.b-seg, .q-seg, .c-seg):not([data-slide]):has(> :nth-child(3)) > :is(a, button) { flex: 1 1 auto !important; min-width: 44px !important;';
    const at = css.indexOf(rule);
    expect(at).toBeGreaterThan(-1);
    expect(mediaBefore(css, at)).toBe('@media (max-width: 359px) {');
  });

  it('gives the drawn 40px show-password eye a 44px hit ring (I6)', () => {
    const css = read('../../components/employee-b/account.css');
    expect(css).toMatch(/\.eb-delete-keep \.em-delete-eye \{ width: 40px; height: 40px;/);
    expect(css).toMatch(/\.eb-delete-keep \.em-delete-eye::after \{ content: ""; position: absolute; inset: -2px; border-radius: inherit; \}/);
  });
});

describe('Spanish account deletion targets', () => {
  const css = read('../../components/employee-b/account.css');

  it('keeps a full tap target centred on the native confirmation checkbox', () => {
    const ring = css.match(/html:not\(\.nv-any-lang\) \.em-delete \.em-delete-check input::after\s*\{([^}]+)\}/)?.[1];
    expect(ring).toContain('width: var(--b-btn-h)');
    expect(ring).toContain('height: var(--b-btn-h)');
    expect(ring).toContain('transform: translate(-50%, -50%)');
  });

  it('gives the contact address continuous reach when it wraps', () => {
    expect(css).toMatch(/html:not\(\.nv-any-lang\) \.em-delete \.em-delete-link\s*\{[^}]*display: inline-block;[^}]*max-inline-size: 100%/);
    expect(css).toMatch(/html:not\(\.nv-any-lang\) \.em-delete \.em-delete-link::after\s*\{[^}]*inset-block: min\(0px, calc\(\(100% - var\(--b-btn-h\)\) \/ 2\)\)/);
  });
});
