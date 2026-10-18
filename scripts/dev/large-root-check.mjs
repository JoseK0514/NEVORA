#!/usr/bin/env node
// Dev-only: large-text check for phone pages on the owned fictional runtime
// (phone foundations, slice 0 helper; checks A.5 and A.6). Not part of the
// build, not wired to any npm script, and it refuses to run in production or
// against anything but a loopback host (same guard as style-snapshot.mjs).
//
// Usage:
//   node scripts/dev/large-root-check.mjs --evidence <runtime evidence dir> --out <dir>
//     [--plan plan.json] [--root 200%] [--width 390] [--mode css|browser]
//     [--engine chromium|webkit] [--shots] [--tabs 12]
//
// --root sets the root font size. --mode css (default) puts it on <html>
// before the page's own scripts run; --mode browser sets the browser's
// default font size instead (Chromium only, through DevTools), which is what a
// raised "default font size" setting does. The page is never changed for real
// users; this is a test lever only.
//
// Each view is loaded twice, at the default root and at the large root, and
// the report lists, per view: sideways scroll, text that clips at the large
// root but not at the default, page targets that overlap or drop under 44px at
// the large root but not at the default (the fixed header and tab bar are left
// out: content scrolls under them by design), the focus ring position against
// the sticky header and tab bar for the first --tabs focus stops, and the tab
// bar labels (size, lines).
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { guard } from './style-snapshot.mjs';

function args(argv) {
  const out = { root: '200%', width: '390', mode: 'css', engine: 'chromium', tabs: '12' };
  for (let i = 0; i < argv.length; i++) {
    const name = argv[i].replace(/^--/, '');
    if (name === 'shots') out.shots = true; else out[name] = argv[++i];
  }
  return out;
}

/** Runs in the page. */
function measure(width) {
  // Mobile emulation widens the layout viewport to fit wide content, so innerWidth can't be the yardstick:
  // measure against the width the view was opened at.
  const W = width;
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[hidden], details:not([open]) > :not(summary), [popover]:not(:popover-open), dialog:not([open])'); };
  const key = e => { const parts = []; for (let n = e; n && n !== document.body; n = n.parentElement) { const i = n.parentElement ? [...n.parentElement.children].indexOf(n) : 0; parts.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + ':' + i); } return parts.join('>'); };
  const desc = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 2).map(c => '.' + c).join('') + ' "' + (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + '"';
  const clipped = {};
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || !e.textContent.trim()) continue;
    const s = getComputedStyle(e);
    if (!['hidden', 'clip'].includes(s.overflowX) && !['hidden', 'clip'].includes(s.overflowY)) continue;
    if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) clipped[key(e)] = desc(e) + ` ${e.scrollWidth}/${e.clientWidth} x ${e.scrollHeight}/${e.clientHeight}`;
  }
  // Content past the right edge of the viewport, outside a sideways scroller (a clipped page hides it).
  const scroller = e => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if (o === 'auto' || o === 'scroll') return true; } return false; };
  const pastEdge = {};
  for (const e of document.querySelectorAll('body *')) {
    if (!vis(e) || e.closest('nextjs-portal')) continue;
    const r = e.getBoundingClientRect();
    if (r.right > W + 1 && r.left < W && !scroller(e) && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) pastEdge[key(e)] = desc(e) + ` right ${Math.round(r.right)}`;
  }
  const targets = [...document.querySelectorAll('a[href], button, summary, input:not([type="hidden"]), select, textarea, [role="button"], [tabindex="0"]')].filter(vis).filter(e => !e.closest('.sr-only'));
  const fixedChrome = e => !!e.closest('.mobile-header, .mobile-nav, nextjs-portal');
  const boxes = targets.filter(e => !fixedChrome(e)).map(e => ({ e, r: e.getBoundingClientRect() }));
  const small = boxes.filter(({ e, r }) => r.height < 43.5 && !['checkbox', 'radio'].includes(e.type) && !e.closest('p, li > span, td') ).map(({ e, r }) => desc(e) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
  const overlaps = [];
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
    const a = boxes[i], b = boxes[j];
    if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
    const x = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left), y = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
    if (x > 1 && y > 1) overlaps.push(desc(a.e) + ' × ' + desc(b.e));
  }
  const tabs = [...document.querySelectorAll('.mobile-nav .mobile-nav-link')].filter(vis).map(e => {
    const label = e.querySelector('span') || e; const s = getComputedStyle(label); const rg = document.createRange(); rg.selectNodeContents(label);
    return { text: label.textContent.trim(), fontSize: s.fontSize, lines: new Set([...rg.getClientRects()].filter(r => r.width > 0.5).map(r => Math.round(r.top))).size, overflow: label.scrollWidth > label.clientWidth + 1 };
  });
  const header = document.querySelector('.mobile-header'), nav = document.querySelector('.mobile-nav');
  const hr = header && getComputedStyle(header).position !== 'static' && getComputedStyle(header).position !== 'relative' ? header.getBoundingClientRect() : null;
  return {
    viewport: W, layoutViewport: innerWidth, documentWidth: Math.max(document.documentElement.scrollWidth, innerWidth), rootFont: getComputedStyle(document.documentElement).fontSize,
    clipped, pastEdge, small, overlaps: overlaps.slice(0, 40), tabs,
    chrome: { headerBottom: hr ? hr.bottom : null, navTop: nav && vis(nav) ? nav.getBoundingClientRect().top : null },
  };
}

