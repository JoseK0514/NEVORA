/** Opt-in Chromium fixture verification. This is not native-device evidence.
 * NEVORA_FIXTURE_BROWSER_URL=http://127.0.0.1:4189 npm test
 * Set NEVORA_PLAYWRIGHT_MODULE to an installed Playwright index.mjs if needed.
 * No browser dependency is added to the packaged prototype.
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const url = process.env.NEVORA_FIXTURE_BROWSER_URL;
const evidence = process.env.NEVORA_FIXTURE_EVIDENCE_DIR || join(tmpdir(), 'nevora-native-fixture');
let browser;
if (url) {
  const parsed = new URL(url);
  assert.equal(parsed.protocol, 'http:');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname), 'Fixture checks are local only');
  assert.equal(parsed.username, '');
  assert.equal(parsed.password, '');
  const moduleName = process.env.NEVORA_PLAYWRIGHT_MODULE;
  const { chromium } = await import(moduleName ? pathToFileURL(moduleName).href : 'playwright');
  browser = await chromium.launch();
  await mkdir(evidence, { recursive: true });
}
after(async () => { await browser?.close(); });

for (const width of [320, 390, 768, 1440]) {
  test(`fictional fixture browser flows and larger text at ${width}px`, { skip: !url }, async () => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('h1').innerText(), 'Your next shift.');
      assert.equal(await page.locator('#runtime').innerText(), 'Web browser · not a native test');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: join(evidence, `fixture-${width}.png`), fullPage: true });

      await page.getByRole('button', { name: 'View sample shift' }).click();
      assert.equal(await page.locator('#shift-dialog').evaluate((dialog) => dialog.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#shift-dialog').evaluate((dialog) => dialog.open), false);
      assert.equal(await page.locator('#open-shift').evaluate((button) => document.activeElement === button), true);

      await page.getByRole('button', { name: 'Check keyboard and sheet' }).click();
      await page.getByLabel('Practice note').fill('Fictional keyboard check');
      await page.getByRole('button', { name: 'Finish keyboard check' }).click();
      assert.equal(await page.getByLabel('Practice note').inputValue(), '');
      assert.match(await page.locator('#keyboard-status').innerText(), /Nothing was saved/);
      await page.locator('#keyboard-dialog').getByRole('button', { name: 'Close', exact: true }).click();

      await page.getByRole('button', { name: 'Save sample marker', exact: true }).click();
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#sample-state').innerText(), 'Fictional marker is saved on this device.');
      await page.getByRole('button', { name: 'Clear marker', exact: true }).click();
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(await page.locator('#sample-state').innerText(), 'No fictional marker saved.');

      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.ok(await page.locator('.shift-body').evaluate((body) => body.clientWidth >= 160), 'Enlarged shift copy must reflow into readable lines');
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: join(evidence, `fixture-${width}-large-text.png`), fullPage: true });
      await page.getByRole('button', { name: 'Check keyboard and sheet' }).click();
      assert.equal(await page.locator('#keyboard-dialog').evaluate((dialog) => dialog.scrollWidth <= dialog.clientWidth), true);
      await page.screenshot({ path: join(evidence, `fixture-${width}-large-text-dialog.png`) });
      assert.deepEqual(errors, []);
    } finally {
      await context.close();
    }
  });
}
