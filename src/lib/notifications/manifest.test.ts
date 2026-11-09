import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

vi.mock('server-only',()=>({}));
vi.mock('@/components/app-shell', () => ({ AppShell: () => null }));
vi.mock('@/lib/notifications/config', () => import('./config'));
vi.mock('@/lib/auth/session', () => ({ requireSession: vi.fn() }));

it('manifest_preserves_portal_identity', async () => {
  expect(existsSync('src/lib/notifications/manifest.ts')).toBe(true);
  const { manifest } = await import('./manifest');
  const result = manifest();
  expect(result).toMatchObject({ id: '/app', start_url: '/app', scope: '/app', name: 'NEVORA', short_name: 'NEVORA', display: 'standalone', theme_color: '#FFFFFF', background_color: '#FFFFFF' });
  expect(result.icons).toEqual([
    { src: '/icons/fuel-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/fuel-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/fuel-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/fuel-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ]);
  for (const icon of [...result.icons!, { src: '/icons/fuel-apple-180.png', sizes: '180x180' }]) {
    const png = readFileSync(`public${icon.src}`); const [width, height] = icon.sizes!.split('x').map(Number);
    expect(png.subarray(1, 4).toString()).toBe('PNG'); expect(png.readUInt32BE(16)).toBe(width); expect(png.readUInt32BE(20)).toBe(height);
  }
});
it('android shortcuts: Schedule then Time off, inside the app scope, Phosphor PNGs; Time off leaves with its module', async () => {
  const { manifest } = await import('./manifest');
  const result = manifest();
  expect(result.shortcuts).toEqual([
    { name: 'Schedule', url: '/app/schedule', icons: [{ src: '/icons/shortcut-schedule-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' }] },
    { name: 'Time off', url: '/app/requests', icons: [{ src: '/icons/shortcut-time-off-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' }] },
  ]);
  for (const shortcut of result.shortcuts!) {
    expect(shortcut.url === result.scope || shortcut.url.startsWith(`${result.scope}/`)).toBe(true);
    const png = readFileSync(`public${shortcut.icons![0].src}`);
    expect(png.subarray(1, 4).toString()).toBe('PNG'); expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([96, 96]);
  }
  const { ALL_MODULES_ON } = await import('../workspace-presentation/modules');
  expect(manifest('#1C4A47', { ...ALL_MODULES_ON, timeOff: false }).shortcuts!.map(shortcut => shortcut.name)).toEqual(['Schedule']);
});
it('regular public manifest endpoint returns revalidated metadata', async () => {
  expect(existsSync('src/app/fuel-portal.webmanifest/route.ts')).toBe(true);
  const { GET } = await import('../../app/fuel-portal.webmanifest/route'); const response = await GET();
  expect(response.headers.get('content-type')).toContain('application/manifest+json'); expect(response.headers.get('cache-control')).toContain('no-cache'); expect((await response.json()).start_url).toBe('/app');
});
it('portal links manifest and theme without leaking metadata to root or Clocker', async () => {
  const portal = await import('../../app/app/layout');
  expect('metadata' in portal && portal.metadata).toMatchObject({ manifest: '/fuel-portal.webmanifest', appleWebApp: { capable: true, title: 'NEVORA' }, icons: { apple: [{ url: '/icons/fuel-apple-180.png', sizes: '180x180', type: 'image/png' }] } });
  // Owner premium P2: white chrome under the white corporate header.
  expect('generateViewport' in portal && await portal.generateViewport()).toMatchObject({ themeColor: '#FFFFFF' });
  expect(existsSync('src/app/manifest.ts')).toBe(false); expect(existsSync('src/app/manifest.webmanifest')).toBe(false);
  for (const path of ['src/app/layout.tsx', 'src/app/clocker/layout.tsx']) if (existsSync(path)) expect(readFileSync(path, 'utf8')).not.toMatch(/manifest|themeColor|PortalDeviceSetup|fuel-portal-sw/);
});
it('worker and manifest headers forbid stale scripts and MIME sniffing', async () => {
  const { default: config } = await import('../../../next.config');
  const rules = await config.headers?.();
  for (const source of ['/fuel-portal-sw.js', '/fuel-portal.webmanifest']) expect(rules?.find(r => r.source === source)?.headers).toEqual(expect.arrayContaining([{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }, { key: 'X-Content-Type-Options', value: 'nosniff' }]));
});

it('preserves the official NEVORA source and uses its derived compact symbol', () => {
  const original = readFileSync('public/images/nevora.png');
  expect(createHash('sha256').update(original).digest('hex')).toBe('3387a115e3bc8e0d41202ba1ba184b6d3819638396f1136b71a4a4df211d274d');
  const compact = readFileSync('public/images/nevora-icon.png');
  expect(compact.subarray(1, 4).toString()).toBe('PNG');
  expect([compact.readUInt32BE(16), compact.readUInt32BE(20)]).toEqual([512, 512]);
  const mark = readFileSync('src/components/brand-mark.tsx', 'utf8');
  expect(mark).toContain('/images/nevora-icon.png');
  expect(mark).not.toContain('velani-mark.svg');
  expect(mark).toContain('/images/nevora-wordmark.png');
  const wordmark = readFileSync('public/images/nevora-wordmark.png');
  expect([wordmark.readUInt32BE(16), wordmark.readUInt32BE(20)]).toEqual([907, 122]);
});

vi.mock('@/lib/data/workspaces', () => ({getWorkspace:async()=>({name:'Northside Services',timeZone:'America/New_York'})}));
