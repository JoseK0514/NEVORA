import { expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AUTH_COPY, AUTH_LANG_COOKIE } from '../../lib/auth-copy';
import { ACCESS_COPY } from '../../components/access-recovery/copy';
import { createDeletionBrowserApp } from './deletion-browser-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';

it('keeps the last Owner signed in and explains the refusal in each portal language', async () => {
  const evidence = process.env.NEVORA_EMPLOYEE_DELETION_EVIDENCE;
  if (!evidence) throw Error('Select an external deletion evidence directory');
  await mkdir(evidence, { recursive: true });
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app = await createDeletionBrowserApp(evidence);
  const query = (text: string, values: string[] = []) => app.database.executor.query({ text, values });
  try {
    await seedOwnedApp(app.database.executor);
    expect(await query("SELECT id FROM employees WHERE active AND role='OWNER'")).toEqual([{ id: 'QAOWNER' }]);
    for (const engine of ['chromium', 'webkit'] as const) {
      const browser = await runtime[engine].launch();
      try {
        for (const lang of ['en', 'es'] as const) {
          await query("INSERT INTO user_language_preferences(employee_id,language) VALUES ('QAOWNER',$1) ON CONFLICT(employee_id) DO UPDATE SET language=EXCLUDED.language", [lang]);
          const context = await browser.newContext({ ...app.network, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: 'block' });
          try {
            await context.addCookies([{ name: AUTH_LANG_COOKIE, value: lang, url: app.url }, { name: 'nv-portal-lang', value: lang, url: app.url }]);
            const page = await context.newPage();
            await page.goto(app.url + '/login?returnTo=%2Fapp%2Faccount%2Fdelete');
            await page.getByLabel(AUTH_COPY[lang].employeeId, { exact: true }).fill('QAOWNER');
            await page.getByLabel(AUTH_COPY[lang].password, { exact: true }).fill(TEST_PASSWORD);
            await page.getByRole('button', { name: AUTH_COPY[lang].signIn, exact: true }).click();
            await page.waitForURL(app.url + '/app/account/delete');
            expect(await page.locator('html').getAttribute('lang')).toBe(lang);
            await page.locator('#deletion-password').fill(TEST_PASSWORD);
            await page.locator('#deletion-understand').check();
            await page.locator('.em-delete-confirm').click();
            const title = page.getByRole('status', { name: ACCESS_COPY[lang].lastOwner.title, exact: true });
            await title.waitFor();
            expect(await page.locator('#deletion-password').count()).toBe(0);
            expect(await query("SELECT id FROM account_deletion_requests WHERE employee_id='QAOWNER'")).toEqual([]);
            for (const width of [320,390,768,1440]) {
              await page.setViewportSize({ width, height: 900 });
              await page.screenshot({ path: resolve(evidence, engine+'-'+lang+'-last-owner-'+width+'.png'), fullPage: true });
            }
            await page.goto(app.url+'/app/profile');
            await page.waitForURL(app.url+'/app/profile');
            expect(await page.locator('h1:visible').count()).toBeGreaterThan(0);
          } finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }
  } finally { await app.close(); }
}, 900000);
