import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import test from 'node:test';
import {waitForMobileAvailabilityForm} from './availability-form-readiness.mjs';

const runtime = createRequire(resolve(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? 'tools/ci-browser-runtime/package.json'));
assert.equal(runtime('playwright/package.json').version, '1.62.1');
const playwright = runtime('playwright');
const week = '2027-11-15';
const markup = '<form class="c-avail__form" aria-label="Normal availability preferences"><button type="button" aria-label="Monday, All day">Monday</button></form><dialog>Monday hours</dialog>';
const render = page => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));

for (const engine of ['chromium', 'webkit']) {
  test(`${engine}: availability waits for the matching mobile read before one click`, async () => {
    const browser = await playwright[engine].launch({headless: true});
    try {
      const page = await browser.newPage({viewport: {width: 390, height: 1000}, isMobile: true, hasTouch: true});
      page.setDefaultTimeout(15000);
      await page.setContent(markup);
      let settled = false;
      const waiting = waitForMobileAvailabilityForm(page, week).then(form => { settled = true; return form; });
      // The old generic selector resolves on this server-rendered editor.
      await page.locator('form.c-avail__form').waitFor();
      await render(page);
      assert.equal(settled, false, 'Server-rendered fallback is not the mobile command owner');
      await page.evaluate(() => {
        const form = document.querySelector('form');
        form.removeAttribute('aria-label');
        const frame = document.createElement('section');
        frame.className = 'em-planning';
        frame.dataset.planningSelection = '2027-11-15';
        frame.dataset.planningState = 'loading';
        form.replaceWith(frame); frame.append(form);
        window.fixtureClicks = 0;
        form.querySelector('button').addEventListener('click', () => {
          window.fixtureClicks++;
          document.querySelector('dialog').showModal();
        });
      });
      await render(page);
      assert.equal(settled, false, 'An incomplete protected planning read must remain pending');
      await page.locator('.em-planning').evaluate(frame => {
        frame.dataset.planningSelection = 'normal'; frame.dataset.planningState = 'ready';
      });
      await render(page);
      assert.equal(settled, false, 'Another selection cannot authorize this week');
      await page.locator('.em-planning').evaluate(frame => { frame.dataset.planningSelection = '2027-11-15'; });
      const form = await waiting;
      await form.getByRole('button', {name: /^Monday, /}).click();
      await page.locator('dialog[open]').waitFor();
      assert.equal(await page.evaluate(() => window.fixtureClicks), 1, 'Exactly one command-owner click');
    } finally { await browser.close(); }
  });

  test(`${engine}: unavailable, paused, denied and wrong-selection owners stay blocked`, async () => {
    const browser = await playwright[engine].launch({headless: true});
    try {
      const page = await browser.newPage();
      for (const state of ['loading', 'unavailable', 'paused', 'denied']) {
        await page.setContent(`<section class="em-planning" data-planning-selection="normal" data-planning-state="${state}">${markup}</section>`);
        await assert.rejects(waitForMobileAvailabilityForm(page, 'normal', 150), error => error.name === 'TimeoutError');
        assert.equal(await page.locator('dialog[open]').count(), 0);
      }
      await page.setContent(`<section class="em-planning" data-planning-selection="normal" data-planning-state="ready">${markup}</section>`);
      await assert.rejects(waitForMobileAvailabilityForm(page, week, 150), error => error.name === 'TimeoutError');
      await assert.rejects(waitForMobileAvailabilityForm(page, 'normal"] form, button'), error => error instanceof TypeError);
    } finally { await browser.close(); }
  });
}
