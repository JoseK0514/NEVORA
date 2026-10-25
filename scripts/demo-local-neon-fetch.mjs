/**
 * LOCAL PROOF ONLY. Lets an unmodified `next start` build (and the payroll
 * worker) reach an owned loopback PostgreSQL through the app's real Neon HTTP
 * driver, so the demo seed can be proven without a hosted database.
 *
 * Preload it with NODE_OPTIONS="--import <absolute path to this file>" and set:
 *   NEVORA_DEMO_LOCAL_PG_URL  postgresql://<user>@127.0.0.1:<port>/nevora_demo   (loopback only)
 *   DATABASE_URL              postgresql://demo@db.nevora-demo.localhost/nevora_demo
 *
 * The Neon driver sends each query to https://api.<host>/sql. This preload
 * answers exactly that endpoint for the reserved host `*.nevora-demo.localhost`
 * by running the same statements on the loopback database, using Neon's
 * SQL-over-HTTP wire format (raw text values, array rows, ordered batches in one
 * transaction). Every other request goes to the original fetch unchanged.
 * It is inert unless NEVORA_DEMO_LOCAL_PG_URL is set, refuses non-loopback
 * targets and database names outside nevora_demo*, and is never used against a
 * hosted database: there the driver talks to Neon directly.
 */
import { createRequire } from 'node:module';

const local = process.env.NEVORA_DEMO_LOCAL_PG_URL;
if (local) {
  const target = new URL(local);
  const name = decodeURIComponent(target.pathname.slice(1));
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) || !(name === 'nevora_demo' || name.startsWith('nevora_demo'))) {
    throw new Error('demo-local-neon-fetch: NEVORA_DEMO_LOCAL_PG_URL must be a loopback nevora_demo* database.');
  }
  const require = createRequire(new URL('../package.json', import.meta.url));
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: local, max: 10, idleTimeoutMillis: 5000, application_name: 'nevora-demo-local-neon' });
  pool.on('error', () => {});
  const raw = { getTypeParser: () => value => value };
  const originalFetch = globalThis.fetch;
  const endpoint = /^https:\/\/api\.nevora-demo\.localhost\/sql$/;
  const levels = { Serializable: 'SERIALIZABLE', RepeatableRead: 'REPEATABLE READ', ReadCommitted: 'READ COMMITTED', ReadUncommitted: 'READ UNCOMMITTED' };
  const shape = result => ({
    fields: result.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID, tableID: f.tableID, columnID: f.columnID, dataTypeSize: f.dataTypeSize, dataTypeModifier: f.dataTypeModifier, format: f.format })),
    command: result.command, rowCount: result.rowCount, rows: result.rows, rowAsArray: true,
  });
  const run = async (client, item) => {
    const result = await client.query({ text: item.query, values: item.params ?? [], rowMode: 'array', types: raw });
    return shape(Array.isArray(result) ? result.at(-1) : result);
  };
  const failure = error => new Response(JSON.stringify(Object.fromEntries(
    ['message', 'severity', 'code', 'detail', 'hint', 'position', 'internalPosition', 'internalQuery', 'where', 'schema', 'table', 'column', 'dataType', 'constraint', 'file', 'line', 'routine']
      .map(key => [key, error?.[key]]).filter(([, value]) => value !== undefined))), { status: 400, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = async function demoLocalNeonFetch(input, init = {}) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url;
    if (!endpoint.test(String(url))) return originalFetch(input, init);
    const headers = new Headers(init.headers);
    const requested = new URL(headers.get('Neon-Connection-String') ?? 'postgresql://invalid');
    if (!requested.hostname.endsWith('.nevora-demo.localhost') || decodeURIComponent(requested.pathname.slice(1)) !== name) {
      return failure({ message: 'demo-local-neon-fetch: connection string does not name the local demo database' });
    }
    init.signal?.throwIfAborted();
    const body = JSON.parse(String(init.body));
    const client = await pool.connect();
    try {
      if (!Array.isArray(body.queries)) return Response.json(await run(client, body));
      const isolation = levels[headers.get('Neon-Batch-Isolation-Level')] ?? null;
      const readOnly = headers.get('Neon-Batch-Read-Only') === 'true', deferrable = headers.get('Neon-Batch-Deferrable') === 'true';
      await client.query(`BEGIN${isolation ? ' ISOLATION LEVEL ' + isolation : ''}${readOnly ? ' READ ONLY' : ''}${deferrable ? ' DEFERRABLE' : ''}`);
      try {
        const results = [];
        for (const item of body.queries) results.push(await run(client, item));
        await client.query('COMMIT');
        return Response.json({ results });
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
    } catch (error) {
      return failure(error);
    } finally {
      client.release();
    }
  };
}
