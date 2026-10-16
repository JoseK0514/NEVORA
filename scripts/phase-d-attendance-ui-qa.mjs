import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { seedOwnedApp, TEST_PASSWORD } from '../src/test/integration/owned-app-fixture.ts';
import { hashPassword } from '../src/lib/auth/password.ts';

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];
const ENGINES = ['chromium', 'webkit'];
const evidence = resolve(
  process.env.PHASE_D_ATTENDANCE_EVIDENCE_DIR ??
    join(homedir(), '.codex', 'visualizations', 'nevora-d1-3-attendance-ui'),
);
await mkdir(evidence, { recursive: true });

const projectRequire = createRequire(import.meta.url);
let playwright;
const explicitRuntimePackage = process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE?.trim();
if (explicitRuntimePackage) {
  playwright = createRequire(explicitRuntimePackage)('playwright');
} else {
  try {
    playwright = projectRequire('playwright');
  } catch {
    const runtime = createRequire(
      join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'),
    );
    playwright = runtime('playwright');
  }
}
const checkpoint = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
const trackedStatus = execFileSync(
  'git',
  ['status', '--porcelain=v1'],
  { encoding: 'utf8' },
).trim();
const sourceClean = trackedStatus.length === 0;
const expectedSha = process.env.PHASE_D_ATTENDANCE_EXPECTED_SHA?.trim();
const allowDirty = process.env.PHASE_D_ATTENDANCE_ALLOW_DIRTY === 'yes';
if (expectedSha) {
  assert.equal(checkpoint, expectedSha, 'D1.3 browser evidence must run on the requested exact SHA');
}
if (!allowDirty) {
  assert.equal(sourceClean, true, 'D1.3 browser evidence requires a clean worktree including untracked files');
}
const report = {
  generatedAt: new Date().toISOString(),
  checkpoint,
  tree,
  sourceClean,
  expectedSha: expectedSha ?? null,
  checks: [],
  errors: [],
  screenshots: [],
  limitations: [
    'Owned local Next application and fictional PostgreSQL are not hosted Vercel/Neon acceptance.',
    'Populated exception states use browser transport fixtures; D1.2 PostgreSQL and route suites separately verify the protected reader.',
    'Local Chromium/WebKit automation does not replace physical-device or screen-reader acceptance.',
  ],
};
let app;
const browsers = [];
const checked = (name) => {
  report.checks.push(name);
  console.log('[D1.3 browser] PASS ' + name);
};
const q = (text, values = []) => app.database.executor.query({ text, values });
const endpoint = '/api/manager/attendance';

function fixtureReady(locationId = 'loc-1') {
  const locationName = locationId === 'd13-retired' ? 'Retired Historical Location' : 'Main Office';
  return {
    state: 'ready',
    engineVersion: 1,
    workspaceId: 'workspace-fuel',
    timeZone: 'America/Puerto_Rico',
    observedAt: '2030-10-07T16:00:00Z',
    validForMs: 30000,
    scope: {
      kind: 'TODAY_AND_OPEN',
      localDate: '2030-10-07',
      dayStartAt: '2030-10-07T04:00:00Z',
    },
    groups: [
      {
        entryId: 'd13-entry',
        employeeId: 'D13-A',
        locationId,
        sourceVersion: 1,
        observations: [
          {
            id: 'd13-signal',
            kind: 'CLOCK_IN_AFTER_SCHEDULE_START',
            breakId: null,
            message: 'Clock-in recorded after scheduled start.',
            evidence: { differenceNanoseconds: '900000000000' },
          },
        ],
      },
    ],
    recordCount: 1,
    signalCount: 1,
    affectedEmployeeCount: 1,
    pendingCorrectionCount: 0,
    labels: {
      employees: [{ id: 'D13-A', name: 'Alexandria Attendance Review Employee With A Long Name' }],
      locations: [{ id: locationId, name: locationName }],
    },
    coverage: {
      state: 'limited',
      limitations: [
        { entryId: 'd13-entry', breakId: 'd13-break', reason: 'break_target_not_captured' },
      ],
      deferredCapabilities: [
        'missing_clock_in',
        'policy_lateness',
        'policy_early_departure',
        'unusually_long_entry',
        'overtime_risk',
      ],
    },
  };
}

async function newContext(browser, viewport = { width: 1440, height: 1000 }) {
  const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
  await context.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== app.url) {
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
  return context;
}

async function login(context, employeeId) {
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto(app.url + '/login', { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Employee ID', { exact: true }).fill(employeeId);
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/app'),
    page.getByRole('button', { name: 'Sign In', exact: true }).click(),
  ]);
  await page.waitForLoadState('networkidle');
  await page.close();
}

async function actualAttendance(context) {
  return context.request.get(app.url + endpoint, {
    headers: { 'X-Nevora-Attendance': '1' },
  });
}

