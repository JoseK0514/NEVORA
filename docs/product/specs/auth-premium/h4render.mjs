import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('./html/', import.meta.url).pathname, out = new URL('./png/', import.meta.url).pathname;
const b = await chromium.launch();
for (const [f, w, h, full] of [['h4-phone-390', 390, 844, true], ['h4-desk-1440', 1440, 960, false]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 }); await p.goto('file://' + dir + f + '.html'); await p.waitForTimeout(300);
  await p.screenshot({ path: out + f + '.png', fullPage: full }); await p.close(); }
await b.close(); console.log('rendered');
