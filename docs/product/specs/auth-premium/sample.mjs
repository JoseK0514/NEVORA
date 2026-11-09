import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { readFileSync } from 'node:fs';
const src = readFileSync(new URL('../../../../public/images/nevora-wordmark.png', import.meta.url)).toString('base64');
const b = await chromium.launch(); const p = await b.newPage();
console.log(await p.evaluate(async (src) => { const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height).data; const cnt = {}; for (let i = 0; i < d.length; i += 4) { const r = d[i], g = d[i+1], bb = d[i+2]; if (bb > 180 && r < 120) { const k = [r, g, bb].map(v => (v >> 3) << 3).join(','); cnt[k] = (cnt[k] || 0) + 1; } if (r < 60 && g < 60 && bb < 90) { const k = 'dark ' + [r, g, bb].map(v => (v >> 3) << 3).join(','); cnt[k] = (cnt[k] || 0) + 1; } } return Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6); }, src));
await b.close();
