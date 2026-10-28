import { assertPilotLedger, validatePilot, PILOT, type OwnerAdvisorPilot } from './owner-advisor-pilot.mjs';
import { createECDH,createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { constants, cpSync, createWriteStream } from 'node:fs';
import { access, copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, statfs, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import {pathToFileURL} from 'node:url';
import { createDisposableExchangeDatabase } from './local-postgres';
import {createOwnedPgTransport,type OwnedDatabaseIdentity} from './owned-pg-transport';
import type {SqlExecutor} from '../../lib/notifications/types';
import {createCalendarLogRedactor} from './calendar-log-redaction';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
const applicationInput = (name: string) => ['src/', 'public/'].some(prefix => name.startsWith(prefix)) || ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts'].includes(name);
export function copyOwnedDependencies(source: string, mirror: string): void {
  // An external cp can be observed between fork and exec as the parent's Node
  // argv. Copy in-process instead of relaxing the supervisor's identity fence.
  cpSync(join(source, 'node_modules'), join(mirror, 'node_modules'), {
    recursive: true, verbatimSymlinks: true, mode: constants.COPYFILE_FICLONE,
  });
}
function trackedApplicationFiles(source: string): string[] {
  const gitPaths = (args: string[]) => execFileSync('git', args, { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean);
  if (gitPaths(['ls-files', '-o', '--exclude-standard', '-z']).some(applicationInput)) throw Error('Untracked application source cannot produce exact-SHA evidence');
  if (gitPaths(['diff', '--name-only', 'HEAD', '-z']).some(applicationInput)) throw Error('Tracked application source differs from HEAD');
  return gitPaths(['ls-files', '-c', '-z']).filter(applicationInput).sort();
}
/** The sole approved scratch DB substitution, derived from the original source. */
export function createOwnedDbAdapter(originalDb: string): string {
  const queryRows = originalDb.slice(originalDb.indexOf('export function queryRows'));
  if (!queryRows.startsWith('export function queryRows')) throw new Error('Unexpected production DB contract');
  return `import { createOwnedPgTransport } from '../test/integration/owned-pg-transport';\nimport { ownedAppBarriers } from '../test/integration/owned-app-barriers';\nlet sql: ReturnType<typeof createOwnedPgTransport> | undefined;\nexport function getDb() {\n if (!sql) {\n  const url=process.env.NEVORA_OWNED_APP_DATABASE;\n  const identity=process.env.NEVORA_OWNED_APP_IDENTITY;\n  const directory=process.env.NEVORA_OWNED_APP_BARRIERS;\n  if(!url||!identity||!directory) throw new Error('Owned application test setup missing');\n  sql=createOwnedPgTransport(url,JSON.parse(identity),ownedAppBarriers(directory));\n }\n return sql;\n}\n${queryRows}`;
}
/** E's exact generated-only dev change; preserve the complete source file. */
export function createOwnedDevTypeReferences(original: string): string {
  let derived = original;
  for (const name of ['routes.d.ts', 'root-params.d.ts']) {
    const production = `import "./.next/types/${name}";`;
    if (original.split(`./.next/types/${name}`).length !== 2 || original.split(/\r?\n/).filter(line => line === production).length !== 1) throw Error('Unexpected source-pinned Next type imports');
    derived = derived.replace(production, `import "./.next/dev/types/${name}";`);
  }
  return derived;
}
async function availablePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((ready, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', ready); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No loopback port');
  await new Promise<void>((ready, reject) => server.close(error => error ? reject(error) : ready()));
  return address.port;
}
async function stopOwnedProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  const wait = new Promise<void>(resolve => child.once('exit', () => resolve()));
  const signal = (kind: NodeJS.Signals) => {
    try { process.kill(process.platform === 'win32' ? child.pid! : -child.pid!, kind); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error; }
  };
  signal('SIGTERM');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([wait, new Promise<void>(resolve => { timer = setTimeout(resolve, 5000); })]); }
  finally { if (timer) clearTimeout(timer); }
  if (child.exitCode === null && child.signalCode === null) { signal('SIGKILL'); await wait; }
}

/** Resolve the nearest existing parent, including symlinked ancestors. */
async function canonicalDestination(path:string):Promise<string>{
 try {return await realpath(path);}
 catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;return join(await canonicalDestination(dirname(path)),basename(path));}
}
export async function assertExternalEvidencePath(source:string,evidenceDirectory:string) {
 const outside=(base:string,path:string)=>{const distance=relative(base,path);return distance==='..'||distance.startsWith('..'+sep)||isAbsolute(distance);};
 if (!isAbsolute(evidenceDirectory) || !outside(resolve(source),resolve(evidenceDirectory)) || !outside(await realpath(source),await canonicalDestination(resolve(evidenceDirectory)))) {
  throw new Error('Application evidence must be an explicit directory outside the repository.');
 }
}

