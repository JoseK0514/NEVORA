// UI audit driver (tools/ui-audit). Started by tools/ui-audit/cli.mjs through vitest.ui-audit.config.mts; not part of
// the unit suite or tsc (an .mts outside scripts/, and not a *.test file). One owned app build per run (production by
// default, at the owned https test origin behind the loopback TLS proxy), the fictional fixtures in fixtures/seed.mts,
// one signed-in session per role reused by every context, then every selected view: role × route × state × width ×
// text size × browser × language. Each view gets a full-page screenshot, the in-page rules (rules/page-rules.js), axe,
// a focus walk, forced colours, console, network and layout-shift checks. Results stream to <out>/views.jsonl; the CLI
// writes report.json, summary.md and pixel diffs from it (report.mjs). Nothing here sends email or SMS, takes a payment
// or presses the billing handoff; outside requests are aborted.
import {it} from '@rstest/core';
import {createRequire} from 'node:module';
import {mkdir, writeFile, appendFile, readFile} from 'node:fs/promises';
import {join, resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOwnedNextApp} from '../../src/test/integration/owned-next-app';
import {OWNED_COLLAB_ORIGIN} from '../../src/test/integration/owned-collab-origin';
import {startOwnedTlsProxy} from '../../src/test/integration/owned-tls-proxy';
import {TEST_PASSWORD} from '../../src/test/integration/owned-app-fixture';
import {seedAudit, type AuditSeed} from './fixtures/seed.mts';
import {ROLES, routesFor, heightFor} from './routes.mjs';
import {INJECTIONS} from './selftest/injections.mjs';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Opts = {roles: string[]; routes: string[]; widths: number[]; text: number[]; browsers: string[]; lang: string[]; build: 'production' | 'dev'; out: string; workers: number; selftest: boolean; focusStops: number; maxViews: number};
type Finding = {rule: string; severity: 'fail' | 'warn' | 'info'; selector: string | null; text: string; rect: number[] | null; data: Record<string, unknown>; crop?: string};

const here = dirname(fileURLToPath(import.meta.url));
const opts: Opts = JSON.parse(process.env.NEVORA_UI_AUDIT_OPTIONS ?? '{}');
const G69 = /due to access control checks/i;

