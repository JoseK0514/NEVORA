import assert from 'node:assert/strict';
import type {createOwnedNextApp} from './owned-next-app';
import {TEST_PASSWORD} from './owned-app-fixture';

type App = Awaited<ReturnType<typeof createOwnedNextApp>>;
// Narrow structural contract for the separately installed, pinned QA runtime.
type Response = {status(): number; ok(): boolean; headers(): Record<string,string>; json(): Promise<unknown>};
type Locator = {fill(value: string): Promise<void>; click(): Promise<void>; waitFor(): Promise<void>; count(): Promise<number>; innerText(): Promise<string>};
type Page = {goto(url: string): Promise<Response | null>; setDefaultTimeout(ms: number): void; waitForURL(predicate: (url: URL) => boolean): Promise<void>;
  locator(selector: string): Locator; getByLabel(label: string, options?: {exact: boolean}): Locator; getByRole(role: string, options: {name: string; exact?: boolean}): Locator; getByText(text: string, options: {exact: boolean}): Locator};
type BrowserContext = {request: {get(url: string, options?: {headers: Record<string,string>}): Promise<Response>}; newPage(): Promise<Page>; close(): Promise<void>;
  route(pattern: string, handler: (route: {request(): {url(): string}; continue(): Promise<void>; abort(): Promise<void>}) => Promise<void>): Promise<void>};
type Browser = {newContext(options?: {viewport: {width: number; height: number}; serviceWorkers: string; userAgent?: string}): Promise<BrowserContext>};
export type NativeCheck = {name: string; status: 'passed'};
export async function verifyNativeBackend(app: App, browser: Browser, checks: NativeCheck[]) {
  const contexts: BrowserContext[] = [];
  const q = (text: string, values: readonly unknown[] = []) => app.database.executor.query({text, values});
  async function check(name: string, task: () => Promise<void>) {
    await task(); checks.push({name, status: 'passed'}); console.log('PASS', name);
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
    const page = await context.newPage(); page.setDefaultTimeout(20000);
    await page.goto(app.url + '/login');
    await page.getByLabel('Employee ID', {exact: true}).fill(id);
    await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
    await Promise.all([page.waitForURL(url => url.pathname === '/app'), page.getByRole('button', {name: 'Sign in', exact: true}).click()]);
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
  } finally { await Promise.all(contexts.map(context => context.close())); }
}
