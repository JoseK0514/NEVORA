import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('.', import.meta.url).pathname;
const b = await chromium.launch();
const names = ['p6-schedule', 'p6-requests', 'p6-pay', 'p6-mytime', 'p6-notifications', 'p6-profile', 'p6-more'];
for (const n of names) { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await p.goto(`file://${dir}${n}.html`); await p.screenshot({ path: `${dir}${n}.png`, fullPage: true }); await p.close(); }
const p = await b.newPage({ viewport: { width: 1780, height: 900 }, deviceScaleFactor: 1 }); await p.goto(`file://${dir}p6-board.html`); await p.screenshot({ path: `${dir}p6-board.png`, fullPage: true });
await b.close(); console.log('rendered');