export async function releaseOwnedDerivedArtifacts(root:string,source:string,ownerId:string) {
 if(!isAbsolute(root)||resolve(root)!==root||!/^owned-next-[A-Za-z0-9]+$/.test(basename(root)))throw Error('Derived cleanup requires an owned application root');
 await assertExternalEvidencePath(source,root);
 const mirror=join(root,'app'),marker=join(root,'ownership.json');
 const checkIdentity=async()=>{
  const [rootInfo,mirrorInfo,markerInfo]=await Promise.all([lstat(root),lstat(mirror),lstat(marker)]);
  if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink()||!mirrorInfo.isDirectory()||mirrorInfo.isSymbolicLink()||!markerInfo.isFile()||markerInfo.isSymbolicLink())throw Error('Derived cleanup ownership paths changed');
  const canonicalRoot=await realpath(root);
  if(await realpath(mirror)!==join(canonicalRoot,'app'))throw Error('Derived cleanup mirror escaped its owner');
  const actual=JSON.parse(await readFile(marker,'utf8'));
  if(actual.ownerId!==ownerId||actual.root!==root||actual.source!==source||actual.closed!==true||actual.sourceVerified!==true||actual.mirrorVerified!==true)throw Error('Derived cleanup requires verified closed ownership');
  return canonicalRoot;
 };
 const canonicalRoot=await checkIdentity(),directories:string[]=[];
 for(const name of ['node_modules','.next']){
  const target=join(mirror,name);
  let info;try{info=await lstat(target);}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
  if(!info.isDirectory()||info.isSymbolicLink()||await realpath(target)!==join(canonicalRoot,'app',name))throw Error('Derived cleanup target escaped its owner');
  directories.push(name);
 }
 const before=await statfs(root);
 for(const name of directories){
  if(await checkIdentity()!==canonicalRoot)throw Error('Derived cleanup owner moved');
  await rm(join(mirror,name),{recursive:true,force:false});
 }
 const after=await statfs(root);
 return {directories:directories.map(name=>'app/'+name),availableBytesBefore:before.bavail*before.bsize,availableBytesAfter:after.bavail*after.bsize};
}

export function ownedPayrollEnvironment(options: {payrollEnabled?:boolean} = {}) {
  return {NEVORA_PAYROLL_ENABLED: options.payrollEnabled === true ? 'true' : 'false'};
}

/** No ambient provider settings enter ordinary owned test runtimes. */
export function ownedAdvisorEnvironment(options: {ownerAdvisorEnabled?: boolean; ownerAdvisorPilot?: OwnerAdvisorPilot} = {}): Record<string,string> {
  const base = {NEVORA_OWNER_ADVISOR_ENABLED: options.ownerAdvisorEnabled === true ? 'true' : 'false'};
  const pilot = options.ownerAdvisorPilot;
  if (!pilot) return base;
  if (options.ownerAdvisorEnabled !== true) throw Error('Pilot requires explicit owner advisor activation');
  validatePilot(pilot);
  const {credential, ...publicConfig} = pilot;
  return {...base, NEVORA_OWNER_ADVISOR_PROVIDER:'neon', NEVORA_OWNER_ADVISOR_DATA_APPROVED:'true',
    NEVORA_OWNER_ADVISOR_MODEL:pilot.model, NEVORA_OWNER_ADVISOR_DAILY_LIMIT:'20',
    NEON_AI_GATEWAY_BASE_URL:pilot.baseUrl, NEON_AI_GATEWAY_TOKEN:credential,
    NEVORA_OWNER_ADVISOR_PILOT:JSON.stringify(publicConfig)};
}

