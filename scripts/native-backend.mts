import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {spawn} from 'node:child_process';
import {openSync, closeSync, statfsSync} from 'node:fs';
import {join, isAbsolute} from 'node:path';
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app';
import {seedOwnedApp, seedOwnedScenario, assignOwnedManagerCompanyAccess} from '../src/test/integration/owned-app-fixture';
import {verifyNativeBackend, type NativeCheck} from '../src/test/integration/native-shell.integration';
import {createOwnedSmtp} from '../src/test/integration/owned-smtp';
import {createNativeDeviceControl} from '../src/test/integration/native-device-control';
import {registerOwnedProcess, captureSource, assertSourceUnchanged, safeEnvironment} from './phase-e-owned.mjs';

const root = process.env.NEVORA_NATIVE_OWNED_ROOT, ownerId = process.env.PHASE_E_OWNER_ID;
assert(root && isAbsolute(root) && ownerId && /^[a-f0-9]{32}$/.test(ownerId));
assert.equal(await readFile(join(root, 'native-owner'), 'utf8'), ownerId);
const custody = captureSource(process.cwd(), process.env.NEVORA_NATIVE_EXPECTED_SHA);
const report = {ownerId, checkpoint: custody.checkpoint, platform: process.env.NEVORA_NATIVE_PLATFORM, status: 'failed', checks: [] as NativeCheck[], devices: [] as unknown[], ownershipClosed: false, error: undefined as string | undefined};
const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const playwright = runtime('playwright');
assert.equal(runtime('playwright/package.json').version, '1.62.1');
let app: Awaited<ReturnType<typeof createOwnedNextApp>> | undefined;
let server: Awaited<ReturnType<typeof playwright.chromium.launchServer>> | undefined;
let control: Awaited<ReturnType<typeof createNativeDeviceControl>> | undefined;
const smtp = await createOwnedSmtp();
async function runDevice(platform: 'ios' | 'android') {
  assert(app && control);
  const space = statfsSync(root!); assert(space.bavail * space.bsize >= 2 * 1024 ** 3, 'At least 2 GiB free is required before a native device run');
  const args = [`native/${platform}/test-ui.py`, '--mode', 'owned-backend', '--backend-origin', app.url,
    '--backend-control-origin', control.origin, '--backend-owner', ownerId!, '--expected-sha', custody.checkpoint, '--evidence-root', root!,
    ...(platform === 'android' ? ['--serial', process.env.NEVORA_NATIVE_ANDROID_SERIAL!] : ['--simulator', process.env.NEVORA_NATIVE_IOS_SIMULATOR!])];
  const fd = openSync(join(root!, platform + '-driver.log'), 'w', 0o600);
  try {
    await new Promise<void>((ready, reject) => {
      const child = spawn('python3', args, {env: {...safeEnvironment(), ANDROID_HOME: process.env.ANDROID_HOME ?? '', NEVORA_OWNED_PROCESS_OWNER: ownerId!, ...(process.env.JAVA_HOME ? {JAVA_HOME: process.env.JAVA_HOME} : {})}, stdio: ['ignore', fd, fd]});
      child.once('error',reject); child.once('exit',code => code === 0 ? ready() : reject(Error(platform + ' full-backend SDK checks failed; see driver log')));
    });
  } finally { closeSync(fd); }
  const prefix = platform === 'android' ? 'nevora-native-android-' : 'nevora-native-ui-';
  const entries = (await readdir(root!)).filter(name => name.startsWith(prefix)); assert.equal(entries.length,1);
  const result = JSON.parse(await readFile(join(root!,entries[0],'result.json'),'utf8'));
  assert.equal(result.passed,true); assert.equal(result.fixtureOnly,false); assert.equal(result.checkpoint,custody.checkpoint);
  assert.equal(result.ownerId,ownerId); assert.equal(result.origin,app.url); assert.equal(result.instrumentationTests,2);
  if (platform === 'android') { assert.equal(result.serial,process.env.NEVORA_NATIVE_ANDROID_SERIAL); assert.equal(result.coldProcessRestart,true); }
  else assert.equal(result.simulator,process.env.NEVORA_NATIVE_IOS_SIMULATOR);
  report.devices.push(result); report.checks.push({name: platform + '-full-backend',status: 'passed'});
}
try {
  app = await createOwnedNextApp(root, {mobileAccessEnabled: true, invitationSmtpPort: smtp.port, processOwnerId: ownerId,
    onProcessStarted: async child => { assert(child.pid); await registerOwnedProcess({kind: 'next', pid: child.pid, ownerId}); },
    initializeDatabase: async ({executor}) => {
      await seedOwnedApp(executor); await seedOwnedScenario(executor, 'NATIVE', 0);
      await executor.query({text: "UPDATE employees SET role=CASE id WHEN 'QA-NATIVE-A' THEN 'EMPLOYEE' WHEN 'QA-NATIVE-B' THEN 'MANAGER' ELSE role END WHERE id IN ('QA-NATIVE-A','QA-NATIVE-B')", values: []});
      await assignOwnedManagerCompanyAccess(executor, 'QA-NATIVE-B');
      await executor.query({text: "INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES('QA-NATIVE-JOIN','Fictional','Activation','native-join@example.invalid','555-0101','EMPLOYEE','loc-1')", values: []});
    }});
  console.log('Owned Next ready', app.url);
  server = await playwright.chromium.launchServer({headless: true, env: {...safeEnvironment(), NEVORA_OWNED_PROCESS_OWNER: ownerId}, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false});
  await registerOwnedProcess({kind: 'browser-chromium', pid: server.process().pid, ownerId});
  const browser = await playwright.chromium.connect(server.wsEndpoint());
  await verifyNativeBackend(app, browser, report.checks, smtp);
  if (process.env.NEVORA_NATIVE_PLATFORM !== 'contract') {
    control = await createNativeDeviceControl(app.database.executor,ownerId);
    // Device stores and large SDK outputs are deliberately exercised serially.
    if (['android','all'].includes(process.env.NEVORA_NATIVE_PLATFORM!)) await runDevice('android');
    if (['ios','all'].includes(process.env.NEVORA_NATIVE_PLATFORM!)) await runDevice('ios');
  }
  report.status = 'passed';
} catch (error) { report.error = error instanceof Error ? error.stack : String(error); console.error(report.error); }
finally {
  const failures: unknown[] = [];
  for (const close of [() => control?.close(), () => server?.close(), () => app?.close(), () => smtp.close()]) {
    try { await close(); } catch (error) { failures.push(error); }
  }
  try { assertSourceUnchanged(process.cwd(), custody); } catch (error) { failures.push(error); }
  if (failures.length) { report.status = 'failed'; report.error = [report.error, ...failures.map(String)].filter(Boolean).join('\n'); }
  else report.ownershipClosed = true;
  await writeFile(join(root, 'backend-results.json'), JSON.stringify(report, null, 2), {mode: 0o600});
}
process.exitCode = report.status === 'passed' ? 0 : 1;
