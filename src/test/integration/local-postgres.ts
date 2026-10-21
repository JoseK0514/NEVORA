import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Client } from 'pg';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

/** Keep this a literal equal to db/migrations/order.ts BASE_MIGRATIONS: the
 * PR16 database-restore rehearsal parses it from this file's source, and
 * src/test/migration-order.test.ts fails on any drift between the two. */
export const CURRENT_MIGRATIONS = [
  '0001_initial.sql',
  '0002_schedule_health.sql',
  '0003_schedule_assistance.sql',
  '0004_assistance_layer.sql',
  '0005_time_clock.sql',
  '0006_scheduling_rule_inputs.sql',
  '0007_portal_web_push.sql',
  '0008_workspace_positions.sql',
  '0009_schedule_generation.sql',
  '0010_shift_coverage_automation.sql',
  '0011_clocker_devices.sql',
  '0012_clocker_pins.sql',
  '0013_clocker_punches.sql',
  '0014_clocker_breaks.sql',
  '0015_clocker_schedule_context.sql',
  '0016_time_corrections.sql',
  '0017_missing_time_supersession.sql',
  '0018_timecards.sql',
  '0019_payroll_export_mappings.sql',
  '0020_account_recovery.sql',
  '0021_timecard_reassignment_interlock.sql',
  '0022_timecard_reopen_revision_authority.sql',
  '0023_employee_attention_receipts.sql',
  '0024_contextual_communications.sql',
  '0025_calendar_subscriptions.sql',
  '0023_template_ownership.sql',
  '0024_schedule_copy_receipts.sql',
  '0025_company_policies.sql',
  '0026_attendance_observations.sql',
  '0027_payroll_period_custody.sql', '0028_configurable_payroll.sql', '0029_payroll_private_notices.sql',
  '0030_notification_source_kinds.sql', '0031_workspace_presentation.sql', '0032_workspace_words_modules.sql',
  '0033_management_alert_preferences.sql', '0034_account_deletion_requests.sql', '0035_passkeys.sql',
] as const;

/** This adapter deliberately does not use the application's DATABASE_URL. Every
 * batch owns a connection: concurrent tests exercise actual PostgreSQL locks. */
