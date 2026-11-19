import { afterAll, beforeAll, expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import { fictionalProfile } from '../fixtures/shift-changes';
import { businessDate } from '../../lib/business-time';
import { addDays, weekStartFor } from '../../lib/date-utils';
import type { WeeklyComparison, WeeklyPlanReview, WeeklyResult } from '../../lib/owner-advisor/weekly-contracts';
import { runBeforeRecoveryDeadline } from '../../../scripts/browser-response-deadline.mjs';

type Route = { request(): { url(): string; method(): string; postDataJSON(): { op?: string } };
  fetch(): Promise<{ status(): number }>; abort(reason?: string): Promise<void>; continue(): Promise<void> };
type Response = { url(): string; status(): number; json(): Promise<WeeklyResult>; request(): { method(): string; postDataJSON(): { op?: string } } };
const runtimeRequire = createRequire(resolve('tools/ci-browser-runtime/package.json'));
const runtime = runtimeRequire('playwright');
let app: Awaited<ReturnType<typeof createOwnedNextApp>>, evidence: string, monday: string;
const checks: string[] = [], external: string[] = [], errors: string[] = [];
const navigationControls: Record<string, unknown>[] = [];
let completedEngines = 0;

beforeAll(async () => {
  if (!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE) throw Error('External evidence path required');
  evidence = resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE, 'weekly-real-ui');
  await mkdir(evidence, { recursive: true });
  app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true, ownerAdvisorWeeklyEnabled: true, ownerAdvisorKnowledgeEnabled: true });
  await seedOwnedApp(app.database.executor);
  const q = app.database.executor.query.bind(app.database.executor);
  const workspace = await q<{ time_zone: string }>({ text: 'SELECT time_zone FROM workspaces WHERE singleton=true', values: [] });
  monday = weekStartFor(businessDate(new Date(), workspace[0].time_zone));
  await q({ text: `DELETE FROM location_coverage_windows;
    INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time)
    SELECT 'weekly-'||id||'-'||day,id,day,'08:00','12:00' FROM locations CROSS JOIN unnest(ARRAY[1,2]) day WHERE id IN ('loc-1','loc-2');
    INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
    ('WEEK-A','Fictional Avery','Weekly <script>literal</script>','555-0131','EMPLOYEE','loc-1'),
    ('WEEK-B','Fictional Blair','Weekly','555-0132','EMPLOYEE','loc-1');
    INSERT INTO employee_location_eligibility(employee_id,location_id)
    SELECT employee_id,location_id FROM unnest(ARRAY['WEEK-A','WEEK-B']) employee_id CROSS JOIN unnest(ARRAY['loc-1','loc-2']) location_id;
    INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time)
    SELECT employee_id||'-'||day,employee_id,day,'08:00','12:00' FROM unnest(ARRAY['WEEK-A','WEEK-B']) employee_id CROSS JOIN unnest(ARRAY[1,2]) day;`, values: [] });
  await q({ text: "INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) SELECT id,40,$1::jsonb FROM employees WHERE id LIKE 'WEEK-%'", values: [JSON.stringify(fictionalProfile())] });
  for (let offset = 1; offset <= 4; offset++) await q({ text: "INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) SELECT id,$1,true FROM employees WHERE id LIKE 'WEEK-%'", values: [addDays(monday, offset * 7)] });
});

afterAll(async () => {
  if (!app) return;
  await app.close();
  await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete: completedEngines === 2, checks, external, errors, navigationControls,
    source: app.sourceHashes, modelConfigured: false, data: 'Fictional owned loopback PostgreSQL only',
    api: 'Actual Next authentication, weekly route, SQL solver and writer; no synthetic API responses',
    fault: 'Actual apply fetched to completion, then reply aborted; first recovery request also aborted' }, null, 2));
});

