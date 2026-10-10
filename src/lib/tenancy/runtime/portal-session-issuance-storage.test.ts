import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const path = resolve('src/lib/tenancy/runtime/portal-session-issuance-storage.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
const clauses = (text: string, expected: string[]) => { for (const clause of expected) expect(text).toContain(clause); };
function body(tag: string) {
  const statement = statements.find(part => part.text.includes(`$${tag}$`));
  expect(statement, `missing ${tag} source feature`).toBeDefined();
  const literal = tokenizeDdl(statement!.text).find(token => token.kind === 'literal' && token.raw.startsWith(`$${tag}$`));
  expect(literal).toBeDefined(); return literal!.raw.slice(tag.length + 2, -(tag.length + 2));
}
function table() {
  const declarations = parseDdlDeclarations(source); expect(declarations.tables).toHaveLength(1);
  const t = declarations.tables[0];
  expect(declarations.diagnostics.filter(d => d.span.startOffset >= t.span.startOffset && d.span.startOffset < t.span.endOffset)).toEqual([]);
  return t;
}
const expansion = readFileSync(resolve('db/migrations/0026_tenant_ownership_expand.sql'), 'utf8');
const initial = readFileSync(resolve('db/migrations/0001_initial.sql'), 'utf8');
// Inert lexical/declaration contracts: no SQL, PL/pgSQL, cascade or RLS behavior is executed here.
describe('unused live portal-session issuance storage source', () => {
  it('first acquires the exact installer fence in explicit ReadCommitted before prerequisite reads or DDL', () => {
    expect(source.length, 'missing artifact is feature RED rather than a loader error').toBeGreaterThan(0);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(statements.map(part => part.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'CREATE', 'CREATE', 'ALTER', 'ALTER', 'REVOKE', 'REVOKE', 'REVOKE', 'DO', 'COMMIT']);
  });
  it('declares exactly six explicit native fields with no default, copied expiry or invented issuance rights', () => {
    const t = table(); expect(t.name.normalized).toEqual(['nevora_tenancy', 'portal_session_issuance']);
    expect(t.persistence).toBe('PERMANENT'); expect(t.ifNotExists).toBe(false);
    expect(t.columns.map(column => [column.name.normalized, column.dataType.raw])).toEqual([
      ['token_hash', 'pg_catalog.bpchar(64)'], ['workspace_id', 'pg_catalog.text'], ['employee_id', 'pg_catalog.text'],
      ['workspace_incarnation', 'pg_catalog.int8'], ['portal_access_version', 'pg_catalog.int8'], ['session_created_at', 'pg_catalog.timestamptz'],
    ]);
    expect(t.columns.every(column => column.nullability.explicit === 'NOT_NULL')).toBe(true);
    expect(t.constraints.find(c => c.kind === 'PRIMARY_KEY')?.columns.map(c => c.normalized)).toEqual(['token_hash']);
    expect(t.constraints.filter(c => c.kind === 'DEFAULT')).toEqual([]);
    for (const field of ['workspace_incarnation', 'portal_access_version']) expect(source).toContain(`CHECK (${field} > 0::pg_catalog.int8)`);
    const declaration = statements.find(part => part.text.includes('CREATE TABLE'))!.text;
    expect(declaration).not.toMatch(/expires_at|authorization_version|role|capabilit|provenance|hex/i);
  });
  it('keeps source hash and scoped employee native FK cascades compatible with hard revocation', () => {
    const refs = table().constraints.filter(c => c.kind === 'FOREIGN_KEY'); expect(refs).toHaveLength(3);
    expect(refs.map(c => [c.columns.map(k => k.normalized), c.reference?.table.normalized, c.reference?.columns?.map(k => k.normalized), c.reference?.optionsRaw])).toEqual([
      [['token_hash'], ['public', 'employee_sessions'], ['token_hash'], 'ON UPDATE RESTRICT ON DELETE CASCADE'],
      [['workspace_id'], ['public', 'workspaces'], ['id'], 'ON UPDATE RESTRICT ON DELETE RESTRICT'],
      [['workspace_id', 'employee_id'], ['public', 'employees'], ['workspace_id', 'id'], 'ON UPDATE RESTRICT ON DELETE CASCADE'],
    ]);
    expect(parseDdlDeclarations(initial).tables.find(t => t.name.normalized.at(-1) === 'employee_sessions')?.constraints.filter(c => c.kind === 'PRIMARY_KEY').map(c => c.columns.map(k => k.normalized))).toEqual([['token_hash']]);
    expect(source).not.toMatch(/REFERENCES public\.employee_sessions\(token_hash,|ALTER\s+TABLE\s+public\./i);
  });
  it('requires preowned schema and all three actual current-owned persistent source relations', () => {
    clauses(body('portal_session_issuance_prerequisites'), ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user', 'schema_owner IS DISTINCT FROM installer_oid',
      "parent_namespace.nspname = 'public'", "parent.relname IN ('workspaces', 'employees', 'employee_sessions')", "parent.relkind = 'r'", "parent.relpersistence = 'p'", 'parent.relowner = installer_oid',
      'portal_session_issuance_schema_missing', 'portal_session_issuance_schema_not_owned', 'portal_session_issuance_parent_invalid']);
    expect(source).not.toMatch(/CREATE\s+SCHEMA|CREATE\s+ROLE/i);
  });
  it('binds the original four session columns including native char64 and original now default without rewriting them', () => {
    clauses(body('portal_session_issuance_prerequisites'), ["attribute.attname = 'token_hash'", "attribute.atttypid = 'pg_catalog.bpchar'::pg_catalog.regtype", 'attribute.atttypmod = 68',
      "attribute.attname = 'employee_id'", "attribute.attname IN ('expires_at', 'created_at')", "attribute.atttypid = 'pg_catalog.timestamptz'::pg_catalog.regtype", 'attribute.attnotnull',
      "attribute.attidentity = ''", "attribute.attgenerated = ''", "pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid) = 'now()'", 'portal_session_issuance_session_columns_invalid']);
    expect(body('portal_session_issuance_prerequisites')).toContain('ARRAY[\'token_hash\', \'employee_id\', \'expires_at\', \'created_at\']::pg_catalog.name[]');
  });
  it('retains real nondeferrable enforced session global primary key with exact native default btree semantics', () => {
    clauses(body('portal_session_issuance_prerequisites'), ["key_constraint.contype = 'p'", 'key_constraint.conrelid = session_oid', 'key_constraint.conkey = ARRAY[session_token_attnum]::pg_catalog.int2[]',
      'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'", 'key_index.indisprimary', 'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate',
      'key_index.indclass[0] = bpchar_opclass_oid', 'key_index.indcollation[0] = session_token_collation', 'key_index.indoption[0] = 0', "opclass.opcname = 'bpchar_ops'", 'opclass.opcdefault', "method.amname = 'btree'", 'portal_session_issuance_session_key_invalid']);
  });
  it('binds actual original employee cascade FK and both retained session lookup indexes', () => {
    clauses(body('portal_session_issuance_prerequisites'), ['reference.conrelid = session_oid', 'reference.confrelid = employee_oid', 'reference.conkey = ARRAY[session_employee_attnum]::pg_catalog.int2[]',
      'reference.confkey = ARRAY[employee_id_attnum]::pg_catalog.int2[]', "reference.confupdtype = 'a'", "reference.confdeltype = 'c'", "reference.confmatchtype = 's'", 'reference.convalidated', 'NOT reference.condeferrable', "->> 'conenforced'",
      "lookup.relname = 'employee_sessions_employee_idx'", "lookup.relname = 'employee_sessions_expires_idx'", 'lookup_index.indkey[0] = session_employee_attnum', 'lookup_index.indkey[0] = session_expiry_attnum', 'portal_session_issuance_session_reference_invalid', 'portal_session_issuance_session_indexes_invalid']);
  });
  it('retains exact scoped employment and native workspace keys without premature nullable-ownership cutover', () => {
    const pre = body('portal_session_issuance_prerequisites');
    clauses(pre, ["key_constraint.conname = 'f10_tenant_c49de3d265fb'", 'key_constraint.conkey = ARRAY[employee_workspace_attnum, employee_id_attnum]::pg_catalog.int2[]',
      'key_constraint.conkey = ARRAY[workspace_id_attnum]::pg_catalog.int2[]', 'key_constraint.conkey = ARRAY[employee_id_attnum]::pg_catalog.int2[]', 'key_index.indclass[0] = text_opclass_oid', 'key_index.indcollation[1] = employee_id_collation']);
    const staged = pre.slice(pre.indexOf('-- Staged source workspace metadata'), pre.indexOf('IF employee_workspace_attnum IS NULL'));
    expect(staged).not.toContain('attribute.attnotnull');
    expect(source).toContain('staged nullable ownership'); expect(source).toContain('independently captured ownership');
  });
  it('pins retained source function bodies and complete flags, rather than matching source guard names only', () => {
    const pre = body('portal_session_issuance_prerequisites');
    for (const tag of ['identity_guard', 'write_fence']) expect(pre).toContain(createHash('sha256').update(expansion.split(`$${tag}$`)[1], 'utf8').digest('hex'));
    clauses(pre, ['function.proowner = installer_oid', 'function.prosecdef', 'function.pronargs = 0', "function.proargtypes = ''::pg_catalog.oidvector", 'function.proargmodes IS NULL', 'function.proallargtypes IS NULL', 'NOT function.proretset', 'NOT function.proisstrict', 'NOT function.proleakproof', 'function.prosupport = 0', 'function.probin IS NULL',
      "function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype", "function.provolatile = 'v'", "function.proparallel = 'u'", "language.lanname = 'plpgsql'", "function.proconfig = ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[]"]);
  });
  it('requires all six exact source routes and original immutable session-parent contract anchor', () => {
    clauses(body('portal_session_issuance_prerequisites'), ['trigger.tgrelid IN (workspace_oid, employee_oid, session_oid)', "trigger.tgname = 'f10_identity_guard'", 'trigger.tgtype = 31', "trigger.tgname = 'f10_write_fence'", 'trigger.tgtype = 62', "trigger.tgenabled = 'O'", 'trigger.tgconstraint = 0', 'trigger.tgnargs = 0', 'trigger.tgqual IS NULL', "trigger.tgargs = ''::pg_catalog.bytea", 'trigger.tgoldtable IS NULL', 'trigger.tgnewtable IS NULL',
      "contract.table_name = 'employee_sessions'", "contract.storage = 'IMMUTABLE_PARENT'", "contract.primary_key_columns = ARRAY['token_hash']::pg_catalog.name[]", "'{\"kind\":\"PARENT\",\"columns\":[\"employee_id\"],\"target\":\"employees\",\"targetColumns\":[\"id\"]}'::pg_catalog.jsonb", 'contract.source_line = 48', 'portal_session_issuance_source_contract_invalid']);
    expect(source).not.toMatch(/VALIDATED_CAPTURE|SET\s+phase|backfill_actor\s*=/);
  });
  it('rejects every existing same-name relation or guard overload without destructive replacement', () => {
    clauses(body('portal_session_issuance_prerequisites'), ["relation.relname = 'portal_session_issuance'", "function.proname = 'guard_portal_session_issuance'", 'portal_session_issuance_already_installed', 'portal_session_issuance_guard_already_installed']);
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|\bDROP\b/i);
  });
  it('locks the actual session before a separate fresh INSERT source comparison, without locking authority backwards', () => {
    const guard = body('portal_session_issuance_guard');
    const lock = 'PERFORM session.token_hash FROM public.employee_sessions AS session';
    expect(guard.indexOf(lock)).toBeGreaterThan(-1); expect(guard.indexOf('FOR SHARE;')).toBeGreaterThan(guard.indexOf(lock));
    const missingAtLock = `IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_mismatch';
    END IF;`;
    expect(guard).toContain(missingAtLock);
    expect(guard.indexOf(missingAtLock)).toBeGreaterThan(guard.indexOf('FOR SHARE;'));
    expect(guard.indexOf('IF NOT EXISTS (')).toBeGreaterThan(guard.indexOf(missingAtLock) + missingAtLock.length);
    clauses(guard, ['session.token_hash = NEW.token_hash', "pg_catalog.convert_to(session.employee_id, 'UTF8') = pg_catalog.convert_to(NEW.employee_id, 'UTF8')", 'session.created_at IS NOT DISTINCT FROM NEW.session_created_at',
      'JOIN public.employees AS employee ON employee.id = session.employee_id', "pg_catalog.convert_to(employee.id, 'UTF8') = pg_catalog.convert_to(NEW.employee_id, 'UTF8')", "pg_catalog.convert_to(employee.workspace_id, 'UTF8') = pg_catalog.convert_to(NEW.workspace_id, 'UTF8')", 'portal_session_issuance_source_mismatch']);
    expect(guard).not.toMatch(/portal_authority|incarnation_counter|expires_at|employee\.active|password|SET\s+ROLE|EXECUTE|FOR UPDATE/);
  });
  it('makes all six UPDATE values immutable without normalizing text or reseeding generations', () => {
    const guard = body('portal_session_issuance_guard');
    clauses(guard, ['NEW.token_hash IS DISTINCT FROM OLD.token_hash', "pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')", "pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8')",
      'NEW.workspace_incarnation IS DISTINCT FROM OLD.workspace_incarnation', 'NEW.portal_access_version IS DISTINCT FROM OLD.portal_access_version', 'NEW.session_created_at IS DISTINCT FROM OLD.session_created_at', 'portal_session_issuance_identity_immutable', 'RETURN NEW;']);
    expect(guard).not.toMatch(/btrim|lower\(|upper\(|\+\s*1|CURRENT_TIMESTAMP|clock_timestamp\(\)/);
  });
  it('has one invoker INSERT/UPDATE row guard and deliberately no DELETE/TRUNCATE refusal or durable writer', () => {
    const fn = statements.find(part => part.text.includes('CREATE FUNCTION')); expect(fn).toBeDefined();
    clauses(fn!.text, ['CREATE FUNCTION nevora_tenancy.guard_portal_session_issuance()', 'RETURNS trigger', 'SECURITY INVOKER', 'SET search_path = pg_catalog']);
    expect(fn!.text).not.toContain('SECURITY DEFINER');
    const triggers = statements.filter(part => part.text.includes('CREATE TRIGGER')); expect(triggers).toHaveLength(1);
    clauses(triggers[0].text, ['BEFORE INSERT OR UPDATE ON nevora_tenancy.portal_session_issuance', 'FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_session_issuance()']);
    const guard = body('portal_session_issuance_guard');
    clauses(guard, ["TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'", "TG_TABLE_NAME IS DISTINCT FROM 'portal_session_issuance'", "TG_LEVEL IS DISTINCT FROM 'ROW'", 'portal_session_issuance_guard_route_invalid']);
    expect(guard).not.toMatch(/TG_OP = '(?:DELETE|TRUNCATE)'|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET/);
  });
  it('enables FORCE RLS with zero policies, private PUBLIC revokes and no rows/grants/session authority', () => {
    expect(statements.filter(part => part.leadingKeyword === 'ALTER').map(part => words(part.text).join(' '))).toEqual(['ALTER TABLE NEVORA_TENANCY . PORTAL_SESSION_ISSUANCE ENABLE ROW LEVEL SECURITY ;', 'ALTER TABLE NEVORA_TENANCY . PORTAL_SESSION_ISSUANCE FORCE ROW LEVEL SECURITY ;']);
    expect(statements.filter(part => part.leadingKeyword === 'REVOKE').map(part => words(part.text).join(' '))).toEqual(['REVOKE ALL ON SCHEMA NEVORA_TENANCY FROM PUBLIC ;', 'REVOKE ALL ON TABLE NEVORA_TENANCY . PORTAL_SESSION_ISSUANCE FROM PUBLIC ;', 'REVOKE ALL ON FUNCTION NEVORA_TENANCY . GUARD_PORTAL_SESSION_ISSUANCE ( ) FROM PUBLIC ;']);
    expect(statements.some(part => ['INSERT', 'UPDATE', 'DELETE', 'GRANT'].includes(part.leadingKeyword ?? ''))).toBe(false);
    expect(source).not.toMatch(/CREATE\s+(?:ROLE|POLICY)|ON\s+CONFLICT|workspace-fuel/i);
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('atomically rejects expanded named schema/table/column/function ACLs, including ambient defaults', () => {
    const acl = body('portal_session_issuance_acl');
    clauses(acl, ['pg_catalog.aclexplode', "pg_catalog.acldefault('n', namespace.nspowner)", "pg_catalog.acldefault('r', control.relowner)", "pg_catalog.acldefault('f', function.proowner)", 'attribute.attacl', 'privileges.grantee <> namespace.nspowner', 'privileges.grantee <> control.relowner', 'privileges.grantee <> function.proowner', 'portal_session_issuance_acl_invalid']);
    for (const keyword of ['GRANT', 'REVOKE', 'EXECUTE']) expect(words(acl)).not.toContain(keyword);
  });
  it('records lossless lexical source and explicit source-only/anti-revival limitations instead of current-proof authority', () => {
    expect(source.length).toBeGreaterThan(0); expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    expect(journal.parts.map(part => part.text).join('')).toBe(source); expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    clauses(source, ['LIVE sidecar', 'No anti-revival or recovery guarantee', 'no copied expiry', 'legacy compatibility mapping', 'independently captured ownership', 'current-proof', 'actual Neon', 'No source rows']);
    const declarations = parseDdlDeclarations(source);
    expect(declarations.effectiveSchema).toBe('NOT_COMPUTED');
    expect(declarations.diagnostics.map(d => [d.code, d.severity])).toEqual([
      ['BODY_NOT_INTERPRETED', 'UNSUPPORTED'], ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'], ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'], ['BODY_NOT_INTERPRETED', 'UNSUPPORTED'],
      ['UNSUPPORTED_CREATE_FORM', 'UNSUPPORTED'], ['UNSUPPORTED_CREATE_FORM', 'UNSUPPORTED'], ['ALTER_NOT_REDUCED', 'UNSUPPORTED'], ['ALTER_NOT_REDUCED', 'UNSUPPORTED'],
      ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'], ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'], ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'], ['BODY_NOT_INTERPRETED', 'UNSUPPORTED'], ['STATEMENT_OUTSIDE_CREATE_TABLE', 'UNSUPPORTED'],
    ]);
  });
});
