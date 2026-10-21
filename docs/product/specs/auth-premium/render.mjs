import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { readdirSync } from 'node:fs';
const dir = new URL('./html/', import.meta.url).pathname; const out = new URL('./png/', import.meta.url).pathname;
const b = await chromium.launch();
for (const f of readdirSync(dir).filter(f => f.endsWith('.html'))) {
  const phone = f.includes('phone'); const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await p.goto('file://' + dir + f); await p.waitForTimeout(400); await p.screenshot({ path: out + f.replace('.html', '.png') }); await p.close(); }
await b.close(); console.log('rendered');
