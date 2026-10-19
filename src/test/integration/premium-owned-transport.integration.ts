import { it, expect } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { createOwnedPgTransport, type OwnedDatabaseIdentity } from './owned-pg-transport';

it('bounds concurrent connections, preserves rollback and cancellation, and rechecks ownership on reuse', async () => {
  const db = await createDisposableExchangeDatabase({ mode: 'empty' });
  const [identity] = await db.executor.query<OwnedDatabaseIdentity>({ text: "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: [] });
  const transport = createOwnedPgTransport(db.connectionString, identity);
  try {
    const rows = await Promise.all(Array.from({ length: 160 }, () => transport.query('SELECT pg_sleep(0.02),pg_backend_pid() AS pid')));
    const pids = new Set(rows.map(r => r[0].pid));
    expect(pids.size).toBeGreaterThan(1); expect(pids.size).toBeLessThanOrEqual(12);
    await transport.query('CREATE TABLE pool_probe(id integer)');
    await expect(transport.transaction([transport.query('INSERT INTO pool_probe VALUES(1)'), transport.query('SELECT 1/0')])).rejects.toMatchObject({ code: '22012' });
    expect(await transport.query('SELECT count(*)::int AS n FROM pool_probe')).toEqual([{ n: 0 }]);
    const controller = new AbortController();
    const pending = Promise.resolve(transport.query('SELECT pg_sleep(10)', [], { fetchOptions: { signal: controller.signal } }));
    const timer = setTimeout(() => controller.abort(), 40);
    await expect(pending).rejects.toThrow(); clearTimeout(timer);
    expect(await transport.query('SELECT 1 AS healthy')).toEqual([{ healthy: 1 }]);
    await db.executor.query({ text: `COMMENT ON DATABASE "${identity.name}" IS 'wrong-owner'`, values: [] });
    await expect(transport.query('SELECT 1')).rejects.toThrow('ownership changed');
  } finally {
    await db.executor.query({ text: `COMMENT ON DATABASE "${identity.name}" IS '${identity.marker}'`, values: [] });
    await transport.close(); await db.dispose();
  }
});
