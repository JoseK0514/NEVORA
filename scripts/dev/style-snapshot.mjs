#!/usr/bin/env node
// Dev-only: computed-style snapshot of NEVORA pages on the owned fictional
// runtime (DESIGN.MD U10). Not part of the build, not wired to any npm script,
// and it refuses to run in production or against anything but a loopback host.
//
// Usage:
//   node scripts/dev/style-snapshot.mjs --evidence <runtime evidence dir> --out <dir>
//     [--plan plan.json] [--widths 1440,390] [--keys selector|index] [--geometry]
//     [--shots] [--engine chromium|webkit]
//
// <runtime evidence dir> holds the owned runtime's access.json (url, demoAccounts,
// password). The password is read, used to sign in, and never printed.
//
// A plan is a JSON array of views: { "role": "owner" | null, "path": "/app",
//   "name"?: "key", "widths"?: [1440], "scope"?: ["css selector", …],
//   "steps"?: [ { "block": "/api/manager/finder" } | { "offline": true }
//              | { "click": "sel" } | { "fill": ["sel", "text"] }
//              | { "press": "Meta+K" } | { "select": ["Label", "value"] }
//              | { "wait": 300 } | { "waitFor": "sel" } ] }
// "block" and "offline" steps apply before the page loads. "scope" limits the
// snapshot to those elements and their descendants (default: the whole body).
// Without --plan, the U10 plan runs: owner, employee, both payroll roles and
// sign-in, at 1440 and 390.
//
// Element keys: with --keys selector (default), each element is keyed by its
// path of tag#id.classes, with an :n suffix only when siblings share that
// signature, so moving an element among differently-classed siblings keeps
// its key. --keys index reproduces the original U10 positional keys.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PROPS = ['display', 'position', 'color', 'background-color', 'background-image', 'border-top-color', 'border-top-width', 'border-left-color', 'border-left-width', 'border-radius', 'font-size', 'font-weight', 'font-family', 'line-height', 'letter-spacing', 'text-transform', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap', 'opacity', 'box-shadow', 'visibility', 'grid-template-columns', 'flex-direction', 'align-items', 'justify-content', 'text-align', 'outline-style', 'width', 'height', 'overflow-x', 'white-space'];

const MGMT = ['/app?view=attendance', '/app?view=schedule', '/app?view=team', '/app?view=requests', '/app?view=activity', '/app/schedule', '/app/schedule/new', '/app/schedule/coverage', '/app/schedule/templates', '/app/schedule/settings', '/app/availability', '/app/exchange', '/app/requests', '/app/updates', '/app/updates/compose', '/app/employees', '/app/employees/new', '/app/employees/AUDIT-E', '/app/timecards', '/app/reports', '/app/payroll-export', '/app/notifications', '/app/clocker-recovery', '/app/account-recovery'];
const OWNER = [...MGMT, '/app/inbox', '/app/settings', '/app/settings/workspace', '/app/settings/locations', '/app/settings/positions', '/app/settings/breaks', '/app/settings/clocker', '/app/settings/company-policies'];
const STAFF = ['/app', '/app/schedule', '/app/my-time', '/app/requests/hub', '/app/availability', '/app/updates', '/app/notifications', '/app/profile', '/app/exchange/swap', '/app/exchange/callout', '/app/my-pay', '/app/timecards'];
const U10_PLAN = [['owner', OWNER], ['employee', STAFF], ['payrollOwner', ['/app/payroll', '/app/settings/payroll', '/app/my-pay']], ['payrollEmployee', ['/app/my-pay']], [null, ['/login']]]
  .flatMap(([role, paths]) => paths.map(path => ({ role, path })));

function args(argv) {
  const out = { widths: '1440,390', keys: 'selector', engine: 'chromium' };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (['geometry', 'shots'].includes(name)) out[name] = true;
    else out[name] = argv[++i];
  }
  return out;
}

export function guard(url) {
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.NEXT_PHASE) throw Error('style-snapshot is a dev-only tool and does not run in production or in a build.');
  const host = new URL(url).hostname;
  if (!['127.0.0.1', 'localhost', '[::1]', '::1'].includes(host)) throw Error('style-snapshot only runs against the owned local runtime (loopback host).');
}