it('NEVORA UI audit', async () => {
  const started = Date.now();
  const out = resolve(opts.out);
  await mkdir(join(out, 'shots'), {recursive: true}); await mkdir(join(out, 'crops'), {recursive: true});
  const viewsFile = join(out, 'views.jsonl');
  await writeFile(viewsFile, '');
  const runtimeRequire = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'));
  const playwright = runtimeRequire('playwright');
  const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
  const axeVersion = JSON.parse(await readFile(join(dirname(axePath), 'package.json'), 'utf8')).version;
  const sharp = createRequire(import.meta.url)('sharp');
  const pageRules = await readFile(join(here, 'rules/page-rules.js'), 'utf8');
  const exceptions = JSON.parse(await readFile(join(here, 'exceptions.json'), 'utf8'));
  const production = opts.build !== 'dev';
  const meta: Record<string, unknown> = {started: new Date(started).toISOString(), options: opts, axeVersion, playwright: runtimeRequire('playwright/package.json').version, build: opts.build};

  const app = await createOwnedNextApp(join(out, 'app'), {
    ...(production ? {production: true, portalHttpsOrigin: OWNED_COLLAB_ORIGIN} : {}),
    payrollEnabled: true, ownerAdvisorEnabled: true, managerAdvisorEnabled: true, ownerAdvisorWeeklyEnabled: true, ownerAdvisorKnowledgeEnabled: true, ownerAdvisorBusinessImportsEnabled: true,
    clockerPunchEnabled: true, clockerPinKey: 'ab'.repeat(32),
  });
  const tls = production ? await startOwnedTlsProxy({[OWNED_COLLAB_ORIGIN]: app.url}) : null;
  const base = production ? OWNED_COLLAB_ORIGIN : app.url.replace('127.0.0.1', 'localhost');
  meta.builtAt = new Date().toISOString(); meta.buildSeconds = Math.round((Date.now() - started) / 1000);
  const browsers: Record<string, any> = {};
  try {
    const seed: AuditSeed = await seedAudit(app.database.executor);
    meta.setupLog = seed.setupLog; meta.ids = seed.ids;
    const fill = (p: string) => p.replace(/\{(\w+)\}/g, (_, k) => seed.ids[k] ?? `{${k}}`);
    const ctxBase = (width: number, extra: Record<string, unknown> = {}) => ({
      viewport: {width, height: heightFor(width)}, deviceScaleFactor: 1, serviceWorkers: 'block', reducedMotion: 'reduce',
      ...(tls ? {proxy: {server: tls.server}, ignoreHTTPSErrors: true} : {}), ...extra,
    });
    for (const name of opts.browsers) browsers[name] = await playwright[name].launch({headless: true});

    // ---- one session per role (avoids the sign-in rate limit) ----
    const sessions: Record<string, unknown> = {};
    const login = async (role: string) => {
      const id = seed.logins[role];
      const context = await browsers[opts.browsers[0]].newContext(ctxBase(1440));
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      if (role === 'clocker') {
        const token = await seed.clockerEnrollment('loc-1');
        await page.goto(base + '/clocker/aud-kiosk-main'); await page.waitForLoadState('networkidle').catch(() => {});
        await page.locator('textarea[name="enrollmentToken"]').fill(token);
        await page.locator('form button[type="submit"]').click();
        await page.locator('[data-clocker-pin="entry"]').waitFor({timeout: 30000});
      } else if (id) {
        await page.goto(base + '/login');
        await page.getByLabel('Employee ID', {exact: true}).fill(id);
        await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
        await page.getByRole('button', {name: 'Sign in', exact: true}).click();
        await page.waitForURL((u: URL) => u.pathname.startsWith('/app'), {timeout: 30000});
      }
      sessions[role] = await context.storageState();
      await context.close();
    };
    const roles = Object.keys(ROLES).filter(r => opts.roles.includes(ROLES[r as keyof typeof ROLES].group));
    for (const role of roles) { try { await login(role); } catch (e) { (meta.setupLog as unknown[]).push(`sign in ${role} failed: ${String((e as Error).message).slice(0, 200)}`); } }

    // ---- the view list ----
    type View = {browser: string; role: string; lang: string; text: number; width: number; path: string; state: string; injection?: string};
    const views: View[] = [];
    const routeMatch = (p: string) => !opts.routes.length || opts.routes.some(r => (r.startsWith('/') ? p.split('?')[0] === r || p === r : p.includes(r)));
    if (opts.selftest) {
      for (const inj of INJECTIONS as any[]) for (const variant of ['clean', 'injected']) views.push({browser: inj.browser ?? 'chromium', role: inj.role ?? 'owner', lang: inj.lang ?? 'en', text: inj.text ?? 100, width: inj.width ?? 390, path: inj.path ?? '/app', state: 'default', injection: variant === 'injected' ? inj.rule : 'clean:' + inj.rule});
    } else {
      for (const browser of opts.browsers) for (const role of roles) for (const lang of opts.lang) for (const text of opts.text) for (const width of opts.widths)
        for (const r of routesFor(role)) if (routeMatch(r.path)) views.push({browser, role, lang, text, width, path: fill(r.path), state: r.state});
    }
    if (opts.maxViews > 0) views.splice(opts.maxViews);
    meta.viewCount = views.length;
    console.log(`[ui-audit] ${views.length} views; build ${meta.buildSeconds}s; roles ${roles.join(',')}`);

    // ---- groups share a context: browser, role, language, text size, input ----
    const groups = new Map<string, View[]>();
    for (const v of views) { const k = [v.browser, v.role, v.lang, v.text, v.width <= 768 ? 'touch' : 'mouse'].join('|'); if (!groups.has(k)) groups.set(k, []); groups.get(k)!.push(v); }
    let done = 0;
    const runGroup = async (key: string, list: View[]) => {
      const [browser, role, lang, text, input] = key.split('|');
      const touch = input === 'touch';
      const state = sessions[role] ?? (ROLES[role as keyof typeof ROLES].group === 'public' ? undefined : null);
      if (state === null) { for (const v of list) await record(v, {skipped: 'no session for role'}); return; }
      const context = await browsers[browser].newContext(ctxBase(list[0].width, {hasTouch: touch, ...(state ? {storageState: state} : {})}));
      await context.addCookies([{name: 'nv-lang', value: lang, url: base}]);
      if (Number(text) !== 100) await context.addInitScript((size: number) => { const add = () => { const s = document.createElement('style'); s.setAttribute('data-ui-audit', 'text'); s.textContent = `html{font-size:${size}% !important}`; document.head.appendChild(s); }; if (document.head) add(); else document.addEventListener('DOMContentLoaded', add); }, Number(text));
      await context.addInitScript(() => { (window as any).__uiaCls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__uiaCls += e.value; }).observe({type: 'layout-shift', buffered: true}); } catch { (window as any).__uiaCls = null; } });
      if (role === 'clocker' && lang === 'es') await context.addInitScript(() => { try { localStorage.setItem('nevora.clocker.locale', 'es'); } catch { /* storage blocked */ } });
      // Outside origins never load: no analytics, payments, maps or mail.
      const aborted = new Set<string>();
      await context.route('**/*', async (route: any) => { const u = new URL(route.request().url()); if (['http:', 'https:'].includes(u.protocol) && u.origin !== base) { aborted.add(u.href); await route.abort('blockedbyclient'); } else await route.continue(); });
      const page = await context.newPage(); page.setDefaultTimeout(20000);
      const consoleLog: {type: string; text: string}[] = [], pageErrors: string[] = [], network: {url: string; status?: number; failure?: string}[] = [];
      page.on('console', (m: any) => { if (['error'].includes(m.type())) consoleLog.push({type: m.type(), text: m.text().slice(0, 400)}); });
      page.on('pageerror', (e: Error) => pageErrors.push(String(e.message).slice(0, 400)));
      page.on('requestfailed', (r: any) => network.push({url: r.url(), failure: r.failure()?.errorText ?? 'failed'}));
      page.on('response', (r: any) => { if (r.status() >= 400) network.push({url: r.url(), status: r.status()}); });
      for (const v of list) {
        consoleLog.length = 0; pageErrors.length = 0; network.length = 0;
        try { await record(v, await audit(page, context, v, touch, aborted, {consoleLog, pageErrors, network})); }
        catch (e) { await record(v, {error: String((e as Error).message).slice(0, 500)}); }
      }
      await context.close();
    };

    const audit = async (page: any, context: any, v: View, touch: boolean, aborted: Set<string>, logs: any) => {
      const t0 = Date.now();
      const slug = `${v.browser}/${v.role}/${v.lang}-${v.text}/${(v.path.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '') || 'root')}${v.state !== 'default' ? '~' + v.state : ''}${v.injection ? '~' + v.injection.replace(/[^a-z0-9]+/gi, '-') : ''}-${v.width}`;
      await page.setViewportSize({width: v.width, height: heightFor(v.width)});
      const routed: string[] = [];
      const intended = new Set<string>();
      if (v.state === 'slow' || v.state === 'failed') {
        await page.route(`${base}/api/**`, async (route: any) => {
          if (route.request().method() !== 'GET') return route.continue();
          intended.add(route.request().url());
          if (v.state === 'slow') { await new Promise(r => setTimeout(r, 3500)); return route.continue().catch(() => {}); }
          return route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: {code: 'ui_audit_unavailable'}})});
        });
        routed.push(`${base}/api/**`);
      }
      const injection = v.injection && !v.injection.startsWith('clean:') ? INJECTIONS.find((x: any) => x.rule === v.injection) : null;
      let response: any = null;
      if (v.state === 'login-error' || v.state === 'login-empty') {
        response = await page.goto(base + v.path, {waitUntil: 'load'});
        if (v.state === 'login-error') { await page.getByLabel(/Employee ID|ID de empleado/).first().fill('NOPE-1'); await page.getByLabel(/^(Password|Contraseña)$/).first().fill('wrong-password-123'); }
        await page.getByRole('button', {name: /^(Sign in|Iniciar sesión|Entrar)$/}).first().click(); await page.waitForTimeout(1500);
      } else {
        response = await page.goto(base + v.path, {waitUntil: 'load', timeout: 45000});
      }
      if (v.state === 'slow') await page.waitForTimeout(3000);
      else await page.waitForLoadState('networkidle', {timeout: 8000}).catch(() => {});
      await page.waitForTimeout(500);
      if (v.state === 'clocker-pin') {
        await page.locator('#clocker-employee-id').fill(seed.ids.clockerJames); await page.locator('#clocker-employee-id').press('Enter');
        await page.locator('[data-clocker-step="pin"]').waitFor({timeout: 15000}).catch(() => {}); await page.waitForTimeout(400);
      }
      if (v.state === 'offline') { await context.setOffline(true); await page.waitForTimeout(1800); }
      if (injection) { await page.evaluate(injection.apply); await page.waitForTimeout(300); }
      const cls = await page.evaluate(() => (window as any).__uiaCls).catch(() => null);
      const shotRel = `shots/${slug}.png`, shotAbs = join(out, shotRel);
      await mkdir(dirname(shotAbs), {recursive: true});
      const shot: Buffer = await page.screenshot({path: shotAbs, fullPage: true});
      const exc = exceptions.filter((x: any) => !x.role || x.role === v.role);
      const {findings, metrics} = await page.evaluate(`(${pageRules})(${JSON.stringify({width: v.width, text: v.text, touch, lang: v.lang, peopleData: seed.peopleData, exceptions: exc})})`) as {findings: Finding[]; metrics: Record<string, unknown>};
      // ---- axe ----
      await page.addScriptTag({path: axePath});
      const axe = await page.evaluate(async () => { const r = await (window as any).axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']}, resultTypes: ['violations']}); return r.violations.map((x: any) => ({id: x.id, impact: x.impact, help: x.help, nodes: x.nodes.slice(0, 8).map((n: any) => ({target: n.target.join(' '), html: n.html.slice(0, 160), data: n.any?.[0]?.data ?? null}))})); });
      const meta2 = await sharp(shot).metadata();
      for (const violation of axe) for (const node of violation.nodes) {
        const box = await page.evaluate((s: string) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return {rect: [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)], color: getComputedStyle(e).color, text: (e.textContent || '').trim().slice(0, 80)}; }, node.target).catch(() => null);
        let severity: Finding['severity'] = ['critical', 'serious'].includes(violation.impact) ? 'fail' : violation.impact === 'moderate' ? 'warn' : 'info';
        const data: Record<string, unknown> = {impact: violation.impact, help: violation.help, html: node.html, axe: node.data};
        if (violation.id === 'color-contrast' && box && box.rect[2] > 0 && box.rect[3] > 0) {
          // Translucent glass: axe cannot see through backdrop-filter. Sample the rendered pixels before reporting.
          const sampled = await sampleContrast(sharp, shot, meta2, box.rect, box.color).catch(() => null);
          data.sampled = sampled;
          const need = Number(node.data?.expectedContrastRatio?.replace?.(':1', '') ?? node.data?.expectedContrastRatio ?? 4.5);
          if (sampled && sampled.ratio >= need) { severity = 'info'; data.glassFalsePositive = true; }
        }
        findings.push({rule: 'axe:' + violation.id, severity, selector: node.target, text: box?.text ?? '', rect: box?.rect ?? null, data});
      }
      // ---- focus walk ----
      findings.push(...await focusWalk(page, v.browser));
      // ---- forced colours: buttons keep a visible edge ----
      await page.emulateMedia({forcedColors: 'active'});
      const forced = await page.evaluate(() => {
        const out: any[] = [];
        for (const e of document.querySelectorAll('button, [role=button], input[type=submit], input[type=button]')) {
          const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || e.closest('[aria-hidden="true"],[hidden]')) continue;
          const s = getComputedStyle(e);
          const edge = ['Top', 'Right', 'Bottom', 'Left'].some(k => parseFloat((s as any)['border' + k + 'Width']) > 0 && (s as any)['border' + k + 'Style'] !== 'none' && !/transparent|rgba\(0, 0, 0, 0\)/.test((s as any)['border' + k + 'Color']));
          const outline = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0;
          if (!edge && !outline && (e.textContent || '').trim()) out.push({text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 60), rect: [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)], html: e.outerHTML.slice(0, 120)});
        }
        return out.slice(0, 20);
      });
      await page.emulateMedia({forcedColors: 'none'});
      for (const x of forced) findings.push({rule: 'forced-colors', severity: 'fail', selector: null, text: x.text, rect: x.rect, data: {html: x.html}});
      // ---- console, page errors, network, layout shift ----
      for (const c of logs.consoleLog) findings.push(G69.test(c.text) && v.browser === 'webkit' ? {rule: 'known-g69', severity: 'info', selector: null, text: c.text, rect: null, data: {}} : {rule: 'console-error', severity: 'fail', selector: null, text: c.text, rect: null, data: {}});
      for (const e of logs.pageErrors) findings.push(G69.test(e) && v.browser === 'webkit' ? {rule: 'known-g69', severity: 'info', selector: null, text: e, rect: null, data: {}} : {rule: 'page-error', severity: 'fail', selector: null, text: e, rect: null, data: {}});
      for (const n of logs.network) {
        if (aborted.has(n.url) || intended.has(n.url)) continue;
        if (n.failure && /ERR_ABORTED|cancelled|NS_BINDING_ABORTED|Load request cancelled/i.test(n.failure)) continue; // navigation-cancelled prefetches
        if (n.failure && G69.test(n.failure)) { findings.push({rule: 'known-g69', severity: 'info', selector: null, text: n.url, rect: null, data: {failure: n.failure}}); continue; }
        if (v.state === 'offline' && n.failure) continue;
        const expected404 = n.status === 404 && /no-such-page|not-a-real/.test(v.path);
        const expectedDenied = v.state === 'denied' && [401, 403, 404].includes(n.status ?? 0);
        if (expected404 || expectedDenied) continue;
        findings.push({rule: 'network', severity: n.failure || (n.status ?? 0) >= 500 ? 'fail' : 'warn', selector: null, text: n.url.replace(base, ''), rect: null, data: {status: n.status ?? null, failure: n.failure ?? null}});
      }
      if (typeof cls === 'number' && cls > 0.1) findings.push({rule: 'cls', severity: 'fail', selector: null, text: `layout shift ${cls.toFixed(3)}`, rect: null, data: {cls}});
      if (v.state === 'offline') await context.setOffline(false);
      for (const r of routed) await page.unroute(r);
      // ---- crops for fails and warnings ----
      let crops = 0;
      for (const f of findings) {
        if (f.severity === 'info' || !f.rect || crops >= 12) continue;
        const [x, y, w, h] = f.rect, pad = 16;
        const left = Math.max(0, x - pad), top = Math.max(0, y - pad);
        const width = Math.min((meta2.width ?? 0) - left, w + pad * 2), height = Math.min((meta2.height ?? 0) - top, h + pad * 2);
        if (width < 4 || height < 4) continue;
        const rel = `crops/${slug}-${crops}-${f.rule.replace(/[^a-z0-9]+/gi, '-')}.png`;
        await mkdir(dirname(join(out, rel)), {recursive: true});
        await sharp(shot).extract({left, top, width: Math.min(width, 1600), height: Math.min(height, 1600)}).toFile(join(out, rel)).then(() => { f.crop = rel; crops++; }).catch(() => {});
      }
      return {status: response?.status() ?? null, finalUrl: page.url().replace(base, ''), title: await page.title().catch(() => ''), h1: await page.locator('h1').first().innerText().catch(() => null), cls, metrics, shot: shotRel, ms: Date.now() - t0, findings};
    };

    const record = async (v: View, result: Record<string, unknown>) => {
      done++;
      await appendFile(viewsFile, JSON.stringify({...v, ...result}) + '\n');
      if (done % 25 === 0 || done === views.length) console.log(`[ui-audit] ${done}/${views.length} views, ${Math.round((Date.now() - started) / 1000)}s`);
    };

    // ---- run: each browser in parallel, `workers` contexts per browser ----
    const byBrowser = new Map<string, [string, View[]][]>();
    for (const [k, list] of groups) { const b = k.split('|')[0]; if (!byBrowser.has(b)) byBrowser.set(b, []); byBrowser.get(b)!.push([k, list]); }
    await Promise.all([...byBrowser.values()].map(async queue => {
      const next = async (): Promise<void> => { const item = queue.shift(); if (!item) return; await runGroup(item[0], item[1]).catch(e => console.log('[ui-audit] group failed', item[0], String(e).slice(0, 300))); return next(); };
      await Promise.all(Array.from({length: Math.max(1, opts.workers)}, () => next()));
    }));
    meta.finished = new Date().toISOString(); meta.seconds = Math.round((Date.now() - started) / 1000);
  } finally {
    await writeFile(join(out, 'meta.json'), JSON.stringify(meta, null, 2));
    for (const b of Object.values(browsers)) await b.close().catch(() => {});
    await tls?.close(); await app.close();
  }
}, 24 * 3600 * 1000);

