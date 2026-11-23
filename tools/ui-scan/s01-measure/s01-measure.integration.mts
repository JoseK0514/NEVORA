// QA S-01 measurement (Nov 21, 2026 QA): how long the scoped access frame takes to show Schedule, Team, a person's page
// and Timecards on throttled networks, on the owned app's production build (or `next dev` for comparison).
// Fictional seeded data, a throwaway local Postgres, Chromium only (CDP Network.emulateNetworkConditions). It measures and
// changes nothing; the frame's 15-second rule is untouched. Run it with tools/ui-scan/s01-measure/run.sh.
import {it} from '@rstest/core';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from '../../../src/test/integration/owned-next-app';
import {seedOwnedApp,seedOwnedScenario,grantOwnedManagerWorkforcePermission,TEST_PASSWORD} from '../../../src/test/integration/owned-app-fixture';
import {fixtureProof} from '../../../src/test/integration/shift-change-api';
import {publishScheduleWithRevision} from '../../../src/test/integration/management-api';
import {readOwnerOperationalScope,assignOperationalScope} from '../../../src/lib/company-access/operational-scope.server';
import {hashPassword} from '../../../src/lib/auth/password';
import {businessDate} from '../../../src/lib/business-time';
import {addDays,weekStartFor} from '../../../src/lib/date-utils';
import {fictionalProfile} from '../../../src/test/fixtures/shift-changes';

/** Chrome DevTools presets (front_end/core/sdk/NetworkManager.ts). Throughput in bytes per second, latency in ms per request. */
const PROFILES = {
  none: {label: 'No throttling', conditions: null},
  // DevTools "Fast 3G" (labelled "Slow 4G" in current Chrome): 1.6 Mbps * 0.9 down, 750 kbps * 0.9 up, 150 ms * 3.75 latency.
  fast3g: {label: 'Fast 3G (DevTools): 562.5 ms, 1.44 Mbps down, 675 kbps up', conditions: {latency: 562.5, downloadThroughput: 1.6 * 1000 * 1000 / 8 * .9, uploadThroughput: 750 * 1000 / 8 * .9}},
  // A plain 4 Mbps down cap with modest latency.
  cap4m: {label: '4 Mbps down, 1 Mbps up, 50 ms latency', conditions: {latency: 50, downloadThroughput: 4 * 1000 * 1000 / 8, uploadThroughput: 1000 * 1000 / 8}},
} as const;
type ProfileName = keyof typeof PROFILES;
const env = (name: string, fallback: string) => process.env[name] || fallback;
const PEOPLE = Number(env('NEVORA_S01_PEOPLE', '22'));
const WATCH_MS = Number(env('NEVORA_S01_WATCH_MS', '60000'));
const WATCH_NONE_MS = Number(env('NEVORA_S01_WATCH_NONE_MS', '30000'));
const PROFILE_NAMES = env('NEVORA_S01_PROFILES', 'none,fast3g,cap4m').split(',') as ProfileName[];
const ROLES = env('NEVORA_S01_ROLES', 'owner,manager').split(',');
const LOADS = env('NEVORA_S01_LOADS', 'cold,warm').split(',');
const MAX_LOAD = Number(env('NEVORA_S01_MAX_LOAD', '3'));
const PERSON = 'QA-SCAN-A';
const PAGES = [['schedule', '/app/schedule'], ['team', '/app/employees'], ['person', `/app/employees/${PERSON}`], ['timecards', '/app/timecards']] as const;

