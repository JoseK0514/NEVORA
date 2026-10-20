import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createServer} from 'node:net';
import {homedir, tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app.ts';
import {seedOwnedApp, TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';

if (process.env.DATABASE_URL) throw Error('Unset DATABASE_URL before owned payroll UI verification.');
const bin = process.env.NEVORA_TEST_PG_BIN;
if (!bin || !existsSync(join(bin, 'initdb'))) throw Error('NEVORA_TEST_PG_BIN must identify an existing local PostgreSQL bin directory.');
const evidence = resolve(process.env.NEVORA_PAYROLL_EVIDENCE_DIR ?? '../payroll-ui-evidence');
await mkdir(evidence, {recursive: true});
const projectRequire = createRequire(import.meta.url);
let playwright;
try {playwright = projectRequire('playwright');}
catch {playwright = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'))('playwright');}
const cluster = mkdtempSync(join(tmpdir(), 'nevora-payroll-ui-owned-'));
const marker = randomBytes(16).toString('hex');
writeFileSync(join(cluster, 'owner'), marker, {mode: 0o600});
const data = join(cluster, 'data');
const pg = (name, args) => {
  const r = spawnSync(join(bin, name), args, {encoding: 'utf8', timeout: 45000});
  if (r.error || r.status !== 0) throw Error(`${name}: ${r.error?.message ?? r.stderr}`);
};
const report = {checks: [], screenshots: [], errors: [], runtime: 'Owned local Next app and fictional PostgreSQL; production DB adapter substituted only in scratch copy'};
const pass = name => {report.checks.push(name); console.log('PASS ' + name);};
const period = {startDate: '2026-09-21', endDate: '2026-09-27'};
let app, started = false;
const browsers = [];
async function ready(page) { await page.getByRole('heading', {name: 'Choose finalized employees', exact: true}).waitFor(); }
async function geometry(page, name) {
  const g = await page.evaluate(() => {
    const root = document.querySelector('.payroll-page');
    const visible = el => {const r = el.getBoundingClientRect(), s = getComputedStyle(el); const closed = el.closest('details:not([open])'); return (!closed || closed.querySelector(':scope > summary')?.contains(el)) && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';};
    const controls = [...root.querySelectorAll('button,input,select,textarea,summary')].filter(visible).map(el => {
      const r = el.getBoundingClientRect();
      const hit = el.matches('input[type=checkbox]') ? el.closest('label').getBoundingClientRect() : r;
      return {label: el.getAttribute('aria-label') || el.textContent, height: hit.height, left: r.left, right: r.right};
    });
    const clipped = [...root.querySelectorAll('label,strong,small,p,dd')].filter(visible).flatMap(el => {
      const r = el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1 ? [el.textContent] : [];
    });
    return {width: innerWidth, scroll: document.documentElement.scrollWidth, controls, clipped};
  });
  assert(g.scroll <= g.width + 1, name + ' horizontal page overflow');
  assert.deepEqual(g.clipped, [], name + ' clipped content');
  assert.deepEqual(g.controls.filter(c => c.height < 43.5), [], name + ' controls smaller than 44px');
  pass(name + ': no overflow, clipping, or short control hit areas');
}
async function shot(page, name) {
  const path = join(evidence, name + '.png');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({path, fullPage: true, style: 'nextjs-portal { display: none; }'}); report.screenshots.push(path);
}
async function login(context) {
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(app.url + '/login');
  await page.getByLabel('Employee ID', {exact: true}).fill('QAOWNER');
  await page.getByLabel('Password', {exact: true}).fill(TEST_PASSWORD);
  await Promise.all([page.waitForURL(u => u.pathname === '/app'), page.getByRole('button', {name: 'Sign in', exact: true}).click()]);
  await page.close();
}
async function open(context) {
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(app.url + '/app/payroll-export?start=2026-09-21&end=2026-09-27');
  await ready(page); return page;
}
try {
  const s = createServer();
  const actualPort = await new Promise((resolve, reject) => {s.once('error', reject); s.listen(0, '127.0.0.1', () => {const p = s.address().port; s.close(() => resolve(p));});});
  pg('initdb', ['-D', data, '-U', 'nevora_payroll', '--auth-local=trust', '--auth-host=trust', '--encoding=UTF8', '--no-locale']);
  pg('pg_ctl', ['-D', data, '-l', join(cluster, 'postgres.log'), '-w', 'start', '-o', `-h 127.0.0.1 -p ${actualPort} -k ${cluster}`]);
  started = true;
  process.env.FUEL_TEST_DATABASE_URL = `postgresql://nevora_payroll@127.0.0.1:${actualPort}/nevora_exchange_test_payroll_${marker.slice(0, 12)}`;
  process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN = 'yes';
  app = await createOwnedNextApp(evidence);
  await seedOwnedApp(app.database.executor);
  const q = (text, values = []) => app.database.executor.query({text, values});
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-PAY-A','Avery','Morgan','555-0211','EMPLOYEE','loc-1'),('QA-PAY-B','Blair','Chen','555-0212','EMPLOYEE','loc-1'),('QA-PAY-C','Casey','Rivera','555-0213','EMPLOYEE','loc-1')");
  await q("INSERT INTO clocker_devices(id,location_id,name,active) VALUES('payroll-qa-device','loc-1','Fictional Payroll QA',true)");
  for (const id of ['QA-PAY-A', 'QA-PAY-B', 'QA-PAY-C']) {
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1','payroll-qa-device','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)", ['entry-' + id, id]);
    await q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version) VALUES($1,$2,'2026-09-22T16:00:00Z','2026-09-22T16:30:00Z',1)", ['break-' + id, 'entry-' + id]);
  }
  for (const engine of ['chromium', 'webkit']) {
    const browser = await playwright[engine].launch({headless: true}); browsers.push(browser);
    const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true, serviceWorkers: 'block'});
    await context.route('**/*', route => {const u = new URL(route.request().url()); return ['http:', 'https:'].includes(u.protocol) && u.origin !== app.url ? route.abort() : route.continue();});
    await login(context);
    for (const font of ['inter', 'jetbrains-mono']) assert.equal((await context.request.get(app.url + '/fonts/typeface/' + font + '/variable.ttf')).status(), 200);
    pass(engine + ': both licensed local typefaces served');
    const h = {'origin': app.url, 'content-type': 'application/json', 'x-nevora-timecards': '1', 'x-nevora-actor': 'QAOWNER'};
    if (engine === 'chromium') {
      for (const id of ['QA-PAY-A', 'QA-PAY-B']) {
        for (const action of ['APPROVE', 'FINALIZE']) {
          const r = await context.request.post(app.url + '/api/timecards', {headers: h, data: period});
          assert.equal(r.status(), 200);
          const card = (await r.json()).cards.find(c => c.card.employeeId === id);
          const m = await context.request.post(app.url + '/api/manager/timecards', {headers: h, data: {...period, operationId: randomUUID(), employeeId: id, expectedRevision: card.revision, expectedSourceHash: card.sourceHash, action}});
          assert.equal(m.status(), 200, await m.text());
        }
      }
      pass('Actual API approval and finalization of two fictional employee timecards');
    }
    const page = await open(context);
    const generate = page.getByRole('button', {name: 'Generate reviewed export', exact: true});
    assert(await generate.isDisabled());
    assert(await page.getByRole('checkbox', {name: 'Select Casey Rivera', exact: true}).isDisabled());
    await page.getByRole('button', {name: 'Select finalized', exact: true}).click();
    assert(await generate.isEnabled());
    const summary = page.getByRole('region', {name: 'Export summary', exact: true});
    assert.match(await summary.innerText(), /16h 0m/); assert.match(await summary.innerText(), /1h 0m/);
    await page.getByRole('button', {name: 'Clear', exact: true}).click(); assert(await generate.isDisabled());
    const check = page.getByRole('checkbox', {name: 'Select Avery Morgan', exact: true});
    await check.focus(); await page.keyboard.press('Space'); assert(await check.isChecked());
    assert.equal(await check.evaluate(el => getComputedStyle(el).outlineWidth), '3px');
    pass(engine + ': finalized-only selection, exact selected totals, clear, keyboard selection and visible focus');
    await page.getByLabel('Period end', {exact: true}).fill('2026-09-28'); assert(await generate.isDisabled());
    await page.getByLabel('Period end', {exact: true}).fill('2026-09-27'); assert(await generate.isEnabled());
    await page.getByLabel('Period start', {exact: true}).fill('2026-08-01');
    await page.getByRole('button', {name: 'View finalized time', exact: true}).click();
    await page.getByText('Choose a period of 1 to 31 days.', {exact: true}).waitFor();
    await page.getByLabel('Period start', {exact: true}).fill(period.startDate);
    await page.getByRole('button', {name: 'View finalized time', exact: true}).click();
    pass(engine + ': changed-date export guard and 31-day period validation');
    await page.getByRole('button', {name: 'Select finalized', exact: true}).click();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({width, height: width < 600 ? 844 : 1000});
      await geometry(page, engine + ' ' + width + ' overview');
      if ([390, 1440].includes(width)) await shot(page, engine + '-overview-' + width);
    }
    await page.locator('#payroll-mapping > summary').focus(); await page.keyboard.press('Enter');
    assert(await page.locator('#payroll-mapping').evaluate(el => el.open));
    await page.getByLabel('File layout', {exact: true}).selectOption('ADP_RUN_GENERIC_V1');
    assert.equal(await page.getByLabel('Date format', {exact: true}).inputValue(), 'US');
    assert.equal(await page.getByLabel('Decimal places for hours', {exact: true}).inputValue(), '2');
    assert(await page.getByRole('button', {name: 'Add column', exact: true}).isDisabled());
    assert(await page.getByRole('button', {name: 'Remove column 1', exact: true}).isDisabled());
    await page.getByLabel('Fixed value for column 1', {exact: true}).fill('QA01');
    await page.getByLabel('File layout', {exact: true}).selectOption('CUSTOM_CSV');
    await page.getByRole('button', {name: 'Add column', exact: true}).click();
    await page.getByLabel('Fixed value for column 9', {exact: true}).fill('Fictional fixed value');
    await page.getByRole('button', {name: 'Remove column 9', exact: true}).click();
    assert.equal(await page.getByLabel('Column 9 heading', {exact: true}).count(), 0);
    pass(engine + ': ADP template shape, fixed values and custom column removal');
    await page.getByLabel('Profile name', {exact: true}).fill('Fictional payroll CSV ' + engine);
    await page.getByLabel('Payroll product / edition', {exact: true}).fill('QA provider template v1');
    await page.getByRole('textbox', {name: /Verified import requirements/}).fill('Fictional QA CSV template: exact durations, provider identifiers reviewed.');
    await page.getByLabel('Date format', {exact: true}).selectOption('US');
    await page.getByLabel('Decimal places for hours', {exact: true}).fill('2');
    await page.getByLabel('Hour precision', {exact: true}).selectOption('HALF_UP');
    await page.getByRole('button', {name: 'Add column', exact: true}).click();
    await page.getByLabel('Column 9 heading', {exact: true}).fill('Provider code');
    await page.getByLabel('Value source for column 9', {exact: true}).selectOption('providerEmployeeId');
    await page.getByLabel('Avery Morgan', {exact: true}).fill('QA001');
    await page.getByLabel('Blair Chen', {exact: true}).fill('QA002');
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({width, height: width < 600 ? 844 : 1000});
      await geometry(page, engine + ' ' + width + ' expanded mapping');
      if (width === 390) await shot(page, engine + '-mapping-' + width);
    }
    await page.setViewportSize({width: engine === 'webkit' ? 390 : 1440, height: engine === 'webkit' ? 844 : 1000});
    const save = page.getByRole('button', {name: 'Save mapping profile', exact: true}); assert(await save.isDisabled());
    await page.getByRole('checkbox', {name: /I verified the required fields/}).check(); await save.click();
    await page.getByText('Mapping saved as revision 1.', {exact: true}).waitFor();
    await page.locator('#payroll-mapping > summary').click();
    pass(engine + ': full mapping fields, provider identifiers, review gate and real profile save');
    const commands = [];
    await page.route('**/api/payroll-export', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      commands.push(route.request().postDataJSON());
      await new Promise(r => setTimeout(r, 800));
      const response = await route.fetch();
      if (commands.length === 1) return route.abort('failed');
      return route.fulfill({response});
    });
    await generate.click();
    assert(await generate.isDisabled());
    assert(await page.getByLabel('Period start', {exact: true}).isDisabled());
    assert.equal(await page.getByRole('button', {name: /Download mapped CSV/}).count(), 0);
    await page.getByText('The export outcome is unconfirmed. Retry this same generation to retrieve its receipt.', {exact: true}).waitFor();
    assert(await generate.isDisabled());
    await page.getByRole('button', {name: 'Retry same export', exact: true}).click();
    await page.getByRole('heading', {name: 'Your files are ready', exact: true}).waitFor();
    assert.equal(commands.length, 2); assert.deepEqual(commands[0], commands[1]);
    pass(engine + ': actual completed export with dropped response replays same operation and verified receipt');
    for (const [name, button] of [['mapped.csv', 'Download mapped CSV'], ['canonical.json', 'Download canonical time record']]) {
      const download = page.waitForEvent('download'); await page.getByRole('button', {name: new RegExp(button)}).click();
      const d = await download; const path = join(evidence, engine + '-' + name); await d.saveAs(path);
      if (name.endsWith('.csv')) assert.match(await readFile(path, 'utf8'), /QA001/);
      else {const model = JSON.parse(await readFile(path, 'utf8')); assert.equal(model.rows.length, 2); assert.equal(model.rows[0].recordedNanoseconds, '28800000000000'); assert.equal(model.rows[0].breakNanoseconds, '1800000000000');}
    }
    await page.getByText('Export receipt & verification', {exact: true}).click();
    const csvHash = createHash('sha256').update(await readFile(join(evidence, engine + '-mapped.csv'))).digest('hex');
    assert.match(await page.getByRole('region', {name: 'Your files are ready'}).innerText(), new RegExp(csvHash));
    await page.unroute('**/api/payroll-export');
    for (const width of [390, 1440]) {await page.setViewportSize({width, height: width < 600 ? 844 : 1000}); await geometry(page, engine + ' ' + width + ' verified files'); await shot(page, engine + '-files-' + width);}
    pass(engine + ': real CSV and canonical JSON downloads, exact break basis and matching SHA-256');
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click(); await ready(page); assert(await generate.isDisabled());
    await page.getByRole('button', {name: 'Select finalized', exact: true}).click();
    await page.route('**/api/payroll-export', route => route.fulfill({status: 409, json: {state: 'conflict'}}));
    await generate.click(); await page.getByText('The finalized revision or mapping changed. Refresh and review again.', {exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Retry same export', exact: true}).count(), 0);
    assert.equal(await page.getByRole('button', {name: /Download mapped CSV/}).count(), 0);
    await page.unroute('**/api/payroll-export');
    pass(engine + ': stale source conflict exposes no verified download or same-operation retry');
    await page.route('**/api/timecards', async route => {const r = await route.fetch(); const body = await r.json(); return route.fulfill({response: r, json: {...body, cards: []}});});
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click(); await page.getByRole('heading', {name: 'No employees in this period'}).waitFor();
    assert(await generate.isDisabled()); await shot(page, engine + '-empty'); await page.unroute('**/api/timecards');
    await page.route('**/api/timecards', route => route.fulfill({status: 503, json: {state: 'unavailable'}}));
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click(); await page.getByRole('heading', {name: 'Exports unavailable', exact: true}).waitFor();
    await shot(page, engine + '-error'); await page.unroute('**/api/timecards');
    await page.route('**/api/timecards', async route => {await new Promise(r => setTimeout(r, 900)); return route.continue();});
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click(); await page.getByRole('heading', {name: 'Loading finalized time', exact: true}).waitFor(); await shot(page, engine + '-loading'); await ready(page); await page.unroute('**/api/timecards');
    await context.setOffline(true); await page.getByRole('heading', {name: 'Exports unavailable offline', exact: true}).waitFor();
    await context.setOffline(false); await ready(page);
    await page.emulateMedia({reducedMotion: 'reduce'}); await page.reload(); await ready(page);
    assert.equal(await page.locator('.payroll-page-mark span').evaluate(el => getComputedStyle(el).transform), 'none');
    pass(engine + ': empty, error, loading, offline recovery and reduced-motion states');
    await page.route('**/api/timecards', async route => {
      const response = await route.fetch(), body = await response.json();
      const source = body.cards.find(c => c.state === 'FINALIZED');
      const cards = Array.from({length: 101}, (_, i) => {
        const card = structuredClone(source), id = 'UI-LIMIT-' + i;
        card.source.employeeId = id;
        card.source.employeeName = `Fictional employee ${i} with an intentionally long name for narrow-screen review`;
        card.history.forEach(h => {h.snapshot.employeeId = id; h.snapshot.employeeName = card.source.employeeName;});
        return card;
      });
      return route.fulfill({response, json: {...body, cards}});
    });
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click(); await ready(page);
    await page.getByRole('button', {name: 'Select finalized', exact: true}).click();
    assert.equal(await page.getByRole('checkbox', {checked: true}).count(), 100);
    assert(await page.getByRole('checkbox', {name: 'Select Fictional employee 100 with an intentionally long name for narrow-screen review', exact: true}).isDisabled());
    for (const width of [320, 1440]) {await page.setViewportSize({width, height: width === 320 ? 844 : 1000}); await geometry(page, engine + ' ' + width + ' 101 long employee names');}
    await page.getByRole('button', {name: 'Clear', exact: true}).click();
    assert(await page.getByRole('checkbox', {name: 'Select Fictional employee 100 with an intentionally long name for narrow-screen review', exact: true}).isEnabled());
    await page.unroute('**/api/timecards');
    pass(engine + ': 100-employee export limit and long employee names on desktop and mobile');
    await page.route('**/api/timecards', route => route.fulfill({status: 403, json: {state: 'unavailable'}}));
    await page.getByRole('button', {name: 'Refresh export data', exact: true}).click();
    await page.getByRole('heading', {name: 'Export access ended', exact: true}).waitFor();
    assert.equal(await page.getByRole('button', {name: 'Generate reviewed export', exact: true}).count(), 0);
    assert.equal(await page.locator('#payroll-mapping').count(), 0);
    pass(engine + ': access loss clears employee, mapping and export surfaces');
    await context.close();
  }
  assert.deepEqual(report.errors, [], 'Browser errors');
  report.passed = true;
} catch (error) {
  report.failure = error.stack; console.error(error); process.exitCode = 1;
  for (const browser of browsers) for (const context of browser.contexts()) for (const page of context.pages()) {
    await page.screenshot({path: join(evidence, 'failure.png'), fullPage: true});
    await writeFile(join(evidence, 'failure.html'), await page.content());
  }
}
finally {
  for (const browser of browsers) await browser.close();
  await app?.close();
  if (readFileSync(join(cluster, 'owner'), 'utf8') !== marker) throw Error('Owned cluster marker changed; refusing teardown.');
  if (started) pg('pg_ctl', ['-D', data, '-w', 'stop', '-m', 'fast']);
  rmSync(cluster, {recursive: true, force: true});
  await writeFile(join(evidence, 'report.json'), JSON.stringify(report, null, 2));
}
