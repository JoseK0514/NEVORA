/** Focused native FormData regression. Existing loopback source fixtures only;
 * actions are intercepted, so this does not claim authenticated persistence. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loopbackOrigin, validateOutput } from './verify-nevora-foundation-config.mjs';
const output = process.env.NEVORA_QA_OUTPUT;
await validateOutput(output, process.cwd());
const generic = loopbackOrigin(process.env.NEVORA_QA_GENERIC_URL);
const fuel = loopbackOrigin(process.env.NEVORA_QA_FUEL_URL);
assert(process.env.NEVORA_QA_PLAYWRIGHT_PATH, 'Use the existing Playwright runtime');
const playwright = await import(pathToFileURL(process.env.NEVORA_QA_PLAYWRIGHT_PATH).href);
const red = process.argv.includes('--red'), baseline = process.argv.includes('--baseline');
const results = [];
await mkdir(resolve(output, 'screenshots'), { recursive: true });
async function audit(page) {
  return page.evaluate(() => {
    const root = document.querySelector('select[name=employeeId]').closest('form');
    const visible = element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && rect.height > 0; };
    const controls = [...root.querySelectorAll('input:not([type=hidden]),select,button,a')].filter(visible).map(element => {
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element), range = document.createRange(); range.selectNodeContents(element); const text = range.getBoundingClientRect();
      return { name: element.name, text: element.textContent.trim(), rect: rect.toJSON(), fontSize: style.fontSize, centerDelta: text.height && element.tagName !== 'SELECT' ? Math.abs((text.top + text.bottom - rect.top - rect.bottom) / 2) : null };
    });
    const textBounds = [], walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) { const node = walker.currentNode; if (!node.textContent.trim() || node.parentElement.closest('option,select') || !visible(node.parentElement)) continue; const range = document.createRange(); range.selectNodeContents(node); for (const rect of range.getClientRects()) if (rect.left < -1 || rect.right > innerWidth + 1) textBounds.push({ text: node.textContent.trim(), rect: rect.toJSON() }); }
    return { url: location.href, heading: document.querySelector('h1')?.textContent, overflow: document.documentElement.scrollWidth > innerWidth, controls, textBounds };
  });
}
async function capture(page, name) {
  const path = resolve(output, 'screenshots', name + '.png');
  const bytes = await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  return { path, sha256: createHash('sha256').update(bytes).digest('hex') };
}
for (const engine of red ? ['chromium'] : ['chromium', 'webkit']) {
  const browser = await playwright[engine].launch();
  try {
    for (const width of red ? [375] : [320,375,390,430,768,1024,1440]) for (const role of red ? ['manager'] : ['manager','owner']) for (const mode of ['new','edit']) for (const customer of baseline ? ['fuel'] : red ? ['generic'] : ['fuel','generic']) {
      const context = await browser.newContext({ viewport: { width, height: width === 768 ? 1024 : width === 1024 ? 768 : 844 }, timezoneId: 'America/Puerto_Rico', locale: 'en-US', reducedMotion: 'reduce' });
      await context.addInitScript(() => { const Original = Date; window.Date = class extends Original { constructor(...args) { super(...(args.length ? args : ['2026-10-01T16:00:00Z'])); } static now() { return new Original('2026-10-01T16:00:00Z').getTime(); } }; });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const name = `${engine}-${width}-${role}-${mode}-${customer}`, row = { name, engine, width, role, mode, customer, errors, checks: [] };
      try {
        const url = `${customer === 'fuel' ? fuel : generic}/app/schedule/${mode}?${role}&week=2026-10-05&shiftId=shift-sam&employeeId=${customer === 'generic' ? 'sam' : 'E'}&start=08:00&end=12:00`;
        assert.equal((await page.goto(url)).status(), 200);
        await page.waitForFunction(() => window.fixtureReady);
        await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode().catch(() => {}))); });
        await page.waitForTimeout(80);
        assert.deepEqual(await page.evaluate(() => window.fixtureHydrationErrors ?? []), []);
        row.audit = await audit(page); row.initial = await capture(page, name + '-initial');
        assert.equal(row.audit.overflow, false); assert.deepEqual(row.audit.textBounds, []);
        assert(row.audit.controls.every(control => control.rect.left >= -1 && control.rect.right <= width + 1));
        assert(row.audit.controls.filter(control => ['Save changes','Cancel','Delete Shift','Create Shift'].includes(control.text)).every(control => control.rect.height >= 44 && (control.centerDelta === null || control.centerDelta <= 1)));
        assert.equal(row.audit.heading, mode === 'new' ? 'Create New Shift' : 'Edit shift');
        if (customer === 'generic') {
          const employee = page.locator('select[name=employeeId]'), position = page.locator('select[name=positionId]');
          const submitted = () => page.locator('form').filter({ has: page.locator('select[name=employeeId]') }).evaluate(form => ({ employee: new FormData(form).get('employeeId'), positions: new FormData(form).getAll('positionId') }));
          if (mode === 'new') { assert.equal(await position.inputValue(), ''); row.checks.push('new defaults positionless'); await position.selectOption('cashier'); }
          await employee.focus(); assert.equal(await employee.evaluate(element => element === document.activeElement), true);
          await employee.selectOption('lee');
          row.qualified = await submitted(); row.qualifiedImage = await capture(page, name + '-qualified');
          // Both modes must submit their explicit assignment after reassignment.
          if (red) {
            row.qualifiedPassed = JSON.stringify(row.qualified.positions) === '["cashier"]';
            // Restore an explicit choice to independently expose unqualified change.
            await employee.selectOption('sam'); await position.selectOption('cashier');
          } else assert.deepEqual(row.qualified, { employee: 'lee', positions: ['cashier'] });
          await employee.selectOption('owner'); row.unqualified = await submitted();
          row.unavailableText = await position.locator('option:checked').textContent();
          row.unqualifiedImage = await capture(page, name + '-unqualified');
          if (red) row.unqualifiedPassed = JSON.stringify(row.unqualified.positions) === '["cashier"]';
          else { assert.deepEqual(row.unqualified, { employee: 'owner', positions: ['cashier'] }); assert.match(row.unavailableText, /unavailable/); }
          await position.focus(); await page.keyboard.press('Home'); await page.keyboard.press('Enter');
          // Explicit selection is deliberate even on platforms where Home leaves the native popup open.
          await position.selectOption(''); row.cleared = await submitted(); assert.deepEqual(row.cleared.positions, ['']);
          await employee.selectOption('lee'); assert.deepEqual((await submitted()).positions, ['']);
          row.checks.push('explicit clear persists across subsequent employee change');
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          row.bottom = await page.evaluate(() => { const submit = [...document.querySelectorAll('button[type=submit]')].at(-1)?.getBoundingClientRect(); const nav = document.querySelector('.mobile-nav')?.getBoundingClientRect(); return { submit: submit?.toJSON(), nav: nav?.toJSON() }; });
          row.bottomImage = await capture(page, name + '-bottom');
          if (row.bottom.nav?.height) assert(row.bottom.submit.bottom <= row.bottom.nav.top + 1);
          if (!red) {
            await employee.selectOption('sam'); await position.selectOption('cashier'); await employee.selectOption('owner');
            await page.locator('button[type=submit]').filter({ hasText: mode === 'new' ? 'Save' : 'Save changes' }).click();
            row.pending = await submitted();
            assert.deepEqual(row.pending, { employee: 'owner', positions: ['cashier'] });
            await page.waitForURL(/error=POSITION_INELIGIBLE/);
            await page.waitForFunction(() => window.fixtureReady);
            row.action = await page.evaluate(() => JSON.parse(sessionStorage.getItem('assignmentFixtureSubmission')));
            assert.equal(row.action.name, mode === 'new' ? 'createShiftAction' : 'updateShiftAction');
            assert.deepEqual(row.action.entries.filter(([key]) => key === 'positionId'), [['positionId','cashier']]);
            row.serverErrorText = await page.locator('.form-error').textContent();
            assert.match(row.serverErrorText, /qualified/);
            // Real error navigation reloads the persisted assignment. There is
            // no unsaved-input echo contract on the existing shift actions.
            if (mode === 'edit') assert.deepEqual(await submitted(), { employee: 'sam', positions: ['cashier'] });
            row.errorImage = await capture(page, name + '-server-error');
          }
        }
        assert.deepEqual(errors, []); row.passed = red ? row.qualifiedPassed && row.unqualifiedPassed : true;
      } catch (error) { row.passed = false; row.error = String(error); row.failureImage = await capture(page, name + '-failure'); }
      results.push(row); await writeFile(resolve(output, 'assignment-results.json'), JSON.stringify(results, null, 2)); await context.close();
    }
  } finally { await browser.close(); }
}
console.log(JSON.stringify({ cases: results.length, passed: results.filter(row => row.passed).length }));
assert(results.every(row => row.passed), 'Explicit positions must survive qualified/unqualified reassignment in native FormData');
