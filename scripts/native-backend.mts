import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join, isAbsolute} from 'node:path';
import {readFile, writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from '../src/test/integration/owned-next-app';
import {seedOwnedApp, seedOwnedScenario, assignOwnedManagerCompanyAccess} from '../src/test/integration/owned-app-fixture';
import {verifyNativeBackend, type NativeCheck} from '../src/test/integration/native-shell.integration';
import {registerOwnedProcess, captureSource, assertSourceUnchanged, safeEnvironment} from './phase-e-owned.mjs';

const root = process.env.NEVORA_NATIVE_OWNED_ROOT, ownerId = process.env.PHASE_E_OWNER_ID;
assert(root && isAbsolute(root) && ownerId && /^[a-f0-9]{32}$/.test(ownerId));
assert.equal(await readFile(join(root, 'native-owner'), 'utf8'), ownerId);
const custody = captureSource(process.cwd(), process.env.NEVORA_NATIVE_EXPECTED_SHA);
const report = {ownerId, checkpoint: custody.checkpoint, status: 'failed', checks: [] as NativeCheck[], ownershipClosed: false, error: undefined as string | undefined};
const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const playwright = runtime('playwright');
assert.equal(runtime('playwright/package.json').version, '1.62.1');
let app: Awaited<ReturnType<typeof createOwnedNextApp>> | undefined;
let server: Awaited<ReturnType<typeof playwright.chromium.launchServer>> | undefined;
try {
  app = await createOwnedNextApp(root, {mobileAccessEnabled: true, processOwnerId: ownerId,
    onProcessStarted: async child => registerOwnedProcess({kind: 'next', pid: child.pid, ownerId}),
    initializeDatabase: async ({executor}) => {
      await seedOwnedApp(executor); await seedOwnedScenario(executor, 'NATIVE', 0);
      await executor.query({text: "UPDATE employees SET role=CASE id WHEN 'QA-NATIVE-A' THEN 'EMPLOYEE' WHEN 'QA-NATIVE-B' THEN 'MANAGER' ELSE role END WHERE id IN ('QA-NATIVE-A','QA-NATIVE-B')", values: []});
      await assignOwnedManagerCompanyAccess(executor, 'QA-NATIVE-B');
    }});
  console.log('Owned Next ready', app.url);
  server = await playwright.chromium.launchServer({headless: true, env: {...safeEnvironment(), NEVORA_OWNED_PROCESS_OWNER: ownerId}, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false});
  await registerOwnedProcess({kind: 'browser-chromium', pid: server.process().pid, ownerId});
  const browser = await playwright.chromium.connect(server.wsEndpoint());
  await verifyNativeBackend(app, browser, report.checks);
  if (process.env.NEVORA_NATIVE_PLATFORM !== 'contract') throw Error('Full-backend native device driver not yet installed');
  report.status = 'passed';
} catch (error) { report.error = error instanceof Error ? error.stack : String(error); console.error(report.error); }
finally {
  try { await server?.close(); await app?.close(); assertSourceUnchanged(process.cwd(), custody); report.ownershipClosed = true; }
  catch (error) { report.status = 'failed'; report.error = String(error); }
  await writeFile(join(root, 'backend-results.json'), JSON.stringify(report, null, 2), {mode: 0o600});
}
process.exitCode = report.status === 'passed' ? 0 : 1;
