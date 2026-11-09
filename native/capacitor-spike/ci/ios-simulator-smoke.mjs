import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

assert.equal(process.platform, 'darwin', 'iOS simulator smoke requires macOS');
const output = 'artifacts/ios-simulator';
mkdirSync(output, { recursive: true });
const run = (args, timeout = 120000) => execFileSync('xcrun', ['simctl', ...args], { encoding: 'utf8', timeout });
const available = JSON.parse(run(['list', 'devices', 'available', '--json']));
const candidates = Object.entries(available.devices)
  .filter(([runtime]) => runtime.includes('.iOS-'))
  .sort(([a], [b]) => b.localeCompare(a, undefined, { numeric: true }))
  .flatMap(([runtime, devices]) => devices.filter(device => device.isAvailable && device.name.startsWith('iPhone')).map(device => ({ ...device, runtime })));
const device = candidates[0];
assert.ok(device, 'Runner has no available iPhone simulator');
const app = resolve('artifacts/ios-derived/Build/Products/Debug-iphonesimulator/App.app');
assert.ok(existsSync(app), 'Unsigned simulator build is missing');
const evidence = { candidate: process.env.EXPECTED_SHA, device: { name: device.name, udid: device.udid, runtime: device.runtime }, scope: 'Packaged fixture install, process launch and screenshot only; not WebView interaction, authentication, passkey or accessibility verification' };

try {
  if (device.state !== 'Booted') run(['boot', device.udid]);
  run(['bootstatus', device.udid, '-b'], 300000);
  run(['install', device.udid, app]);
  const launch = run(['launch', '--terminate-running-process', device.udid, 'com.nevora.spike']);
  const match = launch.match(/com\.nevora\.spike:\s*(\d+)/);
  assert.ok(match, `No launched process ID returned: ${launch}`);
  evidence.pid = Number(match[1]);
  await new Promise(resolve => setTimeout(resolve, 4000));
  process.kill(evidence.pid, 0);
  run(['io', device.udid, 'screenshot', `${output}/launch.png`]);
  evidence.status = 'passed';
  evidence.launch = launch.trim();
  console.log(`iOS simulator installed and launched the packaged fixture on ${device.name}`);
} catch (error) {
  evidence.status = 'failed';
  evidence.error = String(error);
  try { run(['io', device.udid, 'screenshot', `${output}/failure.png`], 30000); } catch {}
  throw error;
} finally {
  writeFileSync(`${output}/result.json`, JSON.stringify(evidence, null, 2) + '\n');
  try { run(['shutdown', device.udid], 30000); } catch {}
}
