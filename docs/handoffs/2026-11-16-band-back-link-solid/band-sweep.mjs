// Every Owner route at 768 and 1440: rows the new rule paints must sit above a title that paints the band.
import { createRequire } from 'node:module'; import { writeFileSync } from 'node:fs';
const require = createRequire(process.env.PW_FROM + '/'); const { chromium } = require('playwright');
const [base, password, outFile] = process.argv.slice(2);
const routes = `/app /app/ai-manager /app/ai-manager/knowledge /app/ai-manager/weekly /app/availability /app/billing /app/employees /app/employees/import /app/employees/new /app/employees/QA-SCAN-C /app/help /app/inbox /app/more /app/notifications /app/payroll /app/payroll-export /app/payroll/history /app/profile /app/profile/calendar /app/profile/device-alerts /app/profile/passkeys /app/reports /app/requests /app/schedule /app/schedule/coverage /app/schedule/new /app/schedule/publish /app/schedule/settings /app/schedule/templates /app/settings /app/settings/branding /app/settings/breaks /app/settings/clocker /app/settings/clocker/photos /app/settings/clocker/pins /app/settings/company-policies /app/settings/features /app/settings/locations /app/settings/locations/new /app/settings/payroll /app/settings/positions /app/settings/workspace /app/timecards /app/timecards/corrections /app/updates /app/updates/compose /app/account/delete`.split(' ');
const SEL = ['.app-shell[data-nv-b] .c-page:has(> header.c-title) > .c-nav--phone:has(> .c-nav__back)', '.app-shell[data-nv-b] .q-page:has(> .q-hd) > .q-nav', '.app-shell[data-nv-b] .q-page:has(> article > .q-hd) > .q-nav'];
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage();
await p.goto(base + '/login'); await p.locator('#login-employee-id').fill('QAOWNER'); await p.locator('#login-password').fill(password);
await p.getByRole('button', { name: 'Sign in', exact: true }).click(); await p.waitForURL(u => u.pathname.startsWith('/app'));
const out = []; let painted = 0, bad = 0;
for (const w of [768, 1440]) { await p.setViewportSize({ width: w, height: 1000 });
  for (const r of routes) { await p.goto(base + r).catch(() => {}); await p.waitForTimeout(1500);
    const rows = await p.evaluate(SEL => [...document.querySelectorAll(SEL.join(','))].map(row => {
      const page = row.parentElement, title = page.querySelector(':scope > header.c-title, :scope > .q-hd, :scope > article > .q-hd'), ts = title && getComputedStyle(title), rs = getComputedStyle(row);
      return { row: row.className, shown: row.checkVisibility(), bg: rs.backgroundColor, titleBand: ts ? ts.borderImageSource.slice(0, 40) : 'no title', titleBg: ts?.backgroundColor };
    }), SEL);
    for (const x of rows) { if (x.bg === 'rgb(12, 114, 108)') painted++; const ok = !x.shown || x.titleBand.startsWith('linear-gradient'); if (!ok) bad++; out.push({ width: w, route: p.url().replace(base, ''), asked: r, ...x, ok }); }
  } }
writeFileSync(outFile, JSON.stringify(out, null, 1));
console.log(`rows matched ${out.length}, painted solid ${painted}, off-band ${bad}`); for (const x of out) if (!x.ok) console.log('OFF BAND', JSON.stringify(x));
console.log([...new Set(out.filter(x => x.shown).map(x => `${x.asked}`))].join(' '));
await b.close();