async function geometry(page, engine, width) {
  const value = await page.evaluate(() => {
    const surface = document.querySelector('.attendance-review');
    if (!surface) throw new Error('Attendance surface missing');
    const bounds = surface.getBoundingClientRect();
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    };
    const controls = [...surface.querySelectorAll('button,a')].filter(visible).map((element) => {
      const rect = element.getBoundingClientRect();
      return { text: element.textContent, height: rect.height, left: rect.left, right: rect.right };
    });
    const text = [...surface.querySelectorAll('strong,small,span')].filter(visible).flatMap((element) => {
      const rect = element.getBoundingClientRect();
      return rect.left < bounds.left - 2 || rect.right > bounds.right + 2
        ? [{ text: element.textContent, left: rect.left, right: rect.right }]
        : [];
    });
    return {
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      controls,
      clippedText: text,
    };
  });
  assert(value.documentWidth <= value.viewportWidth + 2, engine + ' ' + width + ' horizontal overflow');
  assert.deepEqual(value.clippedText, [], engine + ' ' + width + ' clipped text');
  assert.deepEqual(
    value.controls.filter((control) => control.height < 43.5),
    [],
    engine + ' ' + width + ' touch targets',
  );
  if (width <= 430) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(30);
    const clearance = await page.evaluate(() => {
      const nav = document.querySelector('.mobile-nav');
      const control = document.querySelector('.attendance-review-refresh');
      if (!nav || !control) return null;
      const navBox = nav.getBoundingClientRect();
      const controlBox = control.getBoundingClientRect();
      return {
        navTop: navBox.top,
        controlBottom: controlBox.bottom,
        overlap: controlBox.bottom > navBox.top - 2,
      };
    });
    assert.equal(clearance?.overlap ?? false, false, engine + ' ' + width + ' mobile-nav clearance');
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  checked(engine + ': attendance geometry ' + width);
}

