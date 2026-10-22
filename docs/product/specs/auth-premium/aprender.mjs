import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('./html/', import.meta.url).pathname, out = new URL('./png/', import.meta.url).pathname;
const b = await chromium.launch();
for (const f of ['ap-schedule', 'ap-mytime', 'ap-requests', 'ap-pay', 'ap-notifications', 'ap-profile', 'ap-more']) {
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await p.goto('file://' + dir + f + '.html'); await p.waitForTimeout(300);
  await p.screenshot({ path: out + f + '.png', fullPage: f !== 'ap-more' }); await p.close(); }
await b.close(); console.log('rendered');
