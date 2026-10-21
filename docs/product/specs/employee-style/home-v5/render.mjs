import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch();
const jobs = [['h5-board', 1370, 924], ['h5-a-teal', 390, 844], ['h5-b-white', 390, 844], ['h5-c-dayoff', 390, 844], ['h5-a-teal-long', 390, 844, true]];
for (const [n, w, h, full] of jobs) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto(`file://${dir}${n}.html`);
  await p.screenshot({ path: `${dir}${n}.png`, fullPage: !!full || n === 'h5-board' });
  await p.close();
}
await b.close();
console.log('rendered');
