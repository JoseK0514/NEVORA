import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
await p.goto('file://' + new URL('./html/e4-desk-signin-1440.html', import.meta.url).pathname); await p.waitForTimeout(400);
await p.screenshot({ path: '/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/grain.png', clip: { x: 1100, y: 40, width: 260, height: 160 } }); await b.close();
