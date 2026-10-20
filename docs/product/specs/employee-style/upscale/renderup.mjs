import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('.', import.meta.url).pathname; const b = await chromium.launch();
for (const n of ['up-u1-home', 'up-u1-schedule', 'up-u2-home', 'up-u2-schedule']) { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await p.goto(`file://${dir}${n}.html`); await p.screenshot({ path: `${dir}${n}.png`, fullPage: true }); await p.close(); }
for (const [n, w] of [['up-board', 1760], ['up-refs', 1400]]) { const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 }); await p.goto(`file://${dir}${n}.html`); await p.waitForTimeout(300); await p.screenshot({ path: `${dir}${n}.png`, fullPage: true }); await p.close(); }
await b.close(); console.log('rendered');
