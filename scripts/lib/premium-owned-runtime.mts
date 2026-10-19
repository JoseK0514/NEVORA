import { createECDH, createHash, randomBytes } from 'node:crypto';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { createDisposableExchangeDatabase } from '../../src/test/integration/local-postgres';
import { createOwnedDbAdapter, assertExternalEvidencePath } from '../../src/test/integration/owned-next-app';
import type { OwnedDatabaseIdentity } from '../../src/test/integration/owned-pg-transport';

export async function ownedRuntime(evidence: string, production: boolean, options: { pushCapture?: boolean } = {}) {
  const source = process.cwd();
  await assertExternalEvidencePath(source, evidence);
  await mkdir(evidence, { recursive: true });
  const root = await mkdtemp(join(evidence, 'runtime-')), app = join(root, 'app'), barriers = join(root, 'barriers');
  await mkdir(app); await mkdir(barriers);
  const database = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  let child: ChildProcess | undefined;
  const close = async () => {
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const done = new Promise<void>(resolve => child!.once('exit', () => resolve()));
      child.kill('SIGTERM');
      const timer = setTimeout(() => child!.kill('SIGKILL'), 5000);
      await done; clearTimeout(timer);
    }
    await database.dispose();
  };
  try {
    const checkpoint = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    const hashes: Record<string, string> = {};
    for (const path of files) {
      await mkdir(dirname(join(app, path)), { recursive: true });
      const bytes = await readFile(path); hashes[path] = createHash('sha256').update(bytes).digest('hex');
      await copyFile(path, join(app, path));
    }
    execFileSync('cp', ['-R', resolve('node_modules'), join(app, 'node_modules')]);
    const original = await readFile('src/lib/db.ts', 'utf8');
    // Refuse tenant-runtime access rather than accidentally contacting a real DB.
    const adapter = createOwnedDbAdapter(original) + "\nexport function getTenantRuntimeDb(_role: 'APP' | 'WORKER'): import('@neondatabase/serverless').NeonQueryFunction<false, false> { throw Error('Tenant runtime is outside the owned legacy fixture'); }\n";
    await writeFile(join(app, 'src/lib/db.ts'), adapter);
    const [identity] = await database.executor.query<OwnedDatabaseIdentity>({ text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [] });
    const port = await new Promise<number>((resolve, reject) => {
      const server = createServer(); server.once('error', reject); server.listen(0, '127.0.0.1', () => { const address = server.address(); if (!address || typeof address === 'string') throw Error('No port'); server.close(() => resolve(address.port)); });
    });
    const url = `http://127.0.0.1:${port}`;
    const push = !production && options.pushCapture ? (() => { const key = createECDH('prime256v1'); key.generateKeys(); return { publicKey: key.getPublicKey().toString('base64url'), privateKey: key.getPrivateKey().toString('base64url'), encryptionKey: randomBytes(32), workerSecret: randomBytes(32).toString('base64url') }; })() : undefined;
    const env: NodeJS.ProcessEnv = {
      PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: production ? 'production' : 'development', CI: '1', NEXT_TELEMETRY_DISABLED: '1',
      NEVORA_OWNED_APP_DATABASE: database.connectionString, NEVORA_OWNED_APP_IDENTITY: JSON.stringify(identity), NEVORA_OWNED_APP_BARRIERS: barriers,
      NEVORA_PAYROLL_ENABLED: 'false', PUSH_ENVIRONMENT: 'test', PUSH_FEATURE_ENABLED: 'false', PUSH_DELIVERY_ENABLED: 'false', PUSH_TEST_DELIVERY_ENABLED: 'false',
      ...(!production ? { NEVORA_DEV_CAPTURE_DELIVERY: '1', NEVORA_DEV_CAPTURE_OUT: join(root, 'captures'), FUEL_PORTAL_ORIGIN: url } : {}),
      ...(push ? { PUSH_FEATURE_ENABLED: 'true', PUSH_VAPID_PUBLIC_KEY: push.publicKey, PUSH_VAPID_PRIVATE_KEY: push.privateKey, PUSH_SUBSCRIPTION_ENCRYPTION_KEY: push.encryptionKey.toString('base64url'), PUSH_VAPID_SUBJECT: 'mailto:preview@example.invalid', NOTIFICATION_WORKER_SECRET: push.workerSecret, PUSH_TEST_ACCOUNT_IDS: 'AUDIT-E,AUDIT-M,AUDIT-SWAP,QAOWNER' } : {}),
    };
    await writeFile(join(root, 'source-manifest.json'), JSON.stringify({ checkpoint, hashes, substitutions: { 'src/lib/db.ts': createHash('sha256').update(adapter).digest('hex') }, production }, null, 2));
    await writeFile(join(root, 'ownership.json'), JSON.stringify({ source, root, identity, url, production, evidence, cluster: process.env.NEVORA_PREMIUM_CLUSTER, clusterMarker: process.env.NEVORA_PREMIUM_CLUSTER_MARKER }, null, 2));
    if (production) await new Promise<void>((resolve, reject) => {
      const log = createWriteStream(join(root, 'build.log'));
      const build = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'build'], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
      build.stdout.pipe(log, { end: false }); build.stderr.pipe(log, { end: false });
      build.once('error', reject); build.once('close', code => { log.end(); code === 0 ? resolve() : reject(Error(`Owned production build failed (${code}); see ${root}/build.log`)); });
    });
    const log = createWriteStream(join(root, 'server.log'));
    child = spawn(process.execPath, ['node_modules/next/dist/bin/next', production ? 'start' : 'dev', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: app, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout!.pipe(log, { end: false }); child.stderr!.pipe(log, { end: false });
    child.once('close', () => log.end());
    const deadline = Date.now() + 120000;
    let ready = false;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) throw Error('Owned server exited');
      try { if ((await fetch(url + '/login', { signal: AbortSignal.timeout(3000) })).ok) { ready = true; break; } } catch { /* bounded cold compile */ }
      await new Promise(r => setTimeout(r, 200));
    }
    if (!ready) throw Error('Owned server not ready');
    return { root, app, database, url, close, checkpoint, push };
  } catch (error) { await close(); throw error; }
}

export async function sessionCookie(database: Awaited<ReturnType<typeof createDisposableExchangeDatabase>>, employeeId: string) {
  const token = randomBytes(32).toString('base64url');
  await database.executor.query({ text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '4 hours')", values: [createHash('sha256').update(token).digest('hex'), employeeId] });
  return 'fuel_session=' + token;
}
