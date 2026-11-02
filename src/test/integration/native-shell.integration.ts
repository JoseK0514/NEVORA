import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {createOwnedSmtp} from './owned-smtp';
import type {createOwnedNextApp} from './owned-next-app';
import {TEST_PASSWORD} from './owned-app-fixture';

type App = Awaited<ReturnType<typeof createOwnedNextApp>>;
// Narrow structural contract for the separately installed, pinned QA runtime.
type Response = {status(): number; ok(): boolean; headers(): Record<string,string>; json(): Promise<unknown>};
type Locator = {fill(value: string): Promise<void>; click(): Promise<void>; waitFor(): Promise<void>; count(): Promise<number>; innerText(): Promise<string>; inputValue(): Promise<string>};
type Page = {goto(url: string): Promise<Response | null>; setDefaultTimeout(ms: number): void; waitForURL(predicate: (url: URL) => boolean): Promise<void>;
  locator(selector: string): Locator; getByLabel(label: string, options?: {exact: boolean}): Locator; getByRole(role: string, options: {name: string | RegExp; exact?: boolean}): Locator; getByText(text: string, options: {exact: boolean}): Locator;
  screenshot(options: {path: string; fullPage: boolean}): Promise<Buffer>};
type BrowserContext = {request: {get(url: string, options?: {headers: Record<string,string>}): Promise<Response>; post(url: string, options: {headers: Record<string,string>; data: Record<string,unknown>}): Promise<Response>}; newPage(): Promise<Page>; close(): Promise<void>;
  route(pattern: string, handler: (route: {request(): {url(): string}; continue(): Promise<void>; abort(): Promise<void>}) => Promise<void>): Promise<void>};
