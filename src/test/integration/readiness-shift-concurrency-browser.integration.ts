import { expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createOwnedNextApp, ownedProductionRequested } from './owned-next-app';
import { OWNED_COLLAB_ORIGIN } from './owned-collab-origin';
import { startOwnedTlsProxy } from './owned-tls-proxy';
import { seedOwnedApp, assignOwnedManagerCompanyAccess, TEST_PASSWORD } from './owned-app-fixture';
import { fixtureProof } from './shift-change-api';
import { hashPassword } from '../../lib/auth/password';
import { readOwnerOperationalScope, assignOperationalScope } from '../../lib/company-access/operational-scope.server';
import { generationNeedKey } from '../../lib/scheduling/generation-claims';
import { getWorkspace } from '../../lib/data/workspaces';
import { pendingDeletionLabelMarkup } from './shift-deletion-label-fixture';

type TracedRequest = { url(): string; method(): string; headers(): Record<string, string>; isNavigationRequest(): boolean; failure(): { errorText?: string } | null };

it('preserves reviewed intent across two real Manager sessions, generation and lost responses', async () => {
  const evidence = process.env.NEVORA_READINESS_MATRIX_EVIDENCE;
  if (!evidence) throw Error('Choose an external readiness matrix evidence directory');
  await mkdir(evidence, { recursive: true });
  const { observeBrowserCell } = await import(new URL('../../../scripts/phase-e-browser-qa.mjs', import.meta.url).href);
  const { verifyNavigationFetchDiagnostic, observeWindowExceptions } = await import(new URL('../../../scripts/browser-navigation-diagnostic.mjs', import.meta.url).href);
  const { observeRscCaughtErrors, requestFailureCategory } = await import(new URL('../../../scripts/rsc-caught-error-observer.mjs', import.meta.url).href);
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  // A production build sets the session cookie `secure`, which WebKit keeps only over https. Production runs therefore
  // serve the app at the owned test origin through the owned loopback TLS proxy (a throwaway certificate made at run
  // time), as the Clocker production run does; development keeps plain http on 127.0.0.1.
  const production = ownedProductionRequested();
  const app = await createOwnedNextApp(evidence, production ? { portalHttpsOrigin: OWNED_COLLAB_ORIGIN } : {});
  const tls = production ? await startOwnedTlsProxy({ [OWNED_COLLAB_ORIGIN]: app.url }).catch(async error => { await app.close(); throw error; }) : null;
  const base = production ? OWNED_COLLAB_ORIGIN : app.url;
  const network = tls ? { proxy: { server: tls.server }, ignoreHTTPSErrors: true } : {};
  const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => app.database.executor.query<T>({ text, values });
  const browsers: { close(): Promise<void> }[] = [], checks: string[] = [], errors: unknown[] = [], runtimeExecutions: unknown[] = [], runtimeControls: unknown[] = [];
  const runtimeTrace: Record<string, unknown>[] = [], runtimeFailureTraces: unknown[] = [], routerReadControls: unknown[] = [];
  const deletionLocatorControls: Record<string, unknown>[] = [];
  let stage = 'seed', traceOmitted = 0, failureTracesOmitted = 0;
  const trace = (value: Record<string, unknown>) => { if (runtimeTrace.length === 240) { runtimeTrace.shift(); traceOmitted++; } runtimeTrace.push({ at: Math.round(performance.now()), stage, completedChecks: checks.length, ...value }); };
  let complete = false, failureShot: (() => Promise<void>) | undefined, serial = 0;
  try {
    await seedOwnedApp(app.database.executor);
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('MATRIX-SECOND','Fictional','Second Company Manager','NONE','MANAGER','loc-1')");
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('MATRIX-COMPANY','Fictional','Company Manager','NONE','MANAGER','loc-1'),('MATRIX-LOCAL','Fictional','Local Manager','NONE','MANAGER','loc-1'),('MATRIX-WORKER','Fictional','First Worker','NONE','EMPLOYEE','loc-1'),('MATRIX-OTHER','Fictional','Other Worker','NONE','EMPLOYEE','loc-1')");
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('MATRIX-COMPANY',$1,false),('MATRIX-LOCAL',$1,false)", [await hashPassword(TEST_PASSWORD)]);
    await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('MATRIX-WORKER','loc-1'),('MATRIX-OTHER','loc-1'); INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'matrix-'||e||d,e,d,'00:00','24:00' FROM unnest(ARRAY['MATRIX-WORKER','MATRIX-OTHER'])e CROSS JOIN generate_series(0,6)d; INSERT INTO weekly_availability_submissions(week_start,employee_id,uses_normal_availability) VALUES('2026-10-12','MATRIX-WORKER',true),('2026-10-12','MATRIX-OTHER',true); INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('matrix-week','loc-1','2026-10-12','DRAFT','QAOWNER')");
    await assignOwnedManagerCompanyAccess(app.database.executor, 'MATRIX-COMPANY');
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) SELECT 'MATRIX-SECOND',password_hash,false FROM employee_credentials WHERE employee_id='MATRIX-COMPANY'");
    await assignOwnedManagerCompanyAccess(app.database.executor, 'MATRIX-SECOND');
    const owner = await fixtureProof(app.database.executor, 'QAOWNER'), view = await readOwnerOperationalScope(owner, 'MATRIX-LOCAL', app.database.executor);
    if (view.state !== 'ready') throw Error('Owned scope unavailable');
    const c = view.data.current;
    expect((await assignOperationalScope(owner, 'MATRIX-LOCAL', { action: 'ASSIGN', operationId: randomUUID(), expectedEmployeeVersion: c.employeeUpdatedAt, expectedRoleGeneration: c.roleGeneration, expectedScopeRevision: c.scopeRevision, scope: { mode: 'LOCATIONS', locationIds: ['loc-1'] } }, app.database.executor)).state).toBe('saved');
    const workspace = await getWorkspace(app.database.executor), scope = { workspaceId: workspace.id, timeZone: workspace.timeZone, weekStart: '2026-10-12', locationId: 'loc-1' };
    const need = { kind: 'STAFFING' as const, needStart: '2026-10-12T08:00', needEnd: '2026-10-12T16:00', configuredCapacity: 1, staffingBasis: { requiredStaff: 1, positions: [] } };
    const claims = { version: 1, claims: [{ ...need, needKey: generationNeedKey(scope, need), coveredStart: need.needStart, coveredEnd: need.needEnd, quantity: 1 }] };
    async function seed(generated = false) {
      const id = 'matrix-shift-' + serial++;
      await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_origin,generated_claims) VALUES($1,'matrix-week','MATRIX-WORKER','2026-10-12','08:00','16:00',$2,$3::jsonb)", [id, generated ? 'GENERATED' : 'MANAGER', generated ? JSON.stringify(claims) : null]);
      return id;
    }
    for (const engine of ['chromium', 'webkit']) {
      // Separate browser processes keep both actual sessions foreground without
      // suppressing any of the application's blur/visibility privacy handlers.
      const b0 = await runtime[engine].launch({ headless: true }), b1 = await runtime[engine].launch({ headless: true }); browsers.push(b0, b1);
      const b2 = await runtime[engine].launch({ headless: true }); browsers.push(b2);
      const c0 = await b0.newContext({ viewport: { width: 390, height: 1000 }, serviceWorkers: 'block', ...network }), c1 = await b1.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...network });
      const c2 = await b2.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...network });
      // Reuse the release suite's witnessed native-navigation diagnostic. Its
      // negative controls prove real window exceptions/rejections remain fatal.
      const control = engine === 'webkit' ? await verifyNavigationFetchDiagnostic(b0) : { verified: false, windowObserverVerified: false, status: 'not-applicable' };
      if (engine === 'webkit') expect(control.verified).toBe(true);
      runtimeControls.push({ engine, ...control });
      for (const [index, context] of [c0, c1, c2].entries()) {
        const execution = { engine, width: index === 0 ? 390 : 1440, kind: 'readiness-schedule' };
        const observer = observeBrowserCell(execution, errors, { navigationDiagnosticVerified: control.verified, navigationReadKinds: ['manager-today-read'], routerReadsDuringNavigation: true });
        observer.setStageReader(() => stage);
        await observer.observeContext(context, index === 1 ? 'manager' : 'primary');
        await observeRscCaughtErrors(context, (_page: unknown, metadata: Record<string, unknown>) => trace({ engine, index, event: 'caught-rsc-error', metadata }));
        if (engine !== 'webkit') await observeWindowExceptions(context, (_page: unknown, kind: string) => errors.push({ engine, index, kind, type: 'window-javascript-error' }));
        runtimeExecutions.push(execution);
      }
      const p0 = await c0.newPage(), p1 = await c1.newPage(), p2 = await c2.newPage(), page = (n: number) => n === 2 ? p2 : n ? p1 : p0;
      // A pending submit has a different accessible name. The form's stable
      // identity must survive that label change, including after outcome loss.
      const deletionForm = (target: typeof p0) => target.locator('form.c-shift__delete');
      const unknownDeletionLock = async (target: typeof p0, version: string) => {
        const deletion = deletionForm(target);
        await deletion.getByRole('alert').getByText('Deletion outcome unknown', { exact: true }).waitFor();
        expect(await deletion.count()).toBe(1);
        expect(await deletion.locator('fieldset[disabled]').count()).toBe(1);
        const submit = deletion.locator('fieldset button[type="submit"]');
        expect(await submit.count()).toBe(1);
        expect(await submit.evaluate((element: HTMLButtonElement) => element.matches(':disabled'))).toBe(true);
        expect(await deletion.locator('[name="expectedReviewVersion"]').inputValue()).toBe(version);
        return deletion;
      };
      const controlContext = await b0.newContext({ serviceWorkers: 'block' });
      try {
        const controlPage = await controlContext.newPage(); controlPage.setDefaultTimeout(20000);
        for (const pending of [true, false]) {
          const label = pendingDeletionLabelMarkup(pending);
          await controlPage.setContent('<form id="edit-shift-form"><fieldset><input name="notes" value="Fictional retained draft"></fieldset></form><form class="c-shift__delete"><fieldset disabled><button type="submit">' + label + '</button></fieldset><input type="hidden" name="expectedReviewVersion" value="fictional-version"><div role="alert"><p>Deletion outcome unknown</p></div></form>');
          const legacyMatches = await controlPage.locator('form').filter({ has: controlPage.getByRole('button', { name: 'Delete', exact: true }) }).count();
          expect(legacyMatches).toBe(pending ? 0 : 1);
          const deletion = await unknownDeletionLock(controlPage, 'fictional-version');
          // An unrelated disabled edit form must never prove deletion safety.
          await controlPage.locator('#edit-shift-form fieldset').evaluate((element: HTMLFieldSetElement) => { element.disabled = true; });
          await deletion.locator('fieldset').evaluate((element: HTMLFieldSetElement) => { element.disabled = false; });
          await expect(unknownDeletionLock(controlPage, 'fictional-version')).rejects.toThrow();
          await deletion.locator('fieldset').evaluate((element: HTMLFieldSetElement) => { element.disabled = true; });
          await unknownDeletionLock(controlPage, 'fictional-version');
          deletionLocatorControls.push({ engine, pendingLabel: pending, legacyMatches, canonicalForms: 1, disabledFieldsets: 1, nativeSubmitDisabled: true, unlockedDeletionRejectedWithUnrelatedDisabledEdit: true });
        }
      } finally { await controlContext.close(); }
      const pendingRouterReads = [new Set<object>(), new Set<object>(), new Set<object>()];
      const documentRequests = [0, 0, 0], drainReceipts: { page: number; pending: number }[] = [];
      for (const n of [0, 1, 2]) {
        const p = page(n); p.setDefaultTimeout(20000);
        const requestIds = new WeakMap<object, number>(); let requestSerial = 0;
        const kind = (address: string) => { const url = new URL(address); if (url.origin !== base) return null; const paths: Record<string, string> = { '/login': 'login', '/app': 'manager-home', '/app/schedule': 'schedule', '/app/schedule/edit': 'schedule-edit', '/api/manager/today': 'manager-today', '/api/company-access/operational-authority': 'authority', '/api/notifications': 'notifications', '/__nextjs_original-stack-frames': 'framework-frames' }; return paths[url.pathname] ?? null; };
        const requestMetadata = (request: TracedRequest) => { const resource = kind(request.url()); if (!resource) return null; if (!requestIds.has(request)) requestIds.set(request, ++requestSerial); return { resource, requestId: requestIds.get(request), method: request.method(), document: request.isNavigationRequest(), rsc: request.headers().rsc === '1', serverAction: typeof request.headers()['next-action'] === 'string' }; };
        p.on('request', (request: TracedRequest) => { const metadata = requestMetadata(request); if (metadata) { if (metadata.document) documentRequests[n]++; if (metadata.method === 'GET' && metadata.rsc && ['manager-home', 'schedule', 'schedule-edit'].includes(metadata.resource)) pendingRouterReads[n].add(request); trace({ engine, index: n, event: 'request', ...metadata }); } });
        p.on('response', (response: { request(): TracedRequest; status(): number }) => { const metadata = requestMetadata(response.request()); if (metadata) trace({ engine, index: n, event: 'response', status: response.status(), ...metadata }); });
        p.on('requestfinished', (request: TracedRequest) => { pendingRouterReads[n].delete(request); const metadata = requestMetadata(request); if (metadata) trace({ engine, index: n, event: 'finished', ...metadata }); });
        p.on('requestfailed', (request: TracedRequest) => { pendingRouterReads[n].delete(request); const metadata = requestMetadata(request); if (metadata) trace({ engine, index: n, event: 'failed', category: requestFailureCategory(request.failure()?.errorText), ...metadata }); });
        p.on('framenavigated', (frame: { url(): string }) => { if (frame === p.mainFrame()) trace({ engine, index: n, event: 'document', resource: kind(frame.url()) }); });
        p.on('pageerror', () => { trace({ engine, index: n, event: 'pageerror' }); if (runtimeFailureTraces.length < 8) runtimeFailureTraces.push({ engine, index: n, events: [...runtimeTrace] }); else failureTracesOmitted++; });
        stage = 'login';
        await p.route('**/*', async (route: { request(): { url(): string }; abort(): Promise<void>; continue(): Promise<void> }) => { const url = new URL(route.request().url()); if (['http:', 'https:'].includes(url.protocol) && url.origin !== base) await route.abort(); else await route.continue(); });
        await p.goto(base + '/login'); await p.getByLabel('Employee ID', { exact: true }).fill(n === 2 ? 'MATRIX-SECOND' : n ? 'MATRIX-LOCAL' : 'MATRIX-COMPANY'); await p.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD); await p.getByRole('button', { name: 'Sign in', exact: true }).click(); await p.waitForURL(base + '/app');
      }
      const form = (n: number) => page(n).locator('form').filter({ has: page(n).locator('[name="employeeId"]') });
      const drainRouterReads = async (n: number) => {
        const receipt = { page: n, pending: pendingRouterReads[n].size }; drainReceipts.push(receipt);
        // A client-side redirect updates history before its RSC stream ends.
        // networkidle may already belong to the old document; require actual
        // request completion before this test initiates another hard navigation.
        await expect.poll(() => pendingRouterReads[n].size, { timeout: 20000 }).toBe(0);
        trace({ engine, index: n, event: 'router-reads-drained', pendingAtStart: receipt.pending });
      };
      const open = async (n: number, id: string) => { const p = page(n); await drainRouterReads(n); await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await p.goto(base + '/app/schedule/edit?shiftId=' + id); await form(n).locator('[name="expectedReviewVersion"]').waitFor({ state: 'attached' }); };
      // Negative control: even a previously idle document must not let a held
      // real Next RSC read be cancelled by the next fixture navigation.
      const probeSource = await seed(), probeDestination = await seed();
      await open(0, probeSource);
      await p0.waitForLoadState('networkidle');
      let releaseProbe: () => void = () => {}, probeArrived: () => void = () => {}, holdProbe = true;
      const probeGate = new Promise<void>(resolve => { releaseProbe = resolve; }), probeSeen = new Promise<void>(resolve => { probeArrived = resolve; });
      const probePattern = '**/app/schedule/edit?*';
      await p0.route(probePattern, async (route: { request(): TracedRequest; continue(): Promise<void> }) => { if (holdProbe && route.request().headers().rsc === '1') { probeArrived(); await probeGate; } await route.continue(); });
      let nextProbe: Promise<void> | undefined, probeTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        await p0.evaluate(() => { void fetch(location.pathname + location.search, { cache: 'no-store', headers: { RSC: '1' } }).then(response => response.text()).catch(() => {}); });
        await Promise.race([probeSeen, new Promise<never>((_, reject) => { probeTimer = setTimeout(() => reject(Error('Owned RSC control was not requested')), 10000); })]);
        await p0.waitForLoadState('networkidle');
        expect(pendingRouterReads[0].size).toBeGreaterThan(0);
        const pendingAfterOldIdle = pendingRouterReads[0].size;
        trace({ engine, index: 0, event: 'old-idle-barrier-returned-with-pending-router-read' });
        const before = documentRequests[0], receiptCount = drainReceipts.length;
        nextProbe = open(0, probeDestination);
        await expect.poll(() => drainReceipts.length).toBe(receiptCount + 1);
        expect(drainReceipts.at(-1)?.pending).toBeGreaterThan(0);
        expect(documentRequests[0]).toBe(before);
        holdProbe = false; releaseProbe(); await nextProbe;
        expect(documentRequests[0]).toBeGreaterThan(before);
        routerReadControls.push({ engine, pendingAfterOldIdle, documentRequestsWhileHeld: before, documentRequestsAfterRelease: documentRequests[0], events: runtimeTrace.filter(value => value.engine === engine && value.index === 0).slice(-30) });
        checks.push(`${engine}: held real RSC read blocks next hard navigation until response completion`);
      } finally { if (probeTimer) clearTimeout(probeTimer); holdProbe = false; releaseProbe(); await nextProbe?.catch(() => {}); await p0.unroute(probePattern); await q('DELETE FROM shifts WHERE id=ANY($1::text[])', [[probeSource, probeDestination]]); }
      const edit = async (n: number, note: string, reassign = false) => { if (reassign) await form(n).locator('select[name="employeeId"]').selectOption('MATRIX-OTHER'); await form(n).locator('[name="notes"]').fill(note); await form(n).evaluate((element: HTMLFormElement) => element.requestSubmit()); };
      const remove = async (n: number) => { const p = page(n); await p.getByRole('button', { name: 'Delete shift', exact: true }).click(); await p.getByRole('button', { name: 'Delete', exact: true }).click(); };
      const refused = async (n: number, version: string, unavailable = false) => { await page(n).getByRole('alert').filter({ hasText: unavailable ? 'You don’t have access to make this change' : 'changed since you opened' }).first().waitFor(); expect(await form(n).locator('[name="expectedReviewVersion"]').inputValue()).toBe(version); await page(n).getByRole('button', { name: 'Reload current shift', exact: true }).first().waitFor(); };
      const loseNextResponse = async (n: number, id: string) => {
        const pattern = '**/app/schedule/edit?shiftId=' + id;
        const loss = { intercepted: false, completed: false, failed: false, upstreamStatus: 0 };
        await page(n).route(pattern, async (route: { request(): { method(): string }; fetch(options: { maxRedirects: number }): Promise<{ status(): number }>; abort(reason: string): Promise<void>; continue(): Promise<void> }) => {
          if (loss.intercepted || route.request().method() !== 'POST') return route.continue();
          loss.intercepted = true;
          try {
            // Await the real action response (and therefore its transaction)
            // before losing it. An unrelated existing alert is not a barrier.
            const response = await route.fetch({ maxRedirects: 0 });
            loss.upstreamStatus = response.status();
            await route.abort('failed');
          } catch {
            // Playwright errors can include request cookies. Retain only the
            // safe interception outcome, including on early fixture teardown.
            loss.failed = true;
            await route.abort('failed').catch(() => {});
          } finally { loss.completed = true; }
        });
        return { pattern, loss, wait: async () => {
          await expect.poll(() => loss.completed, { timeout: 20000 }).toBe(true);
          expect(loss).toMatchObject({ intercepted: true, failed: false, upstreamStatus: 200 });
          await page(n).getByRole('alert').filter({ hasText: 'This change could not be confirmed' }).first().waitFor();
        } };
      };
      for (const stale of [0, 1]) {
        stage = 'revision-conflict';
        const winner = 1 - stale;
        for (const [first, second] of [['edit', 'edit'], ['reassign', 'edit'], ['edit', 'reassign'], ['edit', 'delete'], ['delete', 'edit']]) {
          const id = await seed(); failureShot = () => page(stale).screenshot({ path: resolve(evidence, `${engine}-failure.png`), fullPage: true });
          await open(winner, id); await open(stale, id);
          const version = await form(stale).locator('[name="expectedReviewVersion"]').inputValue();
          await form(stale).locator('[name="notes"]').fill('Retained losing draft');
          if (first === 'delete') await remove(winner); else await edit(winner, 'Winning draft', first === 'reassign');
          await page(winner).waitForURL(/\/app\/schedule\?/);
          const committed = await q('SELECT employee_id,notes,updated_at::text FROM shifts WHERE id=$1', [id]);
          if (second === 'delete') await remove(stale); else await edit(stale, 'Retained losing draft', second === 'reassign');
          await refused(stale, version, first === 'delete');
          expect(await form(stale).locator('[name="notes"]').inputValue()).toBe('Retained losing draft');
          expect(await q('SELECT employee_id,notes,updated_at::text FROM shifts WHERE id=$1', [id])).toEqual(committed);
          checks.push(`${engine}: stale ${stale ? 'location' : 'Company'} Manager ${first}/${second}; two real sessions; winning row exact, draft/token retained`);
          await q('DELETE FROM shifts WHERE id=$1', [id]);
        }
        for (const generated of [true, false]) {
          const id = await seed(generated);
          if (generated && stale === 1) {
            await page(1).evaluate(() => window.dispatchEvent(new Event('pagehide'))); await page(1).waitForLoadState('networkidle'); await page(1).goto(base + '/app/schedule/edit?shiftId=' + id);
            await page(1).getByText('You can’t change a shift made by Build and publish.', { exact: false }).filter({ visible: true }).waitFor();
            expect(await form(1).count()).toBe(0); await q('DELETE FROM shifts WHERE id=$1', [id]); checks.push(`${engine}: location Manager cannot edit a current generated shift`); continue;
          }
          const generationWriter = generated ? 2 : winner;
          await open(generationWriter, id); await open(stale, id);
          const version = await form(stale).locator('[name="expectedReviewVersion"]').inputValue();
          if (generated) { await edit(generationWriter, 'Manager took ownership'); await page(generationWriter).waitForURL(/\/app\/schedule\?/); }
          else await q("UPDATE shifts SET assignment_origin='GENERATED',generated_claims=$2::jsonb,updated_at=clock_timestamp() WHERE id=$1", [id, JSON.stringify(claims)]);
          await edit(stale, 'Stale provenance edit'); await refused(stale, version, !generated && stale === 1);
          expect(await q('SELECT assignment_origin FROM shifts WHERE id=$1', [id])).toEqual([{ assignment_origin: generated ? 'MANAGER' : 'GENERATED' }]);
          await q('DELETE FROM shifts WHERE id=$1', [id]);
          checks.push(`${engine}: ${stale ? 'location' : 'Company'} Manager stale ${generated ? 'generated-to-manual UI save' : 'manual-to-generated fixture transition'} rejected`);
        }
      }
      // A committed edit whose response is lost must never acquire a fresh token
      // from the server behind the manager's retained draft.
      for (const n of [0, 1]) {
        stage = 'response-loss';
        const id = await seed(); await open(n, id); failureShot = () => page(n).screenshot({ path: resolve(evidence, `${engine}-failure.png`), fullPage: true });
        const version = await form(n).locator('[name="expectedReviewVersion"]').inputValue();
        const lost = await loseNextResponse(n, id);
        await edit(n, 'Lost response saved once');
        await lost.wait();
        const committed = await q('SELECT notes,updated_at::text FROM shifts WHERE id=$1', [id]); expect(committed[0]?.notes).toBe('Lost response saved once');
        expect(await form(n).locator('[name="expectedReviewVersion"]').inputValue()).toBe(version);
        expect(await form(n).locator('[name="notes"]').inputValue()).toBe('Lost response saved once');
        if (n === 0) { await edit(n, 'Lost response saved once'); await refused(n, version); }
        else { expect(await form(n).locator('fieldset[disabled]').count()).toBeGreaterThan(0); await page(n).getByRole('link', { name: 'Check the schedule', exact: true }).waitFor(); }
        expect(await q('SELECT notes,updated_at::text FROM shifts WHERE id=$1', [id])).toEqual(committed);
        await page(n).unroute(lost.pattern); await q('DELETE FROM shifts WHERE id=$1', [id]);
        checks.push(`${engine}: ${n ? 'location unknown-outcome lock' : 'Company original-review retry'} after committed lost response; row unchanged`);
      }
      for (const n of [0, 1]) {
        stage = 'response-loss';
        const id = await seed(); await open(n, id); failureShot = () => page(n).screenshot({ path: resolve(evidence, `${engine}-failure.png`), fullPage: true });
        const version = await form(n).locator('[name="expectedReviewVersion"]').inputValue();
        await form(n).locator('[name="notes"]').fill('Retained before lost deletion');
        const lost = await loseNextResponse(n, id);
        await remove(n); await lost.wait();
        expect(await q('SELECT id FROM shifts WHERE id=$1', [id])).toEqual([]);
        expect(await form(n).locator('[name="notes"]').inputValue()).toBe('Retained before lost deletion');
        // Phase 2 (C4-Ml): the location Manager deletes from the same sheet as the Company Manager, with the same lock.
        const deletion = await unknownDeletionLock(page(n), version);
        await deletion.getByRole('button', { name: 'Reload current shift', exact: true }).waitFor();
        // Even a synthetic programmatic submit cannot bypass the uncertainty
        // fence; only explicit current-view review can create a new intent.
        await deletion.evaluate((element: HTMLFormElement) => element.requestSubmit());
        await deletion.getByRole('alert').filter({ hasText: 'Deletion outcome unknown' }).waitFor();
        expect(await q('SELECT id FROM shifts WHERE id=$1', [id])).toEqual([]); await page(n).unroute(lost.pattern);
        checks.push(`${engine}: ${n ? 'location' : 'Company'} unknown-outcome lock and copy-before-review after lost successful deletion; draft retained and no replay effects`);
      }
      stage = 'offline';
      const offlineId = await seed(); await open(0, offlineId); await p0.waitForLoadState('networkidle');
      await c0.setOffline(true);
      await p0.waitForFunction(() => !document.querySelector('form [name="expectedReviewVersion"]'), undefined, { timeout: 17000 });
      expect(await form(0).count()).toBe(0); await c0.setOffline(false);
      checks.push(`${engine}: real offline event cannot extend a scoped frame beyond its original 15-second authority`);
      await q('DELETE FROM shifts WHERE id=$1', [offlineId]);
      for (const p of [p0, p1, p2]) { await p.evaluate(() => window.dispatchEvent(new Event('pagehide'))); await p.waitForLoadState('networkidle'); }
      await c0.close(); await c1.close(); await c2.close();
    }
    expect(await q('SELECT id FROM schedule_publication_revisions')).toEqual([]);
    expect(await q('SELECT id FROM notifications')).toEqual([]);
    expect(errors).toEqual([]); complete = true;
  } catch (error) { await failureShot?.().catch(() => {}); throw error; }
  finally { await Promise.all(browsers.map(b => b.close())); await tls?.close(); await app.close(); await writeFile(resolve(evidence, 'report.json'), JSON.stringify({ complete, checks, errors, runtimeControls, runtimeExecutions, deletionLocatorControls, routerReadControls, runtimeTrace, runtimeFailureTraces, traceOmitted, failureTracesOmitted, fictionalOnly: true, source: app.sourceHashes }, null, 2)); }
}, 480000);
