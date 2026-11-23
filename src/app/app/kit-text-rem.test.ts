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

describe('band title and its button at 320px', () => {
  it('Payroll and Pay wrap the button under a title that no longer fits beside it (no two-column grid)', () => {
    const sheet = css('app/app/owner-b-time-pay.css').replace(/:not\(#fa\d+\)/g, '');
    const rule = (tail: string) => sheet.match(new RegExp(`\\.c-page\\.c-pay > \\.b-screen \\.b-hero > \\.b-title${tail} \\{([^}]*)\\}`))?.[1] ?? '';
    expect(rule(':has\\(> \\.b-title__right\\)')).toContain('display: flex !important; flex-wrap: wrap !important;');
    expect(rule(':has\\(> \\.b-title__right\\)')).not.toContain('grid-template-columns');
    expect(rule(':has\\(> \\.b-title__right\\) > \\.b-title__text > h1')).toContain('min-width: min-content !important;');
    expect(rule(' > \\.b-title__right')).toContain('order: 1 !important; flex: none !important;');
  });
});

describe('Insights period labels', () => {
  it('grow with text without the 20px cap (14px, and 12.5px under 360px, at 100%)', () => {
    const sheet = css('components/reports-corp.css');
    expect(sheet).toMatch(/\.c-ins \.c-ins__seg(?::not\(#rz\d+\))+ \{ --b-seg-fs: 0\.875rem; \}/);
    expect(sheet).toMatch(/@media \(max-width: 359px\) \{[^{]*\.c-ins \.c-ins__seg(?::not\(#rz\d+\))+ \{ --b-seg-fs: 0\.78125rem; \} \}/);
  });
});

describe('Home band lines in rem (sweep Z)', () => {
  // The band greeting already follows the token (--b-fs-body, rem); the date and place line under the title and the
  // "/3" beside a figure were 14px, so at 200% text they stayed put while the title doubled. Same 14px at 100%.
  it('the date and place line and a figure\'s small part are 0.875rem', () => {
    expect(css('app/app/b-foundation.css')).toMatch(/\.b-hero \.b-date \{[^}]*font-size: 0\.875rem;/);
    expect(css('components/owner-b/owner-b.css')).toContain('.b-live__v small { font-size: 0.875rem; font-weight: 500; }');
    expect(css('app/app/owner-b-desktop.css')).toContain('.b-live__v small { font-size: 0.875rem !important; line-height: 1.4 !important; }');
    expect(css('app/app/employee-b-work.css')).toMatch(/\.b-live__v small \{ font-size: 0\.875rem !important;/);
    expect(css('components/owner-b/owner-b.css')).toMatch(/\.b-eyebrow \{ font-size: var\(--b-fs-body\);/);
    expect(css('app/b-tokens.css')).toContain('--b-fs-body: 0.96875rem;');
  });
});

describe('desktop at 200% text (sweep, Nov 23)', () => {
  it('kit buttons are rem and wrap between words instead of spilling out of their card', () => {
    expect(css('components/owner-b/owner-b.css')).toContain('font-size: 0.875rem; line-height: var(--b-lh-meta); font-weight: 600; white-space: normal; text-align: center; text-wrap: balance;');
    expect(css('components/owner-b/owner-b.css')).toContain('gap: 6px; flex: none; max-width: 100%; min-height: var(--b-btn-h-compact);');
  });
  it('shell and quiet text in rem: sidebar group label, desktop back link, row values, quiet nav and values, Profile band', () => {
    const desk = css('app/app/owner-b-desktop.css');
    expect(desk).toContain('aside.sidebar .sidebar-group-label { font-size: 0.75rem !important;');
    expect(desk).toContain(':is(.c-row__value, .q-rv) { font-size: 0.875rem !important;');
    expect(desk).toContain('.q-who :is(b, strong, h1, h2) { font-size: 2rem !important; line-height: 2.375rem !important;');
    expect(css('app/app/corp-shell.css')).toContain('.sidebar .sidebar-group-label { margin: 16px 12px 4px !important; padding: 0 !important; font: 600 0.8125rem/1.125rem Inter');
    const quiet = css('components/quiet/quiet.css');
    expect(quiet).toContain('.q-nav__l { justify-self: start; display: flex; align-items: center; gap: 4px; min-height: 44px; font-size: 1.0625rem; line-height: 1.375rem; }');
    expect(quiet).toContain('.q-rv { flex: none; max-width: 55%; font-size: 0.9375rem; line-height: 1.25rem;');
    expect(css('app/app/corp-quiet-bridge.css')).toContain('.q-nav__r { font-size: 0.9375rem; line-height: 1.25rem;');
    const prof = css('components/manager-profile/manager-profile-upscale.css');
    expect(prof).toContain('.q-who h1:not(#nvd-none) { font: 700 1.75rem/2.125rem Inter');
    expect(prof).toContain('font-size: 0.875rem !important; line-height: 1.1875rem !important;');
  });
});

describe('sweep follow-up: B7 and C4 at 200% text', () => {
  it('the card meta ("3 of 9"), the desktop shift sheet title and its subtitle line are rem', () => {
    expect(css('components/owner-b/owner-b.css')).toContain('.b-card__meta { font-size: 0.875rem;');
    const desk = css('app/app/owner-b-desktop.css');
    expect(desk).toMatch(/\.c-shift__head \.c-shift__title \{[^}]*font-size: 2rem !important; line-height: 2\.375rem !important;/);
    expect(desk).toMatch(/\.c-shift__titles \.c-shift__sub \{ font-size: var\(--b-fs-body\) !important; line-height: 1\.25rem !important;/);
  });
});

describe('gap closure (Nov 23): Home, kit buttons, skip link, sign-in footer', () => {
  it('full and big buttons, live figures and the ink chip are rem; the ink header wraps', () => {
    const kit = css('components/owner-b/owner-b.css');
    expect(kit).toContain('.b-btn--full { display: flex; width: 100%; min-height: var(--b-btn-h-full); padding: 0 22px; border-radius: var(--b-radius-pill); font-size: 1rem; line-height: 1.375rem; }');
    expect(kit).toContain('.b-btn--big { min-height: var(--b-btn-h-full); padding: 0 22px; border-radius: var(--b-radius-pill); font-size: 1rem; line-height: 1.375rem; font-weight: 600; }');
    expect(kit).toContain('.b-ink__top { display: flex; flex-wrap: wrap;');
    expect(kit).toMatch(/\.b-ink__due \{[^}]*font-size: 0\.75rem;/);
    expect(css('app/app/b-foundation.css')).toContain('--bs-fig-fs: 1.375rem; --bs-fig-lh: 1.75rem;');
    expect(css('app/app/owner-b-desktop.css')).toContain('b-live__v { font-size: var(--bs-fig-fs, 1.75rem) !important; line-height: var(--bs-fig-lh, 2.125rem) !important; }');
  });
  it('the skip link is real text in rem', () => {
    expect(css('app/app/premium-desktop.css')).toContain('font: 600 0.9375rem/1 Inter');
  });
});

describe('corp shell type tokens', () => {
  it('are rem (13–24px at the default size), so the skip link and every token user grow with text', () => {
    const shell = css('app/app/corp-shell.css');
    expect(shell).toContain('--nv-t-label: 600 0.8125rem/1rem var(--nv-font);');
    expect(shell).toContain('--nv-t-title-1: 600 1.5rem/1.875rem var(--nv-font);');
    expect(shell).not.toMatch(/--nv-t-[a-z0-9-]+: \d+ \d+px\//);
  });
});
