import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { BrandLockup } from './brand-lockup';
import { BrandWordmark } from './brand-mark';

vi.mock('next/image', () => ({ default: () => null }));

it.each(['compact', 'standard', 'large'] as const)('keeps %s brand identity in one icon and aligned text primitive', variant => {
  const html = renderToStaticMarkup(<BrandLockup variant={variant} />);
  expect(html).toContain(`brand-lockup--${variant}`);
  expect(html).toMatch(/brand-mark[^]*brand-lockup-copy[^]*brand-wordmark[^]*brand-lockup-module[^]*Workforce/);
  expect(html).toContain('aria-label="NEVORA"');
  expect(html).toContain('/images/nevora-wordmark.png');
  expect(html).toContain('viewBox="5 4 895 112"');
  expect(html).toContain('<mask');
  expect(html).toContain('brand-wordmark-cyan');
});

it('gives independently rendered wordmarks unique local mask identities', () => {
  const html = renderToStaticMarkup(<><BrandLockup tone="dark" /><BrandLockup /></>);
  const masks = [...html.matchAll(/<mask id="([^"]+)"/g)].map(match => match[1]);
  expect(masks).toHaveLength(2);
  expect(new Set(masks).size).toBe(2);
  expect(html).toContain('data-tone="dark"');
});

it('does not load coffee imagery as a product background', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  expect(css).not.toMatch(/fuel-login-cafe\.jpg|dashboard-hero-art\.svg|dashboard-beans-art\.svg/);
});

it('renders the offline identity from the same wordmark primitive with self-contained public artwork, without the flame', () => {
  // Owner premium P11: the offline page shows the NEVORA wordmark with Workforce under it (no flame mark).
  const ids = (html: string) => html.replace(/nevora-(cutout|ink|cyan)-[A-Za-z0-9_-]+/g, 'nevora-$1-id');
  let markup = renderToStaticMarkup(<BrandWordmark />);
  const page = readFileSync('public/fuel-portal-offline.html', 'utf8');
  const data = readFileSync('public/images/nevora-wordmark.png').toString('base64');
  markup = markup.replaceAll('href="/images/nevora-wordmark.png"', `href="data:image/png;base64,${data}"`);
  expect(page).not.toContain('href="/images/nevora-wordmark.png"');
  expect(ids(page)).toContain(ids(markup));
  expect(page).toContain('Workforce');
  expect(page).not.toMatch(/fuel-192|brand-mark|nevora-icon/);
});