/** Contrast from rendered pixels: the text colour against the most common other colour inside the element's box. */
async function sampleContrast(sharp: any, png: Buffer, meta: any, rect: number[], color: string) {
  const [x, y, w, h] = rect;
  const left = Math.max(0, x), top = Math.max(0, y), width = Math.min(meta.width - left, w), height = Math.min(meta.height - top, h);
  if (width < 2 || height < 2) return null;
  const {data, info} = await sharp(png).extract({left, top, width, height}).raw().toBuffer({resolveWithObject: true});
  const m = color.match(/rgba?\(([^)]+)\)/); if (!m) return null;
  const fg = m[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
  const counts = new Map<string, {n: number; c: number[]}>();
  for (let i = 0; i < data.length; i += info.channels) {
    const c = [data[i], data[i + 1], data[i + 2]];
    if (Math.abs(c[0] - fg[0]) + Math.abs(c[1] - fg[1]) + Math.abs(c[2] - fg[2]) < 60) continue;
    const k = c.map(v => v >> 3).join(',');
    const e = counts.get(k); if (e) e.n++; else counts.set(k, {n: 1, c});
  }
  const bg = [...counts.values()].sort((a, b) => b.n - a.n)[0]?.c;
  if (!bg) return null;
  const lum = (c: number[]) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const a = lum(fg), b = lum(bg);
  return {fg, bg, ratio: Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100};
}

