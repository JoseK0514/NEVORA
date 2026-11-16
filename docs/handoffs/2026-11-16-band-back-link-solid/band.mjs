// Band back-link check: screenshot, raw axe (all rules + color-contrast detail), sampled contrast, computed row background,
// link geometry and keyboard focus, for six pages at phone, tablet and desktop widths. Knowledge and weekly APIs MOCKED;
// the reference pages use the local fictional workspace. Usage: node band.mjs <base> <password> <outDir>
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createMock } from './mock.mjs';
import { createWeeklyMock } from './weekly-mock.mjs';
const require = createRequire(process.env.PW_FROM + '/'); const { chromium } = require('playwright');
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [base, password, out] = process.argv.slice(2); mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
const errors = []; p.on('pageerror', e => errors.push(String(e)));
await p.goto(base + '/login'); await p.locator('#login-employee-id').fill('QAOWNER'); await p.locator('#login-password').fill(password);
await p.getByRole('button', { name: 'Sign in', exact: true }).click(); await p.waitForURL(u => u.pathname.startsWith('/app'));
const km = createMock(); const doc = km.seedEntry('document', [{ title: 'Opening procedure', locale: 'en', category: 'operations', body: 'x', publish: true }]);
await ctx.route('**/api/owner/advisor/knowledge**', r => km.handle(r));
const wm = createWeeklyMock({ places: [['loc-1', 'Northside Main Office'], ['loc-2', 'Northside West Office']] });
await ctx.route('**/api/owner/advisor/weekly', r => wm.handle(r));
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, c) => { const [x, y] = [lum(a), lum(c)].sort((m, n) => n - m); return +((x + 0.05) / (y + 0.05)).toFixed(2); };
const pages = [['weekly', '/app/ai-manager/weekly'], ['knowledge', `/app/ai-manager/knowledge?view=entry&doc=${doc.documentId}`], ['company-profile', '/app/settings/workspace'],
  ['person', '/app/employees/QA-SCAN-C'], ['positions', '/app/settings/positions'], ['help', '/app/help']];
const results = [];
for (const w of [320, 390, 768, 1024, 1440]) {
  await p.setViewportSize({ width: w, height: w < 768 ? 844 : 1000 });
  for (const [label, path] of pages) {
    await p.goto(base + path); await p.waitForTimeout(2400); await p.mouse.move(0, w < 768 ? 800 : 990);
    await p.screenshot({ path: `${out}/${label}@${w}.png`, clip: { x: 0, y: 0, width: w, height: w < 768 ? 360 : 340 } });
    await p.addScriptTag({ content: axeSource });
    const r = await p.evaluate(async () => {
      const back = [...document.querySelectorAll('.c-nav__back, .q-nav__l')].find(e => e.checkVisibility());
      const res = await window.axe.run(document, { resultTypes: ['violations'] });
      const violations = res.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target.join(' '), data: n.any[0]?.data ?? null })) }));
      if (!back) return { back: null, violations };
      const row = back.parentElement, rb = back.getBoundingClientRect(), rr = row.getBoundingClientRect();
      return { violations, back: { cls: back.className, text: back.textContent.trim(), color: getComputedStyle(back).color, box: [rb.x, rb.y, rb.width, rb.height].map(Math.round),
        row: row.className, rowBg: getComputedStyle(row).backgroundColor, rowBox: [rr.x, rr.y, rr.width, rr.height].map(Math.round) } };
    });
    let sample = null, focus = null;
    if (r.back) {
      const [x, y, bw, bh] = r.back.box;
      const shot = await p.screenshot({ clip: { x: Math.min(x + bw + 6, w - 2), y: y + bh / 2, width: 1, height: 1 } });
      const px = await p.evaluate(async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return [...x.getImageData(0, 0, 1, 1).data]; }, shot.toString('base64'));
      const bg = px.slice(0, 3), m = r.back.color.match(/[\d.]+/g).map(Number), alpha = m.length > 3 ? m[3] : 1, fg = m.slice(0, 3).map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
      sample = { band: `rgb(${bg})`, text: `rgb(${fg})`, ratio: ratio(fg, bg) };
      // Keyboard: Tab from the top of the document until the back link has focus.
      await p.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await p.locator('body').focus().catch(() => {});
      for (let i = 0; i < 40; i++) { await p.keyboard.press('Tab'); const hit = await p.evaluate(() => document.activeElement?.matches('.c-nav__back, .q-nav__l') && document.activeElement.checkVisibility()); if (hit) { focus = { tabs: i + 1 }; break; } }
      if (focus) { focus.outline = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineWidth} ${s.outlineStyle} ${s.outlineColor} @${s.outlineOffset}`; });
        const [fx, fy, fw, fh] = r.back.box; await p.screenshot({ path: `${out}/${label}@${w}-focus.png`, clip: { x: Math.max(0, fx - 12), y: Math.max(0, fy - 12), width: Math.min(fw + 24, w - Math.max(0, fx - 12)), height: fh + 24 } }); }
    }
    const row = { page: label, width: w, back: r.back, sample, focus, violations: r.violations };
    results.push(row);
    const cc = r.violations.find(v => v.id === 'color-contrast');
    console.log(`${label}@${w}`, r.back ? `row bg ${r.back.rowBg} · link ${r.back.box} · painted ${sample.ratio}:1 · tab ${focus ? focus.tabs + ' ' + focus.outline : 'NOT REACHED'}` : 'no back link',
      '| axe:', r.violations.map(v => `${v.id}(${v.nodes.length})`).join(' ') || 'none', cc ? '| contrast: ' + cc.nodes.map(n => `${n.target} ${n.data?.contrastRatio ?? ''} ${n.data?.fgColor ?? ''}/${n.data?.bgColor ?? ''}`).join(' ; ') : '');
  }
}
writeFileSync(`${out}/results.json`, JSON.stringify({ base: 'local fictional workspace; knowledge and weekly APIs mocked', pageErrors: errors, results }, null, 1));
console.log('page errors:', errors.length); await b.close();
