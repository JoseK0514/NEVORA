import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { CAPABILITIES } from '../../capabilities/types';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const path = resolve('src/lib/tenancy/runtime/portal-administrative-authority-storage.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const statements = lexSql(source).parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
const names = ['portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location'];
function body(tag: string) {
  const part = statements.find(statement => statement.text.includes(`$${tag}$`));
  expect(part, `required closed ${tag} implementation`).toBeDefined();
  const literal = tokenizeDdl(part!.text).find(token => token.kind === 'literal' && token.raw.startsWith(`$${tag}$`));
  expect(literal).toBeDefined(); return literal!.raw.slice(tag.length + 2, -(tag.length + 2));
}
function tables() {
  const result = parseDdlDeclarations(source).tables;
  expect(result, 'three normalized empty current-set relations are required').toHaveLength(3);
  return result;
}
function clauses(text: string, expected: string[]) { for (const clause of expected) expect(text).toContain(clause); }
const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const portal = readFileSync(resolve('src/lib/tenancy/runtime/portal-authority-storage.sql'), 'utf8');
const originalBody = (text: string, tag: string) => text.split(`$${tag}$`)[1];
// Inert native declaration/source contracts only; no SQL or PL/pgSQL execution.
describe('empty current portal administrative authority storage source', () => {
  it('owns explicit fresh RC and exact exclusive fence before prerequisites or creation', () => {
    expect(source.length, 'missing storage is a missing feature, not a loader error').toBeGreaterThan(0);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(statements[3].leadingKeyword).toBe('DO');
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('declares only the exact three permanent fresh current-set relations without defaults or copied role/state', () => {
    const declarations = tables();
    expect(declarations.map(table => table.name.normalized)).toEqual(names.map(name => ['nevora_tenancy', name]));
    expect(declarations.every(table => table.persistence === 'PERMANENT' && table.ifNotExists === false)).toBe(true);
    expect(declarations.map(table => table.columns.map(column => [column.name.normalized, column.dataType.raw]))).toEqual([
      [['workspace_id', 'pg_catalog.text'], ['employee_id', 'pg_catalog.text'], ['scope_kind', 'pg_catalog.text'],
        ['scope_origin', 'pg_catalog.text'], ['provenance_reference', 'pg_catalog.text'], ['capability_policy_revision', 'pg_catalog.int8']],
      [['workspace_id', 'pg_catalog.text'], ['employee_id', 'pg_catalog.text'], ['capability', 'pg_catalog.text']],
      [['workspace_id', 'pg_catalog.text'], ['employee_id', 'pg_catalog.text'], ['location_id', 'pg_catalog.text']],
    ]);
    expect(declarations.every(table => table.columns.every(column => column.nullability.explicit === 'NOT_NULL'))).toBe(true);
    expect(declarations.flatMap(table => table.constraints.filter(constraint => constraint.kind === 'DEFAULT'))).toEqual([]);
    expect(source).not.toMatch(/password_hash|employee_locations|eligible_location|portal_state\s+pg_catalog|role\s+pg_catalog/i);
  });
  it('retains exact native identity and ordered composite primary keys including empty/padded/long legacy bytes', () => {
    expect(tables().map(table => table.constraints.find(constraint => constraint.kind === 'PRIMARY_KEY')?.columns.map(column => column.normalized))).toEqual([
      ['workspace_id', 'employee_id'], ['workspace_id', 'employee_id', 'capability'], ['workspace_id', 'employee_id', 'location_id'],
    ]);
    expect(source).not.toMatch(/btrim|char_length|lower\(|upper\(|workspace-fuel|substring\(|substr\(NEW|length\(NEW/i);
    clauses(body('portal_administrative_guard'), [
      "pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')",
      "pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8')",
      "pg_catalog.convert_to(NEW.capability, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.capability, 'UTF8')",
      "pg_catalog.convert_to(NEW.location_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.location_id, 'UTF8')",
    ]);
  });
  it('stores closed approved scope/origin variants without legacy inference', () => {
    const checks = tables()[0].constraints.filter(constraint => constraint.kind === 'CHECK').map(constraint => constraint.expression!.raw);
    expect(checks).toContain('(scope_kind COLLATE pg_catalog."C" IN (\'ALL_TENANT\', \'LOCATIONS\'))');
    expect(checks).toContain('(scope_origin COLLATE pg_catalog."C" IN (\'LEGACY_COMPATIBILITY\', \'EXPLICIT_GRANT\'))');
    expect(checks).toContain('(scope_kind COLLATE pg_catalog."C" = \'ALL_TENANT\' OR scope_origin COLLATE pg_catalog."C" = \'EXPLICIT_GRANT\')');
    clauses(source, ['LEGACY_COMPATIBILITY requires independently captured approved source evidence', 'Neither provenance labels nor references authenticate approval']);
  });
  it('requires explicit positive nondecreasing native int8 policy revision without inventing per-grant policy changes', () => {
    expect(source).toContain('CHECK (capability_policy_revision > 0::pg_catalog.int8)');
    clauses(body('portal_administrative_guard'), ['NEW.capability_policy_revision IS NULL', 'NEW.capability_policy_revision < OLD.capability_policy_revision', 'portal_administrative_revision_decreased']);
    expect(body('portal_administrative_guard')).not.toMatch(/\+\s*1|authorization_version|portal_access_version|NEW\.scope_kind/);
    clauses(source, ['Grant/scope replacement must atomically advance existing authorization_version', 'policy definition changes also advance capability_policy_revision']);
  });
  it('binds the capability check exactly to unchanged approved vocabulary with byte-exact code comparison', () => {
    const checks = tables()[1].constraints.filter(constraint => constraint.kind === 'CHECK');
    expect(checks).toHaveLength(1);
    const literals = tokenizeDdl(checks[0].expression!.raw).filter(token => token.kind === 'literal').map(token => token.raw.slice(1, -1));
    expect(literals).toEqual([...CAPABILITIES]);
    expect(checks[0].expression!.raw).toContain('capability COLLATE pg_catalog."C" IN');
    expect(new Set(literals).size).toBe(CAPABILITIES.length);
  });
  it('uses actual same-tenant employment, portal and location keys with native RESTRICT references only', () => {
    const references = tables().map(table => table.constraints.filter(constraint => constraint.kind === 'FOREIGN_KEY').map(constraint => [
      constraint.columns.map(column => column.normalized), constraint.reference?.table.normalized,
      constraint.reference?.columns?.map(column => column.normalized), constraint.reference?.optionsRaw,
    ]));
    expect(references).toEqual([
      [[['workspace_id'], ['public', 'workspaces'], ['id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
        [['workspace_id', 'employee_id'], ['public', 'employees'], ['workspace_id', 'id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
        [['workspace_id', 'employee_id'], ['nevora_tenancy', 'portal_authority'], ['workspace_id', 'employee_id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT']],
      [[['workspace_id', 'employee_id'], ['nevora_tenancy', names[0]], ['workspace_id', 'employee_id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT']],
      [[['workspace_id', 'employee_id'], ['nevora_tenancy', names[0]], ['workspace_id', 'employee_id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
        [['workspace_id', 'location_id'], ['public', 'locations'], ['workspace_id', 'id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT']],
    ]);
    expect(source).not.toMatch(/CASCADE|ALTER\s+TABLE\s+public\./i);
  });
  it('requires exact persistent owned source and private portal parent plus preowned schema', () => {
    clauses(body('portal_administrative_prerequisites'), ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user',
      "parent_namespace.nspname = 'public'", "parent.relname IN ('workspaces', 'employees', 'locations')", "parent.relkind = 'r'", "parent.relpersistence = 'p'", 'parent.relowner = installer_oid',
      "control.relname = 'portal_authority'", 'portal_administrative_schema_missing', 'portal_administrative_schema_not_owned', 'portal_administrative_parent_invalid']);
    expect(source).not.toMatch(/CREATE\s+SCHEMA/i);
  });
  it('requires native exact text attributes while retaining staged nullable employee workspace metadata', () => {
    const pre = body('portal_administrative_prerequisites');
    clauses(pre, ["attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype", 'attribute.atttypmod = -1', "attribute.attidentity = ''", "attribute.attgenerated = ''", 'NOT attribute.atthasdef', 'attribute.attcollation']);
    const staged = pre.slice(pre.indexOf('-- Staged employee workspace'), pre.indexOf('-- Original location workspace'));
    expect(staged).toContain('employee_workspace_attnum'); expect(staged).not.toContain('attribute.attnotnull');
    expect(source).not.toMatch(/VALIDATE CONSTRAINT|ALTER\s+COLUMN/i);
  });
  it('requires complete original physical PKs and exact existing employee/location/portal composite keys', () => {
    clauses(body('portal_administrative_prerequisites'), ["'f10_tenant_c49de3d265fb'", "'communication_location_workspace_key'",
      'ARRAY[workspace_id_attnum]', 'ARRAY[employee_id_attnum]', 'ARRAY[location_id_attnum]',
      'ARRAY[employee_workspace_attnum, employee_id_attnum]', 'ARRAY[location_workspace_attnum, location_id_attnum]',
      'ARRAY[portal_workspace_attnum, portal_employee_attnum]', 'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'",
      'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate', 'NOT key_index.indnullsnotdistinct', 'key_index.indpred IS NULL', 'key_index.indexprs IS NULL',
      'key_index.indnatts', 'key_index.indnkeyatts', 'key_index.indkey', 'key_index.indclass', 'key_index.indcollation', 'key_index.indoption', 'key_relation.relowner = installer_oid', "method.amname = 'btree'"]);
  });
  it('binds default builtin text opclasses and original ordered collation rather than changing source comparisons', () => {
    clauses(body('portal_administrative_prerequisites'), ["opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace", "opclass.opcname = 'text_ops'", "opclass.opcintype = 'pg_catalog.text'::pg_catalog.regtype", 'opclass.opcdefault',
      'workspace_id_collation', 'employee_workspace_collation', 'employee_id_collation', 'location_workspace_collation', 'location_id_collation', 'portal_workspace_collation', 'portal_employee_collation']);
  });
  it('checks accepted portal native eight-column, forced zero-policy and exact native FK envelope before reuse', () => {
    clauses(body('portal_administrative_prerequisites'), ['portal_attribute_count <> 8', 'portal_column_invalid', 'control.relrowsecurity', 'control.relforcerowsecurity', 'pg_catalog.pg_policy',
      "'authorization_version'", "'portal_access_version'", "'capability_policy_revision'", "'portal_state'", "'proof_provenance'", "'provenance_reference'",
      'key_constraint.confrelid = workspace_oid', 'key_constraint.confrelid = employee_oid', "key_constraint.confupdtype = 'r'", "key_constraint.confdeltype = 'r'", "key_constraint.confmatchtype = 's'", 'portal_administrative_portal_invalid']);
  });
  it('binds original native guard bodies/flags and every exact enabled workspace/employee/location route', () => {
    const pre = body('portal_administrative_prerequisites');
    for (const tag of ['identity_guard', 'write_fence']) expect(pre).toContain(createHash('sha256').update(originalBody(expansion, tag), 'utf8').digest('hex'));
    clauses(pre, ['function.proowner = installer_oid', "function.prokind = 'f'", 'function.pronargs = 0', 'function.proargmodes IS NULL', 'function.proallargtypes IS NULL', 'NOT function.proretset', 'function.prosecdef',
      'NOT function.proisstrict', 'NOT function.proleakproof', 'function.prosupport = 0', 'function.probin IS NULL', "function.provolatile = 'v'", "function.proparallel = 'u'", "language.lanname = 'plpgsql'",
      "function.proconfig = ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[]", 'trigger.tgrelid IN (workspace_oid, employee_oid, location_oid)', 'trigger.tgtype = 31', 'trigger.tgtype = 62', "trigger.tgenabled = 'O'", 'trigger.tgconstraint = 0', 'trigger.tgnargs = 0', 'trigger.tgqual IS NULL']);
  });
  it('requires accepted original anchors/control provenance without manufacturing captured ownership or cutover', () => {
    clauses(body('portal_administrative_prerequisites'), ["contract.table_name = 'employees'", "contract.table_name = 'workspaces'", "contract.table_name = 'locations'",
      "'{\"kind\":\"CAPTURED_IMMUTABLE\"}'::pg_catalog.jsonb", "'{\"kind\":\"ROOT\",\"column\":\"id\"}'::pg_catalog.jsonb", "'{\"kind\":\"DIRECT\",\"column\":\"workspace_id\"}'::pg_catalog.jsonb",
      "contract.primary_key_columns = ARRAY['id']::pg_catalog.name[]", 'contract.sidecar_name IS NULL', 'protocol.migration_id = 26', "protocol.phase IN ('EXPANDED_LEGACY', 'FENCED')",
      "'7c628e374f03c9025b2c0cfd3568be033f07238d'", "'5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681'"]);
    expect(source).not.toContain('VALIDATED_CAPTURE');
  });
  it('binds accepted portal guard source/function/route/owner and its private ACL, not a name-only parent assertion', () => {
    const pre = body('portal_administrative_prerequisites');
    expect(pre).toContain(createHash('sha256').update(originalBody(portal, 'portal_authority_guard'), 'utf8').digest('hex'));
    clauses(pre, ["function.proname = 'guard_portal_authority'", 'NOT function.prosecdef', "function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]", "trigger.tgname = 'portal_authority_row_guard'", 'trigger.tgtype = 27', "trigger.tgname = 'portal_authority_truncate_guard'", 'trigger.tgtype = 34', 'portal_administrative_portal_guard_invalid', 'portal_administrative_portal_acl_invalid']);
  });
  it('rejects any same-name target or guard overload fresh-only, with no replacement/destructive repair', () => {
    clauses(body('portal_administrative_prerequisites'), ["relation.relname IN ('portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location')", "function.proname = 'guard_portal_administrative_authority'", 'portal_administrative_already_installed', 'portal_administrative_guard_already_installed']);
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|\bDROP\b/i);
  });
  it('uses a closed fixed-path invoker route and protects individual identities, not mutable scope/grant values', () => {
    const functions = statements.filter(statement => statement.leadingKeyword === 'CREATE' && words(statement.text)[1] === 'FUNCTION');
    expect(functions).toHaveLength(1);
    clauses(functions[0].text, ['CREATE FUNCTION nevora_tenancy.guard_portal_administrative_authority()', 'RETURNS trigger', 'SECURITY INVOKER', 'SET search_path = pg_catalog']);
    clauses(body('portal_administrative_guard'), ["TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'", 'portal_administrative_guard_route_invalid', 'portal_administrative_identity_immutable', "TG_LEVEL IS DISTINCT FROM 'ROW'", "TG_LEVEL IS DISTINCT FROM 'STATEMENT'"]);
    expect(functions[0].text).not.toContain('SECURITY DEFINER');
  });
  it('permits controlled current-set deletion/replacement while rejecting unscoped truncate without inventing retained history', () => {
    const guard = body('portal_administrative_guard');
    expect(guard).not.toContain("TG_OP = 'DELETE'"); expect(guard).not.toMatch(/delete_forbidden|RETURN OLD|INSERT|SELECT|DELETE\s+FROM|EXECUTE\s/i);
    clauses(guard, ["TG_OP = 'TRUNCATE'", 'portal_administrative_truncate_forbidden']);
    const triggers = statements.filter(statement => words(statement.text)[0] === 'CREATE' && words(statement.text)[1] === 'TRIGGER');
    expect(triggers).toHaveLength(6);
    for (const name of names) {
      expect(triggers.some(statement => statement.text.includes(`BEFORE UPDATE ON nevora_tenancy.${name}`))).toBe(true);
      expect(triggers.some(statement => statement.text.includes(`BEFORE TRUNCATE ON nevora_tenancy.${name}`))).toBe(true);
    }
    expect(source).not.toMatch(/retention_days|expires_at\s+pg_catalog|created_at\s+pg_catalog|tombstone|audit_event\s+pg_catalog/i);
  });
  it('forces all three tables with zero policies and explicit PUBLIC revokes, no grants/seeds/helper activation', () => {
    const alters = statements.filter(statement => statement.leadingKeyword === 'ALTER'); expect(alters).toHaveLength(6);
    for (const name of names) {
      expect(alters.map(statement => words(statement.text).join(' '))).toContain(`ALTER TABLE NEVORA_TENANCY . ${name.toUpperCase()} ENABLE ROW LEVEL SECURITY ;`);
      expect(alters.map(statement => words(statement.text).join(' '))).toContain(`ALTER TABLE NEVORA_TENANCY . ${name.toUpperCase()} FORCE ROW LEVEL SECURITY ;`);
      expect(source).toContain(`REVOKE ALL ON TABLE nevora_tenancy.${name} FROM PUBLIC;`);
    }
    expect(source).toContain('REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;');
    expect(source).toContain('REVOKE ALL ON FUNCTION nevora_tenancy.guard_portal_administrative_authority() FROM PUBLIC;');
    expect(statements.some(statement => ['INSERT', 'UPDATE', 'DELETE', 'GRANT'].includes(statement.leadingKeyword ?? ''))).toBe(false);
    expect(source).not.toMatch(/CREATE\s+(ROLE|POLICY|SCHEMA)/i);
  });
  it('rejects expanded nonowner schema/table/column/function/default ACLs atomically without repairing named grants', () => {
    clauses(body('portal_administrative_acl'), ['pg_catalog.aclexplode', "pg_catalog.acldefault('n', namespace.nspowner)", "pg_catalog.acldefault('r', control.relowner)", "pg_catalog.acldefault('f', function.proowner)", 'attribute.attacl',
      'privileges.grantee <> namespace.nspowner', 'privileges.grantee <> control.relowner', 'privileges.grantee <> function.proowner', 'portal_administrative_acl_invalid']);
    for (const keyword of ['GRANT', 'REVOKE', 'EXECUTE']) expect(words(body('portal_administrative_acl'))).not.toContain(keyword);
  });
  it('keeps complete lossless inert source and explicitly discloses protected writer/current-proof/recovery gates', () => {
    const lexical = lexSql(source); expect(source.length).toBeGreaterThan(0); expect(lexical.complete).toBe(true);
    expect(lexical.diagnostics).toEqual([]); expect(lexical.semanticAnalysis).toBe('NOT_PERFORMED');
    expect(lexical.parts.map(part => part.text).join('')).toBe(source);
    clauses(source, ['No source rows, roles, grants', 'No atomic grant replacement', 'header-policy equality', 'full-set', 'current-proof', 'actual Neon', 'F10/F12', 'No anti-revival or recovery guarantee']);
  });
});