try {
  app = await createOwnedNextApp(evidence);
  await seedOwnedApp(app.database.executor);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  await q(
    "INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES('d13-retired','workspace-fuel','d13-retired','Retired Historical Location','Retired Historical Location',false)",
  );

  for (const [id, first, last, role] of [
    ['D13-M', 'Morgan', 'Manager', 'MANAGER'],
    ['D13-A', 'Alexandria', 'Attendance Review Employee With A Long Name', 'EMPLOYEE'],
  ]) {
    await q(
      "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,$2,$3,'555-0130',$4,'loc-1')",
      [id, first, last, role],
    );
    await q(
      'INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',
      [id, passwordHash],
    );
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')", [id]);
  }

  for (const engine of ENGINES) {
    const browser = await playwright[engine].launch({ headless: true });
    browsers.push(browser);

    const owner = await newContext(browser);
    await login(owner, 'QAOWNER');
    const ownerActual = await actualAttendance(owner);
    assert.equal(ownerActual.status(), 200);
    assert.equal((await ownerActual.json()).state, 'ready');
    checked(engine + ': real Owner protected attendance read');

    const manager = await newContext(browser);
    await login(manager, 'D13-M');
    assert.equal((await actualAttendance(manager)).status(), 200);
    checked(engine + ': real Manager protected attendance read');
    await manager.close();

    const employee = await newContext(browser);
    await login(employee, 'D13-A');
    assert.equal((await actualAttendance(employee)).status(), 403);
    const employeePage = await employee.newPage();
    await employeePage.goto(app.url + '/app?view=attendance', { waitUntil: 'networkidle' });
    assert.equal(await employeePage.getByText('Today’s clock-ins', { exact: true }).count(), 0);
    checked(engine + ': Employee cannot enter Manager attendance surface');
    await employee.close();

    let fixture = { payload: fixtureReady(), status: 200 };
    await owner.route('**/api/manager/attendance', async (route) => {
      const headers = route.request().headers();
      assert.equal(headers['x-nevora-attendance'], '1');
      if (fixture.delayMs) await new Promise((resolve) => setTimeout(resolve, fixture.delayMs));
      await route.fulfill({
        status: fixture.status,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store, private', Vary: 'Cookie' },
        body: JSON.stringify(fixture.payload),
      });
    });

    const page = await owner.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(app.url + '/app?view=attendance', { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Today’s clock-ins', exact: true }).waitFor();
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    const body = await page.locator('body').innerText();
    assert.match(body, /Alexandria Attendance Review Employee With A Long Name/);
    assert.match(body, /Main Office/);
    assert.match(body, /15 min/);
    assert.doesNotMatch(body, /D13-A/);
    assert.doesNotMatch(body, /\bLate\b/);
    checked(engine + ': populated factual attendance exception state');
    await page.getByText('Some comparisons are limited', { exact: true }).waitFor();
    checked(engine + ': limited source state is explicitly disclosed');

    fixture = {
      status: 403,
      payload: { state: 'unavailable', reason: 'access_denied' },
      delayMs: 350,
    };
    await page.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'nevora-session-check' })));
    await page.getByText('Loading attendance review', { exact: true }).waitFor();
    assert.equal(
      await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(),
      0,
      'protected attendance data must clear before lifecycle reauthorization completes',
    );
    await page.getByText('Sign in again', { exact: true }).waitFor();
    checked(engine + ': lifecycle reauthorization clears protected snapshot before the response');
    fixture = { payload: fixtureReady(), status: 200 };
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();

    fixture = { payload: fixtureReady(), status: 200, delayMs: 200 };
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.getByText('Loading attendance review', { exact: true }).waitFor();
    assert.equal(await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(), 0);
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    checked(engine + ': visibility revalidation clears protected snapshot before refresh');

    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
    await page.getByText('Attendance updates paused', { exact: true }).waitFor();
    assert.equal(await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(), 0);
    fixture = { payload: fixtureReady(), status: 200, delayMs: 200 };
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    await page.getByText('Loading attendance review', { exact: true }).waitFor();
    assert.equal(await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(), 0);
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    checked(engine + ': pagehide/pageshow requires a fresh protected snapshot');

    fixture = { payload: fixtureReady('d13-retired'), status: 200 };
    await page.getByRole('button', { name: 'Refresh attendance review' }).click();
    await page.getByText('Retired Historical Location', { exact: true }).waitFor();
    assert.equal(await page.getByText('Recorded location', { exact: true }).count(), 0);
    checked(engine + ': historical inactive location keeps its recorded label');

    fixture = {
      payload: {
        ...fixtureReady(),
        labels: {
          employees: [{ id: 'D13-A', name: 'Alexandria Attendance Review Employee With A Long Name' }],
          locations: [{ id: 'loc-1', name: 'Renamed Main Office' }],
        },
      },
      status: 200,
    };
    await page.getByRole('button', { name: 'Refresh attendance review' }).click();
    await page.getByText('Renamed Main Office', { exact: true }).waitFor();
    assert.equal(await page.getByText('Main Office', { exact: true }).count(), 0);
    checked(engine + ': refreshed server labels replace stale page-load labels');

    fixture = { payload: fixtureReady(), status: 200 };
    await page.getByRole('button', { name: 'Refresh attendance review' }).click();
    await page.getByText('Main Office', { exact: true }).waitFor();

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: width <= 430 ? 844 : 1000 });
      await geometry(page, engine, width);
      const shot = join(evidence, engine + '-attendance-' + width + '.png');
      await page.screenshot({ path: shot, fullPage: true });
      report.screenshots.push(shot);
    }

    const refresh = page.getByRole('button', { name: 'Refresh attendance review' });
    await refresh.focus();
    assert.equal(await refresh.evaluate((element) => document.activeElement === element), true);
    checked(engine + ': keyboard focus on attendance Refresh');

    fixture = {
      status: 200,
      payload: { ...fixtureReady(), groups: [], recordCount: 0, signalCount: 0, affectedEmployeeCount: 0, labels: { employees: [], locations: [] }, coverage: { ...fixtureReady().coverage, state: 'complete', limitations: [] } },
    };
    await refresh.click();
    await page.getByText('Nothing to review', { exact: true }).waitFor();
    checked(engine + ': empty is distinct from unavailable');

    fixture = { status: 503, payload: { state: 'unavailable', reason: 'read_failed' } };
    await refresh.click();
    await page.getByText('Attendance review unavailable', { exact: true }).waitFor();
    assert.equal(await page.getByText('Nothing to review', { exact: true }).count(), 0);
    checked(engine + ': unavailable clears healthy empty state');

    fixture = { status: 200, payload: { ...fixtureReady(), validForMs: 120 } };
    await refresh.click();
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    await page.getByText('Attendance review unavailable', { exact: true }).waitFor({ timeout: 3000 });
    assert.equal(await page.getByText('Sign in again', { exact: true }).count(), 0);
    checked(engine + ': expired source freshness is not mislabeled as sign-in failure');

    fixture = { status: 403, payload: { state: 'unavailable', reason: 'access_denied' } };
    await refresh.click();
    await page.getByText('Sign in again', { exact: true }).waitFor();
    assert.equal(await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(), 0);
    checked(engine + ': access denial clears protected people');

    fixture = { status: 200, payload: fixtureReady() };
    await page.goto(app.url + '/app?view=attendance', { waitUntil: 'networkidle' });
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    await owner.setOffline(true);
    await page.getByText('Attendance updates paused', { exact: true }).waitFor();
    assert.equal(await page.getByText('Alexandria Attendance Review Employee With A Long Name').count(), 0);
    await owner.setOffline(false);
    await page.getByText('Clock-in after scheduled start', { exact: true }).waitFor();
    checked(engine + ': offline pause removes stale protected attendance data');

    await owner.close();
    await browser.close();
  }

  assert.deepEqual(report.errors, []);
} catch (error) {
  report.errors.push(String(error?.stack ?? error));
  process.exitCode = 1;
} finally {
  for (const browser of browsers) await browser.close().catch(() => {});
  if (app) await app.close().catch((error) => report.errors.push(String(error)));
  report.finishedAt = new Date().toISOString();
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors, evidence }, null, 2));
}
