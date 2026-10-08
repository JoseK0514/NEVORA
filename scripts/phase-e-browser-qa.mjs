import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { accessSync, constants, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertOwnedFixture, assertSourceUnchanged, assertSuitesPresent, BROWSER_SUITES, captureSource, ENGINES, externalEvidence, installTerminationHandlers, parseSuiteArguments, raceOwnedAbort, registerOwnedProcess, safeEnvironment, selectSuites, verifyBrowserExecutions, verifySourceManifest, WIDTHS } from './phase-e-owned.mjs';

/** Darwin's pinned wrapper launches a child whose marker macOS can inspect;
 * launch that exact packaged binary directly, with the wrapper's two DYLD vars.
 * This keeps the strict marked-root supervisor unchanged. */
export function darwinWebKitLaunch(engine, wrapper, revisions, platform=process.platform) {
  if (engine !== 'webkit' || platform !== 'darwin') return {};
  const directory=dirname(wrapper),executablePath=join(directory,'Playwright.app/Contents/MacOS/Playwright');
  assert.equal(basename(wrapper),'pw_run.sh','Expected pinned WebKit wrapper');
  assert(revisions.some(revision=>/^\d+$/.test(revision)&&basename(directory)==='webkit-'+revision),'Expected pinned WebKit revision layout');
  assert(statSync(wrapper).isFile()&&statSync(executablePath).isFile(),'Expected packaged WebKit files');
  accessSync(executablePath,constants.X_OK);
  const wrapperSource=readFileSync(wrapper,'utf8');
  assert(wrapperSource.includes('DYLD_FRAMEWORK_PATH="$DYLIB_PATH" DYLD_LIBRARY_PATH="$DYLIB_PATH" "$PLAYWRIGHT" "$@"'),'Unexpected pinned WebKit launcher environment');
  return {executablePath,environment:{DYLD_FRAMEWORK_PATH:directory,DYLD_LIBRARY_PATH:directory},identity:{executablePath,binaryHash:createHash('sha256').update(readFileSync(executablePath)).digest('hex'),wrapperHash:createHash('sha256').update(wrapperSource).digest('hex')}};
}

/**
 * Each owning module exports async runScenario({ app, browser, context, page,
 * engine, width, evidenceDirectory, axeFile }). app is createOwnedNextApp's real
 * Next/SQL fixture; the context/page already have external-network and page-error
 * guards. Return { checks: [nonempty descriptions of actually exercised cases] }.
 * The controller calls every suite once for each required engine/width, runs axe
 * on the resulting owned page, closes each context, validates the source mirror
 * and records only executed cases. A module must scrub capability secrets before
 * saving its own screenshots/receipts. The existing owned-next-app.ts helper
 * writes Next stdout into next.log; E3.3 must prevent capability URL logging and
 * prove a sentinel credential absent from request/error/Next logs before any
 * raw calendar capability browser flow uses this helper. Physical devices, assistive technology and
 * actual calendar clients are separately required evidence, not these checks.
 */
