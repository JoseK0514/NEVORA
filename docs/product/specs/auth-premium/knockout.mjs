import { chromium } from '/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs';
import { writeFileSync, readFileSync } from 'node:fs';
const src = readFileSync(new URL('../../../../public/images/nevora-wordmark.png', import.meta.url)).toString('base64');
const b = await chromium.launch(); const p = await b.newPage();
const data = await p.evaluate(async (src) => { const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, c.width, c.height); for (let i = 0; i < d.data.length; i += 4) { const l = (d.data[i] * .299 + d.data[i + 1] * .587 + d.data[i + 2] * .114); const a = Math.max(0, Math.min(255, (235 - l) * 255 / 200)); d.data[i] = d.data[i + 1] = d.data[i + 2] = 255; d.data[i + 3] = a; } x.putImageData(d, 0, 0); return c.toDataURL('image/png').split(',')[1]; }, src);
writeFileSync(new URL('./wordmark-white.png', import.meta.url), Buffer.from(data, 'base64')); await b.close(); console.log('ok');
