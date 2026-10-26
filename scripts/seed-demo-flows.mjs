/**
 * Phase B of the fictional demo company: the cookie-bound workflows, driven
 * through the running app with Playwright as the fictional people themselves.
 *
 * Run after phase A (scripts/seed-demo-company.mts) against a running build of
 * the app that uses the same database, with every private value in env files:
 *
 *   node --env-file=<demo env file> scripts/seed-demo-flows.mjs
 *
 * Required environment (in the env file):
 *   NEVORA_DEMO_APP_URL        origin of the running app, e.g. http://localhost:3917
 *   DATABASE_URL               the same nevora_demo* database (read-only lookups and the final counts)
 *   BOOTSTRAP_EMPLOYEE_ID, BOOTSTRAP_PASSWORD   the Owner from setup:company
 *   NEVORA_DEMO_PASSWORD       everyone else's password (set by phase A)
 *   NEVORA_DEMO_ACCOUNTS_FILE  the account list phase A wrote
 *   NEVORA_DEMO_WORKER_ENV_FILE  env file for one payroll worker pass (the app's env: DATABASE_URL, NEVORA_PAYROLL_ENABLED=true)
 * Optional: PLAYWRIGHT_RUNTIME_ROOT (a node_modules folder that has playwright),
 *   NEVORA_DEMO_EVIDENCE_DIR (screenshots and the JSON summary), NEVORA_DEMO_ONLY (comma list of steps).
 *
 * Every write goes through the app (its pages, server actions and JSON APIs)
 * under a real signed-in session. The database is read only to look up the IDs
 * a person would see on screen and for the closing counts. The browser may only
 * reach the app origin; push and email stay off in the app's env, and this
 * script runs no notification worker, so no notification is delivered.
 * Passwords are read from the env file and never printed.
 */
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import pg from 'pg';

const env = process.env;
const fail = message => { throw new Error(message); };
if (env.NEVORA_SETUP_ENVIRONMENT === 'production') fail('Refusing: NEVORA_SETUP_ENVIRONMENT=production.');
const appUrl = new URL(env.NEVORA_DEMO_APP_URL ?? fail('NEVORA_DEMO_APP_URL is required.')).origin;
const databaseUrl = env.DATABASE_URL ?? fail('DATABASE_URL is required.');
const databaseName = decodeURIComponent(new URL(databaseUrl).pathname.slice(1));
const demoName = name => name === 'nevora_demo' || name.startsWith('nevora_demo');
if (!demoName(databaseName)) fail('Refusing: the database name must be nevora_demo or start with nevora_demo.');
const ownerPassword = env.BOOTSTRAP_PASSWORD ?? fail('BOOTSTRAP_PASSWORD is required in the env file.');
const demoPassword = env.NEVORA_DEMO_PASSWORD ?? fail('NEVORA_DEMO_PASSWORD is required in the env file.');
const accounts = JSON.parse(await readFile(env.NEVORA_DEMO_ACCOUNTS_FILE ?? fail('NEVORA_DEMO_ACCOUNTS_FILE is required.'), 'utf8'));
const workerEnvFile = env.NEVORA_DEMO_WORKER_ENV_FILE ?? fail('NEVORA_DEMO_WORKER_ENV_FILE is required.');
const evidence = resolve(env.NEVORA_DEMO_EVIDENCE_DIR ?? 'outputs/demo-company');
const only = env.NEVORA_DEMO_ONLY ? new Set(env.NEVORA_DEMO_ONLY.split(',')) : null;
const runtimeRoot = resolve(env.PLAYWRIGHT_RUNTIME_ROOT ?? join(homedir(), '.cache', 'codex-runtimes', 'codex-primary-runtime', 'dependencies', 'node', 'node_modules'));
const { chromium } = createRequire(join(runtimeRoot, 'package.json'))('playwright');
const S = accounts.scenario, W = accounts.weeks, TZ = accounts.timeZone;
const ownerId = S.owner;
const summary = { startedAt: new Date().toISOString(), app: appUrl, database: databaseName, steps: {}, skipped: [], warnings: [] };
const log = message => console.log(`[phase B] ${message}`);
const addDays = (date, n) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const db = new pg.Client({ connectionString: databaseUrl, application_name: 'nevora-demo-flows' });
await db.connect();
const q = async (text, values = []) => (await db.query(text, values)).rows;
const [{ name: connected }] = await q('SELECT current_database() AS name');
if (!demoName(connected)) fail('Refusing: connected database is not nevora_demo*.');
const [company] = await q('SELECT name FROM workspaces WHERE singleton AND active');
if (company?.name !== accounts.company) fail('Refusing: the database company does not match the phase A account list.');
const already = await q("SELECT (SELECT count(*) FROM time_off_requests)::int AS timeoff, (SELECT count(*) FROM payroll_runs)::int AS runs");
if ((already[0].timeoff || already[0].runs) && !only) fail('Refusing a second run: phase B data already exists. Reset the database (see DEMO-DATABASE.md) and run both phases again.');