/** Tab through the page: every stop needs a visible ring, the order should follow the DOM and the screen, no trap. */
async function focusWalk(page: any, browser: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const total = await page.evaluate(() => {
    const ring = (e: Element, pseudo?: string) => { const s = getComputedStyle(e, pseudo); return {o: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, b: s.boxShadow, bc: s.borderColor, op: s.opacity}; };
    const list = [...document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,summary,[tabindex]')].filter(e => e.tabIndex >= 0 && !e.matches(':disabled'));
    (window as any).__uiaBase = new Map(list.map(e => [e, {self: ring(e), before: ring(e, '::before'), after: ring(e, '::after')}]));
    (document.activeElement as HTMLElement | null)?.blur?.(); window.scrollTo(0, 0);
    return list.length;
  });
  const key = browser === 'webkit' ? 'Alt+Tab' : 'Tab';
  const stops: any[] = [];
  const max = Math.min(opts.focusStops || 60, total + 2);
  for (let i = 0; i < max; i++) {
    await page.keyboard.press(key);
    const s = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body || e === document.documentElement) return null;
      const all = [...document.querySelectorAll('*')];
      const r = e.getBoundingClientRect();
      const base = (window as any).__uiaBase.get(e);
      const now = (pseudo?: string) => { const s = getComputedStyle(e, pseudo); return {o: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, b: s.boxShadow, bc: s.borderColor, op: s.opacity, ow: parseFloat(s.outlineWidth), os: s.outlineStyle, oc: s.outlineColor}; };
      const self = now(), before = now('::before'), after = now('::after');
      const visibleOutline = (x: any) => x.os !== 'none' && x.ow >= 2 && !/transparent|rgba\(\d+, \d+, \d+, 0\)/.test(x.oc);
      const shadowGrew = (x: any, b: any) => x.b !== 'none' && x.b !== b.b && /(\d+(\.\d+)?)px/.test(x.b) && Math.max(...[...x.b.matchAll(/(-?\d+(\.\d+)?)px/g)].map((m: any) => Math.abs(parseFloat(m[1])))) >= 2;
      const changed = (x: any, b: any) => !!b && (visibleOutline(x) && x.o !== b.o || shadowGrew(x, b) || (x.bc !== b.bc && x.o !== b.o));
      const ring = visibleOutline(self) || (base ? shadowGrew(self, base.self) || changed(before, base.before) || changed(after, base.after) || changed(self, base.self) : false);
      const label = (e.getAttribute('aria-label') || e.innerText || e.getAttribute('title') || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 60);
      const fixed = (() => { for (let n: HTMLElement | null = e; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true; } return false; })();
      return {index: all.indexOf(e), top: Math.round(r.top + scrollY), left: Math.round(r.left), rect: [Math.round(r.left + scrollX), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)], ring, label, fixed, tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60)};
    });
    if (!s) { if (stops.length) break; else continue; }
    const seen = stops.findIndex(x => x.index === s.index);
    if (seen >= 0) {
      if (stops.length < total - 1) findings.push({rule: 'focus-trap', severity: 'fail', selector: `${s.tag}.${s.cls}`, text: s.label, rect: s.rect, data: {cycle: stops.length - seen, stops: stops.length, tabbable: total}});
      break;
    }
    stops.push(s);
  }
  for (const s of stops) if (!s.ring) findings.push({rule: 'focus-ring', severity: 'fail', selector: `${s.tag}.${s.cls}`, text: s.label, rect: s.rect, data: {}});
  for (let i = 1; i < stops.length; i++) {
    const a = stops[i - 1], b = stops[i];
    if (b.index < a.index) findings.push({rule: 'focus-order', severity: 'warn', selector: `${b.tag}.${b.cls}`, text: b.label, rect: b.rect, data: {kind: 'dom', after: a.label}});
    else if (!a.fixed && !b.fixed && b.top < a.top - 60) findings.push({rule: 'focus-order', severity: 'warn', selector: `${b.tag}.${b.cls}`, text: b.label, rect: b.rect, data: {kind: 'visual', after: a.label, up: a.top - b.top}});
  }
  if (!stops.length && total > 0) findings.push({rule: 'focus-ring', severity: 'warn', selector: null, text: 'no element took focus from the keyboard', rect: null, data: {tabbable: total, key}});
  return findings;
}