/** Runs in every document: the frame's visible state over time (performance.now(), from navigation start). */
const PROBE = `(() => {
 if (window.top !== window || window.__s01) return;
 const log = []; window.__s01 = log; let last = '';
 const words = t => (t || '').replace(/\\s+/g, ' ').trim();
 const shown = sel => [...document.querySelectorAll(sel)].find(e => !e.closest('[hidden]'));
 function classify() {
  const rs = shown('.c-route-state');
  if (rs) { const text = words(rs.textContent);
   if (/Still checking your access/.test(text)) return 'still-checking';
   if (/Couldn.t check your access/.test(text)) return 'failed';
   if (/View paused/.test(text)) return 'paused';
   if (/You.re offline/.test(text)) return 'offline';
   return 'checking-skeleton'; }
  if (shown('[data-b-load]')) return 'route-loading';
  if (!document.querySelector('main')) return 'blank';
  return 'content';
 }
 function tick() { const s = classify(); if (s !== last) { last = s; log.push({t: Math.round(performance.now()), s, h1: words(document.querySelector('main h1')?.textContent).slice(0, 60)}); } }
 new MutationObserver(tick).observe(document, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden', 'data-b-load']});
 setInterval(tick, 100); tick();
 for (const e of ['blur', 'focus', 'offline', 'online', 'pagehide', 'pageshow']) window.addEventListener(e, () => log.push({t: Math.round(performance.now()), event: e}));
})();`;