// ---------------------------------------------------------------- browser sessions
const browser = await chromium.launch({ headless: true });
const sessions = new Map();
async function as(employeeId) {
  if (sessions.has(employeeId)) return sessions.get(employeeId);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block', locale: 'en-US', timezoneId: TZ });
  // The browser may only reach the app itself.
  await context.route('**/*', route => new URL(route.request().url()).origin === appUrl ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(appUrl + '/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Employee ID', { exact: true }).fill(employeeId);
  await page.getByLabel('Password', { exact: true }).fill(employeeId === ownerId ? ownerPassword : demoPassword);
  await Promise.all([page.waitForURL(u => u.pathname.startsWith('/app'), { timeout: 45000 }), page.getByRole('button', { name: 'Sign in', exact: true }).click()]);
  const cookie = (await context.cookies(appUrl)).find(c => /session/i.test(c.name) && c.httpOnly);
  const tokenHash = cookie ? createHash('sha256').update(cookie.value).digest('hex') : null;
  // Public intent binding the app renders into its own time pages (see src/lib/time-corrections/authority.server.ts).
  const correctionAuthority = tokenHash ? createHash('sha256').update('nevora:time-correction:intent:v1\0').update(employeeId).update('\0').update(tokenHash).digest('hex') : null;
  const session = { id: employeeId, context, page, correctionAuthority };
  sessions.set(employeeId, session);
  return session;
}
/** Same-origin fetch from the signed-in page, exactly as the app's own client code calls its APIs. */
async function api(session, method, path, body, headers = {}) {
  return session.page.evaluate(async ({ method, path, body, headers }) => {
    const response = await fetch(path, { method, headers: { ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'same-origin' });
    let json = null; try { json = await response.json(); } catch { /* not JSON */ }
    return { status: response.status, json };
  }, { method, path, body, headers });
}
const expectOk = (result, label, ok = [200, 202]) => { if (!ok.includes(result.status)) fail(`${label}: HTTP ${result.status} ${JSON.stringify(result.json)?.slice(0, 400)}`); return result.json; };
const step = async (name, run) => {
  if (only && !only.has(name)) return;
  log(`${name} …`);
  try { summary.steps[name] = await run(); log(`${name} done ${JSON.stringify(summary.steps[name])}`); }
  catch (error) { summary.steps[name] = { failed: error.message }; console.error(`[phase B] ${name} FAILED: ${error.message}`); process.exitCode = 1; }
};
const zoned = (date, time) => q(`SELECT to_char((($1::date || ' ' || $2)::timestamp AT TIME ZONE '${TZ}') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS at`, [date, time]).then(r => r[0].at);
const entriesOf = (employeeId, from, to) => q(`SELECT e.id,e.location_id AS "locationId",to_char(e.clock_in_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "inAt",
  to_char(e.clock_out_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "outAt",(e.clock_in_at AT TIME ZONE $4)::date::text AS date,
  (SELECT jsonb_agg(jsonb_build_object('id',b.id,'startAt',to_char(b.break_start_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'endAt',to_char(b.break_end_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'))) FROM break_entries b WHERE b.time_entry_id=e.id) AS breaks
  FROM time_entries e WHERE e.employee_id=$1 AND (e.clock_in_at AT TIME ZONE $4)::date BETWEEN $2::date AND $3::date AND e.clock_out_at IS NOT NULL ORDER BY e.clock_in_at`, [employeeId, from, to, TZ]);
const shiftMinutes = (iso, minutes) => new Date(Date.parse(iso) + minutes * 60000).toISOString().replace('.000Z', 'Z');

try {
  // 1. Time corrections: requested by employees, reviewed by the company-wide Manager.
  await step('corrections', async () => {
    const correctionHeaders = s => ({ 'x-nevora-time-correction': '1', 'x-nevora-correction-authority': s.correctionAuthority, ...(['OWNER', 'MANAGER'].includes(s.role) ? { 'x-nevora-actor': s.id } : {}) });
    const request = async (employeeId, command) => {
      const s = await as(employeeId);
      return expectOk(await api(s, 'POST', '/api/employee/time-corrections', { operationId: randomUUID(), ...command }, correctionHeaders(s)), `Correction by ${employeeId}`);
    };
    const review = async (managerId, pending, decision, note) => {
      const s = await as(managerId); s.role = 'MANAGER';
      return expectOk(await api(s, 'POST', '/api/manager/time-corrections', { operationId: randomUUID(), requestId: pending.requestId, expectedRevision: pending.revision, decision, ...(note ? { note } : {}) }, correctionHeaders(s)), `Review by ${managerId}`);
    };
    const prevEnd = addDays(W.previous, 6), currentEnd = addDays(W.current, 6);
    const outcome = { approved: 0, rejected: 0, pending: 0 };
    // Previous week (decided before that week is finalized). Correction review needs Company-wide scope, so Ramón (company-wide Manager) decides.
    const [e407] = await entriesOf('IVC-407', W.previous, prevEnd);
    await review(S.companyManager, await request('IVC-407', { kind: 'ENTRY_BOUNDARY', timeEntryId: e407.id, proposedStartAt: shiftMinutes(e407.inAt, -12), proposedEndAt: e407.outAt, reason: 'I opened the store early and the tablet was still starting up.' }), 'APPROVE'); outcome.approved++;
    const [e408] = await entriesOf('IVC-408', W.previous, prevEnd);
    await review(S.companyManager, await request('IVC-408', { kind: 'ENTRY_BOUNDARY', timeEntryId: e408.id, proposedStartAt: e408.inAt, proposedEndAt: shiftMinutes(e408.outAt, 20), reason: 'Stayed to finish the closing count after clocking out.' }), 'APPROVE', 'Confirmed with the closing checklist.'); outcome.approved++;
    const [e409] = await entriesOf('IVC-409', W.previous, prevEnd);
    await review(S.companyManager, await request('IVC-409', { kind: 'ENTRY_BOUNDARY', timeEntryId: e409.id, proposedStartAt: shiftMinutes(e409.inAt, -45), proposedEndAt: e409.outAt, reason: 'Forgot to clock in when I arrived.' }), 'REJECT', 'The schedule and door log show a later start.'); outcome.rejected++;
    const withBreak = (await entriesOf('IVC-410', W.previous, prevEnd)).find(e => e.breaks?.length);
    if (withBreak) {
      const b = withBreak.breaks[0];
      await review(S.companyManager, await request('IVC-410', { kind: 'BREAK_BOUNDARY', timeEntryId: withBreak.id, breakEntryId: b.id, proposedStartAt: b.startAt, proposedEndAt: shiftMinutes(b.startAt, 30), reason: 'My meal break ended at 30 minutes; I tapped late.' }), 'APPROVE'); outcome.approved++;
    } else summary.warnings.push('IVC-410 had no recorded break last week; break correction skipped.');
    // Current week: these stay pending or are rejected, so the current period stays open.
    // Pending requests stay in the current week (a pending correction would block finalizing the previous one).
    const thisWeek = async id => (await entriesOf(id, W.current, currentEnd)).at(-1);
    const recent = async id => (await thisWeek(id)) ?? (await entriesOf(id, W.previous, prevEnd)).at(-1);
    const e413 = await thisWeek('IVC-413');
    if (e413) { await request('IVC-413', { kind: 'ENTRY_BOUNDARY', timeEntryId: e413.id, proposedStartAt: shiftMinutes(e413.inAt, -8), proposedEndAt: e413.outAt, reason: 'The tablet froze when I tried to clock in.' }); outcome.pending++; }
    const e414 = await thisWeek('IVC-414');
    if (!e413 || !e414) summary.warnings.push('Some pending corrections skipped: no finished current-week entry yet.');
    if (e414) { await request('IVC-414', { kind: 'ENTRY_BOUNDARY', timeEntryId: e414.id, proposedStartAt: e414.inAt, proposedEndAt: shiftMinutes(e414.outAt, 15), reason: 'I helped with a late delivery after my shift.' }); outcome.pending++; }
    const santurce = accounts.locations.santurce;
    // A missing early-morning entry in the current week: Monday when today is later in the week, otherwise
    // today once 07:00 has passed. It stays pending, so it must not land in the week that gets finalized.
    const prNow = new Date().toLocaleTimeString('en-GB', { timeZone: TZ, hour12: false });
    const missingDay = W.today > W.current ? W.current : prNow >= '07:30' ? W.today : null;
    if (missingDay) { await request('IVC-415', { kind: 'MISSING_ENTRY', locationId: santurce, proposedStartAt: await zoned(missingDay, '05:30'), proposedEndAt: await zoned(missingDay, '07:00'), reason: 'Early pastry prep before opening; I did not clock in.' }); outcome.pending++; }
    else summary.warnings.push('Missing-entry correction skipped: no finished early morning in the current week yet.');
    const e416 = await recent('IVC-416');
    if (e416) { await review(S.companyManager, await request('IVC-416', { kind: 'ENTRY_BOUNDARY', timeEntryId: e416.id, proposedStartAt: shiftMinutes(e416.inAt, -30), proposedEndAt: e416.outAt, reason: 'Arrived early to set up the espresso machine.' }), 'REJECT', 'Setup starts at the scheduled time.'); outcome.rejected++; }
    return outcome;
  });

  // 2. Timecards: approve, then finalize every card with recorded time (Owner). The card period spans both
  // past weeks because native payroll needs finalized time for the six days before the pay week as well
  // (Puerto Rico's day-of-rest rule looks back across the workweek boundary).
  const period = { startDate: W.previous, endDate: addDays(W.previous, 6) };
  const cardPeriod = { startDate: W.older, endDate: period.endDate };
  await step('timecards', async () => {
    const owner = await as(ownerId);
    const headers = { 'x-nevora-timecards': '1', 'x-nevora-actor': ownerId };
    const read = async () => { const r = expectOk(await api(owner, 'POST', '/api/timecards', cardPeriod, headers), 'Read timecards'); if (r.state !== 'ready') fail('Timecards unavailable'); return r.cards; };
    const counts = { approved: 0, finalized: 0, skipped: 0 };
    for (const action of ['APPROVE', 'FINALIZE']) {
      for (const card of await read()) {
        const entries = card.source?.entries?.length ?? 0;
        if (!entries) { if (action === 'APPROVE') counts.skipped++; continue; }
        if (action === 'APPROVE' ? !['DRAFT', 'REOPENED', 'NEEDS_REVIEW'].includes(card.state) : card.state !== 'APPROVED') continue;
        const result = await api(owner, 'POST', '/api/manager/timecards', { operationId: randomUUID(), employeeId: card.source.employeeId, ...cardPeriod, action, expectedRevision: card.revision, expectedSourceHash: card.sourceHash }, headers);
        if (result.status !== 200) { summary.warnings.push(`${action} ${card.source.employeeId}: ${result.status} ${JSON.stringify(result.json).slice(0, 200)}`); continue; }
        counts[action === 'APPROVE' ? 'approved' : 'finalized']++;
      }
    }
    return counts;
  });

  // 3. Native payroll setup (Owner): company payroll settings, then each person's wage/tax facts and opening YTD.
  const payrollHeaders = { 'x-nevora-payroll': '1' };
  const payday = addDays(period.endDate, 5);
  await step('payroll-setup', async () => {
    const owner = await as(ownerId);
    expectOk(await api(owner, 'POST', '/api/payroll/settings', { action: 'SAVE_SETTINGS', operationId: randomUUID(), expectedRevision: 0, effectiveFrom: `${W.older.slice(0, 4)}-01-01`,
      reason: 'Fictional demo company payroll settings', preferences: { companyName: accounts.company, language: 'en', currency: 'USD',
        schedule: { frequency: 'WEEKLY', anchorDate: W.older, paydayOffsetDays: 5 }, rules: [], automation: { prepare: false, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } }, payrollHeaders), 'Payroll settings');
    const people = await q(`SELECT e.id, array_agg(DISTINCT t.location_id) AS locations FROM employees e JOIN time_entries t ON t.employee_id=e.id
      WHERE (t.clock_in_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date GROUP BY e.id ORDER BY e.id`, [TZ, period.startDate, period.endDate]);
    const year = Number(period.startDate.slice(0, 4));
    const rates = { LEAD: '1650', EMPLOYEE: '1150' };
    const roles = Object.fromEntries(accounts.accounts.map(a => [a.employeeId, a.role]));
    let profiles = 0;
    for (const [index, person] of people.entries()) {
      const workweekPolicy = { version: 'PR_WORKWEEK_POLICY_V1', id: `IVC-WP-${person.id}`, revision: 1, employeeId: person.id, effectiveFrom: `${year}-01-01T00:00:00-04:00`, effectiveTo: null,
        boundary: { weekday: 1, startTime: '00:00', timeZone: TZ }, federalWorkweek: 'SAME_VERIFIED_BOUNDARY', federalEvidenceReference: 'Fictional demo: FLSA workweek matches the Monday boundary',
        origin: { kind: 'EMPLOYER_NOTICE', noticeReference: 'Fictional demo: written workweek notice in the onboarding packet', deliveredAt: `${year - 1}-12-01T12:00:00-04:00`, deliveryMethod: 'WRITTEN_EMPLOYEE', employeeCoverageConfirmed: true, noticeKind: 'INITIAL', previousPolicyReference: null } };
      const configuration = { schema: 'NEVORA_NATIVE_CONFIGURATION_V1', employeeId: person.id,
        wages: [{ id: `IVC-WAGE-${person.id}`, revision: 1, effectiveFrom: `${year}-01-01T00:00:00-04:00`, effectiveTo: null, locationIds: person.locations, hourlyRateMinor: String(Number(rates[roles[person.id]] ?? '1150') + (index % 4) * 25),
          compensation: 'HOURLY', employment: 'PR_PRIVATE_NONEXEMPT', minimumWageCoverage: 'PR_ACT_47_STANDARD_2026', overtime: 'TIME_AND_HALF', dailyBasis: 'CALENDAR_DAY',
          workweekAnchorDate: W.older, workweekStartTime: '00:00', workweekPolicy, overtimeBasis: 'WEIGHTED_WEEKLY', wageCentRounding: 'UNVERIFIED',
          breakRules: [{ typeId: accounts.breakTypes.rest, treatment: 'PAID_REST' }, { typeId: accounts.breakTypes.meal, treatment: 'UNPAID_RELIEVED_MEAL' }], standardContextAttested: true, evidenceReference: 'Fictional demo: signed wage and context attestation' }],
        tax: { id: `IVC-TAX-${person.id}`, revision: 1, effectiveFrom: `${year}-01-01`, effectiveTo: null, coverage: 'PR_REGULAR_TAXABLE_RESIDENT',
          certificate: { personal: 'INDIVIDUAL_FULL', fullDependents: index % 3, halfDependents: 0, deductionAllowances: 0, veteran: false, additionalMethod: 'FIXED', additionalBasisPoints: null, wageDollarRounding: 'NONE', additionalMinor: '0' },
          certificateReference: 'Fictional demo: signed Form 499R-4', ficaCoverage: 'STANDARD', sinotCoverage: 'STANDARD', sinotEmployeeBasisPoints: 30, prCentRounding: 'HALF_UP',
          // The app's own scoped 2026 professional direction for PR withholding cents (src/lib/payroll/native/pr-income-cent-policy.ts).
          ruleEvidenceReference: 'OWNER_ATTESTED_ACCOUNTANT_PR_2026_FINAL_PERIODIC_HALF_UP_20261014', employerContributions: ['FUTA', 'PR_UI', 'CFSE'].map(code => ({ code, label: code, applicability: 'EXEMPT', basisPoints: null, capMinor: null, wagesBeforeMinor: '0', evidenceReference: `Fictional demo: verified ${code} treatment` })), employerCoverageAttested: true },
        deductions: [],
        // The app's Owner-authorized provisional 2026 calculation policy (src/lib/payroll/native/provisional-policy.ts):
        // exact earnings, one HALF_UP paycheck total. Without it the native calculator accepts only exact-cent amounts.
        calculationPolicyReference: 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014' };
      expectOk(await api(owner, 'POST', '/api/payroll/native-profiles', { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional demo wage and tax facts reviewed', expectedRevision: 0, configuration }, payrollHeaders), `Native profile ${person.id}`);
      expectOk(await api(owner, 'POST', '/api/payroll/native-profiles', { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), reason: 'Fictional demo opening balance is zero', expectedRevision: 0, employeeId: person.id,
        ytd: { year, revision: 1, evidenceReference: 'Fictional demo: new hire, no prior wages this year', attested: true, grossMinor: '0', netMinor: '0', socialSecurityWagesMinor: '0', medicareWagesMinor: '0', sinotWagesMinor: '0', deductions: {}, employerContributions: {}, locationIds: [], employerWagesMinor: { FUTA: '0', PR_UI: '0', CFSE: '0' }, ledgerFingerprint: 'b'.repeat(64) } }, payrollHeaders), `Opening YTD ${person.id}`);
      profiles++;
    }
    return { profiles, payday };
  });

  // 4. Period close for the previous week: who is in this pay period (Owner).
  await step('period-close', async () => {
    const owner = await as(ownerId);
    const headers = { 'x-nevora-period-close': '1', 'x-nevora-actor': ownerId };
    const read = expectOk(await api(owner, 'POST', '/api/period-close', { action: 'READ', command: period }, headers), 'Read period close').result;
    const withTime = new Set((await q(`SELECT DISTINCT employee_id FROM time_entries WHERE (clock_in_at AT TIME ZONE $1)::date BETWEEN $2::date AND $3::date`, [TZ, period.startDate, period.endDate])).map(r => r.employee_id));
    const members = read.members.map(m => withTime.has(m.employeeId)
      ? { employeeId: m.employeeId, disposition: 'INCLUDE', reason: 'Worked recorded, finalized hours this week', employmentFacts: 'Fictional demo: active hourly employee', employmentBasis: 'MANAGER_ATTESTED' }
      : { employeeId: m.employeeId, disposition: 'EXCLUDE', reason: 'Salaried or not working this week in the fictional demo', employmentFacts: 'Fictional demo: not on hourly payroll this week', employmentBasis: 'MANAGER_ATTESTED' });
    const saved = expectOk(await api(owner, 'POST', '/api/period-close', { action: 'POPULATION', command: { operationId: randomUUID(), expectedRevision: read.population?.revision ?? 0, sourceHash: read.sourceHash, ...period, members } }, headers), 'Save population');
    return { included: members.filter(m => m.disposition === 'INCLUDE').length, excluded: members.filter(m => m.disposition === 'EXCLUDE').length, state: saved.state };
  });

  // 5. One native payroll run: prepare, approve, then one worker pass to generate and publish documents.
  await step('payroll-run', async () => {
    const owner = await as(ownerId);
    const prepared = expectOk(await api(owner, 'POST', '/api/payroll/runs', { action: 'PREPARE', operationId: randomUUID(), period, payday }, payrollHeaders), 'Prepare run').receipt;
    const listed = expectOk(await api(owner, 'GET', '/api/payroll/runs', undefined, payrollHeaders), 'Read runs');
    const run = listed.runs.find(r => r.id === prepared.runId);
    if (run?.status !== 'REVIEW_REQUIRED') fail(`Prepared run is ${run?.status}: ${JSON.stringify(run?.exceptions ?? run).slice(0, 600)}`);
    expectOk(await api(owner, 'POST', '/api/payroll/runs', { action: 'APPROVE', operationId: randomUUID(), runId: run.id, expectedRevision: run.revision, reviewToken: run.reviewToken }, payrollHeaders), 'Approve run');
    const worker = () => {
      const result = spawnSync(process.execPath, ['scripts/with-env-file.mjs', workerEnvFile, process.execPath, '--conditions=react-server', '--import', './scripts/node-server-context.mjs', '--import', 'tsx', 'scripts/payroll-worker.ts'], { encoding: 'utf8', timeout: 180000 });
      if (result.status !== 0) fail(`Payroll worker failed: ${(result.stderr || result.stdout).slice(-400)}`);
      return result.stdout.trim().split('\n').at(-1);
    };
    const passes = [worker(), worker()];
    const after = expectOk(await api(owner, 'GET', '/api/payroll/runs', undefined, payrollHeaders), 'Read runs');
    const final = after.runs.find(r => r.id === run.id);
    return { runId: run.id, status: final?.status, documents: final?.documents?.length ?? 0, published: final?.documents?.some(d => d.published) ?? false, gross: final?.totals?.grossMinor, workerPasses: passes.length };
  });

  // 6. Time off, through the Requests pages: pending, approved, partial-day, declined and withdrawn.
  await step('time-off', async () => {
    const today = W.today;
    const submit = async (employeeId, { start, end, partial, reason }) => {
      const s = await as(employeeId), page = s.page;
      await page.goto(appUrl + '/app/requests?tab=new', { waitUntil: 'domcontentloaded' });
      if (partial) await page.getByRole('button', { name: 'Part of a day', exact: true }).click();
      await page.locator('#timeoff-start-date').fill(start);
      if (partial) { await page.locator('#timeoff-start-time').fill(partial[0]); await page.locator('#timeoff-end-time').fill(partial[1]); }
      else await page.locator('#timeoff-end-date').fill(end);
      if (reason) await page.locator('#timeoff-note').fill(reason);
      await Promise.all([page.waitForURL(u => u.searchParams.get('submitted') === '1', { timeout: 30000 }), page.getByRole('button', { name: 'Send', exact: true }).click()]);
      const [row] = await q('SELECT id FROM time_off_requests WHERE employee_id=$1 AND start_date=$2 ORDER BY created_at DESC LIMIT 1', [employeeId, start]);
      return row.id;
    };
    const decide = async (managerId, requestId, decision) => {
      const page = (await as(managerId)).page;
      await page.goto(appUrl + `/app/requests?requestId=${requestId}`, { waitUntil: 'domcontentloaded' });
      const button = page.locator(`form:has(input[name="requestId"][value="${requestId}"]) button[name="decision"][value="${decision}"]`).first();
      await Promise.all([page.waitForURL(u => u.searchParams.has('reviewed') || u.searchParams.has('decided') || u.searchParams.has('error'), { timeout: 30000 }), button.click()]);
      if (new URL(page.url()).searchParams.has('error')) fail(`Decision ${decision} for ${requestId} was not saved.`);
    };
    const withdraw = async (employeeId, requestId) => {
      const page = (await as(employeeId)).page;
      await page.goto(appUrl + `/app/requests?requestId=${requestId}`, { waitUntil: 'domcontentloaded' });
      // The request opens as a sheet from its row in the list.
      await page.waitForLoadState('networkidle');
      await page.locator(`li#request-${requestId} > button[aria-haspopup="dialog"]`).click();
      await page.locator(`li#request-${requestId} dialog[open]`).waitFor();
      const form = page.locator(`li#request-${requestId} form[aria-label^="Withdraw request"]`);
      await form.getByText('Yes, withdraw this request').click();
      await form.getByRole('button', { name: /Withdraw request/ }).click();
      for (let i = 0; i < 60; i++) {
        const [row] = await q('SELECT status FROM time_off_requests WHERE id=$1', [requestId]);
        if (row?.status === 'CANCELLED') return;
        await page.waitForTimeout(500);
      }
      fail(`Withdrawal of ${requestId} was not recorded.`);
    };
    const d = n => addDays(today, n);
    const ids = {};
    ids.pending1 = await submit('IVC-412', { start: d(16), end: d(17), reason: 'Family wedding in Ponce' });
    ids.pending2 = await submit('IVC-418', { start: d(21), end: d(21), reason: 'Medical appointment' });
    ids.pending3 = await submit('IVC-303', { start: d(30), end: d(34), reason: 'Vacation' });
    ids.approved1 = await submit('IVC-402', { start: d(9), end: d(10), reason: 'Moving to a new apartment' });
    ids.approved2 = await submit('IVC-421', { start: d(12), end: d(13) });
    ids.partial = await submit('IVC-405', { start: d(8), partial: ['09:00', '13:00'], reason: 'Dentist in the morning' });
    ids.declined1 = await submit('IVC-414', { start: d(5), end: d(6), reason: 'Concert in San Juan' });
    ids.declined2 = await submit('IVC-422', { start: d(7), end: d(7) });
    ids.withdrawn1 = await submit('IVC-409', { start: d(18), end: d(19), reason: 'Trip, plans changed' });
    ids.withdrawn2 = await submit('IVC-420', { start: d(25), end: d(25) });
    // Team time off needs company-wide access, so the company-wide Manager and the Owner decide.
    await decide(S.companyManager, ids.approved1, 'APPROVED');
    await decide(ownerId, ids.approved2, 'APPROVED');
    await decide(S.companyManager, ids.partial, 'APPROVED');
    await decide(S.companyManager, ids.declined1, 'DENIED');
    await decide(ownerId, ids.declined2, 'DENIED');
    await withdraw('IVC-409', ids.withdrawn1);
    await withdraw('IVC-420', ids.withdrawn2);
    const states = await q('SELECT status, count(*)::int AS n FROM time_off_requests GROUP BY status ORDER BY status');
    return Object.fromEntries(states.map(r => [r.status, r.n]));
  });

  // 7. Shift changes at Condado: two swaps, two open coverage offers and one callout.
  await step('shift-changes', async () => {
    const future = async employeeId => q(`SELECT sh.id, sh.date::text AS date, sh.start_time::text AS start FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id
      WHERE sh.employee_id=$1 AND s.status='PUBLISHED' AND s.week_start=$2 AND ((sh.date::text || ' ' || sh.start_time::text)::timestamp AT TIME ZONE $3) > now() + interval '2 hours'
      ORDER BY sh.date, sh.start_time`, [employeeId, W.current, TZ]);
    const out = { swaps: [], coverage: [], callout: null };
    // Submit the shift-change form, then wait until the database shows the result.
    const formSubmit = async (page, buttonName, recorded) => {
      await page.getByRole('button', { name: buttonName }).first().click();
      for (let i = 0; i < 60; i++) {
        const value = await recorded();
        if (value) return value;
        const failure = await page.locator('.form-error').first().textContent({ timeout: 200 }).catch(() => null);
        if (failure) fail(failure.trim());
        await page.waitForTimeout(500);
      }
      fail('The shift-change request was not recorded.');
    };
    // Decide one request: its buttons sit in a form that carries the request ID, inline (Manager inbox) or
    // inside the sheet its row opens (employee lists). Then wait until the database shows the new status.
    const act = async (page, path, requestId, buttonName, table, done) => {
      await page.goto(appUrl + path, { waitUntil: 'networkidle' });
      const form = page.locator(`form:has(input[name="requestId"][value="${requestId}"])`).first();
      if (!(await form.isVisible())) {
        await page.locator(`li#request-${requestId} > button[aria-haspopup="dialog"]`).first().click();
        await form.waitFor();
      }
      await form.getByRole('button', { name: buttonName }).first().click();
      for (let i = 0; i < 60; i++) {
        const [row] = await q(`SELECT status FROM ${table} WHERE id=$1`, [requestId]);
        if (done(row?.status)) return row.status;
        await page.waitForTimeout(500);
      }
      fail(`${path}: ${requestId} did not reach the expected status.`);
    };
    // Swaps: the requester picks one of the partner's shifts on the Swap page.
    for (const [index, [requester, partner]] of S.swaps.entries()) {
      const mine = await future(requester), theirs = new Set((await future(partner)).map(s => s.id));
      if (!mine.length || !theirs.size) { summary.warnings.push(`Swap ${requester}↔${partner}: no future published shifts left this week.`); continue; }
      const page = (await as(requester)).page;
      let sent = false;
      for (const source of mine) {
        await page.goto(appUrl + `/app/exchange/swap?sourceShiftId=${source.id}`, { waitUntil: 'domcontentloaded' });
        const options = page.locator('input[type="radio"]');
        if (!(await options.count())) continue;
        let picked = false;
        for (let i = 0; i < await options.count(); i++) { const value = await options.nth(i).getAttribute('value'); if (theirs.has(value)) { await options.nth(i).check({ force: true }); picked = true; break; } }
        if (!picked) continue;
        sent = await formSubmit(page, /^Send swap request to /, async () => (await q("SELECT id FROM shift_exchanges WHERE kind='SWAP' AND requested_by_employee_id=$1 ORDER BY created_at DESC LIMIT 1", [requester]))[0]);
        break;
      }
      if (!sent) { summary.warnings.push(`Swap ${requester}↔${partner}: no eligible target on the Swap page.`); continue; }
      const exchange = sent;
      out.swaps.push(exchange.id);
      if (index === 0) {
        // The partner accepts under Shift requests › For you, then the company-wide Manager approves.
        await act((await as(partner)).page, '/app/exchange?tab=foryou', exchange.id, /^Accept/, 'shift_exchanges', status => status && status !== 'EMPLOYEE_PENDING');
        await act((await as(S.companyManager)).page, '/app/exchange?tab=requests', exchange.id, /^Approve/, 'shift_exchanges', status => status && status !== 'MANAGER_PENDING');
      }
    }
    // Two open coverage offers: the shift stays with its owner until someone picks it up.
    for (const employeeId of S.coverage) {
      const [source] = await future(employeeId);
      if (!source) { summary.warnings.push(`Coverage by ${employeeId}: no future published shift this week.`); continue; }
      const page = (await as(employeeId)).page;
      await page.goto(appUrl + `/app/exchange/swap?sourceShiftId=${source.id}&mode=cover`, { waitUntil: 'domcontentloaded' });
      await formSubmit(page, /^Offer$/, async () => (await q("SELECT id FROM shift_exchanges WHERE kind='COVERAGE' AND requested_by_employee_id=$1", [employeeId]))[0]);
      out.coverage.push(source.id);
    }
    // One callout, waiting for a Manager.
    const [calloutShift] = await future(S.callout);
    if (calloutShift) {
      const page = (await as(S.callout)).page;
      await page.goto(appUrl + `/app/exchange/callout?shiftId=${calloutShift.id}`, { waitUntil: 'networkidle' });
      await page.getByText('Illness / sick', { exact: true }).click();
      await page.locator('textarea[name="reasonNote"]').fill('Fever since last night.');
      await formSubmit(page, /^Send/, async () => (await q('SELECT id FROM shift_callouts WHERE shift_id=$1', [calloutShift.id]))[0]);
      out.callout = calloutShift.id;
    } else summary.warnings.push('Callout: no future published shift this week.');
    const rows = await q('SELECT kind, status, count(*)::int AS n FROM shift_exchanges GROUP BY kind, status ORDER BY kind, status');
    const callouts = await q('SELECT status, count(*)::int AS n FROM shift_callouts GROUP BY status');
    return { ...out, exchanges: rows, callouts };
  });

  // 8. Three updates from the Owner and the company-wide Manager, one requiring acknowledgement.
  await step('updates', async () => {
    const publish = async (authorId, title, message, review) => {
      const page = (await as(authorId)).page;
      await page.goto(appUrl + '/app/updates/compose', { waitUntil: 'networkidle' });
      if (await page.getByText('Couldn’t load the form').count()) return 'held';
      await page.getByLabel('Title', { exact: true }).fill(title);
      await page.getByLabel('Message', { exact: true }).fill(message);
      if (review) await page.getByLabel('Review requirement', { exact: true }).selectOption('REQUIRED');
      await page.getByRole('button', { name: 'Preview audience', exact: true }).click();
      const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/manager/communications' && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Publish update', exact: true }).click();
      const result = await (await response).json();
      if (result.status !== 'committed') fail(`Update "${title}" was not published: ${JSON.stringify(result)}`);
      return 'published';
    };
    const results = [
      await publish(ownerId, 'Nuevo menú de otoño', 'Starting Monday every location serves the autumn menu: pumpkin spice latte, quesito de guayaba and mallorca. Tasting at 8:00 AM in Condado.', false),
      await publish(ownerId, 'Safety: new espresso machine procedure', 'Please read the new steam wand cleaning procedure before your next shift and confirm you have read it.', true),
      await publish(S.companyManager, 'Parking at Aeropuerto LMM', 'Staff parking moves to Lot C next week. Bring your badge.', false),
    ];
    if (results.includes('held')) summary.skipped.push('Updates: not published. The app holds Updates (D04 activation hold, src/lib/communications/sql.ts) everywhere except owned loopback test databases, so a nevora_demo database cannot publish them.');
    return { published: results.filter(r => r === 'published').length, held: results.filter(r => r === 'held').length };
  });
} finally {
  // Closing counts.
  const counts = await q(`SELECT
    (SELECT count(*) FROM locations)::int AS locations,
    (SELECT jsonb_object_agg(role,n) FROM (SELECT role,count(*)::int n FROM employees GROUP BY role) r) AS people,
    (SELECT jsonb_object_agg(k,n) FROM (SELECT s.week_start::text||' '||s.status AS k,count(*)::int n FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id GROUP BY 1) w) AS shifts,
    (SELECT count(*) FROM time_entries)::int AS time_entries,
    (SELECT count(*) FROM time_entries WHERE clock_out_at IS NULL)::int AS open_entries,
    (SELECT count(*) FROM break_entries)::int AS breaks,
    (SELECT jsonb_object_agg(k,n) FROM (SELECT (SELECT e.event_kind FROM time_correction_events e WHERE e.request_id=r.id ORDER BY e.revision DESC LIMIT 1) AS k,count(*)::int n FROM time_correction_requests r GROUP BY 1) c) AS corrections,
    (SELECT jsonb_object_agg(status,n) FROM (SELECT status,count(*)::int n FROM time_off_requests GROUP BY status) t) AS time_off,
    (SELECT jsonb_object_agg(kind||' '||status,n) FROM (SELECT kind,status,count(*)::int n FROM shift_exchanges GROUP BY kind,status) x) AS exchanges,
    (SELECT count(*) FROM shift_callouts)::int AS callouts,
    (SELECT count(*) FROM communications)::int AS updates,
    (SELECT count(*) FROM payroll_runs)::int AS payroll_runs,
    (SELECT count(*) FROM payroll_publications)::int AS payroll_publications,
    (SELECT count(*) FROM payroll_documents)::int AS payroll_documents`).catch(error => [{ error: error.message }]);
  summary.counts = counts[0];
  summary.finishedAt = new Date().toISOString();
  await mkdir(evidence, { recursive: true });
  await writeFile(join(evidence, 'phase-b-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  log(`summary written to ${join(evidence, 'phase-b-summary.json')}`);
  for (const s of sessions.values()) await s.context.close().catch(() => {});
  await browser.close().catch(() => {});
  await db.end().catch(() => {});
}