it.each(['chromium', 'webkit'])('%s reviews full weekly changes, rejects stale approval, recovers a lost commit and declines without writing', async engine => {
  const index = engine === 'chromium' ? 0 : 1, offset = 1 + index * 2, week = addDays(monday, offset * 7);
  const origin = app.url.replace('127.0.0.1', 'localhost');
  const browser = await runtime[engine].launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const { observeBrowserCell } = await import(pathToFileURL(resolve('scripts/phase-e-browser-qa.mjs')).href);
  const { verifyReloadFetchDiagnostic } = await import(pathToFileURL(resolve('scripts/browser-reload-diagnostic.mjs')).href);
  const diagnostics = { engine, navigationDiagnostics: [] };
  const runtimeErrors: unknown[] = [];
  const controls: Record<string, {verified: boolean}> = {};
  let observer: ReturnType<typeof observeBrowserCell>;
  let page: Awaited<ReturnType<typeof context.newPage>>;
  const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query({ text, values });
  const before = await app.database.executor.query<{ n: number }>({ text: 'SELECT count(*)::int n FROM shifts', values: [] });
  const priorCount = before[0].n;
  const visualFailures: unknown[] = [];
  let phase = 'login', dropSave = false, dropCheck = false, committedBeforeLoss = false, applyPosts = 0;
  const observed: { op: string; status: number; state?: string }[] = [];
  const pendingRouterReads = new Set<object>(), pendingShellReads = new Set<object>();
  let navigationAttempts = 0;
  type ReadRequest = {url():string;method():string;headers():Record<string,string>};
  const beforeHardNavigation = async () => {
    navigationAttempts++;
    // The old document can already have emitted networkidle while a later RSC
    // stream is unfinished. Let that stream finish before it can remount shell
    // readers, then retire and drain the shell before starting another document.
    await expect.poll(() => pendingRouterReads.size, {timeout:20000}).toBe(0);
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await expect.poll(() => pendingShellReads.size, {timeout:20000}).toBe(0);
    await page.waitForLoadState('networkidle');
  };

  try {
    if (engine === 'webkit') {
      for (const resource of ['notifications', 'authority']) {
        controls[resource] = await verifyReloadFetchDiagnostic(browser, { resource, bothWitnesses: true });
      }
    }
    const cell = observeBrowserCell(diagnostics, runtimeErrors, {
      navigationDiagnosticVerified: controls.notifications?.verified === true,
      reloadDiagnosticVerified: controls.notifications?.verified === true,
      authorityDiagnosticVerified: controls.authority?.verified === true,
      navigationReadKinds: ['notification-read', 'authority-read'],
      requireNotificationGetWitness: true,
      requireAuthorityGetWitness: true,
    });
    observer = cell;
    await cell.observeContext(context, 'primary');
    page = await context.newPage();
  page.on('request', (request: ReadRequest) => {const url=new URL(request.url());if(url.origin!==origin||request.method()!=='GET')return;if(request.headers().rsc==='1')pendingRouterReads.add(request);if(['/api/company-access/operational-authority','/api/notifications'].includes(url.pathname))pendingShellReads.add(request);});
  for(const event of ['requestfinished','requestfailed'])page.on(event,(request:object)=>{pendingRouterReads.delete(request);pendingShellReads.delete(request);});

    await context.route('**/*', async (route: Route) => {
      const req = route.request(), url = new URL(req.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); return; }
      if (url.pathname === '/api/owner/advisor/weekly' && req.method() === 'POST') {
        const op = req.postDataJSON().op;
        if (op === 'apply_week_plan') applyPosts++;
        if (dropSave && op === 'apply_week_plan') {
          dropSave = false; const actual = await route.fetch(); committedBeforeLoss = actual.status() === 200;
          await route.abort('connectionreset'); return;
        }
        if (dropCheck && op === 'check_week_plan') { dropCheck = false; await route.abort('connectionreset'); return; }
      }
      await route.continue();
    });
    page.on('pageerror', (error: Error) => {
      if (phase === 'lost committed response and reload recovery' && cell.isNavigationDiagnostic(error)) return;
      errors.push(engine + ':' + phase + ':' + error.message);
    });
    page.setDefaultTimeout(20000);
    const responseWaitErrors: string[] = [];
    const response = (op: string) => {
      const pending = page.waitForResponse((r: Response) => r.url().endsWith('/api/owner/advisor/weekly') && r.request().method() === 'POST' && r.request().postDataJSON().op === op);
      // Keep cleanup rejections owned; a successful scenario still requires none.
      void pending.catch((error: unknown) => responseWaitErrors.push(String(error)));
      return pending;
    };
    const result = async (pending: Promise<Response>) => {
      const r = await pending; expect(r.status()).toBe(200);
      const body = await runBeforeRecoveryDeadline(() => r.json(), performance.now() + 20000);
      observed.push({ op: r.request().postDataJSON().op!, status: r.status(), state: body.state }); return body;
    };
    await page.goto(origin + '/login');
    await page.getByLabel('Employee ID', { exact: true }).fill('QAOWNER');
    await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(origin + '/app');
    const notificationReadReady = () => page.locator('.portal-notification-bell[data-state="ready"]').first().waitFor({state:'attached'});
    let enteredFromManager = false, navigationControlCompleted = false;
    const openForm = async (steps: number) => {
      await notificationReadReady();
      if (!enteredFromManager) {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.locator('#desktop-primary-navigation').getByRole('link', { name: 'AI manager', exact: true }).click();
        await page.waitForURL(origin + '/app/ai-manager');
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('main').getByRole('link', { name: 'Weekly plan', exact: true }).click();
        await page.waitForURL(origin + '/app/ai-manager/weekly'); enteredFromManager = true;
      } else {await beforeHardNavigation();await page.goto(origin + '/app/ai-manager/weekly');}
      await page.getByRole('button', { name: 'Compare options', exact: true }).waitFor();
      if(!navigationControlCompleted){
    // An earlier document-idle event cannot prove a later real RSC read ended.
    // Hold that read and require the navigation barrier to wait for its body.
    const priorPhase=phase;phase='hard navigation read-drain control';await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await expect.poll(()=>pendingShellReads.size,{timeout:20000}).toBe(0);await page.waitForLoadState('networkidle');
    let releaseProbe:()=>void=()=>{},probeArrived:()=>void=()=>{},holdProbe=true;
    const probeGate=new Promise<void>(resolve=>{releaseProbe=resolve;}),probeSeen=new Promise<void>(resolve=>{probeArrived=resolve;});
    const probePattern='**/app/ai-manager/weekly?__qa_drain=1';
    await page.route(probePattern,async(route:{request():{headers():Record<string,string>};continue():Promise<void>})=>{if(holdProbe&&route.request().headers().rsc==='1'){probeArrived();await probeGate;}await route.continue();});
    let waiting:Promise<void>|undefined,settled=false;
    try{
      await page.evaluate(()=>{void fetch('/app/ai-manager/weekly?__qa_drain=1',{cache:'no-store',headers:{RSC:'1'}}).then(response=>response.text()).catch(()=>{});});
      await runBeforeRecoveryDeadline(()=>probeSeen,performance.now()+20000);await page.waitForLoadState('networkidle');expect(pendingRouterReads.size).toBeGreaterThan(0);
      waiting=beforeHardNavigation().then(()=>{settled=true;});await expect.poll(()=>navigationAttempts).toBe(1);
      await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
      expect(settled).toBe(false);const heldReads=pendingRouterReads.size;expect(heldReads).toBeGreaterThan(0);
      holdProbe=false;releaseProbe();await waiting;expect(pendingRouterReads.size).toBe(0);
      navigationControls.push({engine,previousIdleWithPendingReads:heldReads,navigationWaitedForRealBody:true,remaining:pendingRouterReads.size});
    }finally{holdProbe=false;releaseProbe();await waiting?.catch(()=>{});await page.unroute(probePattern);}
    await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));phase=priorPhase;
      navigationControlCompleted=true;
      }
      for (let i = 0; i < steps; i++) await page.getByRole('button', { name: 'Next week', exact: true }).click();
    };
    const compare = async () => {
      const pending = response('compare_week'); await page.getByRole('button', { name: 'Compare options', exact: true }).click();
      const value = await result(pending); expect(value.state).toBe('ready'); expect(value.comparison?.state).toBe('ready');
      expect(value.readReceiptId).toBeNull(); expect(value.review).toBeNull();
      return value.comparison!;
    };
    const review = async (comparison: WeeklyComparison) => {
      const selected = comparison.alternatives.find(a => a.applyEligible); expect(selected).toBeDefined();
      const pending = response('read_week_plan');
      await page.locator(`a[href="/app/ai-manager/weekly?review=${selected!.id}"]`).click();
      const value = await result(pending); expect(value.review?.id).toBe(selected!.id); expect(value.readReceiptId).toMatch(/^[a-f0-9-]{36}$/);
      const plan = value.review!;
      expect(plan.changes.additions).toHaveLength(plan.added); expect(plan.changes.removals).toHaveLength(plan.removed);
      await page.getByRole('checkbox', { name: 'I reviewed all proposed changes and remaining gaps', exact: true }).waitFor();
      expect(await page.getByRole('button', { name: 'Save as draft', exact: true }).isDisabled()).toBe(true);
      return plan;
    };
    const approve = async () => {
      const checkbox = page.getByRole('checkbox', { name: 'I reviewed all proposed changes and remaining gaps', exact: true });
      await checkbox.focus(); await page.keyboard.press('Space');
      const save = page.getByRole('button', { name: 'Save as draft', exact: true });
      expect(await save.isEnabled()).toBe(true); await save.focus(); await page.keyboard.press('Enter');
    };
    const exactRows = async (plan: WeeklyPlanReview) => {
      const rows = await q(`SELECT sh.employee_id AS "employeeId",s.location_id AS "locationId",sh.date::text,
        left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",sh.position_id AS "positionId",sh.is_designated_lead AS "isDesignatedLead"
        FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$1`, [week]);
      const key = (value: unknown) => JSON.stringify(value);
      const expected = plan.changes.additions.map(({ employeeId, locationId, date, startTime, endTime, positionId, isDesignatedLead }) => ({ employeeId, locationId, date, startTime, endTime, positionId, isDesignatedLead }));
      expect(rows.sort((a,b) => key(a).localeCompare(key(b)))).toEqual(expected.sort((a,b) => key(a).localeCompare(key(b))));
    };

    phase = 'real comparison and complete review'; await openForm(offset); let comparison = await compare();
    expect(comparison.weekStart).toBe(week); expect(comparison.locationScope).toEqual({ kind: 'ALL' });
    let plan = await review(comparison); expect(plan.added).toBe(4);
    expect(await q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: priorCount }]);
    phase = 'responsive and accessible full review';
    await page.evaluate(await readFile(runtimeRequire.resolve('axe-core/axe.min.js'), 'utf8'));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
        shortTargets: [...document.querySelectorAll<HTMLElement>('.wk button,.wk-ack')].filter(el => el.getClientRects().length && el.getBoundingClientRect().height < 44).map(el => el.textContent) }));
      const audit = await page.evaluate("axe.run('.wk',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");
      await writeFile(resolve(evidence, `${engine}-${width}-review-audit.json`), JSON.stringify({ layout, audit }, null, 2));
      await page.screenshot({ path: resolve(evidence, `${engine}-${width}-review.png`), fullPage: true });
      if (layout.overflow || layout.shortTargets.length || audit.violations.length) visualFailures.push({ width, layout, violations: audit.violations });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    checks.push(engine + ': actual authenticated comparison/full read, four exact additions, no writes before acknowledgement; layout/audits retained at320/390/768/1440');

    phase = 'stale save rejected'; await q("UPDATE locations SET short_name=short_name||' QA' WHERE id='loc-1'");
    const stale = response('apply_week_plan'); await approve(); const refusal = await stale; expect(refusal.status()).toBe(409);
    observed.push({ op: 'apply_week_plan', status: refusal.status() });
    await page.getByRole('region', { name: 'Something changed first', exact: true }).waitFor();
    expect(await q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: priorCount }]);
    phase = 'lost committed response and reload recovery'; await openForm(offset); comparison = await compare(); plan = await review(comparison);
    dropSave = true; dropCheck = true; await approve();
    await page.getByRole('region', { name: 'Approval not confirmed', exact: true }).waitFor(); expect(committedBeforeLoss).toBe(true);
    await exactRows(plan);
    const pendingStorage = await page.evaluate(() => JSON.parse(sessionStorage.getItem('nevora.rondo.weekly.pendingApply.v1') ?? 'null'));
    expect(Object.keys(pendingStorage).sort()).toEqual(['acknowledged','authority','readReceiptId','requestId','reviewId','termsDigest']);
    expect(JSON.stringify(pendingStorage)).not.toContain('Fictional');
    await notificationReadReady();
    await beforeHardNavigation();
    const recovered = response('check_week_plan'); await page.reload(); const saved = await result(recovered);
    expect(saved.state).toBe('saved'); expect(saved.receipt?.operationId).toBe(pendingStorage.requestId);
    await page.getByRole('heading', { name: 'What was saved', exact: true }).waitFor();
    expect(saved.progress?.state).toBe('draft'); expect(saved.progress?.assignmentsPresent).toBe(4); expect(saved.progress?.publishedAssignments).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem('nevora.rondo.weekly.pendingApply.v1'))).toBeNull();
    expect(applyPosts).toBe(2); await exactRows(plan);
    expect(await q('SELECT DISTINCT status FROM schedules WHERE week_start=$1', [week])).toEqual([{ status: 'DRAFT' }]);
    expect(await q('SELECT (SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications')).toEqual([{ notifications: 0, publications: 0 }]);
    await page.screenshot({ path: resolve(evidence, `${engine}-saved-after-lost-response.png`), fullPage: true });
    checks.push(engine + ': changed source returns409 with zero writes; real committed lost response reload recovers original operation, no duplicate apply/rows, draft-only and zero notifications/publications');

    phase = 'selected-location decline'; await openForm(offset + 1);
    await page.getByRole('radio', { name: 'Choose locations', exact: true }).check();
    await page.getByRole('group', { name: 'Locations to plan', exact: true }).getByRole('checkbox').first().check();
    const selected = await compare(); expect(selected.locationScope.kind).toBe('SELECTED'); await review(selected);
    const declined = response('decline_week_plan'); await page.getByRole('button', { name: 'Decline', exact: true }).click();
    expect((await result(declined)).state).toBe('declined');
    await page.locator('.wk .b-statecard__t').filter({ hasText: /^Plan declined$/ }).waitFor();
    expect(await q('SELECT count(*)::int n FROM shifts')).toEqual([{ n: priorCount + 4 }]);
    checks.push(engine + ': selected-location compare/review/decline leaves business rows unchanged');

    phase = 'generated-draft rebuild full inspection'; await openForm(offset);
    await page.getByRole('radio', { name: /^Rebuild generated drafts/ }).check();
    const rebuilt = await compare(); expect(rebuilt.mode).toBe('BUILD_WEEK');
    const changed = rebuilt.alternatives.find(a => a.applyEligible && a.removed > 0);
    expect(changed).toBeDefined(); const read = response('read_week_plan');
    await page.locator(`a[href="/app/ai-manager/weekly?review=${changed!.id}"]`).click();
    const replacement = await result(read); expect(replacement.review?.changes.removals.length).toBe(changed!.removed);
    expect(replacement.review?.changes.additions.length).toBe(changed!.added);
    expect(await page.getByRole('button', { name: 'Save as draft', exact: true }).isDisabled()).toBe(true);
    expect(await page.getByText('Fictional Avery Weekly <script>literal</script>', { exact: true }).count()).toBeGreaterThan(0);
    expect(await page.evaluate("document.querySelector('.wk script')")).toBeNull();
    checks.push(engine + ': BUILD_WEEK exposes complete generated replacements, acknowledgement resets; untrusted name stays literal');

    phase = 'session revocation'; await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");
    const denied = response('decline_week_plan'); await page.getByRole('button', { name: 'Decline', exact: true }).click();
    const denial = await denied; expect([401,403]).toContain(denial.status());
    await page.locator('.wk').getByRole('alert').getByText('Your session ended', { exact: true }).waitFor();
    expect(await page.locator('.wk').getByText(/Fictional Avery|Fictional Blair/).count()).toBe(0);
    expect(await page.evaluate(() => sessionStorage.getItem('nevora.rondo.weekly.pendingApply.v1'))).toBeNull();
    checks.push(engine + ': revoked real session clears private review DOM and pending custody');
    if (engine === 'webkit') for (const control of Object.values(controls)) expect(control.verified).toBe(true);
    expect(runtimeErrors).toEqual([]); expect(visualFailures).toEqual([]); expect(responseWaitErrors).toEqual([]); expect(external).toEqual([]); expect(errors).toEqual([]); completedEngines++;
  } catch (error) {
    await writeFile(resolve(evidence, `${engine}-failure.json`), JSON.stringify({ phase, message: String(error), observed }, null, 2));
    await page?.screenshot({ path: resolve(evidence, `${engine}-failed.png`), fullPage: true, timeout: 5000 }).catch(() => {}); throw error;
  } finally {
    observer?.setPhase('context-close');
    await context.unrouteAll({behavior:'wait'});await context.close(); await browser.close();
    await writeFile(resolve(evidence, engine + '-navigation.json'), JSON.stringify({ controls, diagnostics, runtimeErrors }, null, 2));
  }
});
