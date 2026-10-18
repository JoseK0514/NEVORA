import type { MetadataRoute } from 'next';
import { NUVORA_BRAND } from '../brand';
import { ALL_MODULES_ON, pathEnabled, type EnabledModules } from '../workspace-presentation/modules';

/** Android launcher shortcuts (long press on the installed app). One manifest serves
 * every person on the device, so only pages every role can open. iOS ignores them. */
const SHORTCUTS = [
  { name: 'Schedule', url: '/app/schedule', icon: '/icons/shortcut-schedule-96.png' },
  { name: 'Time off', url: '/app/requests', icon: '/icons/shortcut-time-off-96.png' },
] as const;

/** Regular route endpoint: file-based root metadata would also install on Clocker. */
/** `themeColor` follows the company header colour when a brand is set (B1). A module
 * the company turned off (B2) drops its shortcut. */
export function manifest(themeColor = '#1C4A47', modules: EnabledModules = ALL_MODULES_ON): MetadataRoute.Manifest {
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
    shortcuts: SHORTCUTS.filter(shortcut => pathEnabled(shortcut.url, modules)).map(shortcut => ({
      name: shortcut.name, url: shortcut.url,
      icons: [{ src: shortcut.icon, sizes: '96x96', type: 'image/png', purpose: 'any' }],
    })),
  };
}
