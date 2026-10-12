import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire, registerHooks } from 'node:module';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { seedOwnedApp } from '../src/test/integration/owned-app-fixture.ts';
import { workerOnce } from '../src/lib/payroll/worker.ts';

if (process.env.DATABASE_URL) throw Error('Unset DATABASE_URL before owned payroll workflow verification.');
const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb'))) throw Error('NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.');
const evidence = resolve(process.env.NEVORA_PAYROLL_EVIDENCE_DIR ?? '../payroll-workflow-evidence');
await mkdir(evidence, { recursive: true });
const projectRequire = createRequire(import.meta.url);
const serverContext = registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(specifier === 'server-only' ? new URL('../node_modules/next/dist/compiled/server-only/empty.js', import.meta.url).href : specifier, context);
  },
});
const { seedPayrollFixture } = await import('../src/test/integration/payroll-fixture.ts');
serverContext.deregister();
let playwright;
try { playwright = projectRequire('playwright'); }
catch { playwright = createRequire(join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright'); }
const cluster = mkdtempSync(join(tmpdir(), 'nevora-payroll-workflow-owned-'));
const marker = randomBytes(16).toString('hex');
writeFileSync(join(cluster, 'owner'), marker, { mode: 0o600 });
const data = join(cluster, 'data');
const pg = (name, args) => {
  const result = spawnSync(join(bin, name), args, { encoding: 'utf8', timeout: 45000 });
  if (result.error || result.status !== 0) throw Error(`${name}: ${result.error?.message ?? result.stderr}`);
};
const report = { checks: [], screenshots: [], errors: [], runtime: 'Owned local Next app, fictional payroll and real PostgreSQL/API/PDF; only scratch DB transport substituted', fixtureContext: 'Parent Node fixture resolves server-only to Next compiled empty guard, matching owned Vitest server context. Hook deregistered before runtime creation; actual Next uses normal server context.' };
const pass = name => { report.checks.push(name); console.log('PASS ' + name); };
let app, started = false;
const browsers = [];
async function geometry(page, label) {
  const result = await page.evaluate(() => {
    const root = document.querySelector('.payroll-workflow');
    const visible = element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element), closed = element.closest('details:not([open])');
      return (!closed || closed.querySelector(':scope > summary')?.contains(element)) && rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const controls = [...root.querySelectorAll('button,input,select,textarea,summary,a')].filter(visible).map(element => {
      const rect = (element.matches('input[type=checkbox]') ? element.closest('label') : element).getBoundingClientRect();
      return { label: element.getAttribute('name') || element.textContent, height: rect.height, left: rect.left, right: rect.right };
    });
    const overflow = [...document.querySelectorAll('body *')].filter(visible).filter(element => element.getBoundingClientRect().right > innerWidth + 1 || element.scrollWidth > element.clientWidth + 2).map(element => ({ tag: element.tagName, class: element.className?.baseVal ?? element.className, name: element.name, text: element.tagName === 'LABEL' ? element.textContent : undefined, children: element.tagName === 'LABEL' ? [...element.children].map(child => ({ tag: child.tagName, type: child.type, value: child.value, width: child.getBoundingClientRect().width, scroll: child.scrollWidth, client: child.clientWidth })) : undefined, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width, client: element.clientWidth, scroll: element.scrollWidth, overflow: getComputedStyle(element).overflowX })).slice(0, 30);
    return { width: innerWidth, scroll: document.documentElement.scrollWidth, controls, overflow, fonts: [...root.querySelectorAll('input,select,textarea')].filter(visible).map(element => ({ name: element.name || element.type, size: getComputedStyle(element).fontSize })) };
  });
  if (result.scroll > result.width + 1) { await shot(page, 'failure-' + label.replaceAll(' ', '-')); await writeFile(join(evidence, 'failure-layout.json'), JSON.stringify(result, null, 2)); }
  assert(result.scroll <= result.width + 1, `${label} horizontal overflow: ${JSON.stringify(result.controls.filter(control => control.left < -1 || control.right > result.width + 1))}`);
  assert.deepEqual(result.controls.filter(control => control.height < 43.5 || control.left < -1 || control.right > result.width + 1), [], label + ' clipped or short hit areas');
  if (result.width < 600) assert.deepEqual(result.fonts.filter(font => Number.parseFloat(font.size) < 16), [], label + ' mobile field font');
  pass(label + ': no overflow, 44px targets, readable fields');
}
async function shot(page, name) {
  const path = join(evidence, name + '.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true, style: 'nextjs-portal { display: none; }' }); report.screenshots.push(path);
}
async function login(context, employeeId, password) {
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(app.url + '/login');
  await page.getByLabel('Employee ID', { exact: true }).fill(employeeId);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await Promise.all([page.waitForURL(url => url.pathname === '/app'), page.getByRole('button', { name: 'Sign In', exact: true }).click()]);
  await page.close();
}
async function pageFor(context, path) {
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(app.url + path); return page;
}
const apiHeaders = () => ({ origin: app.url, 'x-nevora-payroll': '1' });
try {
  const server = createServer();
  const port = await new Promise((ready, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => { const actual = server.address().port; server.close(() => ready(actual)); }); });
  pg('initdb', ['-D', data, '-U', 'nevora_payroll', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  pg('pg_ctl', ['-D', data, '-l', join(cluster, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${port} -k ${cluster}`]); started = true;
  process.env.FUEL_TEST_DATABASE_URL = `postgresql://nevora_payroll@127.0.0.1:${port}/nevora_exchange_test_payroll_${marker.slice(0, 12)}`;
  process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN = 'yes';
  process.env.NEVORA_PAYROLL_ENABLED = 'true';
  app = await createOwnedNextApp(evidence, { payrollEnabled: true });
  await seedOwnedApp(app.database.executor);
  const fixture = await seedPayrollFixture(app.database.executor);
  for (const engine of ['chromium', 'webkit']) {
    const browser = await playwright[engine].launch({ headless: true }); browsers.push(browser);
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, serviceWorkers: 'block' });
    await context.route('**/*', route => { const url = new URL(route.request().url()); return ['http:', 'https:'].includes(url.protocol) && url.origin !== app.url ? route.abort() : route.continue(); });
    await login(context, fixture.ids.owner, fixture.password);
    const page = await pageFor(context, '/app/payroll');
    await page.getByRole('heading', { name: 'Pay periods', exact: true }).waitFor();
    for (const width of [320, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await geometry(page, `${engine} run review ${width}`); if ([390, 1440].includes(width)) await shot(page, `${engine}-runs-${width}`); }
    if (engine === 'chromium') {
      assert.match(await page.locator('.pw-totals').innerText(), /\$876\.60/);
      assert.match(await page.locator('.pw-totals').innerText(), /\$70\.00/);
      await page.getByRole('link', { name: 'Payroll settings', exact: true }).click();
      await page.getByRole('heading', { name: 'Company defaults', exact: true }).waitFor();
      await page.getByRole('checkbox', { name: 'Publish statements after an authorized approval', exact: true }).uncheck();
      await page.getByRole('checkbox', { name: 'Enable preparation reminders', exact: true }).uncheck();
      await page.getByLabel('Payroll provider preference', { exact: true }).selectOption('PAYCHEX');
      await page.getByLabel('Desired bank channel', { exact: true }).selectOption('OTHER');
      await page.getByRole('button', { name: 'Add rule', exact: true }).click();
      const rule = page.locator('.pw-rule').first();
      await rule.getByLabel('Rule name', { exact: true }).fill('Fictional future employer policy');
      await rule.locator('select[name$="-kind"]').selectOption('EMPLOYER_CONTRIBUTION');
      await rule.getByLabel('Amount in USD', { exact: true }).fill('70.00');
      await rule.getByLabel('Effective from', { exact: true }).fill('2027-01-01');
      await page.getByLabel('Effective date', { exact: true }).fill('2026-01-01');
      await page.getByLabel('Reason for change', { exact: true }).fill('Fictional manual publication review');
      await page.getByRole('button', { name: 'Save company preferences', exact: true }).click();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      await page.reload(); await page.getByRole('heading', { name: 'Company defaults', exact: true }).waitFor();
      assert.equal(await page.getByRole('checkbox', { name: 'Publish statements after an authorized approval', exact: true }).isChecked(), false);
      assert.equal(await page.getByLabel('Payroll provider preference', { exact: true }).inputValue(), 'PAYCHEX');
      assert.equal(await page.getByLabel('Desired bank channel', { exact: true }).inputValue(), 'OTHER');
      assert.equal(await page.locator('.pw-rule').getByLabel('Amount in USD', { exact: true }).inputValue(), '70.00');
      pass('Company settings persist and reload through real APIs');
      await page.getByLabel('Employee', { exact: true }).selectOption(fixture.ids.a);
      await page.getByLabel('Statement language', { exact: true }).selectOption('en');
      await page.getByLabel('Exception effective date', { exact: true }).fill('2026-01-01');
      await page.getByLabel('Exception reason', { exact: true }).fill('Fictional employee language exception');
      await page.getByRole('button', { name: 'Save employee exception', exact: true }).click();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      const currentSettings = await context.request.get(app.url + '/api/payroll/settings', { headers: apiHeaders() });
      assert.equal(currentSettings.status(), 200);
      const settings = await currentSettings.json();
      assert(settings.exceptions.some(item => item.exception.employeeId === fixture.ids.a && item.exception.language === 'en' && item.exception.rules === null));
      assert.equal([...settings.revisions].sort((a, b) => b.revision - a.revision)[0].preferences.rules[0].amountMinor, '7000');
      pass('Effective employee language override inherits company rules without replacing provider amounts');
      await page.getByLabel('Grant recipient', { exact: true }).selectOption(fixture.ids.reviewer);
      await page.getByRole('checkbox', { name: 'Approve an exact reviewed payroll revision', exact: true }).uncheck();
      await page.getByLabel('Access change reason', { exact: true }).fill('Fictional reviewer-only access');
      await page.getByRole('button', { name: 'Save payroll access', exact: true }).click();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      const reviewer = await browser.newContext(); await login(reviewer, fixture.ids.reviewer, fixture.password);
      const reviewPage = await pageFor(reviewer, '/app/payroll');
      await reviewPage.getByRole('heading', { name: 'Pay periods', exact: true }).waitFor();
      assert.equal(await reviewPage.getByRole('button', { name: /Approve revision/ }).count(), 0);
      assert.equal((await reviewer.request.get(app.url + '/api/payroll/settings', { headers: apiHeaders() })).status(), 403);
      pass('Owner grant change gives financial review without approval or settings access');
      await reviewer.close();
    } else {
      await page.getByRole('link', { name: 'Payroll settings', exact: true }).click();
      await page.getByRole('heading', { name: 'Company defaults', exact: true }).waitFor();
    }
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 }); await geometry(page, `${engine} settings ${width}`); if ([390, 1440].includes(width)) await shot(page, `${engine}-settings-${width}`); }
    await page.keyboard.press('Tab');
    await page.getByRole('button', { name: 'Save company preferences', exact: true }).focus();
    assert.equal(await page.getByRole('button', { name: 'Save company preferences', exact: true }).evaluate(element => getComputedStyle(element).outlineWidth), '2px');
    pass(engine + ': keyboard focus is visible');
    await page.getByRole('link', { name: 'Payroll runs', exact: true }).click();
    await page.getByRole('heading', { name: 'Pay periods', exact: true }).waitFor();
    if (engine === 'chromium') {
      await page.getByRole('checkbox', { name: /I reviewed revision/ }).check();
      await page.getByRole('button', { name: /Approve revision/ }).click();
      await page.getByText('Payroll inputs changed. Import the provider amounts again and review the new revision before approving.', { exact: true }).waitFor();
      assert(await page.getByRole('button', { name: /Approve revision/ }).isDisabled());
      pass('Changed settings and employee sources reject stale approval and require a new import review');
      await page.getByText('Import format and contents', { exact: true }).click();
      await page.getByLabel('Import JSON', { exact: true }).fill(JSON.stringify(fixture.amounts));
      const importedResponse = page.waitForResponse(response => response.url() === app.url + '/api/payroll/runs' && response.request().method() === 'POST' && response.request().postDataJSON().action === 'IMPORT');
      await page.getByRole('button', { name: 'Validate and import amounts', exact: true }).click();
      const imported = await importedResponse; assert.equal(imported.status(), 200, await imported.text());
      const importedReceipt = (await imported.json()).receipt;
      const reviewedRevision = page.getByRole('checkbox', { name: `I reviewed revision ${importedReceipt.revision}, the provider amounts and all employee details.`, exact: true });
      await reviewedRevision.waitFor();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      pass('Neutral provider import preserves actual amounts and refreshes source review');
      let lost = false;
      let dropConfirmed, dropRejected;
      const droppedResponse = new Promise((ready, reject) => { dropConfirmed = ready; dropRejected = reject; });
      await page.route('**/api/payroll/runs', async route => {
        if (route.request().method() === 'POST' && route.request().postDataJSON().action === 'APPROVE' && !lost) {
          lost = true;
          try { const response = await route.fetch(); assert.equal(response.status(), 200, await response.text()); await route.abort(); dropConfirmed(); }
          catch (error) { dropRejected(error); }
        } else await route.continue();
      });
      await reviewedRevision.check();
      await page.getByRole('button', { name: /Approve revision/ }).click();
      await droppedResponse;
      await page.getByRole('button', { name: 'Check action reference', exact: true }).waitFor();
      const saved = await page.evaluate(() => localStorage.getItem('nevora-payroll-operation'));
      assert.match(saved, /^[0-9a-f-]{36}$/);
      await page.unroute('**/api/payroll/runs');
      await page.reload(); await page.getByRole('heading', { name: 'Approval recorded', exact: true }).waitFor();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => localStorage.getItem('nevora-payroll-operation')), null);
      const actual = await context.request.get(app.url + '/api/payroll/runs', { headers: apiHeaders() }); assert.equal(actual.status(), 200);
      assert.equal((await actual.json()).runs.filter(run => run.id === fixture.runId).length, 1);
      pass('Lost approval response recovers after reload using only opaque reference and one server run');
      for (let attempt = 0; attempt < 4; attempt++) await workerOnce(app.database.executor);
      await page.getByRole('button', { name: 'Refresh', exact: true }).click();
      await page.locator('.pw-document').first().waitFor();
      const downloadEvent = page.waitForEvent('download'); await page.locator('.pw-document').first().click();
      const downloaded = await downloadEvent; assert.equal(await downloaded.failure(), null);
      const bytes = await readFile(await downloaded.path()); assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
      const fresh = await context.request.get(app.url + '/api/payroll/runs', { headers: apiHeaders() });
      const documents = (await fresh.json()).runs.find(run => run.id === fixture.runId).documents;
      assert(documents.some(document => document.sha256 === createHash('sha256').update(bytes).digest('hex')));
      pass('Private PDF downloads contain real PDF bytes and match immutable server SHA-256');
      await page.getByRole('checkbox', { name: 'Make the approved statements available to their employees.', exact: true }).check();
      await page.getByRole('button', { name: 'Publish employee statements', exact: true }).click();
      await page.getByText('Action recorded. Review the current status below.', { exact: true }).waitFor();
      for (let attempt = 0; attempt < 3; attempt++) await workerOnce(app.database.executor);
      pass('Publication is a separate recorded action and worker stage');
    }
    const employee = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: 'block' });
    await login(employee, fixture.ids.a, fixture.password);
    const personal = await pageFor(employee, '/app/my-pay');
    await personal.getByRole('heading', { name: 'Pay statements', exact: true }).waitFor(); await personal.locator('.pw-document').first().waitFor();
    const self = await employee.request.get(app.url + '/api/payroll/statements', { headers: apiHeaders() }); assert.equal(self.status(), 200);
    const statements = (await self.json()).statements; assert(statements.every(statement => statement.employeeId === fixture.ids.a && statement.published));
    const ownerRuns = await context.request.get(app.url + '/api/payroll/runs', { headers: apiHeaders() });
    const other = (await ownerRuns.json()).runs.flatMap(run => run.documents).find(document => document.employeeId === fixture.ids.b);
    assert(other);
    const foreign = await employee.request.get(app.url + `/api/payroll/documents/${other.id}`, { headers: apiHeaders() });
    const missing = await employee.request.get(app.url + `/api/payroll/documents/${randomUUID()}`, { headers: apiHeaders() });
    assert.equal(foreign.status(), 404); assert.equal(missing.status(), 404); assert.deepEqual(await foreign.json(), await missing.json());
    const ownDownload = await employee.request.get(app.url + `/api/payroll/documents/${statements[0].id}`, { headers: apiHeaders() });
    assert.equal(ownDownload.status(), 200); assert.equal((await ownDownload.body()).subarray(0, 4).toString(), '%PDF');
    await geometry(personal, engine + ' personal statements 390'); await shot(personal, engine + '-my-pay-390');
    await personal.getByRole('button', { name: 'More', exact: true }).click();
    await personal.locator('#employee-more-navigation').getByRole('link', { name: 'My pay', exact: true }).waitFor();
    pass(engine + ': employee sees only own published statements, guessed other document denied, mobile More entry available');
    await employee.close();
    const manager = await browser.newContext(); await login(manager, fixture.ids.manager, fixture.password);
    assert.equal((await manager.request.get(app.url + '/api/payroll/runs', { headers: apiHeaders() })).status(), 403);
    const denied = await pageFor(manager, '/app/payroll'); await denied.waitForURL(url => url.pathname === '/app');
    assert.equal(await denied.locator('.sidebar-nav').getByRole('link', { name: 'Payroll', exact: true }).count(), 0);
    pass(engine + ': Manager role alone cannot enter or read financial payroll'); await manager.close();
    await page.route('**/api/payroll/runs', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'PAYROLL_UNAVAILABLE', message: 'Fictional unavailable UI state' }) }));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await page.getByText('Payroll unavailable', { exact: true }).waitFor();
    assert.equal(await page.locator('.pw-totals').count(), 0); await page.unroute('**/api/payroll/runs');
    await page.getByRole('button', { name: 'Try again', exact: true }).click(); await page.getByRole('heading', { name: 'Pay periods', exact: true }).waitFor();
    pass(engine + ': error state clears financial display and retry reloads real response');
    let release;
    const gate = new Promise(ready => { release = ready; });
    await page.route('**/api/payroll/runs', async route => { await gate; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' }); await page.getByText('Loading payroll', { exact: true }).waitFor();
    release(); await page.getByRole('heading', { name: 'Pay periods', exact: true }).waitFor(); await page.unroute('**/api/payroll/runs');
    pass(engine + ': delayed real GET shows explicit loading state');
    const realEnvelope = await context.request.get(app.url + '/api/payroll/runs', { headers: apiHeaders() });
    const emptyEnvelope = { ...await realEnvelope.json(), runs: [], jobs: [] };
    await page.route('**/api/payroll/runs', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyEnvelope) }));
    await page.getByRole('button', { name: 'Refresh', exact: true }).click(); await page.getByText('No payroll runs yet', { exact: true }).waitFor();
    pass(engine + ': empty presentation fixture explains setup and draft preparation'); await page.unroute('**/api/payroll/runs');
    await context.close();
  }
  assert.deepEqual(report.errors, []); pass('No uncaught page errors in Chromium or WebKit');
} catch (error) { report.failure = error instanceof Error ? error.stack : String(error); throw error; }
finally {
  for (const browser of browsers) await browser.close();
  if (app) await app.close();
  if (app) await writeFile(join(app.root, 'browser-report.json'), JSON.stringify(report, null, 2));
  if (started && readFileSync(join(cluster, 'owner'), 'utf8') === marker) pg('pg_ctl', ['-D', data, '-m', 'immediate', '-w', 'stop']);
  if (readFileSync(join(cluster, 'owner'), 'utf8') === marker) rmSync(cluster, { recursive: true, force: true });
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
}
