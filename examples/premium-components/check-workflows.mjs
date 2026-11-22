import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const runtime = createRequire(
  process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ||
    new URL('../../tools/ci-browser-runtime/package.json', import.meta.url),
);
const {chromium, webkit} = runtime('playwright');
const url = pathToFileURL(resolve(process.argv[2])).href;

for (const [engine, width] of [
  [chromium, 1440],
  [webkit, 390],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    page.setDefaultTimeout(6500);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => {
      if (/^https?:/.test(r.url())) errors.push(r.url());
    });
    const btn = name => page.getByRole('button', {name, exact: true});
    const field = name => page.getByLabel(name, {exact: true});
    const visible = locator => locator.waitFor({state: 'visible'});
    const copy = value => visible(page.getByText(value, {exact: true}).first());
    const section = async (id, title) => {
      await page.goto(url + '#' + id);
      await visible(page.getByRole('heading', {level: 1, name: title, exact: true}));
    };
    const receipt = title =>
      visible(page.locator('.np-tablet .np-result strong').getByText(title, {exact: true}));
    await section('overview', 'Component library');
    const range = page.locator('.np-week span[aria-live]');
    const original = await range.textContent();
    await btn('Next week').click();
    assert.notEqual(await range.textContent(), original);
    await btn('Previous week').click();
    assert.equal(await range.textContent(), original);
    await section('controls', 'Controls');
    const save = btn('Save changes');
    const initialWidth = (await save.boundingBox()).width;
    await save.click();
    const busy = btn('Saving…');
    assert.ok(await busy.isDisabled());
    assert.ok(Math.abs((await busy.boundingBox()).width - initialWidth) < 1);
    await copy('Changes saved');
    const pref = page.getByRole('switch', {name: 'Schedule updates'});
    await field('Simulate a failed save').check();
    await pref.click();
    assert.equal(await pref.getAttribute('aria-checked'), 'false');
    await visible(page.getByRole('alert'));
    assert.equal(await pref.getAttribute('aria-checked'), 'true');
    assert.ok(await page.getByRole('switch', {name: 'Payroll notifications'}).isDisabled());
    await page.getByRole('radio', {name: 'Email', exact: true}).check();
    await btn('View details').focus();
    await page.keyboard.press('Enter');
    await visible(page.getByRole('dialog', {name: 'Schedule preference'}));
    await page.keyboard.press('Escape');
    assert.ok(await btn('View details').evaluate(el => el === document.activeElement));
    await btn('Discard draft').click();
    await btn('Keep draft').click();
    await btn('Discard draft').click();
    await page.getByRole('dialog').getByRole('button', {name: 'Discard draft'}).click();
    assert.ok(await btn('Discard draft').isDisabled());
    await btn('Restore sample draft').click();
    assert.ok(await btn('Discard draft').isEnabled());
    await section('forms', 'Forms and inputs');
    await field('Employee name').fill('');
    await btn('Save changes').click();
    assert.ok(await field('Employee name').evaluate(el => el === document.activeElement));
    await copy('Enter an employee name.');
    await field('Employee name').fill('Sample employee');
    await field('Start time').fill('22:00');
    await field('End time').fill('06:00');
    await copy('Overnight shift');
    await btn('Discard').click();
    await btn('Keep editing').click();
    await btn('Save changes').click();
    await copy('Shift details saved');
    await field('Employee name').fill('Another name');
    await btn('Discard').click();
    await btn('Discard edits').click();
    assert.equal(await field('Employee name').inputValue(), 'Sample employee');
    await section('feedback', 'Status and feedback');
    for (const [id, title] of [
      ['empty', 'No shifts yet'],
      ['no-results', 'No matching employees'],
      ['offline', 'You’re offline'],
      ['stale', 'Showing an earlier schedule'],
      ['denied', 'Owner access required'],
      ['error', 'Schedule couldn’t load'],
      ['saved', 'Schedule saved'],
      ['unconfirmed', 'Clock-in unconfirmed'],
    ]) {
      await field('State').selectOption(id);
      assert.equal(await page.locator('.np-result strong').textContent(), title);
    }
    await btn('Check status').click();
    await copy('Clock-in recorded');
    await btn('Reload roster').click();
    await visible(page.getByRole('status', {name: 'Loading the roster'}));
    await copy('Roster available');
    await btn('Start export').click();
    await visible(btn('Prepare again'));
    assert.equal(await page.locator('progress').getAttribute('value'), '100');
    await section('navigation', 'Navigation and menus');
    for (const mode of ['Sidebar', 'Rail', 'Phone tabs']) {
      await btn(mode).click();
      const nav = page.getByRole('navigation', {name: 'Workspace destinations'});
      const requests = nav.getByRole('link', {name: 'Requests'});
      await requests.click();
      assert.equal(await requests.getAttribute('aria-current'), 'page');
      await btn('Go back').click();
      assert.equal(
        await nav.getByRole('link', {name: 'Schedule'}).getAttribute('aria-current'),
        'page',
      );
    }
    await field('Find an employee').fill('No employee matches');
    await copy('No matching employees');
    await btn('Clear filters').click();
    await page.locator('summary').click();
    await btn('View options').click();
    await page.getByRole('dialog').getByRole('button', {name: 'Show hours'}).click();
    await copy('Hours this week');
    await section('records', 'People and records');
    await btn('Español').click();
    await copy('Resumen de la semana');
    await btn('Approve').first().click();
    await copy('Request approved');
    await btn('Decline').click();
    await btn('Keep request').click();
    await btn('Decline').click();
    await btn('Decline request').click();
    await copy('Request declined');
    await btn('Finalize timecard').click();
    await btn('Finalize').click();
    assert.ok(await btn('Timecard finalized').isDisabled());
    await btn('Semana siguiente').click();
    assert.ok(await btn('Finalize timecard').isEnabled());
    await section('clocker', 'Clocker tablet');
    const scenario = field('Preview a screen');
    const tablet = page.locator('.np-tablet');
    const action = name => tablet.getByRole('button', {name: new RegExp('^' + name + '(?:$| )')});
    await scenario.selectOption('setup');
    await field('Setup code').fill('000000');
    await btn('Connect tablet').click();
    await copy('Enter the sample setup code 804206.');
    await field('Setup code').fill('804206');
    await btn('Connect tablet').click();
    await field('Employee ID').fill('0');
    await btn('Continue').click();
    await copy('Use the sample ID 1042.');
    await field('Employee ID').fill('1042');
    await btn('Continue').click();
    await field('Employee PIN').fill('0000');
    await btn('Continue').click();
    await copy('That PIN doesn’t match the sample employee.');
    for (const n of ['1', '3', '5', '7']) await btn(n).click();
    await btn('Continue').click();
    await action('Clock in').click();
    await receipt('Clock-in recorded');
    await btn('Done').click();
    await visible(field('Employee ID'));
    await scenario.selectOption('working');
    await action('Start break').click();
    await action('Meal break').click();
    await receipt('Meal break started');
    await scenario.selectOption('breaks');
    await action('Rest break').click();
    await receipt('Rest break started');
    await scenario.selectOption('rest');
    await action('End break').click();
    await receipt('Break ended');
    await scenario.selectOption('working');
    await action('Clock out').click();
    await btn('Keep working').click();
    await action('Clock out').click();
    await btn('Confirm clock out').click();
    await receipt('Clock-out recorded');
    await scenario.selectOption('ready');
    await page.getByRole('switch', {name: 'Simulate lost confirmation'}).click();
    await action('Clock in').click();
    await receipt('Punch unconfirmed');
    assert.equal(await action('Clock in').count(), 0);
    await btn('Check status').click();
    await receipt('Clock-in recorded');
    await page.getByRole('switch', {name: 'Simulate lost confirmation'}).click();
    await scenario.selectOption('photo');
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: 'sample.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXvkAAAAASUVORK5CYII=',
        'base64',
      ),
    });
    await visible(tablet.getByRole('img', {name: 'Selected photo'}));
    await btn('Use this photo').click();
    await receipt('Clock-in recorded');
    await scenario.selectOption('offline');
    await btn('Check connection').click();
    await visible(action('Clock in'));
    assert.deepEqual(errors, []);
    if (engine === chromium) {
      await page.emulateMedia({forcedColors: 'active', reducedMotion: 'reduce'});
      await visible(action('Clock in'));
      assert.ok(await page.evaluate(() => matchMedia('(forced-colors: active)').matches));
    }
    console.log(engine.name(), width, 'workflows passed');
  } finally {
    await browser.close();
  }
}
