import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { seedOwnedApp, seedOwnedScenario, TEST_PASSWORD } from '../src/test/integration/owned-app-fixture.ts';
import { updateShift } from '../src/test/integration/management-api.ts';

const evidence = process.env.PHASE_A_EVIDENCE_DIR;
const runtimeRoot = process.env.PLAYWRIGHT_RUNTIME_ROOT;
assert(evidence && isAbsolute(evidence), 'Explicit external evidence directory required');
assert(runtimeRoot && isAbsolute(runtimeRoot), 'Explicit existing Playwright installation required; no download');
const requireRuntime = createRequire(join(runtimeRoot, 'package.json'));
const playwrightModule = await import(pathToFileURL(requireRuntime.resolve('playwright')).href);
const playwright = playwrightModule.default ?? playwrightModule;
assert.equal(typeof playwright.chromium?.launch, 'function', 'Existing Playwright runtime export unavailable');
const report = { startedAt: new Date().toISOString(), runtime: 'Actual Next development runtime + actual sessions/actions + owned PostgreSQL transport', browser: process.env.PHASE_A_BROWSER ?? 'chromium', checks: [], errors: [], screenshots: [], limitations: ['Production Neon transport is not exercised.', 'Physical Safari/iPad and production provider delivery are not exercised.', 'Browser plugin not available; existing local Playwright is used.'] };
let app, browser;
const contexts = [];
let currentCheck = '';
let activePage;
async function waitFor(test, message, timeout = 10000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const value = await test(); if (value) return value; await new Promise(resolve => setTimeout(resolve, 30)); }
  throw new Error(message);
}
async function check(name, task) {
  currentCheck = name;
  const start = performance.now();
  try { const detail = await task(); report.checks.push({ name, status: 'PASS', milliseconds: Math.round(performance.now() - start), detail }); console.log('PASS', name); }
  catch (error) {
    if(activePage && !activePage.isClosed()) {
      const file=join(evidence, `failure-${report.checks.length}.txt`);
      await writeFile(file, activePage.url()+'\n'+await activePage.locator('body').innerText()).catch(()=>{});
      await activePage.screenshot({path:join(evidence, `failure-${report.checks.length}.png`),fullPage:true}).catch(()=>{});
    }
    report.checks.push({ name, status: 'FAIL', milliseconds: Math.round(performance.now() - start), error: String(error.stack ?? error) }); console.log('FAIL', name, String(error.message)); }
  await writeFile(join(evidence, 'app-qa-results.json'), JSON.stringify(report, null, 2));
}
async function q(text, values = []) { return app.database.executor.query({ text, values }); }
async function goto(page, path) {
  activePage = page;
  const response = await page.goto(app.url + path);
  assert(response && response.status() < 400, `Unexpected page status ${response?.status()} for ${path}`);
  await page.waitForLoadState('networkidle');
  assert((await page.locator('body').innerText()).length > 30, 'Blank application');
  return response;
}
async function login(id, width = 390) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block' });
  contexts.push(context);
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== app.url) return route.abort('blockedbyclient');
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.errors.push({ check: currentCheck, error: error.message }));
  await goto(page, '/login');
  await page.getByLabel('Employee ID', { exact: true }).fill(id);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await Promise.all([page.waitForURL(url => url.pathname === '/app'), page.getByRole('button', { name: 'Sign In', exact: true }).click()]);
  await page.waitForLoadState('networkidle');
  assert((await context.cookies()).some(cookie => cookie.name === 'fuel_session'), 'No actual authenticated session cookie');
  return page;
}
async function screenshot(page, name) {
  const path = join(evidence, 'app-screenshots', name + '.png');
  await page.screenshot({ path, fullPage: true }); report.screenshots.push(path);
}
function offerForm(page, shiftId) { return page.locator(`form:has(input[name="sourceShiftId"][value="${shiftId}"]):has(input[name="kind"][value="OFFER_COVERAGE"])`); }
async function submitAndSettle(page, button, { refresh = false } = {}) {
  const response = page.waitForResponse(response => response.request().method() === 'POST' && !!response.request().headers()['next-action']);
  const route = new URL(page.url());
  // Only successful offer/claim callers promise router.refresh(). Policy
  // validation/stale errors legitimately have no refresh and must not hang.
  const refreshed = refresh ? page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.origin === route.origin && url.pathname === route.pathname
      && url.searchParams.get('tab') === route.searchParams.get('tab') && url.searchParams.has('_rsc');
  }) : undefined;
  await button.click();
  const completed = await response;
  assert.equal(await completed.finished(), null, 'Server Action stream must finish without cancellation');
  assert(completed.status() < 400, `Server Action response ${completed.status()}`);
  if (refreshed) {
    const completedRefresh = await refreshed;
    assert.equal(await completedRefresh.finished(), null, 'Refresh stream must finish without cancellation');
    assert(completedRefresh.status() < 400, `Refresh response ${completedRefresh.status()}`);
  }
  await page.waitForFunction(() => !document.querySelector('form[aria-busy="true"]'));
  // Database COMMIT precedes the streamed action response and client refresh.
  // Await both before navigating, especially in WebKit; DB polling alone is insufficient.
  await page.waitForLoadState('networkidle');
}
async function offer(page, shiftId) {
  await goto(page, '/app/exchange?tab=requests');
  await submitAndSettle(page, offerForm(page, shiftId).getByRole('button', { name: 'Offer Shift', exact: true }), { refresh: true });
  return waitFor(async () => (await q("SELECT * FROM shift_exchanges WHERE source_shift_id=$1 AND kind='COVERAGE' AND status='OPEN' ORDER BY created_at DESC LIMIT 1", [shiftId]))[0], 'Actual offer did not commit');
}
async function claim(page, requestId) {
  await goto(page, '/app/exchange?tab=available');
  await submitAndSettle(page, page.locator(`[id="request-${requestId}"]`).getByRole('button', { name: 'Claim Shift', exact: true }), { refresh: true });
  return waitFor(async () => { const row = (await q('SELECT * FROM shift_exchanges WHERE id=$1', [requestId]))[0]; return row && ['APPROVED', 'MANAGER_PENDING'].includes(row.status) ? row : null; }, 'Actual claim did not commit');
}
async function gate(id, task, mutation) {
  assert(/^[a-z0-9-]{1,80}$/.test(id), 'Test barrier IDs must be canonical before arming');
  await writeFile(join(app.barriers, 'armed.json'), JSON.stringify({ id, stage: 'before', contains: ' AS authorized' }));
  const navigation = task();
  try {
    await waitFor(async () => { try { await access(join(app.barriers, `${id}.reached`)); return true; } catch { return false; } }, 'Real read barrier not reached');
    await mutation();
  } finally { await writeFile(join(app.barriers, `${id}.release`), 'release'); }
  return navigation;
}
try {
  await mkdir(join(evidence, 'app-screenshots'), { recursive: true });
  app = await createOwnedNextApp(evidence);
  report.url = app.url; report.sourceManifest = join(app.root, 'source-manifest.json');
  await seedOwnedApp(app.database.executor);
  assert(['chromium','webkit'].includes(report.browser), 'Unsupported browser request');
  browser = await playwright[report.browser].launch({ headless: true });
  report.browserVersion = browser.version();
  const scenario = await seedOwnedScenario(app.database.executor, 'MAIN', 0);
  let a, b, c, owner, opened, completed;
  await check('A073 actual login and authenticated employee/Owner role entry', async () => {
    a = await login(scenario.actors[0]); b = await login(scenario.actors[1]); c = await login(scenario.actors[2]); owner = await login('QAOWNER', 1440);
    await goto(a, '/app/exchange?tab=requests');
    assert.equal(await a.getByRole('heading', { name: 'Shift Requests', exact: true }).count(), 1);
    await screenshot(a, 'employee-requests-390');
    return { roles: ['LEAD', 'OWNER'], actualSessionRows: Number((await q('SELECT count(*)::int n FROM employee_sessions'))[0].n) };
  });
  if (!a || !b || !c || !owner) throw new Error('Authenticated setup failed; dependent scenarios cannot run');
  await check('A085/A089/A097 actual Owner policy writes preserve independent workflows, validation and stale-review guards', async () => {
    const policyUrl='/app/schedule/settings';
    const open=async(page)=>{await goto(page,policyUrl);await page.locator('.shift-policy-disclosure > summary').click();};
    const trade=(page)=>page.locator('.policy-save-form:has(input[name="scope"][value="swap"])');
    const original=(await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy;
    await open(owner);
    await trade(owner).locator('select[name="mode"]').selectOption('MANAGER_REVIEW');
    await trade(owner).locator('[name="submissionAdvanceMinutes"]').fill('1440');
    await trade(owner).locator('[name="completionAdvanceMinutes"]').fill('120');
    await submitAndSettle(owner,trade(owner).getByRole('button',{name:'Save trade policy',exact:true}));
    const saved=(await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy;
    assert.equal(saved.swap.mode,'MANAGER_REVIEW');assert.equal(saved.swap.submissionAdvanceMinutes,1440);assert.equal(saved.swap.completionAdvanceMinutes,120);
    assert.equal(saved.swap.revision,original.swap.revision+1);assert.deepEqual(saved.coverage,original.coverage);
    await trade(owner).locator('[name="completionAdvanceMinutes"]').fill('1500');
    await submitAndSettle(owner,trade(owner).getByRole('button',{name:'Save trade policy',exact:true}));
    assert.equal(await trade(owner).getByRole('alert').count(),1);
    assert.equal(await trade(owner).locator('[name="completionAdvanceMinutes"]').inputValue(),'1500');
    assert.deepEqual((await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy,saved);
    const stale=await login('QAOWNER',390);await open(stale);
    await trade(owner).locator('[name="completionAdvanceMinutes"]').fill('60');
    await submitAndSettle(owner,trade(owner).getByRole('button',{name:'Save trade policy',exact:true}));
    const current=(await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy;
    await trade(stale).locator('[name="completionAdvanceMinutes"]').fill('30');
    await submitAndSettle(stale,trade(stale).getByRole('button',{name:'Save trade policy',exact:true}));
    assert.match(await trade(stale).getByRole('alert').innerText(),/policy changed/i);
    assert.equal(await trade(stale).getByRole('button',{name:'Reload current policy',exact:true}).count(),1);
    assert.deepEqual((await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy,current);
    // Restore the fictional workflow through the real current-revision form,
    // retaining its monotonic review history rather than resetting revisions.
    await trade(owner).locator('select[name="mode"]').selectOption('AUTOMATIC_WHEN_VALID');
    await trade(owner).locator('[name="submissionAdvanceMinutes"]').fill('0');
    await trade(owner).locator('[name="completionAdvanceMinutes"]').fill('0');
    await submitAndSettle(owner,trade(owner).getByRole('button',{name:'Save trade policy',exact:true}));
    assert.deepEqual((await q('SELECT shift_change_policy FROM workspaces'))[0].shift_change_policy.coverage,original.coverage);
    return {actualServerActions:true,independentCoverageUnchanged:true,invalidFieldsPreserved:true,staleReviewRejected:true};
  });
  if (process.env.PHASE_A_POLICY_ONLY !== '1') {
  await check('I1 independent trade navigation survives unknown coverage and coverage cutoff', async () => {
    const [policy] = await q('SELECT shift_change_policy FROM workspaces');
    try {
      for (const mode of ['unknown', 'expired']) {
        const value = structuredClone(policy.shift_change_policy);
        value.coverage = { ...value.coverage, ...(mode === 'unknown' ? { submissionAdvanceMinutes: null } : { submissionAdvanceMinutes: 525600 }) };
        await q('UPDATE workspaces SET shift_change_policy=$1', [JSON.stringify(value)]);
        await goto(a, '/app/exchange?tab=requests');
        assert.equal(await offerForm(a, scenario.sourceId).count(), 0);
        const link = a.locator(`a[href="/app/exchange/swap?sourceShiftId=${scenario.sourceId}"]`);
        assert.equal(await link.count(), 1, 'Valid independent Trade navigation disappeared');
        await Promise.all([a.waitForURL(url => url.pathname.endsWith('/swap')), link.click()]);
        await a.getByRole('heading', { name: 'Choose a shift', exact: true }).waitFor();
      }
    } finally { await q('UPDATE workspaces SET shift_change_policy=$1', [JSON.stringify(policy.shift_change_policy)]); }
    return { independentPolicies: 2, navigationIsNotMutationAuthority: true };
  });
  await check('I3 real pending/completed operation GET is read-only; real action refresh remains functional', async () => {
    opened = await offer(a, scenario.sourceId);
    const [operation] = await q('SELECT operation_id FROM shift_change_operations WHERE request_id=$1 AND actor_employee_id=$2', [opened.id, scenario.actors[0]]);
    const before = await q('SELECT * FROM shift_change_operations ORDER BY operation_id');
    await goto(a, `/app/exchange?tab=requests&operationId=${operation.operation_id}`);
    assert.match(await a.locator('[role="status"]').first().innerText(), /Request recorded/);
    assert.deepEqual(await q('SELECT * FROM shift_change_operations ORDER BY operation_id'), before);
    completed = await claim(b, opened.id); assert.equal(completed.status, 'APPROVED');
    const [accepted] = await q('SELECT operation_id FROM shift_change_operations WHERE request_id=$1 AND actor_employee_id=$2', [opened.id, scenario.actors[1]]);
    await goto(b, `/app/exchange?tab=requests&operationId=${accepted.operation_id}`);
    assert.match(await b.locator('[role="status"]').first().innerText(), /Completed/);
    await screenshot(b, 'completed-operation-390');
    assert.equal((await q('SELECT employee_id FROM shifts WHERE id=$1', [scenario.sourceId]))[0].employee_id, scenario.actors[1]);
    await goto(c, `/app/exchange?tab=requests&operationId=${accepted.operation_id}`);
    assert.equal(await c.locator('p[role="status"]').filter({ hasText: 'Completed.' }).count(), 0, 'Another actor read a private operation');
    return { requestId: opened.id, readOnlyGet: true, atomicOutcome: 'APPROVED' };
  });
  await check('A048/A062 lost real Server Action response reconciles one committed operation', async () => {
    const data = await seedOwnedScenario(app.database.executor, 'LOST', 1);
    const page = await login(data.actors[0]); await goto(page, '/app/exchange?tab=requests');
    let lost = false;
    await page.route('**/*', async route => {
      if (!lost && route.request().method() === 'POST' && route.request().headers()['next-action']) {
        lost = true; await route.fetch(); await route.abort('failed'); return;
      }
      await route.fallback();
    });
    await offerForm(page, data.sourceId).getByRole('button', { name: 'Offer Shift', exact: true }).click();
    await page.getByRole('button', { name: 'Check & retry same request', exact: true }).waitFor();
    const before = await q('SELECT operation_id,command_fingerprint,request_id,result FROM shift_change_operations WHERE actor_employee_id=$1', [data.actors[0]]);
    assert.equal(before.length, 1); assert.equal(before[0].result.status, 'pending');
    await page.getByRole('button', { name: 'Check & retry same request', exact: true }).click();
    await waitFor(async () => await page.getByRole('button', { name: 'Check & retry same request', exact: true }).count() === 0, 'Reconciliation did not resolve uncertainty');
    assert.deepEqual(await q('SELECT operation_id,command_fingerprint,request_id,result FROM shift_change_operations WHERE actor_employee_id=$1', [data.actors[0]]), before);
    assert.equal((await q('SELECT count(*)::int n FROM shift_exchanges WHERE source_shift_id=$1', [data.sourceId]))[0].n, 1);
    return { responseIntentionallyDroppedAfterActualCommit: lost, duplicateRequests: 0 };
  });
  for (const side of ['source','target']) {
    const data = await seedOwnedScenario(app.database.executor, side === 'source' ? 'TERMS' : 'TARGET', side === 'source' ? 2 : 3);
    const page = await login(data.actors[0]);
    const shiftId = side === 'source' ? data.sourceId : data.targetId;
    const scheduleId = `qa-${data.label}-schedule-${side === 'source' ? 0 : 1}`;
    const locationId = side === 'source' ? 'loc-1' : 'loc-2';
    const employeeId = data.actors[side === 'source' ? 0 : 1];
    const date = side === 'source' ? data.sourceDate : data.targetDate;
    const positionId = side === 'source' ? 'qa-pos' : 'qa-pos2';
    const extra = `qa-extra-${side}`;
    await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES($1,'workspace-fuel',$1,'QA Replacement Office','QA Extra',true)", [extra]);
    for (const field of ['date','startTime','endTime','location','position','owner','lead']) {
      await check(`I2 real inter-read ${side} ${field} change cannot authorize undisplayed consent`, async () => {
        await q('UPDATE schedules SET location_id=$2 WHERE id=$1', [scheduleId,locationId]);
        await updateShift({shiftId,employeeId,date,startTime:'08:00',endTime:'16:00',positionId,isDesignatedLead:true,actorEmployeeId:'QAOWNER'},app.database.executor);
        const patch = {date:{date:new Date(Date.parse(date+'T12:00:00Z')+86400000).toISOString().slice(0,10)},startTime:{startTime:'09:00'},endTime:{endTime:'17:00'},position:{positionId:positionId==='qa-pos'?'qa-pos2':'qa-pos'},owner:{employeeId:data.actors[2]},lead:{isDesignatedLead:false},location:{}}[field];
        await gate(`${side}-${field}`.toLowerCase(), () => page.goto(`${app.url}/app/exchange/swap?sourceShiftId=${data.sourceId}`), async () => {
          if(field==='location') await q('UPDATE schedules SET location_id=$2 WHERE id=$1',[scheduleId,extra]);
          else await updateShift({shiftId,employeeId,date,startTime:'08:00',endTime:'16:00',positionId,isDesignatedLead:true,actorEmployeeId:'QAOWNER',...patch},app.database.executor);
        });
        await page.waitForLoadState('networkidle');
        assert.equal(await page.getByRole('button',{name:'Send trade request',exact:true}).count(),0);
        if(side==='source') assert.match(page.url(),/error=EXCHANGE_CHANGED/);
        else assert.match(await page.locator('body').innerText(),/No shifts to trade/);
        return {side,field,realReadBarrier:true,mutationCommitted:true,staleFormWithheld:true};
      });
    }
  }
  await check('A019/A021 actual callout -> manager release -> voluntary replacement preserves privacy', async () => {
    const data = await seedOwnedScenario(app.database.executor, 'ABSENCE', 4), reporter = await login(data.actors[0]), replacement = await login(data.actors[1]);
    await goto(reporter, `/app/exchange/callout?shiftId=${data.sourceId}`);
    await reporter.locator('select[name="reasonCode"]').selectOption('ILLNESS');
    await reporter.locator('textarea[name="reasonNote"]').fill('Fictional private absence detail');
    await submitAndSettle(reporter,reporter.getByRole('button', { name: 'Submit Call-out', exact: true }));
    const record = await waitFor(async () => (await q("SELECT * FROM shift_callouts WHERE shift_id=$1 AND status='PENDING'", [data.sourceId]))[0], 'Callout not persisted');
    await goto(owner, '/app/exchange?tab=pending');
    await owner.locator(`[id="request-${record.id}"]`).getByRole('button', { name: 'Approve', exact: true }).click();
    const linked = await waitFor(async () => (await q('SELECT id FROM shift_exchanges WHERE linked_callout_id=$1', [record.id]))[0], 'Linked coverage missing');
    await goto(replacement, '/app/exchange?tab=available');
    assert(!((await replacement.locator('body').innerText()).includes('Fictional private absence detail')));
    await claim(replacement, linked.id);
    assert.equal((await q('SELECT employee_id FROM shifts WHERE id=$1', [data.sourceId]))[0].employee_id, data.actors[1]);
    assert.equal((await q('SELECT status FROM shift_callouts WHERE id=$1', [record.id]))[0].status, 'APPROVED');
    return { originalAbsencePreserved: true, replacementOwnsOneShift: true };
  });
  await check('I1/A001 actual two-sided trade picker and acceptance preserve both assignments', async () => {
    const data = await seedOwnedScenario(app.database.executor, 'SWAP', 5), requester = await login(data.actors[0]), target = await login(data.actors[1]);
    await goto(requester, `/app/exchange/swap?sourceShiftId=${data.sourceId}`);
    assert(await requester.getByRole('button', { name: 'Send trade request', exact: true }).isDisabled());
    await requester.getByRole('combobox', { name: 'Requested shift', exact: true }).click();
    await requester.getByRole('option').filter({ hasText: `QA SWAP Blair` }).click();
    assert.match(await requester.locator('.reviewed-swap-terms').innerText(), /You give[\s\S]*You receive/);
    await screenshot(requester, 'reviewed-trade-390');
    await requester.getByRole('button', { name: 'Send trade request', exact: true }).click();
    const request = await waitFor(async () => (await q("SELECT * FROM shift_exchanges WHERE source_shift_id=$1 AND kind='SWAP'", [data.sourceId]))[0], 'Trade not created');
    await goto(target, '/app/exchange?tab=requests');
    await target.locator(`[id="request-${request.id}"]`).getByRole('button', { name: 'Accept', exact: true }).click();
    await waitFor(async () => (await q('SELECT status FROM shift_exchanges WHERE id=$1', [request.id]))[0]?.status === 'APPROVED', 'Two-sided swap not completed');
    assert.deepEqual(await q('SELECT id,employee_id FROM shifts WHERE id=ANY($1) ORDER BY id', [[data.sourceId, data.targetId]]), [{ id: data.sourceId, employee_id: data.actors[1] }, { id: data.targetId, employee_id: data.actors[0] }]);
    return { bothAssignmentsChangedAtomically: true };
  });
  await check('A067 actual employee cannot render Owner policy settings or access another operation', async () => {
    await goto(c, '/app/settings/workspace');
    assert(!c.url().includes('/settings/workspace'));
    await c.context().clearCookies();
    await goto(c, '/app/exchange?operationId=11111111-1111-4111-8111-111111111111');
    assert.match(c.url(), /\/login/);
    return { serverRedirects: true };
  });
  }
  if (process.env.PHASE_A_UI_MATRIX === '1') {
    const data = await seedOwnedScenario(app.database.executor, 'UX', 6);
    await q("UPDATE employees SET first_name='Avery María de los Ángeles',last_name='Montgomery-Rivera' WHERE id=$1", [data.actors[0]]);
    await q("UPDATE employees SET first_name='Blair del Carmen',last_name='Villanueva-Montgomery' WHERE id=$1", [data.actors[1]]);
    await q("UPDATE positions SET name='Customer Support and Operations Coordination' WHERE id='qa-pos'");
    await q("UPDATE locations SET name='Northside Western Customer Service Operations Office',short_name='Western Customer Service Operations Office' WHERE id='loc-2'");
    const employee = await login(data.actors[0]);
    const reporter = await login(data.actors[2]);
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) SELECT 'qa-UX-callout',schedule_id,$2,date+2,'08:00','16:00',position_id,false FROM shifts WHERE id=$1",[data.sourceId,data.actors[2]]);
    await goto(reporter,'/app/exchange/callout?shiftId=qa-UX-callout');
    await reporter.locator('select[name="reasonCode"]').selectOption('ILLNESS');
    await submitAndSettle(reporter,reporter.getByRole('button',{name:'Submit Call-out',exact:true}));
    await waitFor(async()=> (await q("SELECT id FROM shift_callouts WHERE shift_id='qa-UX-callout' AND status='PENDING'"))[0], 'UI pending fixture did not commit');
    await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) SELECT 'qa-UX-coverage',schedule_id,$2,date+3,'08:00','16:00',position_id,false FROM shifts WHERE id=$1",[data.sourceId,data.actors[2]]);
    await offer(reporter,'qa-UX-coverage');
    const paths = [
      ['employee-requests','/app/exchange?tab=requests',employee],
      ['employee-trade',`/app/exchange/swap?sourceShiftId=${data.sourceId}`,employee],
      ['employee-callout',`/app/exchange/callout?shiftId=${data.sourceId}`,employee],
      ['owner-policy','/app/schedule/settings',owner],
      ['manager-pending','/app/exchange?tab=pending',owner],
      ['manager-coverage','/app/exchange?tab=coverage',owner],
    ];
    for (const width of [320,375,390,430,768,1024,1440]) {
      for (const [name,path,page] of paths) {
        if(process.env.PHASE_A_POLICY_ONLY==='1' && name!=='owner-policy') continue;
        await check(`UI ${report.browser} ${width}px ${name}`,async()=>{
          await page.setViewportSize({width,height:width<768?844:900});
          await goto(page,path);
          if(name==='owner-policy') await page.locator('.shift-policy-disclosure > summary').click();
          if(name==='employee-trade') {
            await page.getByRole('combobox',{name:'Requested shift',exact:true}).click();
            await page.getByRole('listbox').waitFor();
          }
          await page.waitForTimeout(180);
          const geometry=await page.evaluate(()=>{
            const issues=[];let fragments=0,controls=0;
            if(document.documentElement.scrollWidth>window.innerWidth+1)issues.push({kind:'document-overflow',width:document.documentElement.scrollWidth,viewport:window.innerWidth});
            const selector='.employee-action,.shift-change-form button,.employee-shift-picker-trigger,.manager-workflow-review .button,.policy-save-form .button';
            for(const node of document.querySelectorAll(selector)) {
              const r=node.getBoundingClientRect();if(!r.width||!r.height)continue;controls++;
              if(r.height<43.5||r.width<43.5)issues.push({kind:'small-action',label:node.textContent.trim(),width:r.width,height:r.height});
              if(r.left<-1||r.right>innerWidth+1)issues.push({kind:'action-overflow',label:node.textContent.trim(),left:r.left,right:r.right});
            }
            for(const region of document.querySelectorAll('.shift-slot,.employee-shift-picker-value,.employee-shift-picker-option-copy,.manager-workflow-copy,.shift-policy-disclosure label')) {
              const bound=region.getBoundingClientRect();if(!bound.width||!bound.height)continue;
              const walker=document.createTreeWalker(region,NodeFilter.SHOW_TEXT);let node;
              while(node=walker.nextNode()) {
                if(!node.textContent.trim())continue;
                const range=document.createRange();range.selectNodeContents(node);
                for(const rect of range.getClientRects()) {
                  if(!rect.width)continue;fragments++;
                  if(rect.left<bound.left-1||rect.right>bound.right+1)issues.push({kind:'text-clipped',text:node.textContent.trim(),left:rect.left,right:rect.right,boundLeft:bound.left,boundRight:bound.right});
                }
              }
            }
            return {issues,fragments,controls};
          });
          await screenshot(page,`${report.browser}-${width}-${name}`);
          assert.deepEqual(geometry.issues,[],'Visible control/text geometry violation');
          if(name==='employee-trade') {
            const combo=page.getByRole('combobox',{name:'Requested shift',exact:true});
            await combo.press('Escape');assert.equal(await combo.getAttribute('aria-expanded'),'false');
            await combo.press('ArrowDown');assert.equal(await combo.getAttribute('aria-expanded'),'true');
            const focus=await combo.evaluate(node=>({focused:document.activeElement===node,visible:node.matches(':focus-visible'),outline:getComputedStyle(node).outlineStyle,width:getComputedStyle(node).outlineWidth,shadow:getComputedStyle(node).boxShadow}));
            assert(focus.focused && focus.visible && (focus.outline!=='none'&&parseFloat(focus.width)>0||focus.shadow!=='none'),'Missing visible keyboard focus');
            await combo.press('Enter');
            await page.locator('.reviewed-swap-terms').waitFor();
            assert.equal(await page.getByRole('button',{name:'Send trade request',exact:true}).isEnabled(),true);
          }
          const last=page.locator('.shift-change-form button:visible').last();
          if(await last.count()) {
            await last.evaluate(node=>node.scrollIntoView({block:'center'}));
            const clearance=await last.evaluate(node=>{const r=node.getBoundingClientRect(),nav=document.querySelector('.mobile-nav')?.getBoundingClientRect();return {bottom:r.bottom,navTop:nav?.height?nav.top:innerHeight};});
            assert(clearance.bottom<=clearance.navTop+1,'Final action obscured by fixed navigation');
          }
          return {controls:geometry.controls,textFragments:geometry.fragments,screenshot:`${report.browser}-${width}-${name}.png`};
        });
      }
    }
  }
  await check('Real framework and browser runtime have no uncaught application errors', async () => {
    const log = await readFile(join(app.root, 'next.log'), 'utf8');
    assert(!/revalidatePath.*(?:render|unsupported)|during render|Error:.*(?:permission|Cannot|invalid)/i.test(log), 'Framework error in Next runtime log');
    assert.deepEqual(report.errors, []);
    return { uncaughtPageErrors: report.errors.length };
  });
} catch (error) {
  report.fatal = String(error.stack ?? error);
  console.error(error);
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  await browser?.close();
  if (app) await app.close();
  report.finishedAt = new Date().toISOString();
  report.passed = report.checks.filter(item => item.status === 'PASS').length;
  report.failed = report.checks.filter(item => item.status === 'FAIL').length;
  await writeFile(join(evidence, 'app-qa-results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, failed: report.failed, fatal: report.fatal ?? null, root: app?.root }, null, 2));
  if (report.failed || report.fatal) process.exitCode = 1;
}
