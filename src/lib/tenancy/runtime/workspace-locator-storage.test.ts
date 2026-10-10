import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { normalizeWorkspaceLocator } from '../identity';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const path = resolve('src/lib/tenancy/runtime/workspace-locator-storage.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw);
const clauses = (text: string, expected: string[]) => { for (const clause of expected) expect(text).toContain(clause); };
function body(tag: string) {
  const part = statements.find(p => p.text.includes(`$${tag}$`)); expect(part, `missing closed ${tag} feature`).toBeDefined();
  const literal = tokenizeDdl(part!.text).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`)); expect(literal).toBeDefined();
  return literal!.raw.slice(tag.length + 2, -(tag.length + 2));
}
// Inert lexical/source contracts. The frozen declaration parser cannot evaluate COLLATE or PL/pgSQL.
describe('unused empty workspace locator storage source', () => {
  it('acquires exact exclusive catalog fence first inside explicit ReadCommitted before any prerequisite observation', () => {
    expect(source.length, 'missing artifact is a feature RED, not a loader failure').toBeGreaterThan(0);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(statements.map(p => p.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'CREATE', 'CREATE', 'CREATE', 'ALTER', 'ALTER', 'REVOKE', 'REVOKE', 'REVOKE', 'DO', 'COMMIT']);
  });
  it('declares only exact original workspace text identity plus private canonical C-collated unique code without defaults', () => {
    const table = statements.filter(p => p.text.includes('CREATE TABLE')); expect(table).toHaveLength(1);
    expect(words(table[0].text)).toEqual(words(`CREATE TABLE nevora_tenancy.workspace_locator (
      workspace_id pg_catalog.text PRIMARY KEY REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
      locator_code pg_catalog.text COLLATE pg_catalog."C" NOT NULL UNIQUE
        CHECK (locator_code OPERATOR(pg_catalog.~) '^[a-z0-9-]{8,32}$'::pg_catalog.text)
    );`));
    expect(words(table[0].text)).not.toContain('DEFAULT');
    expect(words(table[0].text)).not.toContain('IF');
  });
  it('matches accepted locator syntax without imposing leading/trailing or all-hyphen restrictions', () => {
    expect(source).toContain("'^[a-z0-9-]{8,32}$'::pg_catalog.text");
    for (const code of ['abcdefgh', '--------', '-abc123-', '0'.repeat(32), 'ab--cd12']) expect(normalizeWorkspaceLocator(code)).toBe(code);
    expect(normalizeWorkspaceLocator('  -AbC123-  ')).toBe('-abc123-');
    for (const code of ['a'.repeat(7), 'a'.repeat(33), 'abcd_123', 'ábcdefgh', 'ab cd123', 'abc\n1234']) expect(normalizeWorkspaceLocator(code)).toBeNull();
    expect(source).not.toMatch(/btrim|char_length|lower\(|upper\(/);
    expect(source).toContain('SQL accepts only canonical lowercase ASCII');
  });
  it('requires a pre-owned schema and actual persistent current-owned public workspace parent', () => {
    clauses(body('workspace_locator_prerequisites'), ["namespace.nspname = 'nevora_tenancy'", 'namespace.nspowner', 'installer.rolname = current_user', 'schema_owner IS DISTINCT FROM installer_oid',
      "parent_namespace.nspname = 'public'", "parent.relname = 'workspaces'", "parent.relkind = 'r'", "parent.relpersistence = 'p'", 'parent.relowner', 'parent_owner IS DISTINCT FROM installer_oid',
      'workspace_locator_schema_missing', 'workspace_locator_schema_not_owned', 'workspace_locator_parent_invalid', 'workspace_locator_parent_not_owned']);
    expect(source).not.toMatch(/CREATE\s+SCHEMA|ALTER\s+TABLE\s+public\./i);
  });
  it('requires original nonnull native text id and valid enforced nondeferrable physical primary key', () => {
    clauses(body('workspace_locator_prerequisites'), ["attribute.attname = 'id'", "attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype", 'attribute.atttypmod = -1', 'attribute.attnotnull', 'NOT attribute.attisdropped',
      "key_constraint.contype = 'p'", 'key_constraint.convalidated', 'NOT key_constraint.condeferrable', 'NOT key_constraint.condeferred', "->> 'conenforced'", 'key_constraint.conkey = ARRAY[parent_id_attnum]::pg_catalog.int2[]',
      'key_index.indisprimary', 'key_index.indisunique', 'key_index.indisvalid', 'key_index.indisready', 'key_index.indislive', 'key_index.indimmediate', 'key_index.indpred IS NULL', 'key_index.indexprs IS NULL', 'key_index.indnatts = 1', 'key_index.indnkeyatts = 1', 'key_index.indkey[0] = parent_id_attnum', 'key_relation.relowner = installer_oid']);
  });
  it('rejects any existing same-name relation or guard overload instead of replacing or silently reusing it', () => {
    clauses(body('workspace_locator_prerequisites'), ["relation.relname = 'workspace_locator'", "function.proname = 'guard_workspace_locator'", 'workspace_locator_already_installed', 'workspace_locator_guard_already_installed']);
    expect(source).not.toMatch(/CREATE\s+OR\s+REPLACE|CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS|\bDROP\b/i);
  });
  it('binds fixed invoker function to exact table, operation and trigger level without hidden mutations', () => {
    const part = statements.find(p => p.text.includes('CREATE FUNCTION')); expect(part).toBeDefined();
    clauses(part!.text, ['CREATE FUNCTION nevora_tenancy.guard_workspace_locator()', 'RETURNS trigger', 'LANGUAGE plpgsql', 'SECURITY INVOKER', 'SET search_path = pg_catalog']);
    expect(part!.text).not.toContain('SECURITY DEFINER');
    const guard = body('workspace_locator_guard');
    clauses(guard, ["TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'", "TG_TABLE_NAME IS DISTINCT FROM 'workspace_locator'", "TG_LEVEL IS DISTINCT FROM 'ROW'", "TG_LEVEL IS DISTINCT FROM 'STATEMENT'", 'workspace_locator_guard_route_invalid']);
    expect(guard).not.toMatch(/EXECUTE|INSERT|SELECT|UPDATE\s+\w+\s+SET|DELETE\s+FROM|%/i);
  });
  it('preserves immutable original workspace and locator bytes with no remapping or normalization', () => {
    const guard = body('workspace_locator_guard');
    clauses(guard, ["pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')", "pg_catalog.convert_to(NEW.locator_code, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.locator_code, 'UTF8')", 'workspace_locator_identity_immutable', 'RETURN NEW;']);
    expect(guard).not.toMatch(/btrim|lower\(|upper\(|substring|substr|NULLIF|COALESCE/);
  });
  it('blocks DELETE/TRUNCATE and reuse with exact row and statement guards', () => {
    clauses(body('workspace_locator_guard'), ["TG_OP = 'DELETE'", 'workspace_locator_delete_forbidden', "TG_OP = 'TRUNCATE'", 'workspace_locator_truncate_forbidden']);
    const triggers = statements.filter(p => p.text.includes('CREATE TRIGGER')); expect(triggers).toHaveLength(2);
    clauses(triggers[0].text, ['BEFORE UPDATE OR DELETE ON nevora_tenancy.workspace_locator', 'FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_workspace_locator()']);
    clauses(triggers[1].text, ['BEFORE TRUNCATE ON nevora_tenancy.workspace_locator', 'FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_workspace_locator()']);
  });
  it('enables/forces zero-policy RLS and revokes PUBLIC without granting activation or installing any mapping', () => {
    expect(statements.filter(p => p.leadingKeyword === 'ALTER').map(p => words(p.text).join(' '))).toEqual(['ALTER TABLE NEVORA_TENANCY . WORKSPACE_LOCATOR ENABLE ROW LEVEL SECURITY ;', 'ALTER TABLE NEVORA_TENANCY . WORKSPACE_LOCATOR FORCE ROW LEVEL SECURITY ;']);
    expect(statements.filter(p => p.leadingKeyword === 'REVOKE').map(p => words(p.text).join(' '))).toEqual(['REVOKE ALL ON SCHEMA NEVORA_TENANCY FROM PUBLIC ;', 'REVOKE ALL ON TABLE NEVORA_TENANCY . WORKSPACE_LOCATOR FROM PUBLIC ;', 'REVOKE ALL ON FUNCTION NEVORA_TENANCY . GUARD_WORKSPACE_LOCATOR ( ) FROM PUBLIC ;']);
    expect(statements.some(p => ['INSERT', 'UPDATE', 'DELETE', 'GRANT'].includes(p.leadingKeyword ?? ''))).toBe(false);
    expect(source).not.toMatch(/CREATE\s+(?:ROLE|POLICY)|workspace-fuel|ON\s+CONFLICT/i);
    expect(words(statements.at(-1)!.text)).toEqual(['COMMIT', ';']);
  });
  it('rejects named schema/table/column/function ACLs including default privileges without repairing them', () => {
    const acl = body('workspace_locator_acl');
    clauses(acl, ['pg_catalog.aclexplode', "pg_catalog.acldefault('n', namespace.nspowner)", "pg_catalog.acldefault('r', control.relowner)", "pg_catalog.acldefault('f', function.proowner)", 'attribute.attacl',
      'privileges.grantee <> namespace.nspowner', 'privileges.grantee <> control.relowner', 'privileges.grantee <> function.proowner', 'workspace_locator_acl_invalid']);
    for (const word of ['GRANT', 'REVOKE', 'EXECUTE']) expect(words(acl)).not.toContain(word);
  });
  it('retains lexical source losslessly and explicitly reports frozen declaration-parser COLLATE limitation', () => {
    expect(source.length).toBeGreaterThan(0); expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    expect(journal.parts.map(p => p.text).join('')).toBe(source); expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    const declarations = parseDdlDeclarations(source);
    expect(declarations.tables).toHaveLength(0);
    expect(declarations.diagnostics.some(d => d.code === 'UNSUPPORTED_DECLARATION_CLAUSE')).toBe(true);
    clauses(source, ['nonsecret selector is not authority', 'legacy compatibility mapping', 'No anti-revival or recovery guarantee', 'actual Neon', 'No source rows']);
  });
});
