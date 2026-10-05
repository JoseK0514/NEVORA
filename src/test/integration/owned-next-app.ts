import { createHash, randomUUID } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { access, copyFile, mkdir, mkdtemp, readFile, realpath, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { createDisposableExchangeDatabase } from './local-postgres';
import type { OwnedDatabaseIdentity } from './owned-pg-transport';

const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
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

/**
 * Real Next development runtime, real login/session/actions and canonical local
 * SQL. Only the scratch copy of src/lib/db.ts is replaced. Production source,
 * existing databases and existing processes are never edited or reused.
 */
export async function createOwnedNextApp(evidenceDirectory: string) {
  const source = resolve(process.cwd());
  const evidence = resolve(evidenceDirectory);
  await assertExternalEvidencePath(source,evidenceDirectory);
  await mkdir(evidence, { recursive: true });
  const root = await mkdtemp(join(evidence, 'owned-next-'));
  const mirror = join(root, 'app');
  const barriers = join(root, 'barriers');
  await mkdir(mirror); await mkdir(barriers);
  const ownerId = randomUUID();
  const database = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  let child: ChildProcess | undefined;
  let closed = false;
  const manifestPath = join(root, 'ownership.json');
  const metadata: Record<string, unknown> = { ownerId, source, root, runtime: 'Next development + owned PostgreSQL; substituted DB transport', started: false };
  await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
  const close = async () => {
    if (closed) return;
    const actual = JSON.parse(await readFile(manifestPath, 'utf8'));
    if (actual.ownerId !== ownerId) throw new Error('Owned application identity changed; refusing teardown');
    if (child) await stopOwnedProcess(child);
    await database.dispose();
    metadata.closed = true; metadata.closedAt = new Date().toISOString();
    await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
    closed = true;
  };
  try {
    const [identity] = await database.executor.query<OwnedDatabaseIdentity>({
      text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [],
    });
    const files = [...new Set(execFileSync('git', ['ls-files', '-c', '-o', '--exclude-standard', '-z'], { cwd: source, encoding: 'utf8' }).split('\0').filter(Boolean))]
      .filter(name => ['src/', 'public/'].some(prefix => name.startsWith(prefix)) || ['package.json', 'package-lock.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.ts'].includes(name))
      .filter(name => !name.split('/').some(part => part.startsWith('.env') || part === 'node_modules'))
      .sort();
    const hashes: Record<string, string> = {};
    for (const name of files) {
      if (isAbsolute(name) || name.split('/').includes('..')) throw new Error('Unsafe tracked source path');
      await mkdir(dirname(join(mirror, name)), { recursive: true });
      await copyFile(join(source, name), join(mirror, name));
      hashes[name] = hash(await readFile(join(source, name)));
    }
    await access(join(source, 'node_modules/next/dist/bin/next'));
    execFileSync('cp', process.platform === 'darwin' ? ['-cR', join(source, 'node_modules'), join(mirror, 'node_modules')] : ['-R', join(source, 'node_modules'), join(mirror, 'node_modules')]);
    const originalDb = await readFile(join(source, 'src/lib/db.ts'), 'utf8');
    const queryRows = originalDb.slice(originalDb.indexOf('export function queryRows'));
    if (!queryRows.startsWith('export function queryRows')) throw new Error('Unexpected production DB contract');
    const adapter = `import { createOwnedPgTransport } from '../test/integration/owned-pg-transport';\nimport { ownedAppBarriers } from '../test/integration/owned-app-barriers';\nlet sql: ReturnType<typeof createOwnedPgTransport> | undefined;\nexport function getDb() {\n if (!sql) {\n  const url=process.env.NEVORA_OWNED_APP_DATABASE;\n  const identity=process.env.NEVORA_OWNED_APP_IDENTITY;\n  const directory=process.env.NEVORA_OWNED_APP_BARRIERS;\n  if(!url||!identity||!directory) throw new Error('Owned application test setup missing');\n  sql=createOwnedPgTransport(url,JSON.parse(identity),ownedAppBarriers(directory));\n }\n return sql;\n}\n${queryRows}`;
    await writeFile(join(mirror, 'src/lib/db.ts'), adapter);
    await writeFile(join(root, 'source-manifest.json'), JSON.stringify({ checkpoint: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim(), hashes, originalDbHash: hash(originalDb), substitutedDbHash: hash(adapter), substitutedFiles: ['src/lib/db.ts'] }, null, 2));
    const port = await availablePort(), url = `http://127.0.0.1:${port}`;
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', CI: '1',
      NEXT_TELEMETRY_DISABLED: '1', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false',
      NEVORA_OWNED_APP_DATABASE: database.connectionString,
      NEVORA_OWNED_APP_IDENTITY: JSON.stringify(identity), NEVORA_OWNED_APP_BARRIERS: barriers,
    };
    const log = createWriteStream(join(root, 'next.log'));
    child = spawn(process.execPath, [join(mirror, 'node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: mirror, env, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout!.pipe(log); child.stderr!.pipe(log);
    child.once('exit', () => log.end());
    Object.assign(metadata, { pid: child.pid, port, url, identity, started: true });
    await writeFile(manifestPath, JSON.stringify(metadata, null, 2));
    const deadline = Date.now() + 90000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw new Error('Owned Next process exited before readiness');
      try { const response = await fetch(`${url}/login`, { redirect: 'manual', signal: AbortSignal.timeout(3000) }); if (response.ok) { ready = true; break; } }
      catch { /* A cold compilation can exceed one poll; retain the bounded startup window. */ }
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    if (!ready) throw new Error(`Owned Next did not become ready; see ${join(root, 'next.log')}`);
    if (hash(await readFile(join(source, 'src/lib/db.ts'))) !== hash(originalDb)) throw new Error('Original DB source changed during test setup');
    return { root, mirror, barriers, url, database, close, sourceHashes: hashes };
  } catch (error) { await close(); throw error; }
}