export type OwnedNextDatabaseInitializer=(context:{executor:SqlExecutor;identity:Readonly<OwnedDatabaseIdentity>;signal?:AbortSignal})=>Promise<void>;

type OwnedMailOptions={recoverySmtpPort?:number;invitationSmtpPort?:number};
function validateOwnedMailOptions(options:OwnedMailOptions){
 for(const port of [options.recoverySmtpPort,options.invitationSmtpPort])if(port!==undefined&&(!Number.isInteger(port)||port<1||port>65535))throw Error('Owned SMTP port must be explicit.');
 if(options.recoverySmtpPort!==undefined&&options.invitationSmtpPort!==undefined&&options.recoverySmtpPort!==options.invitationSmtpPort)throw Error('Recovery and invitation mail must use the same owned transport.');
}
/** Explicit invocation-owned mail only. Never copy ambient provider settings. */
export function ownedMailEnvironment(origin:string,options:OwnedMailOptions={}):Record<string,string>{
 validateOwnedMailOptions(options);
 const invitation=options.invitationSmtpPort!==undefined,port=options.invitationSmtpPort??options.recoverySmtpPort;
 const flags={NEVORA_INVITATION_DELIVERY_ENABLED:invitation?'true':'false'};
 if(port===undefined)return flags;
 let url:URL;try{url=new URL(origin);}catch{throw Error('Owned mail origin must identify the loopback application.');}
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Owned mail origin must identify the loopback application.');
 return {...flags,FUEL_PORTAL_ORIGIN:url.origin,NEVORA_RECOVERY_SMTP_HOST:'127.0.0.1',NEVORA_RECOVERY_SMTP_PORT:String(port),NEVORA_RECOVERY_FROM:invitation?'invitation@example.invalid':'recovery@example.invalid'};
}

