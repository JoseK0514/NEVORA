import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
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
      await lateness.getByLabel('Configuration').selectOption('configured');
      await lateness.getByLabel('Threshold minutes').fill('5');
      await lateness.getByLabel('Effective from (ISO timestamp with timezone)').fill('2020-01-01T00:00:00Z');
      await page.getByRole('button', { name: 'Save policy revision', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
      await page.reload();
      await page.getByRole('heading', { name: 'Policy history' }).waitFor();
      const revisions = (await client.query('SELECT workspace_id,revision FROM nevora_company_policy_revisions')).rows;
      assert.deepEqual(revisions, [{ workspace_id: workspace[0].id, revision: 1 }]);
      checked('Owner policy UI persists revisions under the configured generic company identity');
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
