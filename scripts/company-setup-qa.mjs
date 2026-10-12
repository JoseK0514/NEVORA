import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { bootstrapOwner, readCompanyInput, setupCompany } from './company-setup.ts';
import { verifyPassword } from '../src/lib/auth/password.ts';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { createDisposableExchangeDatabase } from '../src/test/integration/local-postgres.ts';

const evidence = process.env.NEVORA_COMPANY_EVIDENCE_DIR;
const playwrightPackage = process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE;
if (!evidence || !playwrightPackage) throw new Error('Set an external evidence directory and the existing Playwright runtime package.');
await mkdir(evidence, { recursive: true });
const playwright = createRequire(playwrightPackage)('playwright');
const checks = [];
const checked = (name) => { checks.push(name); console.log(`PASS ${name}`); };
const config = {
  COMPANY_NAME: 'Cedar Atelier Fictional', COMPANY_TIME_ZONE: 'Pacific/Honolulu',
  COMPANY_LOCATION_NAME: 'Harbor Studio', COMPANY_LOCATION_SHORT_NAME: 'Harbor', COMPANY_LOCATION_KEY: 'harbor-studio',
  BOOTSTRAP_EMPLOYEE_ID: 'CEDAR-OWNER', BOOTSTRAP_FIRST_NAME: 'Cedar', BOOTSTRAP_LAST_NAME: 'Owner',
  BOOTSTRAP_PHONE: '2025550123', BOOTSTRAP_PASSWORD: 'Fictional-company-only!',
};
const app = await createOwnedNextApp(evidence, { emptyDatabase: true });
const client = new Client({ connectionString: app.database.connectionString });
await client.connect();
let browser;
try {
  const target = new URL(app.database.connectionString);
  const env = { ...process.env, ...config, NEVORA_SETUP_ENVIRONMENT: 'development',
    NEVORA_SETUP_DATABASE_URL: target.href, NEVORA_SETUP_DATABASE_NAME: target.pathname.slice(1) };
  delete env.DATABASE_URL;
  const cli = (file, customEnv = env, args = []) => spawnSync(process.execPath,
    ['--import', 'tsx', file, ...args], { env: customEnv, encoding: 'utf8', timeout: 30000 });
  assert.equal(cli('scripts/setup-company.mts', env, ['--help']).status, 0);
  const invalid = cli('scripts/setup-company.mts', { ...env, COMPANY_NAME: '' });
  assert.equal(invalid.status, 1);
  assert(!invalid.stderr.includes(config.BOOTSTRAP_PASSWORD));
  checked('CLI help and invalid input');
  const installed = cli('scripts/setup-company.mts');
  assert.equal(installed.status, 0, installed.stderr);
  const workspace = (await client.query('SELECT id,name,time_zone FROM workspaces')).rows;
  const locations = (await client.query('SELECT id,name,short_name,clocker_key,workspace_id FROM locations')).rows;
  assert.equal(workspace.length, 1);
  assert.equal(workspace[0].name, config.COMPANY_NAME);
  assert.equal(workspace[0].time_zone, config.COMPANY_TIME_ZONE);
  assert.equal(locations.length, 1);
  assert.equal(locations[0].name, config.COMPANY_LOCATION_NAME);
  assert.equal(locations[0].clocker_key, config.COMPANY_LOCATION_KEY);
  assert.equal(locations[0].workspace_id, workspace[0].id);
  assert.notEqual(locations[0].id, 'loc-1');
  assert.notEqual(workspace[0].id, 'workspace-fuel');
  assert.equal((await client.query('SELECT count(*)::int AS count FROM location_staffing_settings')).rows[0].count, 0);
  const credential = (await client.query('SELECT password_hash FROM employee_credentials WHERE employee_id=$1', [config.BOOTSTRAP_EMPLOYEE_ID])).rows[0];
  assert(await verifyPassword(config.BOOTSTRAP_PASSWORD, credential.password_hash));
  assert.notEqual(credential.password_hash, config.BOOTSTRAP_PASSWORD);
  checked('real CLI installs generic schema, company, one location and hashed owner');
  for (const table of ['schedule_copy_operations', 'schedule_copy_receipts', 'nevora_company_policy_revisions', 'attendance_policy_observations', 'payroll_period_populations', 'payroll_period_manifests', 'payroll_period_events']) {
    assert.equal((await client.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 0);
  }
  checked('fresh generic setup includes all five remediation migrations with no invented policies or custody records');
  assert.equal(cli('scripts/setup-company.mts').status, 1);
  assert.equal((await client.query('SELECT count(*)::int AS count FROM employees')).rows[0].count, 1);
  await assert.rejects(client.query('INSERT INTO workspaces(id,name,time_zone) VALUES($1,$2,$3)', [randomUUID(), 'Second Company', 'Europe/Paris']));
  checked('rerun preserves data and singleton constraint rejects a second company');

  const annexId = randomUUID();
  await client.query('INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES($1,$2,$3,$4,$5)',
    [annexId, workspace[0].id, 'annex-studio', 'Annex Studio', 'Annex']);
  const ownerEnv = { ...env, BOOTSTRAP_EMPLOYEE_ID: 'CEDAR-SECOND', BOOTSTRAP_PRIMARY_LOCATION_ID: annexId,
    BOOTSTRAP_ELIGIBLE_LOCATION_IDS: annexId };
  const second = cli('scripts/bootstrap-owner.mjs', ownerEnv);
  assert.equal(second.status, 0, second.stderr);
  assert.deepEqual((await client.query('SELECT location_id FROM employee_location_eligibility WHERE employee_id=$1', ['CEDAR-SECOND'])).rows, [{ location_id: annexId }]);
  const invalidOwnerEnv = { ...ownerEnv, BOOTSTRAP_EMPLOYEE_ID: 'CEDAR-INVALID', BOOTSTRAP_PRIMARY_LOCATION_ID: 'missing', BOOTSTRAP_ELIGIBLE_LOCATION_IDS: 'missing' };
  assert.equal(cli('scripts/bootstrap-owner.mjs', invalidOwnerEnv).status, 1);
  assert.equal((await client.query("SELECT count(*)::int AS count FROM employees WHERE id='CEDAR-INVALID'")).rows[0].count, 0);
  checked('generic owner bootstrap grants only selected locations and rejects missing locations atomically');
  await client.query('UPDATE locations SET active=false WHERE id=$1', [annexId]);
  const owner = readCompanyInput({ ...config, BOOTSTRAP_EMPLOYEE_ID: 'CEDAR-INACTIVE' }).owner;
  await assert.rejects(bootstrapOwner(client, owner, { primaryLocationId: annexId, eligibleLocationIds: [annexId] }), /active/);
  checked('owner bootstrap rejects inactive locations');

  const originalTestUrl = process.env.FUEL_TEST_DATABASE_URL;
  for (const scenario of ['rollback', 'race']) {
    const url = new URL(originalTestUrl);
    url.pathname += `_${scenario}`;
    process.env.FUEL_TEST_DATABASE_URL = url.href;
    const db = await createDisposableExchangeDatabase({ mode: 'empty' });
    const connection = new Client({ connectionString: db.connectionString });
    const competing = new Client({ connectionString: db.connectionString });
    try {
      await connection.connect();
      const input = readCompanyInput({ ...config, COMPANY_NAME: 'Maple Workshop Fictional', COMPANY_TIME_ZONE: 'Europe/Paris' });
      if (scenario === 'rollback') {
        await assert.rejects(setupCompany(connection, { ...input, locationName: '' }));
        assert.equal((await connection.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).rows[0].count, 0);
        await setupCompany(connection, input);
        assert.equal((await connection.query('SELECT time_zone FROM workspaces')).rows[0].time_zone, 'Europe/Paris');
        checked('late setup failure rolls back all schema/data; clean retry accepts another company and timezone');
      } else {
        await competing.connect();
        const result = await Promise.allSettled([setupCompany(connection, input), setupCompany(competing, input)]);
        assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
        assert.equal(result.filter(item => item.status === 'rejected').length, 1);
        assert.equal((await connection.query('SELECT count(*)::int AS count FROM employees')).rows[0].count, 1);
        checked('concurrent setup serializes to one company and one owner');
      }
    } finally {
      await connection.end(); await competing.end(); await db.dispose();
      process.env.FUEL_TEST_DATABASE_URL = originalTestUrl;
    }
  }

  browser = await playwright.chromium.launch({ headless: true });
  const employeeId = 'CEDAR-STAFF';
  const staffPassword = 'Fictional-staff-only!';
  const positionId = randomUUID();
  await client.query('INSERT INTO positions(id,workspace_id,name) VALUES($1,$2,$3)', [positionId, workspace[0].id, 'Studio Assistant']);
  const readEmployee = async (id = employeeId) => (await client.query(
    'SELECT id,first_name,last_name,phone,email,role,primary_location_id,active,updated_at::text FROM employees WHERE id=$1', [id])).rows[0];
  const signIn = async (page, id, password) => {
    await page.goto(`${app.url}/login`);
    await page.getByLabel('Employee ID', { exact: true }).fill(id);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/app');
  };
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return ['http:', 'https:'].includes(url.protocol) && url.origin !== app.url ? route.abort() : route.continue();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${app.url}/login`);
    assert(await page.getByText(config.COMPANY_NAME, { exact: true }).first().isVisible());
    await page.getByLabel('Employee ID', { exact: true }).fill(config.BOOTSTRAP_EMPLOYEE_ID);
    await page.getByLabel('Password', { exact: true }).fill('wrong-fictional-password');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/login?error=invalid');
    assert(await page.getByText('Employee ID or password is incorrect.').isVisible());
    await page.getByLabel('Employee ID', { exact: true }).fill(config.BOOTSTRAP_EMPLOYEE_ID);
    await page.getByLabel('Password', { exact: true }).fill(config.BOOTSTRAP_PASSWORD);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await page.waitForURL('**/app');
    await page.goto(`${app.url}/app/settings/workspace`);
    assert.equal(await page.getByLabel('Workspace name', { exact: true }).inputValue(), config.COMPANY_NAME);
    assert.equal(await page.getByLabel('Business timezone', { exact: true }).inputValue(), config.COMPANY_TIME_ZONE);
    await page.keyboard.press('Tab');
    assert(await page.evaluate(() => document.activeElement !== document.body));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    await page.screenshot({ path: resolve(evidence, `company-settings-${width}.png`), fullPage: true });
    if (width === 1440) {
      await page.goto(`${app.url}/app/settings/company-policies`);
      const lateness = page.getByRole('group', { name: 'Lateness', exact: true });
      await lateness.getByLabel('Rule setting').selectOption('configured');
      await lateness.getByLabel('Threshold minutes').fill('5');
      await lateness.getByLabel('Effective from', {exact:true}).fill('2019-12-31T14:00');
      await page.getByRole('button', { name: 'Save policies', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Policies saved.' }).waitFor();
      await page.reload();
      await page.getByRole('heading', { name: 'Policy history' }).waitFor();
      const revisions = (await client.query('SELECT workspace_id,revision FROM nevora_company_policy_revisions')).rows;
      assert.deepEqual(revisions, [{ workspace_id: workspace[0].id, revision: 1 }]);
      checked('Owner policy UI persists revisions under the configured generic company identity');
    }
    if (width === 390) {
      await page.goto(`${app.url}/app/employees/new`);
      const creation = page.locator('form.employee-form');
      await creation.getByRole('textbox', { name: /^Employee ID\b/ }).fill(employeeId);
      await creation.getByLabel('First Name', { exact: true }).fill('Sam');
      await creation.getByLabel('Last Name', { exact: true }).fill('Rivera');
      await creation.getByRole('textbox', { name: /^Phone Number\b/ }).fill('2025550142');
      await creation.locator('[name=email]').fill('sam@example.invalid');
      await creation.locator('[name=primaryLocationId]').selectOption(locations[0].id);
      await creation.getByLabel('Studio Assistant', { exact: true }).check();
      await creation.getByRole('button', { name: 'Create Employee', exact: true }).click();
      await creation.getByRole('status').filter({ hasText: 'Employee created.' }).waitFor();
      assert.deepEqual(await readEmployee(), {
        id: employeeId, first_name: 'Sam', last_name: 'Rivera', phone: '202-555-0142', email: 'sam@example.invalid',
        role: 'EMPLOYEE', primary_location_id: locations[0].id, active: true, updated_at: (await readEmployee()).updated_at,
      });
      assert.deepEqual((await client.query('SELECT position_id FROM employee_positions WHERE employee_id=$1', [employeeId])).rows, [{ position_id: positionId }]);
      assert.deepEqual((await client.query('SELECT location_id FROM employee_location_eligibility WHERE employee_id=$1', [employeeId])).rows, [{ location_id: locations[0].id }]);
      checked('employee creation persists contact, role, position and primary eligibility atomically');
      await creation.getByRole('button', { name: 'Create Employee', exact: true }).click();
      await creation.getByRole('alert').waitFor();
      assert.equal((await client.query('SELECT count(*)::int AS count FROM employees WHERE id=$1', [employeeId])).rows[0].count, 1);
      checked('duplicate employee submission preserves the existing record');

      await page.goto(`${app.url}/app/employees/${employeeId}`);
      const core = page.locator('.employee-core-profile-form');
      const stalePage = await context.newPage();
      await stalePage.goto(page.url());
      await core.getByLabel('First name', { exact: true }).fill('Samuel');
      await core.locator('[name=email]').fill('samuel@example.invalid');
      const submitted = page.waitForRequest(request => request.method() === 'POST' && !!request.headers()['next-action']);
      await core.getByRole('button', { name: 'Save Employee Details', exact: true }).click();
      const actionRequest = await submitted;
      await core.getByRole('status').filter({ hasText: 'Employee details updated.' }).waitFor();
      const saved = await readEmployee();
      assert.equal(saved.first_name, 'Samuel'); assert.equal(saved.email, 'samuel@example.invalid');
      await stalePage.locator('.employee-core-profile-form [name=firstName]').fill('Stale');
      await stalePage.getByRole('button', { name: 'Save Employee Details', exact: true }).click();
      await stalePage.getByRole('alert').filter({ hasText: 'changed since you opened' }).waitFor();
      assert.deepEqual(await readEmployee(), saved);
      await stalePage.close();
      await page.reload();
      assert.equal(await core.getByLabel('First name', { exact: true }).inputValue(), 'Samuel');
      for (const employeeWidth of [390, 1440]) {
        await page.setViewportSize({ width: employeeWidth, height: 1000 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
        await page.keyboard.press('Tab');
        assert(await page.evaluate(() => document.activeElement !== document.body));
        await page.screenshot({ path: resolve(evidence, `employee-profile-${employeeWidth}.png`), fullPage: true });
      }
      checked('employee edit survives reload; stale tabs cannot overwrite newer details; mobile and desktop forms fit');

      const staff = await browser.newContext({ viewport: { width: 390, height: 1000 } });
      await staff.route('**/*', route => new URL(route.request().url()).origin === app.url ? route.continue() : route.abort());
      const staffPage = await staff.newPage();
      await staffPage.goto(`${app.url}/activate`);
      await staffPage.getByLabel('Employee ID', { exact: true }).fill(employeeId);
      await staffPage.getByLabel('Phone number', { exact: true }).fill('2025550142');
      await staffPage.getByLabel('Create password', { exact: true }).fill(staffPassword);
      await staffPage.getByLabel('Confirm password', { exact: true }).fill(staffPassword);
      await staffPage.getByRole('button', { name: 'Activate account', exact: true }).click();
      await staffPage.waitForURL('**/login?activated=1');
      const staffHash = (await client.query('SELECT password_hash FROM employee_credentials WHERE employee_id=$1', [employeeId])).rows[0].password_hash;
      assert(await verifyPassword(staffPassword, staffHash)); assert.notEqual(staffHash, staffPassword);
      await signIn(staffPage, employeeId, staffPassword);
      checked('created employee activates and signs in with a hashed password');
      for (const role of ['EMPLOYEE', 'LEAD']) {
        await client.query('UPDATE employees SET role=$1 WHERE id=$2', [role, employeeId]);
        const before = await readEmployee();
        for (const path of ['/app/employees', '/app/employees/new', `/app/employees/${config.BOOTSTRAP_EMPLOYEE_ID}`, '/app/settings/workspace']) {
          await staffPage.goto(app.url + path);
          await staffPage.waitForURL(u=>u.pathname==='/app');
          assert.equal(new URL(staffPage.url()).pathname, '/app');
        }
        const rejected = await staff.request.post(actionRequest.url(), {
          headers: { 'next-action': actionRequest.headers()['next-action'], 'content-type': actionRequest.headers()['content-type'], origin: app.url },
          data: actionRequest.postDataBuffer(),
        });
        assert(rejected.status() < 500);
        assert.deepEqual(await readEmployee(), before);
        const time = await staff.request.get(`${app.url}/api/employee/my-time?employeeId=${config.BOOTSTRAP_EMPLOYEE_ID}`, { headers: { 'x-nevora-my-time': '1' } });
        assert.equal(time.status(), 400);
        checked(`${role} cannot access management routes, replay an Owner write or select another employee's private time`);
      }

      await client.query("UPDATE employees SET role='MANAGER' WHERE id=$1", [employeeId]);
      await staffPage.goto(`${app.url}/app/employees/${config.BOOTSTRAP_EMPLOYEE_ID}`);
      assert.equal(await staffPage.locator('.employee-core-profile-form').count(), 0);
      await staffPage.getByText(/Only an Owner can change another Owner/).waitFor();
      assert(await staffPage.getByText(/Only an Owner can change another Owner/).isVisible());
      await staffPage.goto(`${app.url}/app/employees/${employeeId}`);
      const managerCore = staffPage.locator('.employee-core-profile-form');
      assert.equal(await managerCore.locator('select[name=role] option[value=OWNER]').count(), 0);
      await managerCore.locator('select[name=role]').evaluate(select => select.add(new Option('Forged Owner', 'OWNER')));
      await managerCore.locator('select[name=role]').selectOption('OWNER');
      await managerCore.getByRole('button', { name: 'Save Employee Details', exact: true }).click();
      await managerCore.getByRole('alert').filter({ hasText: 'permission' }).waitFor();
      assert.equal((await readEmployee()).role, 'MANAGER');
      await staffPage.goto(`${app.url}/app/employees/new`);
      const forgedCreate = staffPage.locator('form.employee-form');
      await forgedCreate.locator('[name=id]').fill('CEDAR-FORGED-OWNER');
      await forgedCreate.locator('[name=firstName]').fill('Forged');
      await forgedCreate.locator('[name=lastName]').fill('Owner');
      await forgedCreate.locator('[name=phone]').fill('2025550199');
      await forgedCreate.locator('[name=primaryLocationId]').selectOption(locations[0].id);
      await forgedCreate.locator('select[name=role]').evaluate(select => select.add(new Option('Forged Owner', 'OWNER')));
      await forgedCreate.locator('select[name=role]').selectOption('OWNER');
      await forgedCreate.getByRole('button', { name: 'Create Employee', exact: true }).click();
      await forgedCreate.getByRole('alert').filter({ hasText: 'Only an owner' }).waitFor();
      assert.equal(await readEmployee('CEDAR-FORGED-OWNER'), undefined);
      checked('Manager cannot edit Owner access, promote themselves or create an Owner with a forged form');

      await page.goto(`${app.url}/app/employees/${employeeId}`);
      await core.locator('[name=active]').selectOption('false');
      await core.getByRole('button', { name: 'Save Employee Details', exact: true }).click();
      await core.getByRole('status').filter({ hasText: 'Employee details updated.' }).waitFor();
      assert.equal((await readEmployee()).active, false);
      assert.equal((await client.query('SELECT count(*)::int AS count FROM employee_sessions WHERE employee_id=$1', [employeeId])).rows[0].count, 0);
      await staffPage.goto(`${app.url}/app/employees`);
      assert.equal(new URL(staffPage.url()).pathname, '/login');
      await core.locator('[name=active]').selectOption('true');
      await core.getByRole('button', { name: 'Save Employee Details', exact: true }).click();
      await core.getByRole('status').filter({ hasText: 'Employee details updated.' }).waitFor();
      assert.equal((await readEmployee()).active, true);
      await staffPage.goto(`${app.url}/app`);
      assert.equal(new URL(staffPage.url()).pathname, '/login');
      await signIn(staffPage, employeeId, staffPassword);
      const cookie = (await staff.cookies()).find(item => item.name === 'fuel_session');
      assert(cookie);
      await client.query('UPDATE employee_sessions SET expires_at=clock_timestamp()-interval \'1 second\' WHERE token_hash=$1', [createHash('sha256').update(cookie.value).digest('hex')]);
      await staffPage.goto(`${app.url}/app/employees`);
      assert.equal(new URL(staffPage.url()).pathname, '/login');
      await staff.close();
      checked('deactivation revokes sessions; reactivation needs fresh login; expired sessions lose access');
    }
    assert.deepEqual(errors, []);
    await context.close();
    checked(`real login, wrong-password rejection and configured settings at ${width}px`);
  }
  await writeFile(resolve(evidence, 'verification.json'), JSON.stringify({
    checks, source: process.cwd(), runtime: 'Owned local PostgreSQL and Next app; test-only PostgreSQL transport',
    limitations: ['Hosted Neon transport and production deployment were not tested.'],
  }, null, 2));
} finally {
  await browser?.close();
  await client.end();
  await app.close();
}
