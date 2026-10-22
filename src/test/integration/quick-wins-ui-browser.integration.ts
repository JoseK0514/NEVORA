import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createOwnedNextApp } from './owned-next-app';
import { assignOwnedManagerCompanyAccess, seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import { hashPassword } from '../../lib/auth/password';

it('verifies integrated Manager and Owner quick wins with real sessions and owned data', async () => {
  const evidence = process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;
  if (!evidence) throw Error('Select an external NEVORA_ALL_UI_BROWSER_EVIDENCE directory');
  const output = resolve(evidence, 'quick-wins');
  await mkdir(output, { recursive: true });
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app = await createOwnedNextApp(output, { payrollEnabled: true });
  const browsers: { close(): Promise<void> }[] = [];
  const checks: string[] = [], errors: string[] = [];
  let complete = false;
  try {
    const q = (text: string, values: unknown[] = []) => app.database.executor.query({ text, values });
    await seedOwnedApp(app.database.executor);
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QW-MANAGER','Fictional','Manager','2025550141','MANAGER','loc-1'),('QW-IDLE','Fictional','Idle','2025550142','EMPLOYEE','loc-1')");
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', ['QW-MANAGER', await hashPassword(TEST_PASSWORD)]);
    await assignOwnedManagerCompanyAccess(app.database.executor, 'QW-MANAGER');
    await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('quick-wins-device','loc-1','Fictional quick wins tablet')");
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES('quick-wins-open','QAOWNER','loc-1','quick-wins-device',now()-interval '30 minutes','CLOCKED_IN',1)");
    const origin = app.url.replace('127.0.0.1', 'localhost');
    for (const engine of ['chromium', 'webkit']) {
      const browser = await runtime[engine].launch({ headless: true }); browsers.push(browser);
      for (const actor of ['QAOWNER', 'QW-MANAGER']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
        let holdRefresh = false;
        const pendingRefresh: (() => void)[] = [];
        const releaseRefresh = () => { holdRefresh = false; pendingRefresh.splice(0).forEach(release => release()); };
        await context.route('**/*', async (route: { request(): { url(): string; headers(): Record<string, string> }; abort(reason?: string): Promise<void>; continue(): Promise<void> }) => {
          const url = new URL(route.request().url());
          if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) await route.abort('blockedbyclient');
          else {
            if (holdRefresh && url.pathname === '/app/inbox' && route.request().headers().rsc === '1') await new Promise<void>(release => pendingRefresh.push(release));
            await route.continue();
          }
        });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        page.on('pageerror', (error: Error) => errors.push(engine + ': ' + error.message.slice(0, 400)));
        try {
          await page.goto(origin + '/login');
          await page.getByLabel('Employee ID', { exact: true }).fill(actor);
          await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
          await page.getByRole('button', { name: 'Sign in', exact: true }).click();
          await page.waitForURL(origin + '/app');
          for (const path of ['/app', '/app/timecards', '/app/reports', '/app/inbox', '/app/schedule/new']) {
            const response = await page.goto(origin + path);
            expect(response?.status(), engine + ' ' + actor + ' ' + path).toBe(200);
            await page.locator('main').getByRole('heading', { level: 1 }).first().waitFor();
            await page.waitForLoadState('networkidle');
            for (const width of [320, 390, 768, 1440]) {
              await page.setViewportSize({ width, height: 1000 });
              expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), engine + ' ' + actor + ' ' + path + ' ' + width).toBe(true);
            }
            if (path === '/app') {
              await page.locator('#home-timeline').waitFor();
              expect(await page.locator('#home-timeline').textContent()).toContain('Fictional Owner');
              checks.push(engine + ': ' + actor + ' unscheduled-only Home timeline');
            }
            if (path === '/app/timecards') {
              const folded = page.getByRole('button', { name: /people with no time yet/ });
              await folded.waitFor(); await folded.click();
              await page.waitForFunction(() => [...document.querySelectorAll('.cm-tc-person')].some(element => element === document.activeElement));
              await page.goto(origin + '/app/inbox');
              await page.goto(origin + '/app/timecards#timecard-QAOWNER');
              await page.getByRole('dialog').waitFor();
              expect(await page.getByRole('dialog').textContent()).toContain('Fictional Owner');
              await page.keyboard.press('Escape');
              checks.push(engine + ': ' + actor + ' folded timecards keyboard focus and drawer link');
            }
            if (path === '/app/reports') {
              await page.getByRole('button', { name: /^Report period: This week so far/ }).waitFor();
              await page.setViewportSize({ width: 320, height: 1000 });
              await page.getByRole('button', { name: 'This week', exact: true }).waitFor();
              expect(await page.getByRole('button', { name: 'This week', exact: true }).getAttribute('aria-pressed')).toBe('true');
              await page.getByRole('button', { name: 'Last week', exact: true }).click();
              await page.getByText('No recorded time in this period', { exact: true }).waitFor();
              await page.setViewportSize({ width: 1440, height: 1000 });
              checks.push(engine + ': ' + actor + ' current and empty previous Insights period');
            }
            await page.screenshot({ path: output + '/' + engine + '-' + actor + '-' + path.replaceAll('/', '_') + '.png', fullPage: true });
            checks.push(engine + ': ' + actor + ' ' + path + ' at 320/390/768/1440');
          }
          await page.goto(origin + '/app');
          await page.getByRole('button', { name: 'Search', exact: true }).click();
          const search = page.getByRole('combobox', { name: 'Search pages, people and places' });
          await search.fill('add shift');
          await page.getByRole('option', { name: /Add a shift/ }).waitFor();
          await search.fill('approve time off');
          await page.getByRole('option', { name: /Review time-off requests/ }).waitFor();
          await page.keyboard.press('Escape');
          checks.push(engine + ': ' + actor + ' search verb synonyms and keyboard dismissal');
          for (const path of ['/app/settings', '/app/settings/branding', '/app/settings/positions']) {
            await page.goto(origin + path);
            if (actor === 'QW-MANAGER') {
              await page.getByText('Only Owners can open Settings.', { exact: true }).waitFor();
              expect(new URL(page.url()).pathname).toBe(path);
              expect(await page.getByRole('button', { name: /Save/ }).count()).toBe(0);
            } else await page.locator('main').getByRole('heading', { level: 1 }).first().waitFor();
            checks.push(engine + ': ' + actor + ' Settings route ' + path);
          }
          if (engine === 'chromium' && actor === 'QAOWNER') {
            await context.route('**/api/manager/today', async (route: { fulfill(options: unknown): Promise<void> }) => {
              const now = Date.now(), observedAt = new Date(now).toISOString();
              const shift = { id: 'quick-wins-contact', employeeId: 'QW-MANAGER', employeeName: 'Fictional Manager', locationId: 'loc-1', locationName: 'Northside Main Office', positionName: null,
                startAt: new Date(now - 3600000).toISOString(), endAt: new Date(now + 3600000).toISOString(), status: 'not_clocked_in', firstClockInAt: null, late: false };
              await route.fulfill({ status: 200, json: { state: 'ready', observedAt, validForMs: 60000, timeZone: 'America/Puerto_Rico', today: observedAt.slice(0, 10), counts: { scheduled: 1, clockedIn: 0, late: 0, notClockedIn: 1 }, shifts: [shift], missed: [shift] } });
            });
            await page.goto(origin + '/app/inbox?item=shift%3Aquick-wins-contact');
            const call = page.getByRole('link', { name: 'Call Fictional Manager', exact: true });
            await call.waitFor();
            holdRefresh = true;
            await call.waitFor({ state: 'detached', timeout: 20000 });
            await page.getByRole('button', { name: 'Try again', exact: true }).click();
            await page.getByRole('link', { name: /Contact for Fictional Manager:/ }).waitFor();
            expect(await call.count()).toBe(0);
            expect(await page.getByRole('link', { name: 'Text Fictional Manager', exact: true }).count()).toBe(0);
            releaseRefresh();
            await call.waitFor();
            holdRefresh = true;
            await page.evaluate(() => window.dispatchEvent(new Event('blur')));
            await call.waitFor({ state: 'detached' });
            await page.evaluate(() => window.dispatchEvent(new Event('focus')));
            await page.getByRole('link', { name: /Contact for Fictional Manager:/ }).waitFor();
            expect(await call.count()).toBe(0);
            releaseRefresh();
            await call.waitFor();
            checks.push('chromium: real directory contacts expire and clear on blur; fresh authority and RSC restore them; controlled Today response only');
          }
        } catch (error) {
          await page.screenshot({ path: output + '/' + engine + '-' + actor + '-failure.png', fullPage: true }).catch(() => {});
          throw error;
        } finally { releaseRefresh(); await context.close(); }
      }
    }
    expect(errors).toEqual([]);
    complete = true;
  } finally {
    await Promise.all(browsers.map(browser => browser.close()));
    await app.close();
    await writeFile(output + '/report.json', JSON.stringify({ complete, checks, errors, source: app.sourceHashes, fictionalOnly: true, runtime: 'Next development with owned PostgreSQL transport' }, null, 2));
  }
}, 240000);
