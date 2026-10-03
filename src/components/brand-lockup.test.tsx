import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { BrandLockup } from './brand-lockup';

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

it('renders the offline identity from the same primitive with self-contained public artwork', () => {
  let markup = renderToStaticMarkup(<BrandLockup variant="large" offline />);
  const page = readFileSync('public/fuel-portal-offline.html', 'utf8');
  expect(markup).toContain('/icons/fuel-192.png');
  expect(markup).not.toContain('/_next/image');
  for (const source of ['/icons/fuel-192.png', '/images/nevora-wordmark.png']) {
    const data = readFileSync(`public${source}`).toString('base64');
    markup = markup.replaceAll(`href="${source}"`, `href="data:image/png;base64,${data}"`);
    expect(page).not.toContain(`href="${source}"`);
  }
  expect(page).toContain(markup);
});
