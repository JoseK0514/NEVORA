import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { TEST_PASSWORD } from '../../src/test/integration/owned-app-fixture.ts';
import { checkClocker } from './collab-clocker.mjs';
import { scanInventory, finishInventory } from './collab-inventory.mjs';
import { checkNativeAlerts } from './collab-native.mjs';
import { checkScopedManager } from './collab-scoped-manager.mjs';
import { checkSignup } from './collab-signup.mjs';

const [evidence, ...options] = process.argv.slice(2);
assert.ok(options.every(option => ['--inventory', '--inventory-only', '--screenshots', '--signup-only', '--scoped-manager'].includes(option)), 'Unknown collab browser option.');
const inventoryOnly = options.includes('--inventory-only');
const scopedOnly = options.includes('--scoped-manager');
const signupOnly = options.includes('--signup-only');
const inventoryEnabled = inventoryOnly || options.includes('--inventory');
assert.ok(evidence && isAbsolute(evidence), 'Pass the absolute evidence directory of the running collab sandbox.');
const runtime = JSON.parse(await readFile(join(evidence, 'runtime.json'), 'utf8'));
const { checkpoint, week, actors, profiles } = runtime;
assert.match(runtime.url, /^http:\/\/127\.0\.0\.1:[0-9]+$/);
const url = runtime.url;
assert.equal(checkpoint, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), 'Use the checkout that started the sandbox.');

const require = createRequire(new URL('../../tools/ci-browser-runtime/package.json', import.meta.url));
const { chromium } = require('playwright');
const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
const results = [];
const inventoryResults = [];
const phone = { width: 390, height: 844 };
const desktop = { width: 1440, height: 900 };

function record(id, detail, route) {
  results.push({ id, detail, route });
  console.log(id, detail);
}

