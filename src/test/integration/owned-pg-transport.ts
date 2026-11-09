import { Pool, type QueryResult } from 'pg';

export type OwnedDatabaseIdentity = { name: string; oid: number; marker: string };
export type LocalQueryOptions = { fetchOptions?: { signal?: AbortSignal } };
export type LocalRows = Record<string, unknown>[];
export type LocalQuery = PromiseLike<LocalRows>;
export type OwnedPgTransport = {
  (strings: TemplateStringsArray, ...values: unknown[]): LocalQuery;
  query(text: string, values?: readonly unknown[], options?: LocalQueryOptions): LocalQuery;
  transaction(queries: readonly LocalQuery[], options?: LocalQueryOptions): Promise<LocalRows[]>;
  close(): Promise<void>;
};
export type LocalTransportHooks = {
  /** Test barriers may delay real IO but may not manufacture query results. */
  beforeQuery?(text: string): Promise<void>;
  afterQuery?(text: string, rows: LocalRows): Promise<void>;
};
type Statement = { text: string; values: readonly unknown[]; signal?: AbortSignal };
type PendingQuery = { statement: Statement; started: boolean; promise?: Promise<LocalRows> };

/**
 * Scratch-app test transport only. Implements the repository's observed tagged,
 * parameterized and ordered-batch API with actual loopback PostgreSQL connections.
 * This is not an implementation or certification of the production Neon transport.
 * Import only from tests and the explicitly substituted scratch src/lib/db.ts.
 */
export function createOwnedPgTransport(
  connectionString: string,
  identity: OwnedDatabaseIdentity,
  hooks: LocalTransportHooks = {},
): OwnedPgTransport {
  const target = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(target.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname) ||
      !/^nevora_exchange_test_[a-z0-9_]{1,40}$/.test(identity.name) ||
      decodeURIComponent(target.pathname.slice(1)) !== identity.name ||
      !Number.isSafeInteger(identity.oid) || identity.oid <= 0 ||
      !/^fuel-phase3-disposable:[a-f0-9-]{36}$/.test(identity.marker) || target.search || target.hash) {
    throw new Error('Refusing unowned or non-loopback application test database.');
  }
  const queries = new WeakMap<LocalQuery, PendingQuery>();
  // A portal read fans out into many statements. Bound connections per owned
  // runtime instead of opening hundreds during concurrent browser requests.
  // Production uses Neon HTTP and never imports this test-only transport.
  const pool = new Pool({ connectionString, max: 12, connectionTimeoutMillis: 3000, statement_timeout: 5000, idleTimeoutMillis: 1000, allowExitOnIdle: true });
  // An owned cluster may be torn down while an idle connection is parked. pg
  // removes that connection; active query failures still reject their caller.
  pool.on('error', () => {});

  async function run(statements: readonly Statement[], transaction: boolean, signal?: AbortSignal): Promise<LocalRows[]> {
    const signals = [...statements.flatMap(s => s.signal ? [s.signal] : []), ...(signal ? [signal] : [])];
    const effectiveSignal = signals.length ? AbortSignal.any(signals) : undefined;
    effectiveSignal?.throwIfAborted();
    const client = await pool.connect();
    let released = false;
    const release = (destroy = false) => { if (!released) { released = true; client.release(destroy); } };
    const abort = () => release(true);
    try {
      effectiveSignal?.addEventListener('abort', abort, { once: true });
      effectiveSignal?.throwIfAborted();
      const ownership = await client.query<OwnedDatabaseIdentity>(
        "SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",
      );
      const actual = ownership.rows[0];
      if (!actual || actual.name !== identity.name || actual.oid !== identity.oid || actual.marker !== identity.marker) {
        throw new Error('Application test database ownership changed.');
      }
      if (transaction) await client.query('BEGIN');
      const results: LocalRows[] = [];
      for (const statement of statements) {
        effectiveSignal?.throwIfAborted();
        await hooks.beforeQuery?.(statement.text);
        effectiveSignal?.throwIfAborted();
        const result = await client.query(statement.text, [...statement.values]) as QueryResult | QueryResult[];
        const rows: LocalRows = Array.isArray(result) ? result.at(-1)?.rows ?? [] : result.rows;
        await hooks.afterQuery?.(statement.text, rows);
        results.push(rows);
      }
      effectiveSignal?.throwIfAborted();
      if (transaction) await client.query('COMMIT');
      return results;
    } catch (error) {
      if (transaction) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      effectiveSignal?.removeEventListener('abort', abort);
      release();
    }
  }

  const query = (text: string, values: readonly unknown[] = [], options?: LocalQueryOptions): LocalQuery => {
    const pending: PendingQuery = { statement: { text, values: [...values], signal: options?.fetchOptions?.signal }, started: false };
    const lazy: LocalQuery = {
      then(resolve, reject) {
        if (!pending.promise) {
          if (pending.started) return Promise.reject(new Error('Cannot await a query already consumed by a transaction.')).then(resolve, reject);
          pending.started = true;
          pending.promise = run([pending.statement], false).then(result => result[0]);
        }
        return pending.promise.then(resolve, reject);
      },
    };
    queries.set(lazy, pending);
    return lazy;
  };
  const tagged = (strings: TemplateStringsArray, ...values: unknown[]): LocalQuery => {
    if (!Array.isArray(strings) || !('raw' in strings)) throw new Error('Expected a tagged SQL template.');
    return query(strings.reduce((text, part, index) => text + (index ? `$${index}` : '') + part, ''), values);
  };
  return Object.assign(tagged, {
    query,
    close: () => pool.end(),
    async transaction(batch: readonly LocalQuery[], options?: LocalQueryOptions): Promise<LocalRows[]> {
      const pending = batch.map(item => queries.get(item));
      if (new Set(batch).size !== batch.length || pending.some(item => !item || item.started)) {
        throw new Error('Transaction requires distinct, unexecuted query objects from this transport.');
      }
      if (!batch.length) return [];
      const statements = pending.map(item => { item!.started = true; return item!.statement; });
      return run(statements, true, options?.fetchOptions?.signal);
    },
  });
}