async function createOwnedDatabase(prefix: 'fuel_phase3_test_' | 'nevora_foundation_test_' | 'nevora_generation_test_' | 'nevora_exchange_test_', migrations: number): Promise<{
  executor: SqlExecutor; connectionString: string; dispose(): Promise<void>;
}> {
  if (process.env.DATABASE_URL) throw new Error('Refusing DATABASE_URL; unset it before disposable SQL tests.');
  const value = process.env.FUEL_TEST_DATABASE_URL;
  if (!value || process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN !== 'yes') {
    throw new Error('SQL prerequisites: FUEL_TEST_DATABASE_URL must name a NEW loopback database with the required disposable prefix; FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes is required.');
  }
  const target = new URL(value);
  const name = decodeURIComponent(target.pathname.slice(1));
  if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
    || !new RegExp(`^${prefix}[a-z0-9_]{1,40}$`).test(name) || target.search || target.hash) {
    throw new Error('Refusing non-disposable/remote SQL target.');
  }
  const adminUrl = new URL(target); adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.href, connectionTimeoutMillis: 3000 });
  await admin.connect();
  const marker = `fuel-phase3-disposable:${randomUUID()}`;
  const assertOwned = async () => {
    const result = await admin.query('SELECT shobj_description(oid, \'pg_database\') AS marker FROM pg_database WHERE datname=$1', [name]);
    if (result.rows[0]?.marker !== marker) throw new Error('Disposable ownership marker missing; refusing teardown.');
  };
  let createdOid: number | undefined;
  try {
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) throw new Error('Refusing existing database, even if its name has the disposable prefix.');
    await admin.query(`CREATE DATABASE "${name}"`);
    createdOid = (await admin.query('SELECT oid FROM pg_database WHERE datname=$1', [name])).rows[0]?.oid;
    if (createdOid === undefined) throw new Error('Created database identity missing.');
    await admin.query(`COMMENT ON DATABASE "${name}" IS '${marker}'`);
    await assertOwned();
  } catch (error) {
    // Successful CREATE plus its captured database identity is invocation evidence
    // even when COMMENT fails. Never recover an existing/replaced caller database.
    try {
      if (createdOid !== undefined) {
        const current = await admin.query('SELECT oid FROM pg_database WHERE datname=$1', [name]);
        if (current.rows[0]?.oid === createdOid) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
      }
    } finally { await admin.end(); }
    throw error;
  }
  let disposed = false;
  const dispose = async () => {
    if (disposed) return;
    await assertOwned();
    await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    if ((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', [name])).rowCount) {
      throw new Error('Disposable database remains after teardown.');
    }
    disposed = true;
    await admin.end();
  };
  const run = async (statements: readonly SqlStatement[], transaction: boolean, signal?: AbortSignal) => {
    signal?.throwIfAborted();
    if (disposed) throw new Error('Disposable database was disposed.');
    const client = new Client({ connectionString: target.href, connectionTimeoutMillis: 3000, statement_timeout: 5000 });
    await client.connect();
    let pid: number | undefined;
    const abort = () => { if (pid !== undefined) void admin.query('SELECT pg_cancel_backend($1)', [pid]).catch(() => {}); };
    try {
      [{ pid }] = (await client.query('SELECT pg_backend_pid() AS pid')).rows;
      signal?.addEventListener('abort', abort, { once: true });
      signal?.throwIfAborted();
      if (transaction) await client.query('BEGIN');
      const results: unknown[][] = [];
      for (const statement of statements) {
        signal?.throwIfAborted();
        const result = await client.query(statement.text, [...statement.values]);
        results.push(result.rows);
      }
      signal?.throwIfAborted();
      if (transaction) await client.query('COMMIT');
      return results;
    } catch (error) {
      if (transaction) await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally { signal?.removeEventListener('abort', abort); await client.end(); }
  };
  const executor: SqlExecutor = {
    query: async <T>(statement: SqlStatement, signal?: AbortSignal) => (await run([statement], false, signal))[0] as T[],
    transaction: (statements, signal) => run(statements, true, signal),
  };
  try {
    // Exact checked-in sequence, including original transaction boundaries.
    for (const file of CURRENT_MIGRATIONS.slice(0, migrations)) {
      await assertOwned();
      await executor.query({ text: await readFile(resolve('db/migrations', file), 'utf8'), values: [] });
    }
  } catch (error) { await dispose(); throw error; }
  return { executor, connectionString: target.href, dispose };
}

export function createDisposableFoundationDatabase({ mode }: { mode: 'upgrade' | 'empty' | 'phase-c-base' | 'phase-d2-base' | 'current-runtime' }) {
  return createOwnedDatabase('nevora_foundation_test_', mode === 'current-runtime' ? CURRENT_MIGRATIONS.length : mode === 'phase-c-base' ? 10 : mode === 'phase-d2-base' ? 17 : mode === 'upgrade' ? 7 : 0);
}
export function createDisposableNotificationDatabase({beforePayrollNotices=false}: {beforePayrollNotices?:boolean}={}) {
  return createOwnedDatabase('fuel_phase3_test_', beforePayrollNotices ? CURRENT_MIGRATIONS.indexOf('0029_payroll_private_notices.sql') : CURRENT_MIGRATIONS.length);
}

export function createDisposableGenerationDatabase({mode = 'current-runtime'}: {mode?: 'current-runtime' | 'historical-8'} = {}) {
  return createOwnedDatabase('nevora_generation_test_', mode === 'historical-8' ? 8 : CURRENT_MIGRATIONS.length);
}

export function createDisposableExchangeDatabase({mode}: {mode: 'empty' | 'historical-9' | 'current-runtime'}) {
  return createOwnedDatabase('nevora_exchange_test_', mode === 'empty' ? 0 : mode === 'historical-9' ? 9 : CURRENT_MIGRATIONS.length);
}
