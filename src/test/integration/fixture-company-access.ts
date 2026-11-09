import {readFile} from 'node:fs/promises';
import type {SqlExecutor} from '../../lib/notifications/types';

const installations = new WeakMap<SqlExecutor, Promise<void>>();

export async function installFixtureCompanyAccess(executor: SqlExecutor) {
  const pending = installations.get(executor);
  if (pending) return pending;
  const installation = (async () => {
    const [database] = await executor.query<{name: string; marker: string}>({text: "SELECT datname AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()", values: []});
    if (!database || !/^(nevora_(foundation|generation|exchange)_test_|fuel_phase3_test_)[a-z0-9_]{1,40}$/.test(database.name) || !/^fuel-phase3-disposable:[a-f0-9-]{36}$/.test(database.marker)) throw Error('Company Access fixture requires an owned disposable database.');
    const [schema] = await executor.query<{payroll: boolean; access: boolean}>({text: "SELECT to_regclass('native_payroll_ledger') IS NOT NULL AS payroll,to_regclass('company_access_adoption') IS NOT NULL AS access", values: []});
    if (schema.access) return;
    const files = [...(schema.payroll ? [] : ['0031_native_payroll.sql']), '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql'];
    for (const name of files) await executor.query({text: await readFile('db/migrations/' + name, 'utf8'), values: []});
  })();
  installations.set(executor, installation);
  try { await installation; } catch (error) { installations.delete(executor); throw error; }
}
