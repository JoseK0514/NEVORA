import { expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, assignOwnedManagerCompanyAccess, TEST_PASSWORD } from './owned-app-fixture';
import { fixtureProof } from './shift-change-api';
import { hashPassword } from '../../lib/auth/password';
import { readOwnerOperationalScope, assignOperationalScope } from '../../lib/company-access/operational-scope.server';
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { neutralProfile } from '../../lib/payroll-export/model';
import { saveExportProfile, createPayrollExport } from '../../lib/payroll-export/service';
import { readPeriodClose, savePeriodPopulation, preparePeriodManifest } from '../../lib/period-close/service';

it('connects original shift reviews and explicit period history in owned Chromium and WebKit', async () => {
  const evidence = process.env.NEVORA_READINESS_UI_EVIDENCE;
  if (!evidence) throw Error('Choose an external readiness UI evidence directory');
  await mkdir(evidence, { recursive: true });
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app = await createOwnedNextApp(evidence, { payrollEnabled: true });
  const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => app.database.executor.query<T>({ text, values });
  const checks: string[] = [], errors: string[] = [];
  const browsers: { close(): Promise<void> }[] = [];
  let complete = false, failureShot: (() => Promise<void>) | undefined;
  try {
    await seedOwnedApp(app.database.executor);
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('UI-COMPANY','Fictional','Company Manager','NONE','MANAGER','loc-1'),('UI-LOCAL','Fictional','Location Manager','NONE','MANAGER','loc-1'),('UI-WORKER','Fictional','Worker','NONE','EMPLOYEE','loc-1')");
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('UI-COMPANY',$1,false),('UI-LOCAL',$1,false)", [await hashPassword(TEST_PASSWORD)]);
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('UI-WORKER','loc-1')");
    await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'ui-availability-'||d,'UI-WORKER',d,'00:00','24:00' FROM generate_series(0,6)d; INSERT INTO weekly_availability_submissions(week_start,employee_id,uses_normal_availability) VALUES('2026-10-12','UI-WORKER',true)");
    await assignOwnedManagerCompanyAccess(app.database.executor, 'UI-COMPANY');
    const owner = await fixtureProof(app.database.executor, 'QAOWNER');
    const scope = await readOwnerOperationalScope(owner, 'UI-LOCAL', app.database.executor);
    if (scope.state !== 'ready') throw Error('Owned scope unavailable');
    const c = scope.data.current;
    expect((await assignOperationalScope(owner, 'UI-LOCAL', { action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: c.employeeUpdatedAt, expectedRoleGeneration: c.roleGeneration, expectedScopeRevision: c.scopeRevision, scope: { mode: 'LOCATIONS', locationIds: ['loc-1'] } }, app.database.executor)).state).toBe('saved');
    await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('ui-review','loc-1','2026-10-12','DRAFT','QAOWNER')");

    // Real services prepare an immutable manifest; only the fictional event volume is seeded directly.
    const period = { startDate: '2026-09-21', endDate: '2026-09-27' }, ex = app.database.executor;
    await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('ui-period-device','loc-1','Owned device'); INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('ui-period-entry','UI-WORKER','loc-1','ui-period-device','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT')");
    for (const action of ['APPROVE', 'FINALIZE'] as const) {
      const view = await readTimecards(owner, period, ex); if (view.state !== 'ready') throw Error('Owned cards unavailable');
      const card = view.cards.find(x => x.card.employeeId === 'UI-WORKER')!;
      await mutateTimecard(owner, { ...period, operationId: randomUUID(), employeeId: 'UI-WORKER', expectedRevision: card.revision, expectedSourceHash: card.sourceHash, action }, ex);
    }
    const cards = await readTimecards(owner, period, ex); if (cards.state !== 'ready') throw Error('Owned cards unavailable');
    const card = cards.cards.find(x => x.card.employeeId === 'UI-WORKER')!;
    const profile = await saveExportProfile(owner, { operationId: randomUUID(), id: randomUUID(), expectedRevision: 0, profile: { ...neutralProfile(), name: 'Owned mapping', employeeMappings: [{ employeeId: 'UI-WORKER', providerEmployeeId: 'OWNED-001' }] } }, ex);
    const exported = await createPayrollExport(owner, { ...period, operationId: randomUUID(), profileId: profile.id, profileRevision: profile.revision, cards: [{ employeeId: 'UI-WORKER', revision: card.revision, sourceHash: card.sourceHash, finalizationOperationId: card.history[0].operationId }] }, ex);
    const review = await readPeriodClose(owner, period, ex);
    const population = await savePeriodPopulation(owner, { ...period, operationId: randomUUID(), expectedRevision: 0, sourceHash: review.sourceHash, members: review.members.map(m => ({ employeeId: m.employeeId, disposition: m.employeeId === 'UI-WORKER' ? 'INCLUDE' : 'ZERO_TIME', reason: 'Owned review', employmentFacts: 'Fictional employment facts', employmentBasis: 'MANAGER_ATTESTED' })) }, ex);
    const manifest = await preparePeriodManifest(owner, { ...period, operationId: randomUUID(), populationRevision: population.revision, receipts: [{ actorId: 'QAOWNER', operationId: exported.operationId }] }, ex);
    await q("INSERT INTO payroll_period_events(workspace_id,manifest_id,id,actor_employee_id,kind,command_hash,payload,created_at) SELECT 'workspace-fuel',$1::uuid,md5('ui-event-'||n)::uuid,'QAOWNER','ARTIFACT_SERVED',repeat('a',64),jsonb_build_object('filename','owned-'||n||'.csv'), '2026-09-28'::timestamptz + n*interval '1 microsecond' FROM generate_series(1,1001) n", [manifest.id]);
    const originalArtifact = await q('SELECT manifest_hash FROM payroll_period_manifests WHERE id=$1', [manifest.id]);

    for (const engine of ['chromium', 'webkit']) {
      const browser = await runtime[engine].launch({ headless: true }); browsers.push(browser);
      for (const actor of ['UI-COMPANY', 'UI-LOCAL']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
        const page = await context.newPage(); page.setDefaultTimeout(20000);
        const waitForRead = (path: string) => page.waitForResponse((response: { url(): string; status(): number }) =>
          response.url() === app.url + path && response.status() === 200)
          .then((response: { finished(): Promise<unknown> }) => response.finished());
        const pendingRouterRequests = new Set<object>();
        page.on('request', (request: { url(): string; headers(): Record<string, string> }) => {
          const headers = request.headers();
          const url = new URL(request.url());
          if (url.origin === app.url && (headers.rsc === '1' || headers['next-action'])) {
            pendingRouterRequests.add(request);
          }
        });
        for (const event of ['requestfinished', 'requestfailed']) {
          page.on(event, (request: object) => pendingRouterRequests.delete(request));
        }
        const pause = async () => {
          await expect.poll(() => pendingRouterRequests.size, { timeout: 20000 }).toBe(0);
          await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        };
        const visit = async (path: string) => { if (page.url() !== 'about:blank') await pause(); return page.goto(app.url + path); };
        failureShot = () => page.screenshot({ path: resolve(evidence, `${engine}-${actor}-failure.png`), fullPage: true });
        page.on('pageerror', (error: Error) => errors.push(`${engine} ${actor}: ${error.message}`));
        await context.route((url: URL) => ['http:', 'https:'].includes(url.protocol) && url.origin !== app.url,
          (route: { abort(): Promise<void> }) => route.abort());
        await visit('/login');
        await page.getByLabel('Employee ID', { exact: true }).fill(actor);
        await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
        const homeReady = waitForRead(actor === 'UI-COMPANY' ? '/api/manager/today' : '/api/manager/clock-monitor');
        await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(app.url + '/app');
        await homeReady;
        await page.getByRole('main').getByRole('heading', { level: 1 }).filter({ visible: true }).first().waitFor();
        await page.waitForLoadState('load');
        const id = `${engine}-${actor}`;
        await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,'ui-review','UI-WORKER','2026-10-12','08:00','16:00')", [id]);
        await visit('/app/schedule/edit?shiftId=' + id);
        const form = page.locator('form').filter({ has: page.locator('[name="employeeId"]') });
        await form.locator('[name="expectedReviewVersion"]').waitFor({ state: 'attached' });
        const version = await form.locator('[name="expectedReviewVersion"]').inputValue(); expect(version).toMatch(/^[a-f0-9]{64}$/);
        await form.locator('[name="notes"]').fill('Retained fictional draft');
        await q("UPDATE shifts SET notes='Concurrent edit',updated_at=clock_timestamp() WHERE id=$1", [id]);
        await form.evaluate((element: HTMLFormElement) => element.requestSubmit());
        await form.getByRole('alert').filter({ hasText: 'changed since you opened' }).waitFor();
        expect(await form.locator('[name="notes"]').inputValue()).toBe('Retained fictional draft');
        expect(await form.locator('[name="expectedReviewVersion"]').inputValue()).toBe(version);
        await form.getByText('Unsaved changes to copy', { exact: true }).click();
        expect(await form.getByLabel('Submitted shift changes').inputValue()).toContain('Retained fictional draft');
        expect(await q('SELECT notes FROM shifts WHERE id=$1', [id])).toEqual([{ notes: 'Concurrent edit' }]);
        await page.getByRole('button', { name: 'Delete shift', exact: true }).click();
        const deleteButton = page.getByRole('group', { name: 'Delete this shift?', exact: true }).getByRole('button', { name: 'Delete', exact: true });
        await deleteButton.focus(); await page.keyboard.press('Enter');
        await page.getByText('This shift changed since you opened it.', { exact: false }).last().waitFor();
        expect(await q('SELECT count(*)::int n FROM shifts WHERE id=$1', [id])).toEqual([{ n: 1 }]);
        for (const width of [320, 390, 768, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
        }
        await page.screenshot({ path: resolve(evidence, `${engine}-${actor}-conflict.png`), fullPage: true });
        checks.push(`${engine} ${actor}: edit/delete reject original stale review, keep draft, keyboard confirmation, 320/390/768/1440`);
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'load' }),
          page.getByRole('button', { name: 'Reload current shift', exact: true }).first().click(),
        ]);
        await expect.poll(() => form.locator('[name="notes"]').inputValue(), { timeout: 20000 }).toBe('Concurrent edit');
        await form.locator('[name="notes"]').fill('Fresh reviewed edit');
        const savedScheduleReady = waitForRead('/api/manager/today');
        await form.evaluate((element: HTMLFormElement) => element.requestSubmit());
        await page.waitForURL(/\/app\/schedule\?/);
        await savedScheduleReady;
        expect(await q('SELECT notes FROM shifts WHERE id=$1', [id])).toEqual([{ notes: 'Fresh reviewed edit' }]);
        checks.push(`${engine} ${actor}: explicit reload and valid review save`);
        await visit('/app/schedule/edit?shiftId=' + id);
        await page.getByRole('button', { name: 'Delete shift', exact: true }).click();
        const deletedScheduleReady = waitForRead('/api/manager/today');
        await page.getByRole('group', { name: 'Delete this shift?', exact: true }).getByRole('button', { name: 'Delete', exact: true }).click();
        await page.waitForURL(/\/app\/schedule\?/);
        await deletedScheduleReady;
        expect(await q('SELECT count(*)::int n FROM shifts WHERE id=$1', [id])).toEqual([{ n: 0 }]);
        checks.push(`${engine} ${actor}: fresh original-review delete`);

        if (actor === 'UI-COMPANY') {
          await page.setViewportSize({ width: 390, height: 1000 });
          const payrollReady = Promise.all([
            waitForRead('/api/timecards'),
            waitForRead('/api/payroll-export/profiles'),
            waitForRead('/api/period-close'),
          ]);
          await visit('/app/payroll-export?start=' + period.startDate + '&end=' + period.endDate);
          await page.getByRole('heading', { name: 'Time exports', exact: true }).filter({ visible: true }).waitFor();
          await payrollReady;
          await expect.poll(() => pendingRouterRequests.size, { timeout: 20000 }).toBe(0);
          await page.getByText(/^(Who’s included and sent files|Export history)$/).filter({ visible: true }).click();
          const mobile = page.getByRole('button', { name: 'Choose who’s included', exact: true });
          await mobile.click();
          const history = page.getByRole('region', { name: 'Period artifact and handoff history' });
          await history.getByRole('heading', { name: 'Full period history', exact: true }).scrollIntoViewIfNeeded();
          await history.getByRole('button', { name: 'Load history', exact: true }).click();
          await history.getByText('More events are available.', { exact: true }).waitFor();
          expect(await history.locator('li').count()).toBe(50);
          await history.getByRole('button', { name: 'Load older events', exact: true }).and(page.locator(':enabled')).press('Enter');
          await history.getByText(/100 of 1001 events loaded/).waitFor();
          for (let i = 0; i < 19; i++) {
            await history.getByRole('button', { name: 'Load older events', exact: true }).and(page.locator(':enabled')).press('Enter');
            await expect.poll(() => history.locator('li').count(), { timeout: 20000 }).toBe(Math.min(150 + i * 50, 1001));
          }
          await history.getByText('All events in this history snapshot are loaded.', { exact: true }).waitFor();
          expect(await history.locator('li').count()).toBe(1001);
          expect(await history.getByRole('button', { name: 'Load older events', exact: true }).count()).toBe(0);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2)).toBe(true);
          await page.screenshot({ path: resolve(evidence, `${engine}-history.png`), fullPage: false });
          await page.evaluate(() => window.dispatchEvent(new Event('blur')));
          await history.waitFor({ state: 'detached' });
          expect(await q('SELECT manifest_hash FROM payroll_period_manifests WHERE id=$1', [manifest.id])).toEqual(originalArtifact);
          checks.push(`${engine}: 1001 real events, explicit 50-row pages, complete traversal, unchanged artifact hash, blur retirement`);
        }
        await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
        await context.unrouteAll({behavior:'wait'}); await context.close();
      }
    }
    expect(errors).toEqual([]); complete = true;
  } catch (error) { await failureShot?.().catch(() => {}); throw error; }
  finally {
    await Promise.all(browsers.map(browser => browser.close()));
    await app.close();
    await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete, checks, errors, fictionalOnly: true, source: app.sourceHashes }, null, 2));
  }
}, 480000);