const OBSERVATION = /\\?"authority\\?":\\?"([^"\\]*)\\?",\\?"observedAt\\?":\\?"([^"\\]+)\\?",\\?"validForMs\\?":(\d+)/g;
const observations = (body: string) => [...body.matchAll(OBSERVATION)].map(m => ({authority: m[1], observedAt: m[2], validForMs: Number(m[3])}));

type Req = {id: string; url: string; type?: string; start: number; headers?: number; end?: number; encoded?: number; decoded: number; status?: number; mime?: string; rsc: boolean; prefetch: boolean; authority: boolean; failed?: string; body?: Promise<string | null>};

function loadAverage() { return execFileSync('cat', ['/proc/loadavg'], {encoding: 'utf8'}).trim().split(' ').slice(0, 3).map(Number); }
/** Heavy processes that are not this run's: another app, Postgres or browser on the machine invalidates a measurement. */
function foreignHeavy(appRoot: string): string[] {
 const rows = execFileSync('ps', ['-eo', 'pid=,ppid=,args='], {encoding: 'utf8'}).split('\n').map(l => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map(m => ({pid: Number(m![1]), ppid: Number(m![2]), args: m![3]}));
 const byPid = new Map(rows.map(r => [r.pid, r]));
 const ours = (pid: number) => { for (let p = byPid.get(pid), n = 0; p && n < 30; p = byPid.get(p.ppid), n++) if (p.pid === process.pid || p.args.includes(appRoot)) return true; return false; };
 const pg = process.env.S01_PG_DIR ?? '\0';
 return rows.filter(r => /next-server|next\/dist\/bin\/next|bin\/postgres|postmaster|headless_shell|chrom(e|ium)/.test(r.args) && !r.args.includes(pg) && !ours(r.pid)).map(r => `${r.pid} ${r.args.slice(0, 120)}`);
}
/** CPU ticks a process used (utime + stime), or null when it is gone. */
async function cpuTicks(pid: number) { try { const f = (await readFile(`/proc/${pid}/stat`, 'utf8')).split(') ')[1].split(' '); return Number(f[11]) + Number(f[12]); } catch { return null; } }
/** Foreign processes that used more than 2% of a core over 3 s. An idle leftover (an orphaned Postgres from an
 * interrupted run) is recorded but does not hold the measurement. */
async function busyForeign(foreign: string[]) {
 const pids = foreign.map(f => Number(f.split(' ')[0])), before = await Promise.all(pids.map(cpuTicks));
 await new Promise(r => setTimeout(r, 3000));
 const after = await Promise.all(pids.map(cpuTicks));
 return foreign.filter((_, i) => before[i] !== null && after[i] !== null && after[i]! - before[i]! > 6);
}
async function waitIdle(appRoot: string, log: unknown[]) {
 const started = Date.now();
 for (;;) {
  const load = loadAverage(), foreign = foreignHeavy(appRoot), busy = await busyForeign(foreign);
  if ((load[0] < MAX_LOAD && busy.length === 0) || Date.now() - started > 20 * 60000) return {load, foreign, busyForeign: busy, idle: load[0] < MAX_LOAD && busy.length === 0, waitedMs: Date.now() - started};
  log.push({waiting: {load, busy: busy.slice(0, 5)}});
  await new Promise(r => setTimeout(r, 15000));
 }
}

it('measures S-01 page delivery against the 15-second access window', async () => {
 const build = env('NEVORA_S01_BUILD', 'production');
 const evidence = resolve(env('NEVORA_S01_EVIDENCE', '/tmp/nevora-scan/s01-measure'), build);
 await mkdir(join(evidence, 'shots'), {recursive: true});
 const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app = await createOwnedNextApp(evidence, {production: build === 'production', payrollEnabled: true});
 const q = (text: string, values: unknown[] = []) => app.database.executor.query({text, values});
 const notes: unknown[] = [], results: Record<string, unknown>[] = [];
 const save = () => writeFile(join(evidence, 'results.json'), JSON.stringify({build, profiles: PROFILES, watchMs: WATCH_MS, watchNoneMs: WATCH_NONE_MS, people: PEOPLE, notes, results}, null, 2));
 try {
  // Fictional workspace: the owned fixture, a scenario's three people, PEOPLE more across both locations, this week's
  // published schedule at both locations and two weeks of closed punches.
  await seedOwnedApp(app.database.executor);
  const f = await seedOwnedScenario(app.database.executor, 'SCAN', 0);
  const today = businessDate(new Date(), 'America/Puerto_Rico'), week = weekStartFor(today);
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT 'S01-'||n,'Fictional '||n,'Person','555-0199','EMPLOYEE',CASE WHEN n%3=0 THEN 'loc-2' ELSE 'loc-1' END FROM generate_series(1,$1::int) n`, [PEOPLE]);
  await q("INSERT INTO employee_location_eligibility SELECT id,primary_location_id FROM employees WHERE id LIKE 'S01-%'");
  await q("INSERT INTO employee_positions SELECT id,'qa-pos' FROM employees WHERE id LIKE 'S01-%'");
  await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) SELECT id,40,80,$1::jsonb FROM employees WHERE id LIKE 'S01-%'", [JSON.stringify(fictionalProfile())]);
  await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 's01-av-'||id||'-'||d,id,d,'00:00','24:00' FROM employees CROSS JOIN generate_series(0,6) d WHERE id LIKE 'S01-%'");
  for (const location of ['loc-1', 'loc-2']) {
   await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')", ['s01-week-' + location, location, week]);
   await q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) SELECT 's01-shift-'||e.id||'-'||d,$1,e.id,$2::date+d,(CASE WHEN n%2=0 THEN '07:00' ELSE '12:00' END)::time,(CASE WHEN n%2=0 THEN '15:00' ELSE '20:00' END)::time,'qa-pos'
    FROM (SELECT id,row_number() OVER (ORDER BY id) n FROM employees WHERE id LIKE 'S01-%' AND primary_location_id=$3) e CROSS JOIN generate_series(0,6) d WHERE (d+n)%7<5`, ['s01-week-' + location, week, location]);
   await publishScheduleWithRevision({locationId: location, weekStart: week, managerId: 'QAOWNER'}, app.database.executor);
   await q("INSERT INTO clocker_devices(id,location_id,name) VALUES($1,$2,'Fictional front desk')", ['s01-device-' + location, location]);
  }
  await q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) SELECT 's01-time-'||e.id||'-'||d,e.id,e.primary_location_id,'s01-device-'||e.primary_location_id,
   ($1::date-d+time '08:00') AT TIME ZONE 'America/Puerto_Rico',($1::date-d+time '16:00') AT TIME ZONE 'America/Puerto_Rico','CLOCKED_OUT' FROM employees e CROSS JOIN generate_series(1,14) d WHERE e.id LIKE 'S01-%' OR e.id LIKE 'QA-SCAN-%'`, [today]);
  // A location-scoped Manager (loc-1) with the three location permissions, as the concurrency browser test assigns one.
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('S01-LOCAL','Fictional','Local Manager','555-0198','MANAGER','loc-1')");
  await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('S01-LOCAL',$1,false)", [await hashPassword(TEST_PASSWORD)]);
  await q("INSERT INTO employee_location_eligibility VALUES('S01-LOCAL','loc-1')");
  const owner = await fixtureProof(app.database.executor, 'QAOWNER'), view = await readOwnerOperationalScope(owner, 'S01-LOCAL', app.database.executor);
  if (view.state !== 'ready') throw Error('Owned scope unavailable');
  const c = view.data.current;
  const scoped = await assignOperationalScope(owner, 'S01-LOCAL', {action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: c.employeeUpdatedAt, expectedRoleGeneration: c.roleGeneration, expectedScopeRevision: c.scopeRevision, scope: {mode: 'LOCATIONS', locationIds: ['loc-1']}}, app.database.executor);
  if (scoped.state !== 'saved') throw Error('Location scope not saved');
  for (const permission of ['PUBLISH_SCHEDULE', 'APPROVE_LEAVE', 'REVIEW_TIME_EXCEPTION'] as const) await grantOwnedManagerWorkforcePermission(app.database.executor, 'S01-LOCAL', 'loc-1', permission);
  notes.push({seed: (await q("SELECT (SELECT count(*) FROM employees)::int AS employees,(SELECT count(*) FROM shifts)::int AS shifts,(SELECT count(*) FROM time_entries)::int AS time_entries"))[0], scenarioWeek: f.week, week});

  const browser = await runtime.chromium.launch({headless: true});
  const contextOptions = {viewport: {width: 1440, height: 900}, deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block'};
  try {
   for (const role of ROLES) {
    const login = role === 'owner' ? 'QAOWNER' : 'S01-LOCAL';
    // One sign-in per role (the limit is 10 per 15 minutes per ID); every measured load reuses its cookies.
    const signIn = await browser.newContext(contextOptions), page = await signIn.newPage();
    await page.goto(app.url + '/login');
    await page.getByLabel('Employee ID', {exact: true}).fill(login);
    await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
    await page.getByRole('button', {name: 'Sign in', exact: true}).click();
    await page.waitForURL((u: URL) => u.pathname.startsWith('/app'), {timeout: 60000});
    // Warm-up, unthrottled: every route once (compiles it on `next dev`; primes server caches on both builds).
    for (const [, route] of PAGES) { await page.goto(app.url + route); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(1500); }
    const storageState = await signIn.storageState();
    await signIn.close();
    for (const profileName of PROFILE_NAMES) {
     const profile = PROFILES[profileName];
     for (const [pageName, route] of PAGES) {
      const context = await browser.newContext({...contextOptions, storageState});
      await context.addInitScript(PROBE);
      for (const loadKind of LOADS) {
       const watch = profile.conditions ? WATCH_MS : WATCH_NONE_MS;
       const idle = await waitIdle(app.root, notes);
       for (const old of context.pages()) await old.close();
       const page = await context.newPage();
       const cdp = await context.newCDPSession(page);
       await cdp.send('Network.enable', {maxTotalBufferSize: 200_000_000, maxResourceBufferSize: 50_000_000});
       const requests = new Map<string, Req>();
       cdp.on('Network.requestWillBeSent', (e: {requestId: string; timestamp: number; type?: string; request: {url: string; headers: Record<string, string>}}) => {
        const h = Object.fromEntries(Object.entries(e.request.headers).map(([k, v]) => [k.toLowerCase(), v]));
        const url = new URL(e.request.url);
        requests.set(e.requestId, {id: e.requestId, url: url.pathname + url.search, type: e.type, start: e.timestamp, decoded: 0, rsc: h.rsc === '1', prefetch: h['next-router-prefetch'] === '1', authority: url.pathname === '/api/company-access/operational-authority'});
       });
       cdp.on('Network.responseReceived', (e: {requestId: string; timestamp: number; type?: string; response: {status: number; mimeType: string}}) => { const r = requests.get(e.requestId); if (r) { r.headers = e.timestamp; r.status = e.response.status; r.mime = e.response.mimeType; r.type = e.type ?? r.type; if (r.mime === 'text/x-component') r.rsc = true; } });
       cdp.on('Network.dataReceived', (e: {requestId: string; dataLength: number}) => { const r = requests.get(e.requestId); if (r) r.decoded += e.dataLength; });
       cdp.on('Network.loadingFinished', (e: {requestId: string; timestamp: number; encodedDataLength: number}) => {
        const r = requests.get(e.requestId); if (!r) return;
        r.end = e.timestamp; r.encoded = e.encodedDataLength;
        if (r.rsc || r.authority || r.type === 'Document') r.body = cdp.send('Network.getResponseBody', {requestId: e.requestId}).then((b: {body: string; base64Encoded: boolean}) => b.base64Encoded ? Buffer.from(b.body, 'base64').toString('utf8') : b.body).catch(() => null);
       });
       cdp.on('Network.loadingFailed', (e: {requestId: string; timestamp: number; errorText: string}) => { const r = requests.get(e.requestId); if (r) { r.end = e.timestamp; r.failed = e.errorText; } });
       if (profile.conditions) await cdp.send('Network.emulateNetworkConditions', {offline: false, ...profile.conditions});
       const began = Date.now();
       let gotoError: string | null = null;
       await page.goto(app.url + route, {waitUntil: 'commit', timeout: watch}).catch((e: Error) => { gotoError = e.message.slice(0, 200); });
       await page.waitForTimeout(Math.max(0, watch - (Date.now() - began)));
       const inPage = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        return {now: Math.round(performance.now()), timeline: (window as unknown as {__s01?: unknown[]}).__s01 ?? [], nav: nav ? {ttfb: Math.round(nav.responseStart), responseEnd: Math.round(nav.responseEnd), domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), transferSize: nav.transferSize, encodedBodySize: nav.encodedBodySize, decodedBodySize: nav.decodedBodySize} : null};
       }).catch((e: Error) => ({now: 0, timeline: [], nav: null, error: e.message.slice(0, 200)}));
       const shot = `${role}-${profileName}-${pageName}-${loadKind}.png`;
       await page.screenshot({path: join(evidence, 'shots', shot)}).catch(() => {});
       const loadAfter = loadAverage();
       // Network, relative to the document request (≈ navigation start).
       const all = [...requests.values()];
       const doc = all.find(r => r.type === 'Document');
       const zero = doc?.start ?? Math.min(...all.map(r => r.start));
       const ms = (t?: number) => t === undefined ? null : Math.round((t - zero) * 1000);
       const docBody = doc?.body ? await doc.body : null;
       const authority = await Promise.all(all.filter(r => r.authority).map(async r => { const body = r.body ? await r.body : null; let parsed: {observedAt?: string; authority?: string; state?: string; validForMs?: number} = {}; try { parsed = body ? JSON.parse(body) : {}; } catch { /* not JSON */ }
        return {startMs: ms(r.start), endMs: ms(r.end), status: r.status ?? null, failed: r.failed ?? null, state: parsed.state ?? null, observedAt: parsed.observedAt ?? null, validForMs: parsed.validForMs ?? null, authority: parsed.authority ?? null, startAt: r.start, endAt: r.end}; }));
       const rsc = await Promise.all(all.filter(r => r.rsc && !r.authority).map(async r => {
        const body = r.body ? await r.body : null, obs = body ? observations(body) : [];
        const observation = obs[0] ?? null;
        // The frame's age (scoped-read-frame.tsx): now − authority request start − (page observedAt − authority observedAt),
        // taken here at the RSC response's arrival (the frame reads it a little later, after React renders it).
        const auth = authority.filter(a => a.endAt !== undefined && a.endAt <= r.start && a.observedAt && observation && a.authority === observation.authority).at(-1);
        const age = observation && auth && r.end !== undefined ? Math.round((r.end - auth.startAt) * 1000 - (Date.parse(observation.observedAt) - Date.parse(auth.observedAt!))) : null;
        return {url: r.url.slice(0, 80), prefetch: r.prefetch, startMs: ms(r.start), ttfbMs: r.headers !== undefined ? Math.round((r.headers - r.start) * 1000) : null, endMs: ms(r.end), durationMs: r.end !== undefined ? Math.round((r.end - r.start) * 1000) : null,
         encodedBytes: r.encoded ?? null, decodedBytes: r.decoded, status: r.status ?? null, failed: r.failed ?? null, observation, ageAtArrivalMs: age, remainingAtArrivalMs: age !== null && observation ? observation.validForMs - age : null};
       }));
       const sum = (rows: Req[]) => rows.reduce((n, r) => n + (r.encoded ?? 0), 0);
       const timeline = (inPage.timeline as {t: number; s?: string; event?: string; h1?: string}[]);
       const states = timeline.filter(e => e.s);
       const durations: Record<string, number> = {};
       states.forEach((e, i) => { durations[e.s!] = (durations[e.s!] ?? 0) + ((states[i + 1]?.t ?? inPage.now) - e.t); });
       const firstContent = states.find(e => e.s === 'content');
       const result = {
        build, role, profile: profileName, page: pageName, route, load: loadKind, watchMs: watch, gotoError,
        loadBefore: idle.load, loadAfter, idle: idle.idle, foreign: idle.foreign, busyForeign: idle.busyForeign,
        ttfbMs: inPage.nav?.ttfb ?? null, document: {...inPage.nav, cdpEncodedBytes: doc?.encoded ?? null, cdpDecodedBytes: doc?.decoded ?? null, ssrObservation: docBody ? observations(docBody)[0] ?? null : null},
        contentAtMs: firstContent?.t ?? null, renderedWithinWatch: !!firstContent, contentH1: firstContent?.h1 ?? null, finalState: states.at(-1)?.s ?? null,
        contentDropped: states.filter((e, i) => i > 0 && states[i - 1].s === 'content' && e.s !== 'content').length,
        stillCheckingFirstMs: states.find(e => e.s === 'still-checking')?.t ?? null, failedFirstMs: states.find(e => e.s === 'failed')?.t ?? null, stateDurationsMs: durations,
        timeline: timeline.slice(0, 80), authority: authority.map(({startAt: _s, endAt: _e, ...a}) => a), rsc,
        bytes: {total: sum(all), scripts: sum(all.filter(r => r.type === 'Script')), stylesheets: sum(all.filter(r => r.type === 'Stylesheet')), rscNavigation: sum(all.filter(r => r.rsc && !r.prefetch)), rscPrefetch: sum(all.filter(r => r.rsc && r.prefetch)), requests: all.length},
        screenshot: shot,
       };
       results.push(result);
       console.log(`[s01] ${build} ${role} ${profileName} ${pageName} ${loadKind}: ttfb ${result.ttfbMs} ms, content ${result.contentAtMs ?? 'never'} ms, final ${result.finalState}, dropped ${result.contentDropped}, load ${idle.load[0]}→${loadAfter[0]}`);
       await save();
       await cdp.detach().catch(() => {});
      }
      await context.close();
     }
    }
   }
  } finally { await browser.close(); }
  notes.push({serverLogTail: (await readFile(join(app.root, 'next.log'), 'utf8').catch(() => '')).split('\n').slice(-30)});
 } finally { await save(); await app.close(); }
}, 4 * 60 * 60 * 1000);
