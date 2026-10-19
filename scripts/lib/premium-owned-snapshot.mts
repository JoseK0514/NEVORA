import { execFileSync } from 'node:child_process';
import { chmod, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, join, relative, sep } from 'node:path';
import type { ownedRuntime } from './premium-owned-runtime.mjs';

// This cloud harness resets only its newly created database. It is deliberately
// not a general-purpose reset command accepting an arbitrary connection string.
export async function ownedSnapshot(app: Awaited<ReturnType<typeof ownedRuntime>>, evidence: string) {
  const root = await realpath(app.root), parent = await realpath(evidence);
  const inside = relative(parent, root);
  if (!inside || inside === '..' || inside.startsWith('..' + sep) || isAbsolute(inside)) throw Error('Snapshot root outside evidence ownership');
  const manifest = JSON.parse(await readFile(join(root, 'ownership.json'), 'utf8'));
  const bin = process.env.NEVORA_TEST_PG_BIN;
  if (!bin || !manifest.cluster || manifest.cluster !== process.env.NEVORA_PREMIUM_CLUSTER || manifest.clusterMarker !== process.env.NEVORA_PREMIUM_CLUSTER_MARKER) throw Error('Missing owned cluster provenance');
  const connectionString = app.database.connectionString, target = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || !/^nevora_exchange_test_premium_[a-f0-9]{12}$/.test(target.pathname.slice(1)) || target.pathname.slice(1) !== manifest.identity.name || target.search || target.hash || target.password) throw Error('Refusing non-owned snapshot target');
  const verify = async () => {
    if (app.database.connectionString !== connectionString) throw Error('Snapshot connection changed');
    const current = JSON.parse(await readFile(join(root, 'ownership.json'), 'utf8'));
    if (current.root !== root || current.evidence !== evidence || JSON.stringify(current.identity) !== JSON.stringify(manifest.identity) || current.cluster !== manifest.cluster || current.clusterMarker !== manifest.clusterMarker) throw Error('Snapshot manifest changed');
    if ((await readFile(join(manifest.cluster, 'owner'), 'utf8')) !== manifest.clusterMarker) throw Error('Snapshot cluster marker changed');
    const pid = (await readFile(join(manifest.cluster, 'data/postmaster.pid'), 'utf8')).split('\n');
    if (pid[3] !== target.port || await realpath(pid[1]) !== await realpath(join(manifest.cluster, 'data'))) throw Error('Snapshot cluster endpoint changed');
    const [identity] = await app.database.executor.query({ text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [] });
    if (JSON.stringify(identity) !== JSON.stringify(manifest.identity)) throw Error('Snapshot database identity changed');
  };
  const file = join(root, 'seed.dump');
  await verify();
  execFileSync(join(bin, 'pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', '--file', file, '--dbname', connectionString], { stdio: ['ignore', 'ignore', 'pipe'] });
  await chmod(file, 0o600);
  return {
    verify,
    async restore() {
      await verify();
      execFileSync(join(bin, 'pg_restore'), ['--clean', '--if-exists', '--single-transaction', '--exit-on-error', '--no-owner', '--no-privileges', '--dbname', connectionString, file], { stdio: ['ignore', 'ignore', 'pipe'] });
      await verify();
    },
  };
}