async function pageFor(viewport, permissions = [], userAgent, origin = url) {
  const context = await browser.newContext({ viewport, permissions, userAgent, serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const target = new URL(route.request().url());
    return target.origin === origin || target.protocol === 'blob:' ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.setDefaultNavigationTimeout(60_000);
  return page;
}

async function login(id, viewport = phone, userAgent, origin = url) {
  const page = await pageFor(viewport, [], userAgent, origin);
  await page.goto(origin + '/login');
  await page.locator('#login-employee-id').fill(id);
  await page.locator('#login-password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(target => target.pathname.startsWith('/app'), { timeout: 60_000 });
  assert.notEqual(new URL(page.url()).pathname, '/app/billing', 'The fictional role was redirected to the billing gate.');
  return page;
}

async function captureWidths(page, basename) {
  for (const viewport of [phone, desktop]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: join(evidence, basename + '-' + viewport.width + '.png') });
  }
  await page.setViewportSize(phone);
}

async function checkRondo(page, profile) {
  const main = page.locator('main');
  const response = await page.goto(url + '/app/ai-manager');
  assert.equal(response.status(), 200);
  await main.getByText('Location and week', { exact: true }).waitFor();
  const locations = page.locator('#rm-location option');
  if (profile === 'M') {
    assert.deepEqual(await locations.allTextContents(), ['Northside Main Office', 'Northside West Office']);
  } else {
    assert.equal(await locations.count(), 0);
    await main.getByText(/Main Office/).first().waitFor();
    assert.doesNotMatch(await main.innerText(), /West Office/);
  }

  const answer = page.waitForResponse(reply => reply.url().includes('/api/manager/advisor?view=answer'));
  await page.getByRole('button', { name: 'How many hours are scheduled?', exact: true }).click();
  assert.equal((await answer).status(), 200);
  await main.getByText('You asked:', { exact: true }).waitFor();
  await captureWidths(page, 'rondo-' + profile);
  record('H1', profile + ' opened Rondo and answered a preset schedule question within its location scope');
}

async function checkFindCover(page) {
  await page.goto(url + '/app/schedule?week=' + week + '&location=all');
  const section = page.getByRole('region', { name: 'Open shifts', exact: true });
  const links = section.getByRole('link', { name: /^Find cover:/ });
  await links.first().waitFor();
  const repairs = (await links.evaluateAll(nodes => nodes.map(node => node.href))).map(href => {
    const target = new URL(href);
    return { target, repair: JSON.parse(target.searchParams.get('repair')) };
  });
  assert.ok(repairs.every(({ target, repair }) => target.origin === url && repair.locationId === 'loc-1'));
  assert.doesNotMatch(await page.locator('main').innerText(), /West Office/);

  // Start with partial-day gaps from the published shift to find an eligible candidate.
  const partial = ({ repair }) => repair.startTime !== '00:00' || repair.endTime !== '24:00';
  const replacement = page.getByRole('link', { name: /^Review replacement for/ });
  let selected;
  for (const candidate of [...repairs.filter(partial), ...repairs.filter(item => !partial(item))]) {
    await page.goto(candidate.target.href);
    await page.getByRole('heading', { name: 'Who can cover', exact: true }).waitFor();
    if (await replacement.count()) {
      selected = candidate;
      break;
    }
  }
  assert.ok(selected, 'The fictional schedule did not yield an eligible cover candidate.');
  assert.doesNotMatch(await page.locator('main').innerText(), /West Office/);
  await captureWidths(page, 'location-find-cover');

  await replacement.first().click();
  await page.getByRole('heading', { name: 'Review replacement', exact: true }).waitFor();
  assert.doesNotMatch(await page.locator('main').innerText(), /West Office/);
  await captureWidths(page, 'location-replacement-review');
  record('C3', 'Location Manager opened Review replacement for a Main Office coverage gap');

  const { target, repair } = selected;
  const allowedRoute = target.pathname + target.search;
  target.searchParams.set('locationId', 'loc-2');
  target.searchParams.set('repair', JSON.stringify({ ...repair, locationId: 'loc-2' }));
  await page.goto(target.href);
  await page.getByText('Outside the locations you manage', { exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Who can cover', exact: true }).count(), 0);
  assert.doesNotMatch(await page.locator('main').innerText(), /West Office/);
  record('C5', 'Location Manager opened Find Cover from Schedule and an unassigned location was denied', allowedRoute);
}

async function checkPriority() {
  for (const profile of ['M', 'Ml']) {
    const page = await login(profiles[profile]);
    try {
      await checkRondo(page, profile);
      if (profile === 'Ml') await checkFindCover(page);
    } finally {
      await page.context().close();
    }
  }
  const owner = await login(profiles.O, desktop);
  try {
    await checkClocker({ url, actors, evidence, pageFor, owner, record });
  } finally {
    await owner.context().close();
  }
}

const inventoryOrigin = url.replace('127.0.0.1', 'localhost');
const scanPage = viewport => pageFor(viewport, [], undefined, inventoryOrigin);
const scanLogin = (id, viewport, userAgent) => login(id, viewport, userAgent, inventoryOrigin);
const recordInventory = (id, detail) => {
  inventoryResults.push({ id, detail, observed: 'asserted workflow' });
  console.log(id, detail);
};

async function captureSignup() {
  const page = await scanPage(phone);
  try {
    await checkSignup({ origin: inventoryOrigin, page, evidence, record: recordInventory });
  } finally {
    await page.context().close();
  }
}

try {
  if (signupOnly) {
    await captureSignup();
  }
  const workflowErrors = [];
  if (!inventoryOnly && !signupOnly) {
    try {
      if (!scopedOnly) await checkPriority();
      await checkScopedManager({ runtime, login, captureWidths, record });
    } catch (error) {
      workflowErrors.push(error);
    } finally {
      await writeFile(join(evidence, 'collab-priority-results.json'), JSON.stringify({ checkpoint, results }, null, 2) + '\n');
    }
  }
  if (inventoryEnabled) {
    // The WebAuthn and browser-alert test contracts use localhost. Clocker
    // provisioning uses the exact numeric loopback origin announced by the app.
    if (!signupOnly) {
      try {
        await captureSignup();
      } catch (error) {
        workflowErrors.push(error);
        const id = ['A8', 'A9', 'A10'].find(id => !inventoryResults.some(result => result.id === id));
        inventoryResults.push({ id, observed: 'error', detail: String(error.message).split('\n')[0] });
      }
    }
    try {
      await checkNativeAlerts({ url: inventoryOrigin, login: scanLogin, employee: profiles.E, evidence, record: recordInventory });
    } catch (error) {
      workflowErrors.push(error);
      inventoryResults.push({ id: 'L1', observed: 'error', detail: String(error.message).split('\n')[0] });
    }
    const inventory = await scanInventory({
      evidence, origin: inventoryOrigin, runtime, pageFor: scanPage, login: scanLogin, priority: results, screenshots: options.includes('--screenshots'),
    });
    await finishInventory({ inventory, priority: results, extra: inventoryResults, evidence, checkpoint });
  }
  if (workflowErrors.length) throw new AggregateError(workflowErrors, 'One or more collab browser workflows failed. See the retained evidence.');
} finally {
  await browser.close();
}
