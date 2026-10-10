import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { tokenizeDdl, parseDdlDeclarations } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const source = readFileSync(resolve('src/lib/tenancy/runtime/portal-source-locks.sql'), 'utf8');
const journal = lexSql(source);
const statements = journal.parts.filter(p => p.kind === 'statement');
const words = (s: string) => tokenizeDdl(s).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw);
const normalized = (s: string) => s.replace(/\s+/g, ' ').trim();
function body(tag: string) {
  const raw = tokenizeDdl(source).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`))?.raw;
  expect(raw, `missing ${tag} source feature`).toBeDefined();
  return raw!.slice(tag.length + 2, -(tag.length + 2));
}
const clauses = (s: string, expected: string[]) => { for (const clause of expected) expect(s).toContain(clause); };
const required = [
  ['public.workspaces', 'workspace.id'], ['public.employees', 'employee.id'],
  ['public.employee_credentials', 'credential.employee_id'],
  ['nevora_tenancy.workspace_incarnation_counter', 'incarnation.workspace_id'],
  ['nevora_tenancy.portal_authority', 'authority.workspace_id, authority.employee_id'],
  ['public.employee_sessions', 'session.token_hash'],
  ['nevora_tenancy.portal_session_issuance', 'issuance.token_hash'],
] as const;

// Inert lexical/native catalog source contracts only. No SQL/PLpgSQL/locks/RLS is executed.
describe('unused single-employment portal source lock kernel source', () => {
  it('owns explicit ReadCommitted and installs only after the exact first exclusive catalog fence', () => {
    expect(journal.diagnostics).toEqual([]); expect(journal.complete).toBe(true);
    expect(statements.map(s => s.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'REVOKE', 'DO', 'COMMIT']);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('declares one fixed native INVOKER void function with no credential or caller authority parameters', () => {
    const create = statements.find(s => s.leadingKeyword === 'CREATE')?.text;
    expect(create).toContain('CREATE FUNCTION nevora_tenancy.lock_portal_source_rows(');
    clauses(create!, ['p_workspace_id pg_catalog.text', 'p_employee_id pg_catalog.text', 'p_session_token_hash pg_catalog.bpchar',
      'RETURNS pg_catalog.void', 'LANGUAGE plpgsql', 'SECURITY INVOKER', 'SET search_path = pg_catalog']);
    expect(create).not.toMatch(/SECURITY DEFINER|CREATE OR REPLACE|IF NOT EXISTS/i);
    expect(tokenizeDdl(source).filter(t => t.kind === 'word' && t.raw.toUpperCase() === 'GRANT')).toEqual([]);
    expect(parseDdlDeclarations(source).tables).toEqual([]);
  });
  it('requires an existing current-owned schema and every exact native parent/private relation', () => {
    const pre = body('portal_source_lock_prerequisites');
    clauses(pre, ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user',
      "relation.relkind = 'r'", "relation.relpersistence = 'p'", 'relation.relowner = installer_oid',
      'portal_source_lock_schema_missing', 'portal_source_lock_schema_not_owned', 'portal_source_lock_relation_invalid']);
    for (const table of ['workspaces', 'employees', 'employee_credentials', 'employee_sessions', 'locations',
      'workspace_incarnation_counter', 'portal_authority', 'portal_session_issuance', 'portal_administrative_authority',
      'portal_administrative_capability', 'portal_administrative_location']) expect(pre).toContain(`'${table}'`);
  });
  it('requires native key columns and immediate valid physical keys, preserving staged nullable employee ownership', () => {
    const pre = body('portal_source_lock_prerequisites');
    clauses(pre, ['attribute.atttypid', 'attribute.atttypmod', 'attribute.attnotnull', 'attribute.attidentity', 'attribute.attgenerated',
      'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'",
      'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate',
      'NOT key_index.indnullsnotdistinct', 'key_index.indpred IS NULL', 'key_index.indexprs IS NULL',
      'key_index.indkey', 'key_index.indclass', 'key_index.indcollation', 'key_index.indoption', "method.amname = 'btree'",
      "'f10_tenant_c49de3d265fb'", 'portal_source_lock_key_invalid']);
    expect(pre).toContain("('public', 'employees', 'workspace_id', 'pg_catalog.text', -1, false)");
    expect(pre).not.toContain('f10_workspace_reference');
  });
  it('requires the retained native FK actions and all six private tables FORCE-RLS without policies', () => {
    const pre = body('portal_source_lock_prerequisites');
    clauses(pre, ['foreign_key.confrelid', 'foreign_key.conkey', 'foreign_key.confkey', 'foreign_key.confupdtype', 'foreign_key.confdeltype',
      'foreign_key.convalidated', 'NOT foreign_key.condeferrable', 'NOT foreign_key.condeferred',
      'relation.relrowsecurity', 'relation.relforcerowsecurity', 'pg_catalog.pg_policy', 'portal_source_lock_reference_invalid']);
    expect(pre).toContain("'employee_sessions', ARRAY['token_hash'], 'r', 'c'");
    expect(pre).toContain("'employees', ARRAY['workspace_id','id'], 'r', 'c'");
  });
  it('binds retained guard bodies/flags/trigger routes rather than accepting function names', () => {
    const pre = body('portal_source_lock_prerequisites');
    for (const [file, tag] of [['workspace-incarnation-storage.sql', 'workspace_incarnation_guard'],
      ['portal-authority-storage.sql', 'portal_authority_guard'], ['portal-session-issuance-storage.sql', 'portal_session_issuance_guard'],
      ['portal-administrative-authority-storage.sql', 'portal_administrative_guard']] as const) {
      const original = readFileSync(resolve('src/lib/tenancy/runtime', file), 'utf8');
      const raw = tokenizeDdl(original).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`))!.raw;
      expect(pre).toContain(createHash('sha256').update(raw.slice(tag.length + 2, -(tag.length + 2)), 'utf8').digest('hex'));
    }
    clauses(pre, ['pg_catalog.convert_to(function.prosrc, \'UTF8\')', 'function.proowner = installer_oid',
      "function.prokind = 'f'", 'function.pronargs = 0', 'NOT function.proretset', "language.lanname = 'plpgsql'",
      'function.prosecdef = expected.definer', "trigger.tgenabled = 'O'", 'trigger.tgtype = expected.trigger_type',
      'trigger.tgfoid = function.oid', 'NOT trigger.tgisinternal', 'trigger.tgqual IS NULL', 'portal_source_lock_guard_invalid']);
  });
  it('rejects any pre-existing overload and ambient named schema/table/column/function ACLs without repairing them', () => {
    clauses(body('portal_source_lock_prerequisites'), ["function.proname = 'lock_portal_source_rows'", 'portal_source_lock_already_installed',
      'pg_catalog.aclexplode', 'privilege.grantee <>', 'attribute.attacl', 'portal_source_lock_acl_invalid']);
    clauses(body('portal_source_lock_final_acl'), ['function.proowner', 'pg_catalog.aclexplode', 'privilege.grantee <> function.proowner', 'portal_source_lock_acl_invalid']);
    expect(source).toContain('REVOKE ALL ON FUNCTION nevora_tenancy.lock_portal_source_rows(pg_catalog.text, pg_catalog.text, pg_catalog.bpchar) FROM PUBLIC;');
  });
  it.each(required)('locks required %s then immediately raises fixed missing-source denial', (table, projection) => {
    const kernel = body('portal_source_locks');
    const pattern = new RegExp(`PERFORM ${projection.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?FROM ${table.replace('.', '\\.')}[\\s\\S]*?FOR SHARE;[\\s]*IF NOT FOUND THEN[\\s]*RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';[\\s]*END IF;`);
    expect(kernel).toMatch(pattern);
  });
  it('orders the seven required keys before optional header and complete child sets', () => {
    const kernel = body('portal_source_locks');
    const locks = [...kernel.matchAll(/FROM (public|nevora_tenancy)\.(\w+) AS \w+[\s\S]*?FOR SHARE;/g)].map(m => `${m[1]}.${m[2]}`);
    expect(locks).toEqual([...required.map(r => r[0]), 'nevora_tenancy.portal_administrative_authority',
      'nevora_tenancy.portal_administrative_capability', 'nevora_tenancy.portal_administrative_location']);
  });
  it('preserves exact UTF8 text keys and native char-session equality without normalization', () => {
    const kernel = body('portal_source_locks');
    clauses(kernel, ["pg_catalog.convert_to(employee.workspace_id, 'UTF8')", "pg_catalog.convert_to(p_workspace_id, 'UTF8')",
      "pg_catalog.convert_to(p_employee_id, 'UTF8')", 'session.token_hash = p_session_token_hash', 'issuance.token_hash = p_session_token_hash']);
    expect(kernel).not.toMatch(/btrim|trim\(|upper\(|lower\(|char_length|length\(|password_hash|expires_at|portal_state|incarnation\s*[=><]|RETURN (TRUE|FALSE)/i);
    expect(kernel).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|SET|EXECUTE|CALL)\b/i);
  });
  it('locks full optional child sets in byte order without inventing a header or complete-source assertion', () => {
    const kernel = body('portal_source_locks');
    clauses(kernel, ['IF FOUND THEN', "ORDER BY pg_catalog.convert_to(capability.capability, 'UTF8')", "ORDER BY pg_catalog.convert_to(location.location_id, 'UTF8')"]);
    expect(kernel).not.toMatch(/LIMIT|OFFSET|DISTINCT|COUNT\(|ALL_TENANT|ELSE/);
    expect(source).toContain('persistent portal_authority serialization row');
    expect(source).toContain('complete employee set before downstream locks');
    expect(source).toContain('not authentication, eligibility or current-proof authority');
  });
  it('remains unreferenced by accepted runtime callers and installs no business state or privileges', () => {
    for (const path of ['src/lib/tenancy/resolve.server.ts', 'src/lib/tenancy/executor.server.ts', 'src/lib/auth/session.ts'])
      expect(readFileSync(resolve(path), 'utf8')).not.toContain('lock_portal_source_rows');
    expect(source).not.toMatch(/CREATE\s+(TABLE|POLICY|ROLE|SCHEMA)|ALTER\s+TABLE|set_config|backfill_actor|workspace-fuel/i);
    expect(source).toContain('caller owns its transaction and acquires the shared catalog fence first');
    expect(source).toContain('autocommit immediately releases locks');
  });
  it('uses accepted key declarations as source evidence rather than inventing composite source sessions', () => {
    const session = parseDdlDeclarations(readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8')).tables.find(t => t.name.normalized.at(-1) === 'employee_sessions')!;
    expect(session.columns.find(c => c.name.normalized === 'token_hash')?.dataType.raw).toBe('char(64)');
    expect(session.constraints.find(c => c.kind === 'PRIMARY_KEY')?.columns.map(c => c.normalized)).toEqual(['token_hash']);
    const binding = parseDdlDeclarations(readFileSync(resolve('src/lib/tenancy/runtime/portal-session-issuance-storage.sql'), 'utf8')).tables[0];
    expect(binding.constraints.find(c => c.kind === 'PRIMARY_KEY')?.columns.map(c => c.normalized)).toEqual(['token_hash']);
    expect(normalized(body('portal_source_locks'))).not.toContain('FOR UPDATE');
  });
});
