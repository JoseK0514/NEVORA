import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkClocker({ url, actors, evidence, pageFor, owner, record }) {
  const button = (page, name) => page.getByRole('button', { name, exact: true });
  const state = (page, name) => page.locator('[data-clocker-state="' + name + '"]');

  async function capture(id, page, detail, suffix = '') {
    await page.screenshot({ path: join(evidence, 'clocker-' + id + suffix + '-1024.png') });
    record(id, detail);
  }

  async function connect(name, captureSetup = false) {
    await owner.goto(url + '/app/settings/clocker');
    await owner.locator('[data-clocker-add]').click();
    await owner.locator('#clocker-device-name').fill(name);
    await owner.locator('#clocker-device-location').selectOption('loc-1');
    await owner.locator('form').filter({has: owner.locator('#clocker-device-name')}).locator('button[type=submit]').click();
    const link = owner.locator('a[href*="/clocker/"][target="_blank"]').last();
    await link.waitFor();
    const setup = new URL(await link.getAttribute('href'), url);
    assert.equal(setup.origin, url);
    const kiosk = await pageFor({ width: 1024, height: 768 }, ['camera']);
    await kiosk.goto(setup.href);
    if (captureSetup) {
      await button(kiosk, 'Connect tablet').waitFor();
      await capture('K1', kiosk, 'Setup with a one-time fictional tablet code');
    }
    const advance = button(kiosk, 'Connect tablet').or(button(kiosk, 'Open the time clock')).or(kiosk.locator('#clocker-employee-id')).first();
    await advance.waitFor();
    if (await button(kiosk, 'Connect tablet').isVisible()) await button(kiosk, 'Connect tablet').click();
    const open = button(kiosk, 'Open the time clock');
    await open.or(kiosk.locator('#clocker-employee-id')).first().waitFor();
    if (captureSetup) {
      await open.waitFor();
      await capture('K2', kiosk, 'Tablet connected');
    }
    if (await open.isVisible()) await open.click();
    await kiosk.locator('#clocker-employee-id').waitFor();
    if (captureSetup) await capture('K3', kiosk, 'Employee ID entry');
    return kiosk;
  }

  async function signIn(page, expected = 'ready', capturePin = false) {
    await page.locator('#clocker-employee-id').fill(actors[0]);
    await page.locator('[data-clocker-step=id] button[type=submit]').click();
    if (capturePin) {
      await page.locator('[data-clocker-step=pin]').waitFor();
      await capture('K4', page, 'Employee PIN keypad');
    }
    for (const digit of '2468') {
      await page.locator('[data-clocker-keypad] button[data-key=digit]').filter({hasText: new RegExp('^' + digit + '$')}).click();
    }
    await page.locator('[data-clocker-step=pin] button[type=submit]').click();
    await state(page, expected).waitFor();
  }

  await owner.goto(url + '/app/employees/' + actors[0] + '/clocker-pin');
  const fields = owner.locator('main input:not([type=hidden])');
  await owner.getByText(/set a pin for/i).waitFor();
  await fields.nth(0).fill('2468');
  await fields.nth(1).fill('2468');
  const saved = owner.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/clocker-pin'));
  await button(owner, 'Save PIN').click();
  assert.equal((await saved).status(), 200);
  const first = await connect('Collab test front tablet', true);
  const second = await connect('Collab test back tablet');

  await signIn(first, 'ready', true);
  await capture('K5', first, 'Choose an action');
  const abortExecute = route => route.request().postDataJSON()?.operation === 'execute' ? route.abort() : route.continue();
  await first.route('**/api/clocker/*/punch', abortExecute);
  await button(first, 'Clock in').click();
  await state(first, 'recovery').waitFor();
  await capture('K12', first, 'Interrupted delivery and check-state prompt');
  await first.unroute('**/api/clocker/*/punch', abortExecute);
  const punchUrl = '**/api/clocker/*/punch';
  const gate = Promise.withResolvers();
  const holdExecute = async route => {
    if (route.request().postDataJSON()?.operation === 'execute') await gate.promise;
    return route.continue();
  };
  await signIn(second);
  await second.route(punchUrl, holdExecute);
  try {
    await button(second, 'Clock in').click();
    await state(second, 'sending').waitFor();
    await capture('K10', second, 'Sending while the owned server reply is pending');
  } finally {
    gate.resolve();
  }
  await state(second, 'success').waitFor();
  await capture('K11', second, 'Recorded clock-in receipt from the owned database');
  await second.unroute(punchUrl, holdExecute);
  await button(first, 'Check if it saved').click();
  await state(first, 'review-current').waitFor();
  await capture('K9', first, 'Review current status after a second tablet records the punch');
  await button(first, 'See current status').click();
  await state(first, 'ready').waitFor();
  await button(first, 'Clock out').waitFor();
  await button(first, 'Start break').click();
  await state(first, 'select-break').waitFor();
  await capture('K6', first, 'Choose a break');
  await button(first, 'Back').click();

  // Use the same fictional photo policy seam as the existing capture harness.
  // Stop at local preview, before a punch or upload can send an image.
  const showPhotoPolicy = async route => {
    if (route.request().postDataJSON()?.operation !== 'state') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, json: { ...await response.json(), photoCaptureAvailable: true } });
  };
  await first.route(punchUrl, showPhotoPolicy);
  const policy = { version: 1, enabled: true, events: ['CLOCK_OUT'], retentionDays: 30, failureBehavior: 'ALLOW_WITH_EXCEPTION', captureMaxBytes: 524288, captureMaxDimension: 640, uploadWindowSeconds: 300 };
  const notice = { policyVersion: 1, profileVersion: 1, companyName: 'Northside QA Workforce', retentionDays: 30, assistanceContact: 'Front desk (fictional)', assistanceInstructions: 'Ask the front desk for help.', cleanupDisclosure: 'Fictional cleanup schedule.', backupDisclosure: 'Fictional backups.' };
  await first.route('**/api/clocker/*/photos', route => {
    assert.equal(route.request().postDataJSON()?.operation, 'policy');
    return route.fulfill({ json: { policy, notice } });
  });
  await button(first, 'Done').click();
  await signIn(first);
  await button(first, 'Clock out').click();
  await state(first, 'confirm-out').waitFor();
  await capture('K7', first, 'Confirm clock out');
  await button(first, 'Confirm clock out').click();
  await button(first, 'Open camera').waitFor();
  await first.screenshot({ path: join(evidence, 'clocker-photo-1024.png') });
  await button(first, 'Open camera').click();
  await button(first, 'Take photo').click();
  await button(first, 'Use this photo').waitFor();
  await first.screenshot({ path: join(evidence, 'clocker-photo-preview-1024.png') });
  await button(first, 'Cancel').click();
  await first.getByRole('button', { name: 'Use this photo', exact: true }).waitFor({ state: 'hidden' });
  record('K8', 'Photo and local preview using a simulated policy and camera');
  await first.unroute(punchUrl, showPhotoPolicy);

  // Simulate a second subject only on the recovery state reply. The app must
  // withhold the first subject and never forward a second execute.
  await signIn(first);
  await first.route(punchUrl, abortExecute);
  await button(first, 'Clock out').click();
  await button(first, 'Confirm clock out').click();
  await state(first, 'recovery').waitFor();
  await first.unroute(punchUrl, abortExecute);
  await button(first, 'Check if it saved').click();
  await state(first, 'retry').waitFor();
  await capture('K12', first, 'Retry the original punch when the owned server has no receipt', '-retry');
  await first.route(punchUrl, abortExecute);
  const changedSubject = async route => {
    const operation = route.request().postDataJSON()?.operation;
    assert.equal(operation, 'state');
    const response = await route.fetch();
    const body = await response.json();
    const subject = (body.subject[0] === 'a' ? 'b' : 'a') + body.subject.slice(1);
    await route.fulfill({ response, json: { ...body, subject, firstName: 'Another fictional person' } });
  };
  await first.route(punchUrl, changedSubject);
  await button(first, 'Check if it saved').click();
  await state(first, 'other-person').waitFor();
  await capture('K13', first, 'Other-person protection with a simulated changed subject');
  await first.unroute(punchUrl, changedSubject);

  const errors = [
    ['unavailable', route => route.abort()],
    ['auth', route => route.fulfill({ status: 401, json: { code: 'AUTH_REQUIRED' } })],
    ['storage', null],
  ];
  for (const [mode, reply] of errors) {
    const kiosk = await connect('Collab test ' + mode + ' tablet');
    if (reply) {
      await kiosk.route(punchUrl, route => route.request().postDataJSON()?.operation === 'state' ? reply(route) : route.continue());
    } else {
      await kiosk.evaluate(() => Object.defineProperty(indexedDB, 'open', {
        value() { throw new DOMException('Fictional storage failure', 'InvalidStateError'); },
      }));
    }
    await signIn(kiosk, mode);
    await capture('K14', kiosk, 'Simulated ' + mode + ' error screen', '-' + mode);
    await kiosk.context().close();
  }
}
