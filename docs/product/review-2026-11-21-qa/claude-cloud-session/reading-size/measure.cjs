const { chromium } = require('playwright');
const dir = process.argv[2]; // folder holding compare.html
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 320]) {
    const p = await b.newPage({ viewport: { width: w * 3 + 110, height: 900 }, deviceScaleFactor: 2 });
    await p.goto(`file://${dir}/compare.html?w=${w}`);
    await p.evaluate(() => document.fonts.ready);
    const loaded = await p.evaluate(() => document.fonts.check('400 16px Inter'));
    const m = await p.evaluate(() => [...document.querySelectorAll('.col')].map(c => ({
      v: c.className.split(' ')[1],
      phoneH: Math.round(c.querySelector('.phone').getBoundingClientRect().height),
      items: [...c.querySelectorAll('[data-m]')].map(e => { const cs = getComputedStyle(e); const lh = parseFloat(cs.lineHeight);
        const r = document.createRange(); r.selectNodeContents(e); const lines = new Set([...r.getClientRects()].map(x => Math.round(x.top))).size;
        return { k: e.dataset.m, size: cs.fontSize, lines, cpl: Math.round(e.textContent.length / lines) }; }),
    })));
    console.log(`width ${w} (Inter loaded: ${loaded})`); for (const c of m) console.log(' ', c.v, 'phone height', c.phoneH, JSON.stringify(c.items));
    await p.screenshot({ path: `${dir}/compare-${w}.png`, fullPage: true });
  }
  await b.close();
})();