/** Fictional browser enrollment only; no provider credential, sender or worker. */
export function ownedDeviceEnvironment(origin:string,enabled=false):Record<string,string>{
 if(!enabled)return {};
 const url=new URL(origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Owned device origin must identify the loopback application.');
 const key=createECDH('prime256v1');key.setPrivateKey(Buffer.alloc(32,23));
 return {FUEL_PORTAL_ORIGIN:url.origin,PUSH_ENVIRONMENT:'test',PUSH_FEATURE_ENABLED:'true',PUSH_DELIVERY_ENABLED:'false',PUSH_TEST_DELIVERY_ENABLED:'false',PUSH_VAPID_PUBLIC_KEY:key.getPublicKey().toString('base64url'),PUSH_SUBSCRIPTION_ENCRYPTION_KEY:Buffer.alloc(32,73).toString('base64url')};
}

/**
 * Real Next development runtime, real login/session/actions and canonical local
 * SQL. The scratch DB adapter is replaced; E can additionally pin Next's exact
 * generated dev type-reference paths. Production source,
 * existing databases and existing processes are never edited or reused.
 */
export async function createOwnedNextApp(evidenceDirectory: string, options: { loginDiagnostics?:boolean; ownerAdvisorPilot?: OwnerAdvisorPilot; ownerAdvisorEnabled?: boolean; passkeysEnabled?: boolean; deviceAlertsEnabled?:boolean; clockerPinKey?: string; clockerPunchEnabled?: boolean; payrollEnabled?: boolean; emptyDatabase?: boolean; initializeDatabase?:OwnedNextDatabaseInitializer; recoverySmtpPort?:number; invitationSmtpPort?:number; pinDevTypeReferences?: boolean; signal?: AbortSignal; processOwnerId?: string; onProcessStarted?: (child: ChildProcess, identity: { ownerId: string; root: string; source: string }) => Promise<void> } = {}) {
  if (options.clockerPinKey !== undefined && !/^[a-f0-9]{64}$/.test(options.clockerPinKey)) throw new Error('Owned Clocker PIN key must be 32-byte hex.');
  validateOwnedMailOptions(options);
  const advisorEnvironment = ownedAdvisorEnvironment(options);
  if (options.ownerAdvisorPilot) {
    await assertExternalEvidencePath(resolve(process.cwd()),options.ownerAdvisorPilot.ledgerPath);
    assertPilotLedger(options.ownerAdvisorPilot);
  }
  if (options.processOwnerId !== undefined && !/^[a-f0-9]{32}$/.test(options.processOwnerId)) throw Error('Owned process marker must identify the invocation.');
  if (options.onProcessStarted && !options.processOwnerId) throw Error('Owned process registration requires its invocation marker.');
  if(options.loginDiagnostics&&!options.processOwnerId)throw Error('Login diagnostics require the owned process marker.');
  options.signal?.throwIfAborted();
  const source = resolve(process.cwd());
  // Validate before allocating a runtime or database. Only committed input is
  // eligible for an exact-SHA mirror; a clean tracked status alone is insufficient.
  const files = trackedApplicationFiles(source);
  const pinDevTypeReferences = options.pinDevTypeReferences ?? true;
  const evidence = resolve(evidenceDirectory);
  await assertExternalEvidencePath(source,evidenceDirectory);
  await mkdir(evidence, { recursive: true });
  const root = await mkdtemp(join(evidence, 'owned-next-'));
  const mirror = join(root, 'app');
  const barriers = join(root, 'barriers');
  await mkdir(mirror); await mkdir(barriers);
  const ownerId = randomUUID();
  const database = await createDisposableExchangeDatabase({ mode: options.emptyDatabase ? 'empty' : 'current-runtime' });
  let child: ChildProcess | undefined;
  let closed = false;
  let closing: Promise<void> | undefined;
  let closureFailure: unknown;
  let mirrorPrepared = false;
  let sourceManifestHash: string;
  const mirrorHashes: Record<string, string> = {};
  const hashes: Record<string, string> = {};
  const verifySource = async () => {
    if (JSON.stringify(trackedApplicationFiles(source)) !== JSON.stringify(files)) throw Error('Application source inventory changed during verification');
    for (const [name, expected] of Object.entries(hashes)) if (hash(await readFile(join(source, name))) !== expected) throw Error('Application source changed during verification: ' + name);
  };
  const verifyMirror = async () => {
    if (hash(await readFile(join(root, 'source-manifest.json'))) !== sourceManifestHash) throw Error('Application mirror source manifest changed');
    const actual: string[] = [];
    const queue = [''];
    for (const directory of queue) for (const entry of await readdir(join(mirror, directory), { withFileTypes: true })) {
      const name = directory ? directory + '/' + entry.name : entry.name;
      if (entry.isDirectory() && (name === 'src' || name === 'public' || name.startsWith('src/') || name.startsWith('public/'))) queue.push(name);
      else if (applicationInput(name)) {
        if (!entry.isFile()) throw Error('Application mirror contains unsafe input: ' + name);
        actual.push(name);
      } else if (!directory && entry.name.startsWith('.env')) throw Error('Application mirror contains unapproved environment input');
    }
    if (JSON.stringify(actual.sort()) !== JSON.stringify(Object.keys(mirrorHashes).sort())) throw Error('Application mirror inventory changed');
    for (const [name, expected] of Object.entries(mirrorHashes)) if (hash(await readFile(join(mirror, name))) !== expected) throw Error('Application mirror bytes changed: ' + name);
  };
  const manifestPath = join(root, 'ownership.json');
  const metadata: Record<string, unknown> = { ownerId, source, root, runtime: 'Next development + owned PostgreSQL; substituted DB transport', started: false };
  await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
  const close = (): Promise<void> => {
    if (closed) return closureFailure ? Promise.reject(closureFailure) : Promise.resolve();
    if (!closing) closing = (async () => {
      const actual = JSON.parse(await readFile(manifestPath, 'utf8'));
      if (actual.ownerId !== ownerId) throw new Error('Owned application identity changed; refusing teardown');
      if (child) await stopOwnedProcess(child);
      await database.dispose();
      metadata.closed = true; metadata.closedAt = new Date().toISOString();
      await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
      closed = true; options.signal?.removeEventListener('abort', abort);
      await verifySource();
      if (mirrorPrepared) await verifyMirror();
      metadata.sourceVerified = true; metadata.mirrorVerified = mirrorPrepared;
      await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
      if(mirrorPrepared){
        metadata.derivedArtifactsReleased=await releaseOwnedDerivedArtifacts(root,source,ownerId);
        await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
      }
    })().catch(async error => { closureFailure = error; metadata.verificationError = String(error); await writeFile(manifestPath, JSON.stringify(metadata, null, 2)); closing = undefined; throw error; });
    return closing;
  };
  const abort = () => { void close().catch(() => { /* The setup/caller still awaits and reports close failures. */ }); };
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    options.signal?.throwIfAborted();
    const identityQuery={text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",values:[]};
    const [identity] = await database.executor.query<OwnedDatabaseIdentity>(identityQuery,options.signal);
    if(options.initializeDatabase){
      // Reuse the existing pure loopback/name/OID/marker validator. Constructing
      // this lazy transport starts no connection or application process.
      if(!identity)throw Error('Owned database identity missing before initialization');
      createOwnedPgTransport(database.connectionString,identity);
      await options.initializeDatabase({executor:database.executor,identity:Object.freeze({...identity}),signal:options.signal});
      options.signal?.throwIfAborted();
      const [current]=await database.executor.query<OwnedDatabaseIdentity>(identityQuery,options.signal);
      if(!current||current.name!==identity.name||current.oid!==identity.oid||current.marker!==identity.marker)throw Error('Owned database identity changed during initialization');
    }
    options.signal?.throwIfAborted();
    for (const name of files) {
      if (isAbsolute(name) || name.split('/').includes('..')) throw new Error('Unsafe tracked source path');
      await mkdir(dirname(join(mirror, name)), { recursive: true });
      hashes[name] = hash(await readFile(join(source, name)));
      await copyFile(join(source, name), join(mirror, name));
      if (hash(await readFile(join(mirror, name))) !== hashes[name]) throw Error('Application mirror differs from captured source: ' + name);
    }
    await verifySource();
    await access(join(source, 'node_modules/next/dist/bin/next'));
    copyOwnedDependencies(source, mirror);
    const originalDb = await readFile(join(source, 'src/lib/db.ts'), 'utf8');
    const adapter = createOwnedDbAdapter(originalDb);
    await writeFile(join(mirror, 'src/lib/db.ts'), adapter);
    Object.assign(mirrorHashes, hashes, { 'src/lib/db.ts': hash(adapter) });
    let generatedTypeReferences;
    if (pinDevTypeReferences) {
      const originalTypes = await readFile(join(source, 'next-env.d.ts'), 'utf8');
      const derivedTypes = createOwnedDevTypeReferences(originalTypes);
      await writeFile(join(mirror, 'next-env.d.ts'), derivedTypes);
      generatedTypeReferences = { originalHash: hash(originalTypes), derivedHash: hash(derivedTypes), reason: 'Next 16.4.2 dev generated type-reference paths' };
      mirrorHashes['next-env.d.ts'] = hash(derivedTypes);
    }
    const manifestBytes = JSON.stringify({ checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(), hashes, originalDbHash: hash(originalDb), substitutedDbHash: hash(adapter), substitutedFiles: pinDevTypeReferences ? ['src/lib/db.ts', 'next-env.d.ts'] : ['src/lib/db.ts'], generatedTypeReferences }, null, 2);
    await writeFile(join(root, 'source-manifest.json'), manifestBytes);
    sourceManifestHash = hash(manifestBytes); mirrorPrepared = true;
    await verifyMirror();
    const port = await availablePort(), url = `http://127.0.0.1:${port}`;
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', CI: '1',
      NEVORA_CLOCKER_PIN_KEY: options.clockerPinKey,
      NEXT_PUBLIC_NEVORA_PASSKEYS: options.passkeysEnabled === true ? 'on' : 'off',
      ...ownedPayrollEnvironment(options),
      ...advisorEnvironment,
      NEVORA_CLOCKER_PUNCH_ENABLED: options.clockerPunchEnabled === true ? 'true' : 'false',
      ...ownedMailEnvironment(url,options),
      NEXT_TELEMETRY_DISABLED: '1', PUSH_ENVIRONMENT: 'test', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false',
      ...ownedDeviceEnvironment(url,options.deviceAlertsEnabled),
      NEVORA_OWNED_APP_DATABASE: database.connectionString,
      NEVORA_OWNED_APP_IDENTITY: JSON.stringify(identity), NEVORA_OWNED_APP_BARRIERS: barriers,
      ...(options.loginDiagnostics?{NODE_OPTIONS:'--import='+pathToFileURL(join(mirror,'src/test/integration/owned-login-diagnostics.mjs')).href,NEVORA_OWNED_LOGIN_ORIGIN:url}:{}),
      ...(options.processOwnerId ? { NEVORA_OWNED_PROCESS_OWNER: options.processOwnerId } : {}),
    };
    options.signal?.throwIfAborted();
    const log = createWriteStream(join(root, 'next.log'));
    const pilotArgs: string[] = [];
    if (options.ownerAdvisorPilot) {
      const preload = 'src/test/integration/owner-advisor-pilot-preload.mts';
      const guard = 'src/test/integration/owner-advisor-pilot.mts';
      metadata.ownerAdvisorPilot = { ...JSON.parse(advisorEnvironment.NEVORA_OWNER_ADVISOR_PILOT), ...PILOT, endpoint: PILOT.baseUrl + '/openai/v1/responses', preloadHash:mirrorHashes[preload], guardHash:mirrorHashes[guard] };
      pilotArgs.push('--import', join(mirror,preload));
    }
    child = spawn(process.execPath, [...pilotArgs, join(mirror, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: mirror, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    // Credentials must never reach the persistent sink, even across chunks.
    let endedStreams=0;
    for(const stream of [child.stdout!,child.stderr!]){
      const redactor=createCalendarLogRedactor();
      stream.pipe(redactor).pipe(log,{end:false});
      redactor.once('end',()=>{if(++endedStreams===2)log.end();});
    }
    Object.assign(metadata, { pid: child.pid, port, url, identity, started: true });
    await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
    await options.onProcessStarted?.(child, { ownerId, root, source });
    options.signal?.throwIfAborted();
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline) {
      options.signal?.throwIfAborted();
      if (child.exitCode !== null) throw new Error('Owned Next process exited before readiness');
      try { const response = await fetch(`${url}/login`, { redirect: 'manual', signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(3000)]) : AbortSignal.timeout(3000) }); if (response.ok) { ready = true; break; } }
      catch { /* A cold compilation can exceed one poll; retain the bounded startup window. */ }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (!ready) throw new Error(`Owned Next did not become ready; see ${join(root, 'next.log')}`);
    options.signal?.throwIfAborted();
    await verifySource();
    return { root, mirror, barriers, url, database, close, sourceHashes: hashes };
  } catch (error) { try { await close(); } catch (closureError) { throw new AggregateError([error, closureError], 'Owned application setup and closure failed'); } throw error; }
}
