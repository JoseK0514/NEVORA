import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { accessSync, constants, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertOwnedFixture, assertSourceUnchanged, assertSuitesPresent, BROWSER_SUITES, captureSource, ENGINES, externalEvidence, installTerminationHandlers, parseSuiteArguments, raceOwnedAbort, registerOwnedProcess, safeEnvironment, selectSuites, verifyBrowserExecutions, verifySourceManifest, WIDTHS } from './phase-e-owned.mjs';
import { safeBrowserFailure } from './release-browser-diagnostics.mjs';
import {navigationFetchDiagnostic,observeWindowExceptions,verifyNavigationFetchDiagnostic} from './browser-navigation-diagnostic.mjs';

const nativeErrorNames = new Set(['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'EvalError', 'URIError', 'AggregateError', 'AbortError', 'InvalidStateError', 'NetworkError', 'NotAllowedError', 'NotFoundError', 'NotSupportedError', 'OperationError', 'QuotaExceededError', 'SecurityError', 'TimeoutError', 'DataCloneError', 'EncodingError']);
const canonicalRuntimeMessages = new Set(['ResizeObserver loop completed with undelivered notifications.', 'ResizeObserver loop limit exceeded', 'Connection closed.']);
const runtimeRoutes = new Set(['/login', '/app', '/app/schedule', '/app/communications', '/app/calendar', '/app/settings']);
function readable(read) {
  try { return read(); } catch { return undefined; }
}
function nativeFetchResourceKind(message,page) {
  return readable(()=>{
    const failed=new URL('http:/'+message.slice(0,-' due to access control checks.'.length));
    if(failed.origin!==new URL(page.url()).origin)return null;
    const path=failed.pathname;
    if(path==='/api/company-access/operational-authority')return 'authority-read';
    if(path==='/__nextjs_original-stack-frames')return 'framework-diagnostic';
    if(path==='/api/notifications')return 'notification-read';
    if(path==='/api/employee/home')return 'home-read';
    if(path==='/api/manager/communications'||path.startsWith('/api/manager/communications/'))return 'manager-read';
    if(path==='/api/employee/communications'||path.startsWith('/api/employee/communications/'))return 'employee-read';
    if(path==='/api/employee/my-time')return 'recorded-time-read';
    if(runtimeRoutes.has(path)||path==='/app/updates/compose'||/^\/app\/updates\/[a-f0-9-]{36}$/.test(path))return 'route-read';
    return null;
  })??null;
}
function plainOwnNativeRead(message,page){
  return readable(()=>{const failed=new URL('http:/'+message.slice(0,-' due to access control checks.'.length));return failed.origin===new URL(page.url()).origin&&!failed.username&&!failed.password&&!failed.search&&!failed.hash;})===true;
}

/** Only exact static messages or a bounded React invariant prefix survive;
 * arbitrary suffixes, URLs, arguments and stacks must never be persisted. */
function originalRuntimeDiagnostic(name, message, page) {
  // Playwright splits bare strings at their first colon (including https:).
  // WebKit wraps rejected Errors once. These shapes are observations, not origin proof.
  const canonical = name === 'Unhandled Promise Rejection' && message.startsWith('Error: ') ? message.slice(7) : message;
  const split = typeof name === 'string' ? name.match(/^Minified React error #([1-9]\d{0,2}); visit https$/) : null;
  const invariant = canonical.match(/^Minified React error #([1-9]\d{0,2});/) ?? (split?.[0] === name ? split : null);
  const nativeFetch = name === 'Fetch API cannot load http' && message.length <= 8000
    && message.match(/^\/[^/\s][^\s]* due to access control checks\.$/)?.[0] === message;
  const route = readable(() => new URL(page.url()).pathname);
  return {
    nativeName: nativeErrorNames.has(name) ? name : 'Unknown',
    canonicalMessage: nativeFetch ? 'Fetch API cannot load resource due to access control checks.' : canonicalRuntimeMessages.has(canonical) ? canonical : invariant ? `Minified React error #${invariant[1]}` : null,
    reactInvariant: invariant ? Number(invariant[1]) : null,
    route: runtimeRoutes.has(route) ? route : null,
    resourceKind: nativeFetch ? nativeFetchResourceKind(message,page) : null,
    plainOwnRead:nativeFetch&&plainOwnNativeRead(message,page),
  };
}

/** Window exceptions and unproven native events remain fatal. */
export function observeBrowserCell(execution, errors, {navigationDiagnosticVerified=false}={}) {
  const start = errors.length;
  const classified=new WeakSet(),pages=new WeakMap();
  let phase = 'scenario', readStage = () => null, pageIndex = 0;
  const stages = new Set(['seed', 'compose', 'audience-change', 'full-review', 'native-focus', 'revision-conflict', 'unknown', 'layout', 'private-lifetime', 'withdraw', 'employee-team', 'replacement', 'login', 'confirmation', 'republish', 'response-loss', 'leave-and-revoke', 'unavailable-retry', 'empty', 'loading', 'canonical-communications', 'actions-overflow', 'keyboard', 'api', 'offline', 'late-home', 'late-time', 'route-leave', 'sql-source-failure', 'replaced-session', 'early-my-time-route', 'removal-review', 'last-shift-removal', 'complete-zero', 'communication-source-failure', 'axe-diagnostic']);
  return {
    setStageReader(reader) { readStage = reader; },
    setPhase(value) { assert(['scenario', 'axe', 'context-close'].includes(value)); phase = value; },
    observeContext(context, role) {
      assert(['primary', 'manager'].includes(role));
      context.on('page', page => {
        const index = pageIndex++;
        const state={index,role,pending:null};pages.set(page,state);
        page.on('request',request=>{if(readable(()=>request.isNavigationRequest()&&request.frame()===page.mainFrame())){state.pending=readable(()=>new URL(request.url()).origin===new URL(page.url()).origin)?request:null;}});
        page.on('framenavigated',frame=>{if(readable(()=>frame===page.mainFrame()))state.pending=null;});
        page.on('requestfailed',request=>{if(state.pending===request)state.pending=null;});
        page.on('pageerror', error => {
          const originalMessage = readable(() => error?.message), name = readable(() => error?.name);
          const message = typeof originalMessage === 'string' ? originalMessage : '';
          const diagnostic = originalRuntimeDiagnostic(name, message, page);
          const summary = diagnostic.canonicalMessage === 'Fetch API cannot load resource due to access control checks.' || /load failed|failed to fetch|networkerror|network request failed/i.test(message) ? 'Network load failure'
            : /abort|cancelled|canceled/i.test(message) ? 'Operation aborted'
              : /chunkloaderror|loading chunk/i.test(message) ? 'Module load failure'
                : 'Unclassified page runtime error';
          const stage = readable(readStage);
          if(navigationFetchDiagnostic(execution,diagnostic,!!state.pending,navigationDiagnosticVerified,phase)){
            classified.add(error);execution.navigationDiagnostics??=[];
            execution.navigationDiagnostics.push({type:'navigation-fetch-diagnostic',role,pageIndex:index,phase,diagnostic,pendingMainFrameNavigation:true,stage:stages.has(stage)?stage:null});return;
          }
          errors.push({ type: 'page-runtime-error', role, pageIndex: index, phase, diagnostic,
            failure: safeBrowserFailure({ name, message: summary }, execution, { stage: stages.has(stage) ? stage : null }) });
        });
      });
      if(navigationDiagnosticVerified)return observeWindowExceptions(context,(page,kind)=>{const state=pages.get(page);errors.push({type:'window-javascript-error',kind,role:state?.role??role,pageIndex:state?.index??null,phase});});
    },
    isNavigationDiagnostic(error) {return classified.has(error);},
    assertClean() { assert.equal(errors.length, start, 'Browser runtime/network errors recorded in current cell'); },
  };
}

/** Progress is an allowlist: never serialize scenario payloads, actors or URLs. */
export function browserCellProgress(cell, event, started, now, completed, total) {
  const {suite,engine,width}=cell;
  assert(Object.hasOwn(BROWSER_SUITES,suite)&&ENGINES.includes(engine)&&WIDTHS.includes(width));
  assert(['start','passed','failed'].includes(event));
  assert([started,now,completed,total].every(Number.isSafeInteger)&&started>=0&&now>=started&&completed>=0&&total>0&&total<=70&&completed<=total);
  return {suite,engine,width,event,startedAt:new Date(started).toISOString(),at:new Date(now).toISOString(),durationMs:now-started,completed,total};
}

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
  const progress=[];
  const emitProgress=(cell,event,started)=>{
    const entry=browserCellProgress(cell,event,started,Date.now(),report.executions.filter(item=>item.status==='passed').length,ENGINES.length*modules.length*WIDTHS.length);
    progress.push(entry);
    writeFileSync(join(evidence,'browser-progress-report.json'),JSON.stringify({checkpoint:custody.checkpoint,events:progress},null,2));
    console.log('[Phase E progress] '+JSON.stringify(entry));
  };
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
        let navigationDiagnosticVerified=false;
        if(engine==='webkit'){const probe=await raceOwnedAbort(verifyNavigationFetchDiagnostic(browser),controller.signal);report.navigationDiagnosticProbe=probe;navigationDiagnosticVerified=probe.verified;}
        for (const [item, runScenario] of modules) for (const width of WIDTHS) {
          controller.signal.throwIfAborted();
          const record = { suite: item, engine, width, status: 'failed', checks: [] }; report.executions.push(record);
          const runtimeErrors = observeBrowserCell(record, report.errors,{navigationDiagnosticVerified});
          const started=Date.now();emitProgress(record,'start',started);
          let context;
          try {
            context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width < 768, isMobile: width < 768, serviceWorkers: 'block' });
            try {
            await context.route('**/*', route => {
              const target = new URL(route.request().url());
              if (['http:', 'https:'].includes(target.protocol) && target.origin !== app.url) {
                report.errors.push(`${item} ${engine} ${width}: external request refused`); return route.abort();
              }
              return route.continue();
            });
            await runtimeErrors.observeContext(context, 'primary');
            const page = await context.newPage(); page.setDefaultTimeout(15_000);
            const result = await raceOwnedAbort(runScenario({ app, browser, context, page, engine, width, evidenceDirectory: evidence, axeFile, runtimeErrors }), controller.signal);
            if (!result || !Array.isArray(result.checks) || !result.checks.length || result.checks.some(check => typeof check !== 'string' || !check.trim())) throw Error('Missing executed browser cases: ' + item);
            if (new URL(page.url()).origin !== app.url) throw Error('Browser scenario did not exercise the owned application: ' + item);
            runtimeErrors.setPhase('axe');
            await page.addScriptTag({ path: axeFile });
            const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } })).violations.map(item => item.id));
            assert.deepEqual(violations, [], `${item} ${engine} ${width}: accessibility violations`);
            record.checks = [...result.checks, 'axe WCAG A/AA check'];
            } finally { runtimeErrors.setPhase('context-close'); await context.close(); }
            runtimeErrors.assertClean();
            assertOwnedFixture(); verifySourceManifest(source, app.root, custody.checkpoint); assertSourceUnchanged(source, custody);
            record.status = 'passed';
          } finally { emitProgress(record,record.status,started); }
        }
      } finally { await browser.close(); await server.close(); servers.delete(server); }
    }
    verifyBrowserExecutions(report.executions, suites);
    assert.equal(report.errors.length, 0, 'Browser runtime/network errors recorded');
    report.status = 'passed';
  } catch (error) {
    // Error stacks/URLs could contain raw calendar capabilities; retain only a
    // safe summary here. The suite owner records scrubbed case detail separately.
    report.errors.push('Required browser execution failed');
    console.error('Phase E browser execution failed; see the owned report');
    process.exitCode = 1;
    // Select only scrubbed stage/location fields from existing scenario detail.
    // Never copy its arbitrary payload, HTML, actor, URLs or error stack.
    const execution = report.executions.at(-1);
    let scenario;
    const prefixes = { home: 'home-task11', communications: 'updates' };
    if (execution && Object.hasOwn(prefixes, execution.suite)) {
      try {
        const detail = JSON.parse(readFileSync(join(evidence, `${prefixes[execution.suite]}-${execution.engine}-${execution.width}-failure.json`), 'utf8'));
        scenario = { stage: detail.failedStage, location: detail.failure?.location };
      } catch { /* A missing per-case receipt must not hide the original failure. */ }
    }
    try {
      writeFileSync(join(evidence, 'browser-failure-report.json'), JSON.stringify({
        checkpoint: custody.checkpoint, tree: custody.tree, sourceClean: custody.sourceClean,
        status: 'failed', failure: safeBrowserFailure(error, execution, scenario),
        runtimeErrors: report.errors.filter(item => typeof item === 'object' && item.type === 'page-runtime-error'),
      }, null, 2));
    } catch { report.errors.push('Scrubbed browser diagnostic receipt unavailable'); }
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
