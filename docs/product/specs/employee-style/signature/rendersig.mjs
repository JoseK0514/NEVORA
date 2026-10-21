import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const dir = new URL('.', import.meta.url).pathname; const b = await chromium.launch();
for (const n of ['sig-home', 'sig-schedule', 'sig-requests', 'sig-pay', 'sig-mytime', 'sig-notifications', 'sig-profile', 'sig-more']) { const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }); await p.goto(`file://${dir}${n}.html`); await p.screenshot({ path: `${dir}${n}.png`, fullPage: true }); await p.close(); }
for (const w of [320]) { const p = await b.newPage({ viewport: { width: w, height: 700 }, deviceScaleFactor: 2 }); for (const n of ['sig-home', 'sig-schedule', 'sig-pay']) { await p.goto(`file://${dir}${n}.html`); await p.addStyleTag({ content: '.ph{width:320px!important}' }); await p.screenshot({ path: `${dir}${n}-320.png`, fullPage: true }); } await p.close(); }
const p = await b.newPage({ viewport: { width: 1780, height: 900 } }); await p.goto(`file://${dir}sig-board.html`); await p.screenshot({ path: `${dir}sig-board.png`, fullPage: true });
await b.close(); console.log('rendered');
