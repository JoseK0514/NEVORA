import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1700, height: 1000 } });
await p.goto('file://' + new URL('./html/refs-home.html', import.meta.url).pathname); await p.waitForTimeout(600);
await p.screenshot({ path: new URL('./png/REFS-HOME.png', import.meta.url).pathname, fullPage: true }); await b.close(); console.log('ok');