async function focusWalk(page, count) {
  const stops = [];
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  for (let i = 0; i < count; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
    stops.push(await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body || e.closest('nextjs-portal') || e.tagName === 'NEXTJS-PORTAL') return null;
      const r = e.getBoundingClientRect(), s = getComputedStyle(e);
      const header = document.querySelector('.mobile-header'), nav = document.querySelector('.mobile-nav');
      const inChrome = !!e.closest('.mobile-header, .mobile-nav, [popover], dialog');
      const hp = header ? getComputedStyle(header).position : 'static';
      const headerBottom = header && (hp === 'sticky' || hp === 'fixed') ? header.getBoundingClientRect().bottom : 0;
      const navTop = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect().top : innerHeight;
      const ring = s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none';
      const off = parseFloat(s.outlineOffset) || 0, w = parseFloat(s.outlineWidth) || 0;
      // WCAG 2.4.11: the focused control is not hidden by the sticky chrome. Its top edge and ring sit below
      // the header, and at least its first 24px (or all of it, if shorter) show above the tab bar.
      const clear = inChrome || (r.top - off - w >= headerBottom - 0.5 && r.top + Math.min(r.height, 24) <= navTop + 0.5);
      return { el: e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.'), text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), ring, clear, inChrome };
    }));
  }
  return stops.filter(Boolean);
}

