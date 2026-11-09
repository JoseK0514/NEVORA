/** Explicit opt-in check against an already installed fictional prototype.
 * Requires a running emulator, adb server and external Playwright installation.
 * Never installs on or selects a device implicitly.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const serial = process.env.NEVORA_ANDROID_SERIAL;
const modulePath = process.env.NEVORA_PLAYWRIGHT_MODULE;
assert.ok(serial?.startsWith('emulator-'), 'Set NEVORA_ANDROID_SERIAL to the owned test emulator');
assert.ok(modulePath, 'Set NEVORA_PLAYWRIGHT_MODULE to Playwright index.mjs');
const { _android } = await import(pathToFileURL(modulePath).href);
const devices = await _android.devices();
const device = devices.find(item => item.serial() === serial);
assert.ok(device, 'Requested emulator is not connected');
device.setDefaultTimeout(45000);
const output = 'artifacts/android-device';
await mkdir(output, { recursive: true });
const checks = [];

async function openFixture() {
  await device.shell('am start -n com.nevora.spike/.MainActivity');
  const webview = await device.webView({ pkg: 'com.nevora.spike' });
  const page = await webview.page();
  await page.locator('#runtime').filter({ hasText: 'Android · Capacitor' }).waitFor();
  return page;
}

try {
  let page = await openFixture();
  checks.push('Installed packaged fixture loaded in Android WebView');
  await page.screenshot({ path: `${output}/webview.png`, fullPage: true });
  await writeFile(`${output}/device.png`, await device.screenshot());

  await page.getByRole('button', { name: 'View sample shift' }).click();
  assert.ok(await page.locator('#shift-dialog').evaluate(dialog => dialog.open));
  await device.shell('input keyevent 4');
  await page.waitForFunction(() => !document.querySelector('#shift-dialog').open);
  checks.push('Android Back closed the sample dialog');

  await page.getByRole('button', { name: 'Save sample marker', exact: true }).click();
  await device.shell('am force-stop com.nevora.spike');
  page = await openFixture();
  assert.match(await page.locator('#sample-state').innerText(), /marker is saved/);
  await page.getByRole('button', { name: 'Clear marker', exact: true }).click();
  checks.push('Fictional marker survived process restart and was cleared (not auth)');

  await device.shell('input keyevent 4');
  // Backgrounded WebViews may stop animation frames before the first poll.
  await page.waitForFunction(() => document.visibilityState === 'hidden', undefined, { polling: 100, timeout: 15000 });
  checks.push('Android Back at the fixture root minimized the app');
  await writeFile(`${output}/result.json`, JSON.stringify({ status: 'passed', serial, checks, scope: 'Packaged fictional fixture only; no real sign-in, passkeys or service-worker claim' }, null, 2));
  console.log(JSON.stringify({ status: 'passed', checks }));
} catch (error) {
  await writeFile(`${output}/result.json`, JSON.stringify({ status: 'failed', serial, checks, error: String(error) }, null, 2));
  throw error;
} finally {
  for (const connected of devices) await connected.close();
}
