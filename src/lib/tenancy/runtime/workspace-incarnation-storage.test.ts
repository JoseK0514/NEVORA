import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const source = readFileSync(resolve('src/lib/tenancy/runtime/workspace-incarnation-storage.sql'), 'utf8');
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
const table = () => {
  const parsed = parseDdlDeclarations(source).tables;
  expect(parsed, 'one empty counter declaration is required').toHaveLength(1);
  return parsed[0];
};
function body(tag: string) {
  const statement = statements.find(part => part.text.includes(`$${tag}$`));
  expect(statement, 'a closed complete dollar-quoted body is required').toBeDefined();
  const literal = tokenizeDdl(statement!.text).find(token => token.kind === 'literal' && token.raw.startsWith(`$${tag}$`));
  expect(literal).toBeDefined(); return literal!.raw.slice(tag.length + 2, -(tag.length + 2));
}
// Inert source contracts, not a SQL/PLpgSQL evaluator, installer or DB proof.
describe('workspace incarnation empty technical storage source', () => {
  it('opens explicit ReadCommitted and acquires the exact exclusive catalog fence before observation or DDL', () => {
    expect(statements).toHaveLength(15);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(statements.map(part => part.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'CREATE', 'CREATE', 'CREATE', 'ALTER', 'ALTER', 'REVOKE', 'REVOKE', 'REVOKE', 'DO', 'COMMIT']);
  });
  it('declares only original plain text workspace identity and explicit native positive int8 without inferred defaults', () => {
    const t = table(); expect(t.name.normalized).toEqual(['nevora_tenancy', 'workspace_incarnation_counter']);
    expect(t.persistence).toBe('PERMANENT'); expect(t.ifNotExists).toBe(false);
    expect(t.columns.map(column => [column.name.normalized, column.dataType.raw])).toEqual([['workspace_id', 'pg_catalog.text'], ['incarnation', 'pg_catalog.int8']]);
    expect(t.columns[0].nullability.primaryKey).toBe(true);
    expect(t.columns[1].nullability.explicit).toBe('NOT_NULL');
    expect(t.constraints.filter(c => c.kind === 'DEFAULT')).toEqual([]);
    expect(t.constraints.filter(c => c.kind === 'CHECK').map(c => words(c.expression!.raw))).toEqual([['(', 'INCARNATION', '>', '0', ':', ':', 'PG_CATALOG', '.', 'INT8', ')']]);
    expect(source).not.toMatch(/btrim|char_length|lower\(/i);
  });
  it('preserves exact native parent reference columns and RESTRICT actions, never CASCADE or inferred Fuel ownership', () => {
    const references = table().constraints.filter(c => c.kind === 'FOREIGN_KEY'); expect(references).toHaveLength(1);
    expect(references[0].columns.map(c => c.normalized)).toEqual(['workspace_id']);
    expect(references[0].reference?.table.normalized).toEqual(['public', 'workspaces']);
    expect(references[0].reference?.columns?.map(c => c.normalized)).toEqual(['id']);
    expect(references[0].reference?.optionsRaw).toBe('ON UPDATE RESTRICT ON DELETE RESTRICT');
    expect(source).not.toContain('workspace-fuel');
  });
  it('requires actual current-owned schema and real persistent current-owned public parent before CREATE', () => {
    const guard = body('workspace_incarnation_prerequisites');
    for (const clause of ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user',
      "parent_namespace.nspname = 'public'", "parent.relname = 'workspaces'", "parent.relkind = 'r'", "parent.relpersistence = 'p'", 'parent.relowner', 'parent_owner IS DISTINCT FROM installer_oid']) expect(guard).toContain(clause);
    for (const code of ['workspace_incarnation_schema_missing', 'workspace_incarnation_schema_not_owned', 'workspace_incarnation_parent_invalid', 'workspace_incarnation_parent_not_owned']) expect(guard).toContain(code);
    expect(statements.findIndex(part => part.leadingKeyword === 'DO')).toBe(3);
  });
  it('requires a non-null exact native text id and validated enforced nondeferrable physical primary key', () => {
    const guard = body('workspace_incarnation_prerequisites');
    for (const clause of ["attribute.attname = 'id'", "attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype", 'attribute.atttypmod = -1', 'attribute.attnotnull', 'NOT attribute.attisdropped',
      "key_constraint.contype = 'p'", 'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'", 'key_constraint.conkey = ARRAY[parent_id_attnum]::pg_catalog.int2[]',
      'key_index.indisprimary', 'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate', 'key_index.indpred IS NULL', 'key_index.indexprs IS NULL', 'key_index.indnatts = 1', 'key_index.indnkeyatts = 1', 'key_index.indkey[0] = parent_id_attnum']) expect(guard).toContain(clause);
  });
  it('rejects any duplicate same-name relation or guard overload without replacement', () => {
    const guard = body('workspace_incarnation_prerequisites');
    expect(guard).toContain("relation.relname = 'workspace_incarnation_counter'");
    expect(guard).toContain("function.proname = 'guard_workspace_incarnation_counter'");
    expect(guard).toContain('workspace_incarnation_already_installed'); expect(guard).toContain('workspace_incarnation_guard_already_installed');
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE|IF\s+NOT\s+EXISTS|\bDROP\b/i);
  });
  it('uses one fixed-path invoker trigger function, bound to the exact table and row/statement operations', () => {
    const statement = statements.find(part => /CREATE FUNCTION/.test(part.text)); expect(statement).toBeDefined();
    expect(statement!.text).toContain('CREATE FUNCTION nevora_tenancy.guard_workspace_incarnation_counter()');
    expect(statement!.text).toContain('RETURNS trigger'); expect(statement!.text).toContain('SECURITY INVOKER'); expect(statement!.text).toContain('SET search_path = pg_catalog');
    expect(statement!.text).not.toContain('SECURITY DEFINER');
    const guard = body('workspace_incarnation_guard');
    expect(guard).toContain("TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'"); expect(guard).toContain("TG_TABLE_NAME IS DISTINCT FROM 'workspace_incarnation_counter'");
    expect(guard).toContain("TG_LEVEL IS DISTINCT FROM 'ROW'"); expect(guard).toContain("TG_LEVEL IS DISTINCT FROM 'STATEMENT'");
  });
  it('checks immutable identity by native UTF8 bytes and strictly increasing int8 without normalizing or exposing source values', () => {
    const guard = body('workspace_incarnation_guard');
    expect(guard).toContain("pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')");
    expect(guard).toContain('NEW.incarnation IS NULL OR OLD.incarnation IS NULL OR NEW.incarnation <= OLD.incarnation');
    expect(guard).toContain('workspace_incarnation_identity_immutable'); expect(guard).toContain('workspace_incarnation_not_increasing');
    expect(guard).toContain('RETURN NEW;');
    expect(guard).not.toMatch(/EXECUTE|INSERT|SELECT|DELETE\s+FROM|UPDATE\s+\w+\s+SET|%/i);
  });
  it('rejects DELETE and TRUNCATE with exact before-row and before-statement trigger coverage', () => {
    const guard = body('workspace_incarnation_guard');
    expect(guard).toContain("TG_OP = 'DELETE'"); expect(guard).toContain('workspace_incarnation_delete_forbidden');
    expect(guard).toContain("TG_OP = 'TRUNCATE'"); expect(guard).toContain('workspace_incarnation_truncate_forbidden');
    const triggers = statements.filter(part => /CREATE TRIGGER/.test(part.text)); expect(triggers).toHaveLength(2);
    expect(words(triggers[0].text)).toContain('UPDATE'); expect(words(triggers[0].text)).toContain('DELETE');
    expect(triggers[0].text).toContain('BEFORE UPDATE OR DELETE ON nevora_tenancy.workspace_incarnation_counter'); expect(triggers[0].text).toContain('FOR EACH ROW');
    expect(triggers[1].text).toContain('BEFORE TRUNCATE ON nevora_tenancy.workspace_incarnation_counter'); expect(triggers[1].text).toContain('FOR EACH STATEMENT');
  });
  it('enables and forces zero-policy RLS and revokes PUBLIC schema/table/function before commit with no seeds or grants', () => {
    const alters = statements.filter(part => part.leadingKeyword === 'ALTER').map(part => words(part.text).join(' '));
    expect(alters).toEqual(['ALTER TABLE NEVORA_TENANCY . WORKSPACE_INCARNATION_COUNTER ENABLE ROW LEVEL SECURITY ;', 'ALTER TABLE NEVORA_TENANCY . WORKSPACE_INCARNATION_COUNTER FORCE ROW LEVEL SECURITY ;']);
    const revokes = statements.filter(part => part.leadingKeyword === 'REVOKE').map(part => words(part.text).join(' '));
    expect(revokes).toEqual(['REVOKE ALL ON SCHEMA NEVORA_TENANCY FROM PUBLIC ;', 'REVOKE ALL ON TABLE NEVORA_TENANCY . WORKSPACE_INCARNATION_COUNTER FROM PUBLIC ;', 'REVOKE ALL ON FUNCTION NEVORA_TENANCY . GUARD_WORKSPACE_INCARNATION_COUNTER ( ) FROM PUBLIC ;']);
    expect(statements.some(part => ['INSERT', 'UPDATE', 'DELETE', 'GRANT'].includes(part.leadingKeyword ?? ''))).toBe(false);
    expect(source).not.toMatch(/CREATE\s+(?:ROLE|POLICY)/i);
    expect(words(source)).not.toContain('DEFAULT');
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('retains complete inert statement boundaries and explicit lack of anti-revival or recovery authority', () => {
    expect(journal.diagnostics).toEqual([]); expect(journal.complete).toBe(true); expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    expect(journal.parts.map(part => part.text).join('')).toBe(source);
    expect(source).toContain('No anti-revival or recovery guarantee'); expect(source).toContain('older backup can restore an older counter');
    expect(source).toContain('missing counter'); expect(source).toContain('high-water'); expect(source).toContain('No source rows');
  });
  it('rejects ambient nonowner table, column or function ACLs after PUBLIC revokes without rewriting named grants', () => {
    const guard = body('workspace_incarnation_acl');
    expect(statements[13].leadingKeyword).toBe('DO');
    for (const clause of ['pg_catalog.aclexplode', "pg_catalog.acldefault('r', control.relowner)",
      "pg_catalog.acldefault('f', function.proowner)", 'attribute.attacl',
      'privileges.grantee <> control.relowner', 'privileges.grantee <> function.proowner',
      "control.relname = 'workspace_incarnation_counter'", "function.proname = 'guard_workspace_incarnation_counter'",
      "ERRCODE = '42501'", "MESSAGE = 'workspace_incarnation_acl_invalid'"]) expect(guard).toContain(clause);
    for (const keyword of ['REVOKE', 'GRANT', 'EXECUTE']) expect(words(guard)).not.toContain(keyword);
    expect(guard).not.toMatch(/UPDATE\s+\w+\s+SET/i);
  });
});
