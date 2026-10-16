import type { MetadataRoute } from 'next';
import { NUVORA_BRAND } from '../brand';

/** Regular route endpoint: file-based root metadata would also install on Clocker. */
/** `themeColor` follows the company header colour when a brand is set (B1). */
export function manifest(themeColor = '#1C4A47'): MetadataRoute.Manifest {
  return {
    id: '/app', start_url: '/app', scope: '/app',
    name: NUVORA_BRAND.platformLabel, short_name: NUVORA_BRAND.platformLabel,
    display: 'standalone', theme_color: /^#[0-9A-F]{6}$/i.test(themeColor) ? themeColor.toUpperCase() : '#1C4A47', background_color: '#FFFFFF',
    icons: [
      { src: '/icons/fuel-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/fuel-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/fuel-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/fuel-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