type Browser = {newContext(options?: {viewport: {width: number; height: number}; serviceWorkers: string; userAgent?: string}): Promise<BrowserContext>};
export type NativeCheck = {name: string; status: 'passed'};
export async function verifyNativeBackend(app: App, browser: Browser, checks: NativeCheck[], smtp: Awaited<ReturnType<typeof createOwnedSmtp>>) {
  const contexts: BrowserContext[] = [];
  const failures: unknown[] = [];
  let active: Page | undefined;
  const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query<Record<string,unknown>>({text, values});
  async function check(name: string, task: () => Promise<void>) {
    try { await task(); checks.push({name, status: 'passed'}); console.log('PASS', name); }
    catch (error) {
      if (active) {
        await writeFile(join(app.root, 'failure-' + name + '.txt'), await active.locator('body').innerText()).catch(() => {});
        await active.screenshot({path: join(app.root, 'failure-' + name + '.png'), fullPage: true}).catch(() => {});
      }
      failures.push(error); console.error('FAIL', name, String(error));
    }
  }
  async function session(context: BrowserContext, status: number, state: string, path = '/api/mobile/v1/session', headers: Record<string,string> = {}) {
    const response = await context.request.get(app.url + path, {headers});
    assert.equal(response.status(), status);
    assert.deepEqual(await response.json(), {protocolVersion: 1, state});
    assert.match(response.headers()['cache-control'], /no-store/);
    assert.match(response.headers()['cache-control'], /private/);
    assert.match(response.headers().vary, /Cookie/i);
    assert.equal(response.headers()['referrer-policy'], 'no-referrer');
    return response;
  }
  async function login(id: string, native = true): Promise<{context: BrowserContext; page: Page}> {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block',
      ...(native ? {userAgent: 'Mozilla/5.0 NEVORA-Native/Android/1'} : {})});
    contexts.push(context);
    // A test guard blocks accidental provider/network traffic, not app authority.
    await context.route('**/*', route => new URL(route.request().url()).origin === app.url ? route.continue() : route.abort());
    const page = await context.newPage(); active = page; page.setDefaultTimeout(20000);
    await page.goto(app.url + '/login');
    await page.getByLabel('Employee ID', {exact: true}).fill(id);
    await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
    await Promise.all([page.waitForURL(url => url.pathname === '/app'), page.getByRole('button', {name: 'Sign in', exact: true}).click()]);
    // URL commitment precedes the streamed private page. Wait for its real UI.
    if (native && ['QA-NATIVE-B', 'QA-NATIVE-C'].includes(id)) await page.getByRole('heading', {name: 'Use NEVORA in your web browser'}).waitFor();
    else await page.locator(id === 'QAOWNER' ? '.c-home' : id === 'QA-NATIVE-B' ? '.premium-home' : '.c-ehome').waitFor();
    return {context, page};
  }
  try {
    const anonymous = await browser.newContext(); contexts.push(anonymous);
    await check('missing-session', async () => { await session(anonymous, 401, 'unauthenticated'); });
    await check('denied-selectors', async () => { await session(anonymous, 400, 'denied', '/api/mobile/v1/session?employeeId=QAOWNER'); });
    await check('denied-origin', async () => { await session(anonymous, 403, 'denied', undefined, {Origin: 'https://attacker.invalid'}); });
    await check('denied-cross-site', async () => { await session(anonymous, 403, 'denied', undefined, {'Sec-Fetch-Site': 'cross-site'}); });
    const employee = await login('QA-NATIVE-A');
    await check('employee-native-session', async () => {
      await session(employee.context, 200, 'authenticated');
      assert.equal(await employee.page.getByText('Use NEVORA in your web browser', {exact: true}).count(), 0);
      assert((await employee.page.locator('body').innerText()).length > 100);
    });
    await check('native-renderer-policy', async () => {
      const response = await employee.context.request.get(app.url + '/app/profile');
      const policy = response.headers()['content-security-policy'];
      assert.match(policy, /frame-src 'none'/); assert.match(policy, /connect-src 'self'/);
      assert.match(policy, /form-action 'self'/); assert(!policy.includes('https:'));
      const web = await anonymous.request.get(app.url + '/login');
      assert(!web.headers()['content-security-policy']?.includes("frame-src 'none'"));
    });
    await check('employee-schedule', async () => {
      const response = await employee.page.goto(app.url + '/app/schedule'); assert(response?.ok());
      assert.match(await employee.page.locator('body').innerText(), /Schedule|schedule/);
    });
    await check('employee-authorized-action', async () => {
      active = employee.page;
      await employee.page.goto(app.url + '/app/availability');
      await employee.page.getByRole('button', {name: /^Monday,/}).click();
      await employee.page.getByRole('switch', {name: 'Available on Monday', exact: true}).click();
      await employee.page.getByRole('button', {name: 'Done', exact: true}).click();
      await employee.page.getByRole('button', {name: 'Save', exact: true}).click();
      await employee.page.getByRole('heading', {name: 'Usual hours saved', exact: true}).waitFor();
      const rows = await q("SELECT day_of_week FROM availability_windows WHERE employee_id='QA-NATIVE-A' ORDER BY day_of_week");
      assert.deepEqual(rows.map(row => row.day_of_week), [0, 2, 3, 4, 5, 6]);
    });
    const owner = await login('QAOWNER');
    await check('owner-native-session', async () => {
      await session(owner.context, 200, 'authenticated');
      const response = await owner.page.goto(app.url + '/app/settings/workspace'); assert(response?.ok());
      await owner.page.getByLabel('Business name', {exact: true}).waitFor();
    });
    await check('owner-authorized-action', async () => {
      await owner.page.getByLabel('Business name', {exact: true}).fill('Fictional Native Company');
      await owner.page.getByRole('button', {name: 'Save', exact: true}).click();
      await owner.page.getByText('Company profile saved', {exact: true}).waitFor();
      const rows = await q('SELECT name FROM workspaces'); assert.equal(rows[0].name, 'Fictional Native Company');
    });
    await check('actual-invitation-activation-and-login', async () => {
      const path = app.url + '/api/company-access/invitations/QA-NATIVE-JOIN';
      const headers = {Origin: app.url, 'x-nevora-company-access': '1', 'x-nevora-actor': 'QAOWNER'};
      const currentResponse = await owner.context.request.get(path, {headers}); assert.equal(currentResponse.status(), 200);
      const current = await currentResponse.json() as {state: string; employeeVersion: string; invitationRevision: number};
      assert.equal(current.state, 'ready');
      const response = await owner.context.request.post(path, {headers, data: {action: 'ISSUE', operationId: randomUUID(), expectedEmployeeVersion: current.employeeVersion, expectedInvitationRevision: current.invitationRevision}});
      assert.equal(response.status(), 200);
      const mail = smtp.messages.find(message => message.recipient.includes('native-join@example.invalid')); assert(mail);
      const proof = /#proof=([A-Za-z0-9_-]{43})/.exec(mail.body.replace(/=\r?\n/g, '').replace(/=3D/g, '='))?.[1]; assert(proof);
      assert(!JSON.stringify(await response.json()).includes(proof));
      const context = await browser.newContext({viewport: {width: 390, height: 844}, serviceWorkers: 'block', userAgent: 'Mozilla/5.0 NEVORA-Native/iOS/1'});
      contexts.push(context); const page = await context.newPage(); active = page; page.setDefaultTimeout(20000);
      await page.goto(app.url + '/activate#proof=' + proof);
      await page.locator('#activation-password').fill(TEST_PASSWORD);
      await page.locator('#activation-confirm-password').fill(TEST_PASSWORD);
      await page.getByRole('button', {name: 'Activate account', exact: true}).click();
      await page.locator('#activation-employee-id').waitFor();
      assert.equal(await page.locator('#activation-employee-id').inputValue(), 'QA-NATIVE-JOIN');
      const activated = await login('QA-NATIVE-JOIN'); await session(activated.context, 200, 'authenticated');
    });
    await check('employee-owner-route-denied', async () => {
      await employee.page.goto(app.url + '/app/settings/workspace');
      assert.equal(await employee.page.getByLabel('Business name', {exact: true}).count(), 0);
    });
    for (const [id, role] of [['QA-NATIVE-B', 'manager'], ['QA-NATIVE-C', 'lead']]) {
      await check(role + '-native-unsupported-web-preserved', async () => {
        const native = await login(id);
        await native.page.getByRole('heading', {name: 'Use NEVORA in your web browser'}).waitFor();
        const web = await login(id, false);
        assert.equal(await web.page.getByRole('heading', {name: 'Use NEVORA in your web browser'}).count(), 0);
        await session(web.context, 200, 'authenticated');
      });
    }
    await check('expired-session', async () => {
      await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='QA-NATIVE-A'");
      await session(employee.context, 401, 'unauthenticated');
    });
    await check('revoked-session', async () => {
      await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");
      await session(owner.context, 401, 'unauthenticated');
    });
    const current = await login('QA-NATIVE-A');
    await check('sanitized-database-outage-and-recovery', async () => {
      await q('ALTER TABLE employee_sessions RENAME TO native_test_sessions_unavailable');
      try { await session(current.context, 503, 'unavailable'); }
      finally { await q('ALTER TABLE native_test_sessions_unavailable RENAME TO employee_sessions'); }
      await session(current.context, 200, 'authenticated');
    });
    if (failures.length) throw new AggregateError(failures, 'Native backend assertions failed');
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