/** Runs in the page: computed styles keyed by element path. */
function collect({ PROPS, scope, keys, geometry }) {
  const out = {};
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + [...el.classList].map(c => '.' + c).join('');
  const walk = (el, path) => {
    const s = getComputedStyle(el);
    if (s.display === 'none') { out[path] = 'none'; return; }
    const values = PROPS.map(k => {
      let x = s.getPropertyValue(k);
      if (k === 'width' || k === 'height') { const n = parseFloat(x); x = isNaN(n) ? x : String(Math.round(n)); }
      if (k === 'background-image' && x.length > 80) x = x.slice(0, 80);
      if (k === 'font-family') x = x.split(',')[0];
      return x;
    });
    if (geometry) { const r = el.getBoundingClientRect(); values.push(String(Math.round(r.left)), String(Math.round(r.top + scrollY))); }
    out[path] = values.join('|');
    const children = [...el.children].filter(ch => !['SCRIPT', 'STYLE', 'svg'].includes(ch.tagName));
    const seen = {};
    children.forEach((ch, i) => {
      let part;
      if (keys === 'index') part = ch.tagName.toLowerCase() + (ch.id ? '#' + ch.id : '') + ':' + i;
      else { const base = sig(ch), n = seen[base] = (seen[base] ?? -1) + 1; part = n ? base + ':' + n : base; }
      walk(ch, path + '>' + part);
    });
  };
  const roots = scope?.length ? scope.flatMap(sel => [...document.querySelectorAll(sel)].map((el, i) => [el, sel + (i ? ':' + i : '')])) : [[document.body, 'body']];
  for (const [el, key] of roots) walk(el, key);
  return out;
}

async function main() {
  const opt = args(process.argv.slice(2));
  if (!opt.evidence || !opt.out) throw Error('Usage: --evidence <runtime evidence dir> --out <dir> [--plan plan.json]');
  const access = JSON.parse(readFileSync(join(opt.evidence, 'access.json'), 'utf8'));
  guard(access.url);
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
  const engine = runtime('playwright')[opt.engine];
  const plan = opt.plan ? JSON.parse(readFileSync(opt.plan, 'utf8')) : U10_PLAN;
  const defaultWidths = opt.widths.split(',').map(Number);
  mkdirSync(opt.out, { recursive: true });
  const browser = await engine.launch({ headless: true });
  let pages = 0, failures = 0;
  // One signed-in context per role and width.
  const groups = new Map();
  for (const view of plan) for (const w of view.widths ?? defaultWidths) {
    const id = (view.role ?? 'anon') + '@' + w;
    if (!groups.has(id)) groups.set(id, { role: view.role ?? null, w, views: [] });
    groups.get(id).views.push(view);
  }
  try {
    for (const { role, w, views } of groups.values()) {
      const context = await browser.newContext({ viewport: { width: w, height: w < 600 ? 844 : 1000 }, isMobile: w < 600 && opt.engine === 'chromium', hasTouch: w < 1024, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.route('**/*', r => { const u = new URL(r.request().url()); return ['http:', 'https:'].includes(u.protocol) && u.origin !== access.url ? r.abort() : r.continue(); });
      if (role) {
        const login = await context.newPage();
        await login.goto(access.url + '/login');
        await login.getByLabel('Employee ID', { exact: true }).fill(access.demoAccounts[role]);
        await login.getByLabel('Password', { exact: true }).fill(access.password);
        await Promise.all([login.waitForURL(u => u.pathname.startsWith('/app'), { timeout: 60000 }), login.getByRole('button', { name: 'Sign In', exact: true }).click()]);
        await login.close();
      }
      for (const view of views) {
        const page = await context.newPage();
        const key = view.name ? `${view.name}-${w}` : `${role ?? 'anon'}-${w}-${view.path.replace(/[^a-z0-9]+/gi, '_')}`;
        try {
          for (const step of view.steps ?? []) {
            if (step.block) await page.route('**' + step.block + '**', r => r.fulfill({ status: 503, contentType: 'application/json', body: '{"state":"unavailable"}' }));
            if (step.offline) await page.addInitScript(() => { Object.defineProperty(navigator, 'onLine', { get: () => false }); });
          }
          await page.goto(access.url + view.path, { waitUntil: 'load', timeout: 60000 });
          await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(1200);
          for (const step of view.steps ?? []) {
            if (step.click) await page.locator(step.click).first().click();
            if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
            if (step.press) await page.keyboard.press(step.press);
            if (step.select) await page.getByLabel(step.select[0], { exact: true }).selectOption(step.select[1]);
            if (step.waitFor) await page.locator(step.waitFor).first().waitFor();
            if (step.wait) await page.waitForTimeout(step.wait);
          }
          const styles = await page.evaluate(collect, { PROPS, scope: view.scope, keys: opt.keys, geometry: !!opt.geometry });
          writeFileSync(join(opt.out, key + '.json'), JSON.stringify({ meta: { path: view.path, role, width: w, engine: opt.engine, keys: opt.keys, geometry: !!opt.geometry, props: PROPS.length }, styles }));
          if (opt.shots) {
            const mask = [page.locator('time'), page.locator('[data-home-updated]'), page.locator('[class*="countdown"]'), page.locator('.mws-hours')];
            await page.screenshot({ path: join(opt.out, key + '.png'), fullPage: !view.scope, animations: 'disabled', mask, maskColor: '#FF00FF', style: 'nextjs-portal { display: none !important; }' });
          }
          pages++;
        } catch (error) { failures++; console.log('fail', key, String(error?.message ?? error).slice(0, 160)); }
        finally { await page.close(); }
      }
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(JSON.stringify({ snapshots: pages, failures, out: opt.out }));
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(String(error?.message ?? error)); process.exitCode = 1; });
}
