import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const path = resolve('src/lib/tenancy/runtime/portal-authority-storage.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const statements = lexSql(source).parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
function body(tag: string) {
  const part = statements.find(statement => statement.text.includes(`$${tag}$`));
  expect(part, `closed ${tag} source is required`).toBeDefined();
  const literal = tokenizeDdl(part!.text).find(token => token.kind === 'literal' && token.raw.startsWith(`$${tag}$`));
  expect(literal).toBeDefined(); return literal!.raw.slice(tag.length + 2, -(tag.length + 2));
}
function table() {
  const tables = parseDdlDeclarations(source).tables;
  expect(tables, 'one empty protected authority table is required').toHaveLength(1);
  return tables[0];
}
function clauses(text: string, expected: string[]) { for (const clause of expected) expect(text).toContain(clause); }
const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
function originalBody(tag: string) { const separator = `$${tag}$`; return expansion.split(separator)[1]; }
// Source declarations/lexical contracts only: these do not execute SQL or interpret PL/pgSQL.
describe('empty portal authority storage source', () => {
  it('acquires exact installer fence first in its own explicit fresh ReadCommitted transaction', () => {
    expect(source.length, 'missing artifact is a missing feature, not a loader failure').toBeGreaterThan(0);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(statements.map(part => part.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'CREATE', 'CREATE', 'CREATE', 'ALTER', 'ALTER', 'REVOKE', 'REVOKE', 'REVOKE', 'DO', 'COMMIT']);
  });
  it('declares exact native text composite identity and explicit separate positive int8 revisions without defaults', () => {
    const t = table(); expect(t.name.normalized).toEqual(['nevora_tenancy', 'portal_authority']);
    expect(t.persistence).toBe('PERMANENT'); expect(t.ifNotExists).toBe(false);
    expect(t.columns.map(column => [column.name.normalized, column.dataType.raw])).toEqual([
      ['workspace_id', 'pg_catalog.text'], ['employee_id', 'pg_catalog.text'],
      ['authorization_version', 'pg_catalog.int8'], ['portal_access_version', 'pg_catalog.int8'],
      ['capability_policy_revision', 'pg_catalog.int8'], ['portal_state', 'pg_catalog.text'],
      ['proof_provenance', 'pg_catalog.text'], ['provenance_reference', 'pg_catalog.text'],
    ]);
    expect(t.columns.every(column => column.nullability.explicit === 'NOT_NULL')).toBe(true);
    expect(t.constraints.find(c => c.kind === 'PRIMARY_KEY')?.columns.map(c => c.normalized)).toEqual(['workspace_id', 'employee_id']);
    expect(t.constraints.filter(c => c.kind === 'DEFAULT')).toEqual([]);
    for (const revision of ['authorization_version', 'portal_access_version', 'capability_policy_revision']) expect(source).toContain(`CHECK (${revision} > 0::pg_catalog.int8)`);
  });
  it('keeps approved lifecycle separate from source active/password and distinct nonauthoritative provenance', () => {
    const checks = table().constraints.filter(c => c.kind === 'CHECK').map(c => words(c.expression!.raw));
    expect(checks).toContainEqual(['(', 'PORTAL_STATE', 'IN', '(', "'DISABLED'", ',', "'PROOF_PENDING'", ',', "'ENABLED'", ',', "'SUSPENDED'", ')', ')']);
    expect(checks).toContainEqual(['(', 'PROOF_PROVENANCE', 'IN', '(', "'UNVERIFIED'", ',', "'LEGACY_UNVERIFIED'", ',', "'VERIFIED'", ')', ')']);
    expect(source).toContain('new provisioning/import must be DISABLED');
    expect(source).toContain('A stored VERIFIED label/reference is not verification');
    expect(source).not.toMatch(/password_hash|employees\.active|DEFAULT\s+'ENABLED'/i);
  });
  it('preserves exact workspace/employment references and RESTRICT actions without rekeying original text', () => {
    const refs = table().constraints.filter(c => c.kind === 'FOREIGN_KEY'); expect(refs).toHaveLength(2);
    expect(refs.map(c => [c.columns.map(k => k.normalized), c.reference?.table.normalized, c.reference?.columns?.map(k => k.normalized), c.reference?.optionsRaw])).toEqual([
      [['workspace_id'], ['public', 'workspaces'], ['id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
      [['workspace_id', 'employee_id'], ['public', 'employees'], ['workspace_id', 'id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
    ]);
    expect(source).not.toMatch(/btrim|char_length|lower\(|upper\(|workspace-fuel|CASCADE/);
  });
  it('requires real persistent current-owned parent relations and an already owned control schema', () => {
    clauses(body('portal_authority_prerequisites'), ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user',
      "parent_namespace.nspname = 'public'", "parent.relname IN ('workspaces', 'employees')", "parent.relkind = 'r'", "parent.relpersistence = 'p'", 'parent.relowner = installer_oid',
      'portal_authority_schema_missing', 'portal_authority_schema_not_owned', 'portal_authority_parent_invalid']);
    expect(source).not.toMatch(/CREATE\s+SCHEMA|ALTER\s+TABLE\s+public\./i);
  });
  it('requires exact non-null text original IDs and validated enforced immediate physical workspace primary key', () => {
    clauses(body('portal_authority_prerequisites'), ["attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype", 'attribute.atttypmod = -1', "attribute.attname = 'id'", 'attribute.attnotnull',
      "key_constraint.contype = 'p'", 'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'", 'key_constraint.conkey = ARRAY[workspace_id_attnum]::pg_catalog.int2[]',
      'key_index.indisprimary', 'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate', 'key_index.indpred IS NULL', 'key_index.indexprs IS NULL']);
  });
  it('requires the accepted exact native employee composite key without inventing source ownership NOT NULL or validated backfill', () => {
    const pre = body('portal_authority_prerequisites');
    clauses(pre, ["attribute.attname = 'workspace_id'", "key_constraint.conname = 'f10_tenant_c49de3d265fb'", "key_constraint.contype = 'u'", 'key_constraint.conkey = ARRAY[employee_workspace_attnum, employee_id_attnum]::pg_catalog.int2[]',
      'key_index.indnatts = 2', 'key_index.indnkeyatts = 2', 'key_index.indkey[0] = employee_workspace_attnum', 'key_index.indkey[1] = employee_id_attnum', 'portal_authority_employee_key_invalid']);
    const workspaceColumn = pre.slice(pre.indexOf('-- Staged source workspace metadata'), pre.indexOf('IF employee_workspace_attnum IS NULL'));
    expect(workspaceColumn).not.toContain('attribute.attnotnull');
    expect(pre).not.toMatch(/f10_workspace_reference[\s\S]*convalidated/);
    expect(source).toContain('staged nullable employees.workspace_id and NOT VALID source workspace FK');
    expect(source).toContain('independently proved captured row ownership');
  });
  it('binds exact retained expansion identity/fence function bodies and native function flags instead of trusting names', () => {
    const pre = body('portal_authority_prerequisites');
    for (const tag of ['identity_guard', 'write_fence']) {
      const digest = createHash('sha256').update(originalBody(tag), 'utf8').digest('hex');
      expect(pre).toContain(digest);
    }
    clauses(pre, ['pg_catalog.convert_to(function.prosrc, \'UTF8\')', 'function.proowner = installer_oid', "function.prokind = 'f'", 'function.pronargs = 0', 'NOT function.proretset', 'function.prosecdef',
      "function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype", "function.provolatile = 'v'", "function.proparallel = 'u'", "language.lanname = 'plpgsql'", 'function.proargmodes IS NULL', 'function.proallargtypes IS NULL',
      "function.proconfig = ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[]"]);
  });
  it('requires exact enabled source identity/write routes and retained immutable workspace/employee contract anchors', () => {
    clauses(body('portal_authority_prerequisites'), ["trigger.tgname = 'f10_identity_guard'", 'trigger.tgtype = 31', "trigger.tgname = 'f10_write_fence'", 'trigger.tgtype = 62', "trigger.tgenabled = 'O'", 'NOT trigger.tgisinternal', 'trigger.tgconstraint = 0', 'trigger.tgnargs = 0', 'trigger.tgqual IS NULL', "trigger.tgargs = ''::pg_catalog.bytea",
      "contract.storage = 'DIRECT_IMMUTABLE'", "contract.primary_key_columns = ARRAY['id']::pg_catalog.name[]", "'{\"kind\":\"CAPTURED_IMMUTABLE\"}'::pg_catalog.jsonb", "'{\"kind\":\"ROOT\",\"column\":\"id\"}'::pg_catalog.jsonb", 'portal_authority_source_guard_invalid']);
    expect(source).not.toContain('VALIDATED_CAPTURE');
  });
  it('retains the original global employee id primary key and default native btree key components', () => {
    clauses(body('portal_authority_prerequisites'), [
      'key_constraint.conkey = ARRAY[employee_id_attnum]::pg_catalog.int2[]',
      'portal_authority_employee_identity_key_invalid',
      'key_index.indclass[0] = text_opclass_oid', 'key_index.indclass[1] = text_opclass_oid',
      'key_index.indcollation[0] = employee_workspace_collation', 'key_index.indcollation[1] = employee_id_collation',
      "opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace", "opclass.opcname = 'text_ops'",
      "opclass.opcintype = 'pg_catalog.text'::pg_catalog.regtype", 'opclass.opcdefault',
    ]);
  });
  it('closes retained guard strictness/support/leakproof flags rather than accepting body-only equivalence', () => {
    clauses(body('portal_authority_prerequisites'), ['NOT function.proisstrict', 'NOT function.proleakproof', 'function.prosupport = 0', 'function.probin IS NULL']);
  });
  it('rejects any existing same-name relation or guard overload and never destructively replaces it', () => {
    clauses(body('portal_authority_prerequisites'), ["relation.relname = 'portal_authority'", "function.proname = 'guard_portal_authority'", 'portal_authority_already_installed', 'portal_authority_guard_already_installed']);
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|\bDROP\b/i);
  });
  it('uses only a fixed-path invoker guard on exact metadata route and protects both identity bytes', () => {
    const part = statements.find(s => s.text.includes('CREATE FUNCTION')); expect(part).toBeDefined();
    clauses(part!.text, ['CREATE FUNCTION nevora_tenancy.guard_portal_authority()', 'RETURNS trigger', 'SECURITY INVOKER', 'SET search_path = pg_catalog']);
    expect(part!.text).not.toContain('SECURITY DEFINER');
    clauses(body('portal_authority_guard'), ["TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'", "TG_TABLE_NAME IS DISTINCT FROM 'portal_authority'", "TG_LEVEL IS DISTINCT FROM 'ROW'", "TG_LEVEL IS DISTINCT FROM 'STATEMENT'",
      "pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')", "pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8')", 'portal_authority_identity_immutable']);
  });
  it('denies revision reset/decrease and requires corresponding advance for sensitive state/provenance/policy edits', () => {
    const guard = body('portal_authority_guard');
    clauses(guard, ['NEW.authorization_version < OLD.authorization_version', 'NEW.portal_access_version < OLD.portal_access_version', 'NEW.capability_policy_revision < OLD.capability_policy_revision', 'portal_authority_revision_decreased',
      'NEW.portal_state IS DISTINCT FROM OLD.portal_state', 'NEW.proof_provenance IS DISTINCT FROM OLD.proof_provenance', "pg_catalog.convert_to(NEW.provenance_reference, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.provenance_reference, 'UTF8')",
      'NEW.authorization_version <= OLD.authorization_version', 'NEW.portal_access_version <= OLD.portal_access_version', 'NEW.capability_policy_revision IS DISTINCT FROM OLD.capability_policy_revision', 'portal_authority_revision_not_advanced']);
    expect(guard).not.toMatch(/EXECUTE|INSERT|SELECT|DELETE\s+FROM|\+\s*1|%/i);
  });
  it('prevents erasure/truncate revival with exact row and statement trigger coverage', () => {
    clauses(body('portal_authority_guard'), ["TG_OP = 'DELETE'", 'portal_authority_delete_forbidden', "TG_OP = 'TRUNCATE'", 'portal_authority_truncate_forbidden', 'RETURN NEW;']);
    const triggers = statements.filter(s => s.text.includes('CREATE TRIGGER')); expect(triggers).toHaveLength(2);
    clauses(triggers[0].text, ['BEFORE UPDATE OR DELETE ON nevora_tenancy.portal_authority', 'FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_authority()']);
    clauses(triggers[1].text, ['BEFORE TRUNCATE ON nevora_tenancy.portal_authority', 'FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_portal_authority()']);
  });
  it('forces zero-policy RLS and private PUBLIC revokes with no rows/grants/roles or activation installer side effects', () => {
    expect(statements.filter(s => s.leadingKeyword === 'ALTER').map(s => words(s.text).join(' '))).toEqual(['ALTER TABLE NEVORA_TENANCY . PORTAL_AUTHORITY ENABLE ROW LEVEL SECURITY ;', 'ALTER TABLE NEVORA_TENANCY . PORTAL_AUTHORITY FORCE ROW LEVEL SECURITY ;']);
    expect(statements.filter(s => s.leadingKeyword === 'REVOKE').map(s => words(s.text).join(' '))).toEqual(['REVOKE ALL ON SCHEMA NEVORA_TENANCY FROM PUBLIC ;', 'REVOKE ALL ON TABLE NEVORA_TENANCY . PORTAL_AUTHORITY FROM PUBLIC ;', 'REVOKE ALL ON FUNCTION NEVORA_TENANCY . GUARD_PORTAL_AUTHORITY ( ) FROM PUBLIC ;']);
    expect(statements.some(s => ['INSERT', 'UPDATE', 'DELETE', 'GRANT'].includes(s.leadingKeyword ?? ''))).toBe(false);
    expect(source).not.toMatch(/CREATE\s+(?:ROLE|POLICY)/i);
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('rejects ambient named default table/column/function privileges without silently rewriting named ACLs', () => {
    const acl = body('portal_authority_acl');
    clauses(acl, ['pg_catalog.aclexplode', "pg_catalog.acldefault('r', control.relowner)", "pg_catalog.acldefault('f', function.proowner)", 'attribute.attacl', 'privileges.grantee <> control.relowner', 'privileges.grantee <> function.proowner', 'portal_authority_acl_invalid']);
    for (const keyword of ['REVOKE', 'GRANT', 'EXECUTE']) expect(words(acl)).not.toContain(keyword);
  });
  it('refuses preexisting named schema privileges without repairing or silently retaining them', () => {
    clauses(body('portal_authority_acl'), ["pg_catalog.acldefault('n', namespace.nspowner)", "namespace.nspname = 'nevora_tenancy'", 'privileges.grantee <> namespace.nspowner']);
  });
  it('preserves lossless inert lexical source and explicitly retains incomplete enrollment/proof/recovery gates', () => {
    const journal = lexSql(source); expect(source.length).toBeGreaterThan(0);
    expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]); expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    expect(journal.parts.map(part => part.text).join('')).toBe(source);
    clauses(source, ['No anti-revival or recovery guarantee', 'legacy compatibility mapping', 'session generation', 'current-proof', 'actual Neon', 'missing authority row', 'No source rows']);
  });
});