async function main() {
  // Runs before importing Next/PG/Playwright or selecting any external runtime.
  const owner = assertOwnedFixture();
  const suite = parseSuiteArguments(process.argv.slice(2)), suites = selectSuites('browser', suite), source = resolve(process.cwd());
  assert.equal(owner.mode, 'browser', 'Browser fixture mode mismatch');
  assert.deepEqual(suites, owner.suites, 'Browser suite ownership mismatch');
  const custody = captureSource(source, process.env.PHASE_E_EXPECTED_SHA), evidence = externalEvidence(source, process.env.PHASE_E_EVIDENCE_DIR);
  assertSuitesPresent(source, 'browser', suites);
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
  assert.equal(runtime('playwright/package.json').version, '1.62.1', 'Select the existing approved pinned Playwright runtime');
  const axeFile = process.env.NEVORA_AXE_RUNTIME_FILE ?? runtime.resolve('axe-core/axe.min.js');
  if (!existsSync(axeFile)) throw Error('Select the existing approved pinned axe runtime');
  assert.equal(JSON.parse(readFileSync(join(dirname(axeFile), 'package.json'), 'utf8')).version, '4.11.0', 'Select the existing approved pinned axe runtime');
  const playwright = runtime('playwright');
  const webkitPackage=JSON.parse(readFileSync(join(dirname(runtime.resolve('playwright-core/package.json')),'browsers.json'),'utf8')).browsers.find(browser=>browser.name==='webkit');
  const webkitRevisions=[webkitPackage.revision,...Object.entries(webkitPackage.revisionOverrides??{}).filter(([platform])=>platform.startsWith('mac')).map(([,revision])=>revision)];
  const modules = [];
  for (const item of suites) {
    const scenarioModule = await import(pathToFileURL(join(source, BROWSER_SUITES[item])).href);
    if (typeof scenarioModule.runScenario !== 'function') throw Error('Required browser module must export runScenario: ' + item);
    modules.push([item, scenarioModule.runScenario]);
  }
  const { createOwnedNextApp } = await import('../src/test/integration/owned-next-app.ts');
  const { seedOwnedApp } = await import('../src/test/integration/owned-app-fixture.ts');
  const report = { checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: true, ownerId: owner.ownerId, ownershipFile: process.env.PHASE_E_OWNERSHIP_FILE, ownershipClosed: false, suites, status: 'failed', executions: [], errors: [], runtime: { playwright: '1.62.1', axe: '4.11.0' }, launches: [], sourceManifest: undefined, limitations: ['Owned local Next/SQL mirror is not hosted verification.', 'Chromium/WebKit automation is not physical-device, screen-reader or actual-calendar-client acceptance.'] };
  const controller = new AbortController(), servers = new Set();
  const removeSignals = installTerminationHandlers(() => controller.abort(Error('Owned browser termination signal')));
  let app;
  try {
    // Setup observes abort itself and awaits its owned teardown before rejecting.
    app = await createOwnedNextApp(evidence, { pinDevTypeReferences: true, signal: controller.signal, processOwnerId: owner.ownerId, onProcessStarted: async child => registerOwnedProcess({ kind: 'next', pid: child.pid, ownerId: owner.ownerId }) });
    report.sourceManifest = join(app.root, 'source-manifest.json'); report.appRoot = app.root;
    report.appOwnerId = JSON.parse(readFileSync(join(app.root, 'ownership.json'), 'utf8')).ownerId;
    verifySourceManifest(source, app.root, custody.checkpoint);
    await seedOwnedApp(app.database.executor);
    for (const engine of ENGINES) {
      controller.signal.throwIfAborted();
      const launch = (async () => {
        const launchOptions=darwinWebKitLaunch(engine,playwright[engine].executablePath(),webkitRevisions);
        report.launches.push({engine,...launchOptions.identity});
        const server = await playwright[engine].launchServer({ headless: true, ...(launchOptions.executablePath?{executablePath:launchOptions.executablePath}:{}), env: { ...safeEnvironment(), ...launchOptions.environment, NEVORA_OWNED_PROCESS_OWNER: owner.ownerId }, handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
        servers.add(server);
        await registerOwnedProcess({ kind: 'browser-' + engine, pid: server.process().pid, ownerId: owner.ownerId });
        if (controller.signal.aborted) { await server.close(); servers.delete(server); controller.signal.throwIfAborted(); }
        return server;
      })();
      const server = await raceOwnedAbort(launch, controller.signal);
      const browser = await raceOwnedAbort(playwright[engine].connect(server.wsEndpoint(), { timeout: 15_000 }), controller.signal);
      try {
        for (const [item, runScenario] of modules) for (const width of WIDTHS) {
          controller.signal.throwIfAborted();
          const record = { suite: item, engine, width, status: 'failed', checks: [] }; report.executions.push(record);
          const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 768, isMobile: width < 768, serviceWorkers: 'block' });
          try {
            await context.route('**/*', route => {
              const target = new URL(route.request().url());
              if (['http:', 'https:'].includes(target.protocol) && target.origin !== app.url) {
                report.errors.push(`${item} ${engine} ${width}: external request refused`); return route.abort();
              }
              return route.continue();
            });
            context.on('page', page => page.on('pageerror', () => report.errors.push(`${item} ${engine} ${width}: page runtime error`)));
            const page = await context.newPage(); page.setDefaultTimeout(15_000);
            const result = await raceOwnedAbort(runScenario({ app, browser, context, page, engine, width, evidenceDirectory: evidence, axeFile }), controller.signal);
            if (!result || !Array.isArray(result.checks) || !result.checks.length || result.checks.some(check => typeof check !== 'string' || !check.trim())) throw Error('Missing executed browser cases: ' + item);
            if (new URL(page.url()).origin !== app.url) throw Error('Browser scenario did not exercise the owned application: ' + item);
            await page.addScriptTag({ path: axeFile });
            const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => item.id));
            assert.deepEqual(violations, [], `${item} ${engine} ${width}: accessibility violations`);
            record.checks = [...result.checks, 'axe WCAG A/AA check']; record.status = 'passed';
          } finally { await context.close(); }
          assertOwnedFixture(); verifySourceManifest(source, app.root, custody.checkpoint); assertSourceUnchanged(source, custody);
        }
      } finally { await browser.close(); await server.close(); servers.delete(server); }
    }
    verifyBrowserExecutions(report.executions, suites);
    assert.equal(report.errors.length, 0, 'Browser runtime/network errors recorded');
    report.status = 'passed';
  } catch {
    // Error stacks/URLs could contain raw calendar capabilities; retain only a
    // safe summary here. The suite owner records scrubbed case detail separately.
    report.errors.push('Required browser execution failed');
    console.error('Phase E browser execution failed; see the owned report');
    process.exitCode = 1;
  } finally {
    const failedTeardown = () => { report.errors.push('Source or ownership teardown validation failed'); report.status = 'failed'; process.exitCode = 1; };
    if (controller.signal.aborted) { report.errors.push('Owned browser termination signal'); report.status = 'failed'; process.exitCode = 1; }
    const closedServers = await Promise.allSettled([...servers].map(server => server.close()));
    if (closedServers.some(result => result.status === 'rejected')) failedTeardown();
    if (app) {
      try { verifySourceManifest(source, app.root, custody.checkpoint); } catch { failedTeardown(); }
      // Source failure does not prevent stopping processes we still demonstrably own.
      try {
        await app.close();
        const closed = JSON.parse(readFileSync(join(app.root, 'ownership.json'), 'utf8'));
        if (closed.closed !== true) throw Error('Owned Next teardown not confirmed');
        report.ownershipClosed = true;
      } catch { failedTeardown(); }
    }
    try { assertOwnedFixture(); assertSourceUnchanged(source, custody); } catch { failedTeardown(); }
    writeFileSync(join(evidence, 'browser-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ checkpoint: report.checkpoint, executions: report.executions.length, status: report.status, errors: report.errors.length }));
    removeSignals();
    if (controller.signal.aborted) process.exit(1);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
