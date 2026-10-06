/** Regenerate only public offline branding from the application primitive.
 * No database, provider, application state or private asset is accessed. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandLockup } from '../src/components/brand-lockup';

const path = fileURLToPath(new URL('../public/fuel-portal-offline.html', import.meta.url));
const start = '<!-- NEVORA_LOCKUP_START -->';
const end = '<!-- NEVORA_LOCKUP_END -->';
const template = readFileSync(path, 'utf8');
const left = template.indexOf(start);
const right = template.indexOf(end);
if (left < 0 || right < left) throw new Error('Offline brand markers are missing');
let markup = renderToStaticMarkup(<BrandLockup variant="large" offline />);
// A fallback cannot rely on root image fetches while fully disconnected.
// Embed only these reviewed public source bytes; leave worker scope unchanged.
for (const source of ['/icons/fuel-192.png', '/images/nevora-wordmark.png']) {
  const image = readFileSync(fileURLToPath(new URL(`../public${source}`, import.meta.url)));
  markup = markup.replaceAll(`href="${source}"`, `href="data:image/png;base64,${image.toString('base64')}"`);
}
writeFileSync(path, template.slice(0, left + start.length) + markup + template.slice(right));