async function main() {
  const opt = args(process.argv.slice(2));
  if (!opt.evidence || !opt.out) throw Error('Usage: --evidence <runtime evidence dir> --out <dir> [--plan plan.json]');
  const access = JSON.parse(readFileSync(join(opt.evidence, 'access.json'), 'utf8'));
  guard(access.url);
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
  const engine = runtime('playwright')[opt.engine];
  const plan = opt.plan ? JSON.parse(readFileSync(opt.plan, 'utf8')) : [{ role: 'owner', path: '/app' }, { role: 'employee', path: '/app' }];
  const width = Number(opt.width);
  mkdirSync(opt.out, { recursive: true });
  const browser = await engine.launch({ headless: true });
  const report = [];
  const byRole = new Map();
  for (const v of plan) { const k = v.role ?? null; if (!byRole.has(k)) byRole.set(k, []); byRole.get(k).push(v); }
  try {
    for (const [role, views] of byRole) {
      const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: opt.engine === 'chromium', hasTouch: true, serviceWorkers: 'block', reducedMotion: 'reduce' });
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
        const name = view.name ?? `${role ?? 'anon'}-${view.path.replace(/[^a-z0-9]+/gi, '_')}`;
        const run = async large => {
          const page = await context.newPage();
          if (large && opt.mode === 'browser') { const cdp = await context.newCDPSession(page); await cdp.send('Page.setFontSizes', { fontSizes: { standard: Math.round(16 * parseFloat(opt.root) / 100) } }); }
          // css mode: a stylesheet added after hydration (React owns the <html> attributes, so an inline style would be dropped).
          await page.goto(access.url + view.path, { waitUntil: 'load', timeout: 60000 });
          await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
          if (large && opt.mode !== 'browser') { await page.addStyleTag({ content: `html { font-size: ${opt.root} !important; }` }); await page.waitForTimeout(400); }
          await page.evaluate(() => document.fonts.ready);
          await page.waitForTimeout(800);
          for (const step of view.steps ?? []) {
            if (step.click) await page.locator(step.click).first().click();
            if (step.wait) await page.waitForTimeout(step.wait);
          }
          const m = await page.evaluate(measure, width);
          if (large) {
            m.focus = await focusWalk(page, Number(opt.tabs));
            if (opt.shots) await page.screenshot({ path: join(opt.out, name + '.png'), fullPage: true, animations: 'disabled' });
          }
          await page.close();
          return m;
        };
        try {
          const base = await run(false), big = await run(true);
          const newlyClipped = Object.entries(big.clipped).filter(([k]) => !(k in base.clipped)).map(([, v]) => v);
          const newlyPastEdge = Object.entries(big.pastEdge).filter(([k]) => !(k in base.pastEdge)).map(([, v]) => v);
          const r = {
            view: name, path: view.path, role, rootFont: big.rootFont,
            sidewaysScroll: big.documentWidth > big.viewport + 1, documentWidth: big.documentWidth,
            newlyClipped, newlyPastEdge, small: big.small.filter(x => !base.small.includes(x.replace(/ \d+x\d+$/, '')) && !base.small.some(y => y.replace(/ \d+x\d+$/, '') === x.replace(/ \d+x\d+$/, ''))), overlaps: big.overlaps.filter(x => !base.overlaps.includes(x)),
            smallAtDefault: base.small, overlapsAtDefault: base.overlaps, tabs: big.tabs,
            focusHidden: big.focus.filter(f => !f.clear).map(f => f.text || f.el), focusNoRing: big.focus.filter(f => !f.ring).map(f => f.text || f.el),
          };
          r.pass = !r.sidewaysScroll && !newlyClipped.length && !newlyPastEdge.length && !r.small.length && !r.overlaps.length && !r.focusHidden.length && !r.focusNoRing.length;
          report.push(r);
          console.log((r.pass ? 'ok    ' : 'FAIL  ') + name + ' ' + JSON.stringify({ root: r.rootFont, scroll: r.sidewaysScroll, clipped: newlyClipped.length, pastEdge: newlyPastEdge.length, small: r.small.length, overlaps: r.overlaps.length, focusHidden: r.focusHidden.length, noRing: r.focusNoRing.length, tabs: r.tabs.map(t => t.fontSize + '/' + t.lines).join(' ') }));
        } catch (error) { report.push({ view: name, error: String(error?.message ?? error) }); console.log('error ' + name + ' ' + String(error?.message ?? error).slice(0, 160)); }
      }
      await context.close();
    }
  } finally { await browser.close(); }
  writeFileSync(join(opt.out, 'large-root.json'), JSON.stringify(report, null, 1));
  const failed = report.filter(r => !r.pass).length;
  console.log(JSON.stringify({ views: report.length, failed, out: opt.out }));
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => { console.error(String(error?.message ?? error)); process.exitCode = 1; });
}
