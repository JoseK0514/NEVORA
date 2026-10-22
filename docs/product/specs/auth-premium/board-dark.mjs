import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1900, height: 1000 }, deviceScaleFactor: 1 });
await p.goto('file://' + new URL('./html/board-dark.html', import.meta.url).pathname); await p.waitForTimeout(800);
await p.screenshot({ path: new URL('./png/BOARD-DARK.png', import.meta.url).pathname, fullPage: true }); await b.close(); console.log('board');
