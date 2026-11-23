// Final fixes K (Nov 23, 2026): the kit's text grows with the reader's text size. Each size below is in rem with the same
// pixels at a 16px root (pixel-identical at 100%), so a band title, a nav title, a pill, a chip or a segment label doubles
// at 200% text instead of staying put.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');

describe('kit text in rem', () => {
  it('titles: the corp phone and nav titles and the band h1', () => {
    const corp = css('components/corp/corp.css');
    expect(corp).toContain(':is(#c-root, html) .c-title h1, :is(#c-root, html) .c-nav__title, :is(#c-root, html) .c-skel__title { font-size: 1.75rem; line-height: 2.125rem;');
    expect(corp).toContain('.c-nav__title { max-width: none; text-align: left; font-size: 1.375rem; line-height: 1.75rem;');
    expect(corp).toMatch(/\.c-nav__title \{[^}]*font-size: 1\.0625rem; line-height: 1\.375rem;/);
    const desk = css('app/app/owner-b-desktop.css');
    expect(desk).toContain(':is(.c-page > header.c-title, .q-page > .q-hd) h1 { font-size: 2rem !important; line-height: 2.375rem !important;');
    expect(desk).not.toMatch(/h1 \{ font-size: 32px/);
    expect(css('components/owner-b/owner-b.css')).toContain('.b-title--big h1 { font-size: 2.125rem; line-height: 2.5rem; }');
  });
  it('pills and chips: 12/16 or 13/18 at 100%, and the pill grows past 22px with its text', () => {
    expect(css('components/corp/corp.css')).toMatch(/:is\(#c-root, html\) \.c-pill \{[^}]*height: max\(22px, 1\.375rem\);[^}]*font-size: 0\.8125rem; line-height: 1\.125rem;/);
    for (const sheet of ['app/app/owner-b-desktop.css', 'app/app/owner-b-pages.css']) {
      expect(css(sheet)).toContain('.c-pill:not(.b-status) { height: max(var(--b-chip-h), 1.375rem) !important; border-radius: var(--b-radius-pill) !important; font-size: 0.75rem !important; line-height: 1rem !important;');
      expect(css(sheet)).not.toMatch(/\.c-pill:not\(\.b-status\) \{[^}]*font-size: var\(--b-fs-count\)/);
    }
  });
  it('segment labels grow up to 20px', () => {
    expect(css('app/b-tokens.css')).toContain('--b-seg-fs: min(0.875rem, 20px);');
  });
});

describe('phone band titles in rem', () => {
  it('the shared phone nav title and the quiet page titles are 28/34px at 100% and grow with text', () => {
    for (const sheet of ['app/app/owner-b-pages.css', 'app/app/b-foundation.css']) {
      expect(css(sheet)).not.toContain('font: 700 28px/34px');
      expect(css(sheet)).toContain('font: 700 1.75rem/2.125rem Inter');
    }
  });
});
