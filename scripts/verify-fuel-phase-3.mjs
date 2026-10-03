/** Deliberate fictional loopback fixtures only. No auth or provider bypass is
 * installed in production. API/nativePush doubles exercise real client logic;
 * actual service-worker evidence is recorded separately. */
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { matrixPlan, validateOutput, assertMatrixCounts } from './verify-fuel-phase-3-config.mjs';
import { createHash } from 'node:crypto';
const base = process.env.FUEL_PHASE3_BASELINE_URL;
const current = process.env.FUEL_PHASE3_CURRENT_URL;
const output = process.env.FUEL_PHASE3_QA_OUTPUT;
for (const input of [base, current]) {
  if (!input) throw Error('Deliberately supply FUEL_PHASE3_BASELINE_URL and FUEL_PHASE3_CURRENT_URL.');
  const url = new URL(input);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password || url.pathname !== '/') throw Error('Only explicit loopback fixture origins are allowed.');
}
await validateOutput(output, fileURLToPath(new URL('..', import.meta.url)));
const plan = matrixPlan(process.env.FUEL_PHASE3_BROWSER_MODE ?? 'all');
if (!process.env.FUEL_PHASE3_PLAYWRIGHT_PATH) throw Error('Supply existing local Playwright module path; this script installs nothing.');
const { chromium, webkit } = await import(pathToFileURL(process.env.FUEL_PHASE3_PLAYWRIGHT_PATH).href);
await mkdir(output, { recursive: true });
const results = { states: [], races: [], evidence: 'fictional-data fixtures; no real authentication, provider or physical-device delivery', protected: [], setup: [], errors: [] };
const widths = [320, 375, 390, 430, 768, 1024, 1440];
const roles = ['EMPLOYEE', 'LEAD', 'MANAGER', 'OWNER'];
const date = '2026-10-01T16:00:00Z';
const hash = value => createHash('sha256').update(value).digest('hex');
function frozenClock(iso) {
  const Original = Date;
  window.Date = class extends Original { constructor(...args) { super(...(args.length ? args : [iso])); } static now() { return new Original(iso).getTime(); } };
}
export function nativePushDouble(options = {}) {
  window.qa = { register: 0, permission: 0, subscribe: 0, unsubscribe: 0, messages: [], permissionGesture: [], detached: 0, tests: 0 };
  let permission = options.permission ?? 'default';
  window.Notification = { get permission() { return permission; }, requestPermission() { window.qa.permission++; window.qa.permissionGesture.push(navigator.userActivation.isActive); permission = options.permissionResult ?? 'granted'; return Promise.resolve(permission); } };
  window.PushManager = function () {};
  if (options.unsupported) delete window.PushManager;
  if (options.ios) Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1', configurable: true });
  if (options.standalone === 'unknown') window.matchMedia = undefined;
  else if (options.standalone) { const match = window.matchMedia.bind(window); window.matchMedia = query => query === '(display-mode: standalone)' ? { matches: true } : match(query); }
  if (options.missingLocks) Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  const subscription = () => ({ endpoint: 'https://fictional.example.test/never-send', toJSON: () => ({ endpoint: 'https://fictional.example.test/never-send', keys: { p256dh: 'fictional', auth: 'fictional' } }), unsubscribe: async () => { window.qa.unsubscribe++; if (window.qa.holdUnsubscribe) await new Promise(r => { window.qa.releaseUnsubscribe = r; }); localStorage.removeItem('QA-physical-subscription'); return true; } });
  const worker = label => ({ postMessage(message, ports) { window.qa.messages.push({ label, ...message }); const ack = { version: 1, type: 'OWNER_STATE', generation: message.generation, status: message.type === 'SUPPRESS_OWNER' ? 'suppressed' : 'active', ...(window.qa.wrongAck ?? {}) }; if (window.qa.holdAck) window.qa.releaseAck = () => ports[0]?.postMessage(ack); else ports[0]?.postMessage(ack); } });
  const registration = { active: worker('active'), waiting: worker('waiting'), getNotifications: async () => [], pushManager: {
    getSubscription: async () => { if (window.qa.holdDiscovery) await new Promise(r => { window.qa.releaseDiscovery = r; }); return localStorage.getItem('QA-physical-subscription') ? subscription() : null; },
    subscribe: async () => { window.qa.subscribe++; if (window.qa.holdSubscribe) await new Promise(r => { window.qa.releaseSubscribe = r; }); localStorage.setItem('QA-physical-subscription', 'yes'); return subscription(); },
  } };
  const events = new EventTarget();
  const sw = { register: async () => { window.qa.register++; return registration; }, ready: Promise.resolve(registration), getRegistration: async () => registration, getRegistrations: async () => [registration], addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events) };
  window.qa.registration = registration; window.qa.workerEvents = events;
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: sw });
  if (options.existing) localStorage.setItem('QA-physical-subscription', 'yes');
  if (options.deniedWrites) { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key.startsWith('fuel-')) throw new DOMException('QA quota', 'QuotaExceededError'); return set.call(this, key, value); }; }
  if (options.deniedStorage) Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('QA blocked', 'SecurityError'); } });
}
async function setupApi(context, options = {}) {
  const states = new Map();
  await context.route('**/app/api/push/**', async route => {
    const operation = new URL(route.request().url()).pathname.split('/').at(-1);
    const page = route.request().frame().page();
    const account = new URL(page.url()).searchParams.get('account') ?? 'a';
    let status = states.get(account) ?? { supported: true, enabled: !!options.enabled, configurationAvailable: !options.unavailable, testAllowed: !!options.enabled, dismissalScope: `QA-account-${account}`, vapidPublicKey: 'B' + 'A'.repeat(86), ...(options.enabled ? { ownershipGeneration: `QA-generation-${account}` } : {}) };
    if (options.delay) await new Promise(r => setTimeout(r, options.delay));
    if (options.error) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'QA-unavailable' }) });
    if (operation === 'subscribe') { status = { ...status, enabled: true, testAllowed: true, ownershipGeneration: `QA-generation-${account}` }; states.set(account, status); }
    if (operation === 'unsubscribe') { states.set(account, { ...status, enabled: false, ownershipGeneration: undefined }); return route.fulfill({ json: { status: 'complete' } }); }
    if (operation === 'test') return route.fulfill({ json: { status: 'queued' } });
    await route.fulfill({ json: status });
  });
}
const routeFor = (path, role, extra = '') => path + (path.includes('?') ? '&' : '?') + (role === 'EMPLOYEE' ? '' : role.toLowerCase()) + (extra ? '&' + extra : '');
async function settled(page, url) {
  const response = await page.goto(url); assert.equal(response.status(), 200, url);
  await page.waitForFunction(() => window.fixtureReady === true);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }); await page.waitForTimeout(80);
  assert.deepEqual(await page.evaluate(() => window.fixtureHydrationErrors ?? []), [], 'Hydration must succeed');
}
async function geometry(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.app-shell,.clocker-terminal-page,.auth-card') ?? document.body;
    const elements = [...root.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height; });
    const label = root.querySelector('.mobile-brand-copy small'); const labelRect = label?.getBoundingClientRect();
    return { labelIndex: elements.indexOf(label), labelRect: labelRect ? {x:labelRect.x,y:labelRect.y,width:labelRect.width,height:labelRect.height} : null, overflow: document.documentElement.scrollWidth > innerWidth, width: innerWidth, rows: elements.map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return [e.tagName, e.className.baseVal ?? e.className, ...[r.x, r.y, r.width, r.height].map(n => Math.round(n * 100) / 100), s.color, s.backgroundColor, s.fontSize, s.lineHeight, s.fontWeight, s.borderRadius, s.display]; }) };
  });
}
async function save(page, name) { const file = resolve(output, name + '.png'); const png = await page.screenshot({ path: file, fullPage: true, animations: 'disabled' }); return { file, hash: hash(png), png }; }
async function openSettings(page) {
  const dialog = page.locator('#portal-device-settings');
  if (!await dialog.evaluate(e => e.matches(':popover-open'))) await dialog.evaluate(e => e.showPopover());
  return dialog;
}
async function auditSetup(page, dialog) {
  return dialog.evaluate(root => {
    const rect = root.getBoundingClientRect();
    const controls = [...root.querySelectorAll('button')].map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { text: e.textContent, width: r.width, height: r.height, color: s.color, background: s.backgroundColor, outline: s.outline, disabled: e.disabled }; });
    return { rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, overflow: document.documentElement.scrollWidth > innerWidth, controls };
  });
}
for (const [engine, browserType] of Object.entries({ chromium, webkit })) {
  const browser = await browserType.launch({ headless: true });
  try {
    if (plan.protected) {
      const screens = [
        ...roles.flatMap(role => (['EMPLOYEE', 'LEAD'].includes(role) ? ['/app', '/app/schedule', '/app/availability', '/app/requests', '/app/exchange', '/app/my-time'] : ['/app', '/app/schedule', '/app/schedule/settings', '/app/requests', '/app/availability', '/app/exchange', '/app/employees', '/app/schedule/templates']).map(path => ({ role, path }))),
        ...['/login', '/activate', '/clocker/2', '/clocker/110'].map(path => ({ role: 'EMPLOYEE', path })),
      ];
      for (const { role, path } of screens) for (const width of widths) {
        const height = width === 1024 ? 768 : width === 768 ? 1024 : 844;
        // A fresh viewport context avoids Chromium's resized SVG raster cache.
        // Pixel assertions remain exact; no tolerance, mask or baseline update.
        const context = await browser.newContext({ viewport: { width, height }, timezoneId: 'America/Puerto_Rico', locale: 'en-US', reducedMotion: 'reduce' });
        await context.addInitScript(frozenClock, date); await context.addInitScript(nativePushDouble);
        const a = await context.newPage(), b = await context.newPage();
        for (const page of [a, b]) page.on('pageerror', error => results.errors.push({ engine, url: page.url(), message: error.message }));
        const suffix = routeFor(path, role); await settled(a, base.replace(/\/$/, '') + suffix); await settled(b, current.replace(/\/$/, '') + suffix);
        const name = `${engine}-${role}-${path.replaceAll('/', '_')}-${width}`;
        const before = await save(a, name + '-before'), after = await save(b, name + '-after');
        const ga = await geometry(a), gb = await geometry(b);
        let approvedLabelOnly = false;
        if (ga.labelIndex >= 0 && gb.labelIndex === ga.labelIndex) {
          assert.equal(ga.rows[ga.labelIndex][6], 'rgb(215, 197, 185)');
          assert.equal(gb.rows[gb.labelIndex][6], 'rgb(103, 106, 115)');
          const normalized = structuredClone(gb); normalized.rows[gb.labelIndex][6] = ga.rows[ga.labelIndex][6];
          assert.deepEqual(normalized, ga, 'Only approved module-label foreground may differ in geometry/styles');
          const { default: sharp } = await import(pathToFileURL(process.env.FUEL_PHASE3_SHARP_PATH).href);
          const rawA = await sharp(before.png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
          const rawB = await sharp(after.png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
          assert.deepEqual(rawA.info, rawB.info);const r=ga.labelRect;let changed=0;
          for(let pixel=0;pixel<rawA.info.width*rawA.info.height;pixel++){
            const offset=pixel*4;if(rawA.data[offset]===rawB.data[offset]&&rawA.data[offset+1]===rawB.data[offset+1]&&rawA.data[offset+2]===rawB.data[offset+2]&&rawA.data[offset+3]===rawB.data[offset+3])continue;
            const x=pixel%rawA.info.width,y=Math.floor(pixel/rawA.info.width);
            assert(x>=Math.floor(r.x)&&x<=Math.ceil(r.x+r.width)&&y>=Math.floor(r.y)&&y<=Math.ceil(r.y+r.height),'Unapproved pixel outside module label');changed++;
          }
          approvedLabelOnly = changed>0;
        }
        const entry = { approvedLabelOnly, engine, role, path, width, height, before: before.file, after: after.file, pixelsEqual: before.hash === after.hash, geometryEqual: JSON.stringify(ga) === JSON.stringify(gb), overflow: gb.overflow };
        if (path.startsWith('/clocker/')) { const calls = await b.evaluate(() => window.qa); entry.clockerNoPwa = calls.register === 0 && calls.permission === 0 && calls.subscribe === 0; }
        if(path.startsWith('/app')&&width<768){
          await b.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
          const clearance=await b.evaluate(()=>{const main=document.querySelector('.page-frame'),nav=document.querySelector('.mobile-nav'),n=nav?.getBoundingClientRect();const controls=[...main.querySelectorAll('button,input,select,textarea,a')].map(e=>e.getBoundingClientRect()).filter(r=>r.width&&r.height);const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);let deepest=0;while(walker.nextNode()){if(!walker.currentNode.textContent.trim())continue;const range=document.createRange();range.selectNodeContents(walker.currentNode);const r=range.getBoundingClientRect();if(r.width&&r.height)deepest=Math.max(deepest,r.bottom);}const contentBottom=Math.max(deepest,...controls.map(r=>r.bottom));return {contentBottom,navTop:n?.top,clearance:(n?.height?n.top:innerHeight)-contentBottom,viewport:innerHeight,scrollY,documentHeight:document.documentElement.scrollHeight};});
          assert(clearance.clearance>=8, "Final content must scroll clear of bottom navigation"); entry.clearance=clearance;
          entry.bottomScreenshot=resolve(output,name+'-after-bottom.png');await b.screenshot({path:entry.bottomScreenshot,animations:'disabled'});
        }
        results.protected.push(entry);
        await context.close();
        await writeFile(resolve(output, 'browser-results.json'), JSON.stringify(results, null, 2));
      }
    }
    if (plan.setup) {
      for (const role of roles) for (const width of widths) {
        const context = await browser.newContext({ viewport: { width, height: width >= 768 ? 1024 : 844 }, timezoneId: 'America/Puerto_Rico', reducedMotion: 'reduce' });
        await context.addInitScript(frozenClock, date); await context.addInitScript(nativePushDouble); await setupApi(context);
        const page = await context.newPage(); page.on('pageerror', error => results.errors.push({ engine, role, width, message: error.message }));
        await settled(page, current.replace(/\/$/, '') + routeFor('/app', role, 'push'));
        const dialog = await openSettings(page); await dialog.getByRole('button', { name: 'Enable Notifications', exact: true }).waitFor();
        const ready = await auditSetup(page, dialog); assert.equal(ready.overflow, false);
        assert(ready.controls.every(c => c.height >= 44), '44px setup targets');
        const buttons = dialog.locator('.portal-device-actions').last().locator('button'); const sizes = await buttons.evaluateAll(bs => bs.map(b => b.getBoundingClientRect().width)); assert(Math.max(...sizes) - Math.min(...sizes) < 1, 'equal action widths');
        await save(page, `${engine}-${role}-setup-ready-${width}`);
        await dialog.getByRole('button', { name: 'Show Install Instructions' }).click(); await save(page, `${engine}-${role}-install-instructions-${width}`);
        await dialog.getByRole('button', { name: 'Enable Notifications', exact: true }).focus(); await save(page, `${engine}-${role}-setup-focus-${width}`);
        await dialog.getByRole('button', { name: 'Enable Notifications', exact: true }).click(); await dialog.getByText('Notifications enabled on this device.', { exact: true }).waitFor();
        assert.deepEqual(await page.evaluate(() => window.qa.permissionGesture), [true]);
        await save(page, `${engine}-${role}-setup-enabled-${width}`);
        await dialog.getByRole('button', { name: 'Test Notification' }).click(); await dialog.getByText(/does not confirm receipt/).waitFor();
        await dialog.getByRole('button', { name: 'Turn Off', exact: true }).click(); await dialog.getByText('Notifications turned off on this device.', { exact: true }).waitFor();
        results.setup.push({ engine, role, width, ready, gesture: true, testQueued: true, turnOff: true });
        await context.close(); await writeFile(resolve(output, 'browser-results.json'), JSON.stringify(results, null, 2));
      }
    }

    if (plan.states) {
      const scenarios = [
        ['unsupported', { unsupported: true }, {}, /unavailable/],
        ['denied', { permission: 'denied' }, {}, /blocked/],
        ['revoked', { permission: 'default', existing: true }, { enabled: true }, /access changed/],
        ['error', {}, { error: true }, /setup is unavailable/],
        ['standalone', { standalone: true }, {}, /Opened as a standalone app/],
        ['unknown', { standalone: 'unknown' }, {}, /cannot confirm/],
        ['iphone', { ios: true }, {}, /Home Screen/],
        ['loading', {}, { delay: 1800 }, /Checking this device/],
        ['denied-writes', { deniedWrites: true }, {}, /Enable notifications/],
      ];
      for (const role of roles) for (const width of widths) for (const [name, native, api, text] of scenarios) {
        const context = await browser.newContext({ viewport: { width, height: width >= 768 ? 1024 : 844 }, timezoneId: 'America/Puerto_Rico', reducedMotion: 'reduce' });
        await context.addInitScript(frozenClock, date); await context.addInitScript(nativePushDouble, native); await setupApi(context, api);
        const page = await context.newPage(); page.on('pageerror', error => results.errors.push({ engine, role, width, name, message: error.message }));
        await settled(page, current.replace(/\/$/, '') + routeFor('/app', role, 'push'));
        const dialog = await openSettings(page); try { await dialog.getByText(text).first().waitFor({timeout:5000}); } catch(error) { await save(page, `${engine}-${role}-${name}-${width}-failure`); console.error(await page.locator('body').innerText()); throw error; }
        if (name === 'iphone') { await dialog.getByRole('button', { name: 'Show Install Instructions' }).click(); await dialog.getByText(/In Safari, use Share/).waitFor(); }
        if (name === 'denied-writes') { await dialog.getByRole('button', { name: 'Enable Notifications' }).click(); await dialog.getByText(/cannot safely coordinate/).waitFor(); assert.equal(await page.evaluate(() => window.qa.permission), 0); }
        const audit = await auditSetup(page, dialog); assert.equal(audit.overflow, false);
        const file = await save(page, `${engine}-${role}-${name}-${width}`);
        results.states.push({ engine, role, width, name, screenshot: file.file, audit });
        await context.close(); await writeFile(resolve(output, 'browser-results.json'), JSON.stringify(results, null, 2));
      }
    }
  } finally { await browser.close(); }
}
await writeFile(resolve(output, 'browser-results.json'), JSON.stringify(results, null, 2));
assertMatrixCounts(results, plan);
const failures = results.protected.filter(r => (!r.approvedLabelOnly && (!r.pixelsEqual || !r.geometryEqual)) || r.overflow || r.clockerNoPwa === false);
console.log(JSON.stringify({ protected: results.protected.length, setup: results.setup.length, protectedFailures: failures.length, runtimeErrors: results.errors.length, output }));
assert.equal(failures.length, 0, `Protected regressions: ${failures.map(r => `${r.engine}/${r.role}/${r.path}/${r.width}`).join(', ')}`);
assert.equal(results.errors.length, 0, 'Browser runtime errors');
