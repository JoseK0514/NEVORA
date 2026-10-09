import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import type { CreateTableDeclaration } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const source = readFileSync(resolve('src/lib/tenancy/runtime/control-storage.sql'), 'utf8');
const existingFixture = readFileSync(resolve('src/lib/tenancy/runtime/role-guard.test.ts'), 'utf8');
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
const declaration = () => parseDdlDeclarations(source).tables[0];
const names = (columns: readonly { normalized: string }[]) => columns.map(column => column.normalized);
function tableContract(table: CreateTableDeclaration) {
  return {
    name: table.name.normalized, persistence: table.persistence, ifNotExists: table.ifNotExists,
    columns: table.columns.map(column => ({ name: column.name.normalized, type: column.dataType.raw,
      nullability: column.nullability })),
    constraints: table.constraints.map(constraint => ({ kind: constraint.kind, scope: constraint.scope,
      columns: names(constraint.columns), expression: constraint.expression ? words(constraint.expression.raw) : null })),
  };
}
function guardBody() {
  const statement = statements.find(part => part.leadingKeyword === 'DO');
  expect(statement, 'an actual pre-CREATE prerequisite guard must be present').toBeDefined();
  const token = tokenizeDdl(statement!.text).find(part => part.kind === 'literal' && part.raw.startsWith('$runtime_control_prerequisites$'));
  expect(token, 'the guarded body must remain one intact dollar-quoted statement').toBeDefined();
  return token!.raw.slice('$runtime_control_prerequisites$'.length, -'$runtime_control_prerequisites$'.length);
}
function hasSequence(tokens: string[], sequence: string[]) {
  return tokens.some((_, index) => sequence.every((token, offset) => tokens[index + offset] === token));
}

// These tests inspect inert source declarations and statement boundaries. They
// do not parse PL/pgSQL semantically or execute installation, guards or ACLs.
describe('runtime control-storage source preparation', () => {
  it('acquires the exact exclusive catalog plan first after BEGIN before any setting, prerequisite or DDL', () => {
    expect(statements[0].leadingKeyword).toBe('BEGIN');
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    // The lossless journal includes the exact separator newline with this statement.
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(statements.filter(part => part.text === '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text)).toHaveLength(1);
    expect(statements.findIndex(part => part.leadingKeyword === 'SET')).toBe(2);
    expect(statements.findIndex(part => part.leadingKeyword === 'DO')).toBe(3);
    expect(statements.findIndex(part => part.leadingKeyword === 'CREATE')).toBe(4);
    expect(statements.filter(part => part.leadingKeyword === 'BEGIN')).toHaveLength(1);
    expect(statements.filter(part => part.leadingKeyword === 'COMMIT')).toHaveLength(1);
  });
  it('declares the exact original six persistent columns without defaults or inferred authority', () => {
    const tables = parseDdlDeclarations(source).tables;
    expect(tables).toHaveLength(1);
    expect(tableContract(tables[0])).toMatchObject({
      name: ['nevora_tenancy', 'runtime_role_binding'], persistence: 'PERMANENT', ifNotExists: false,
      columns: [
        { name: 'kind', type: 'pg_catalog.text', nullability: { explicit: 'UNSPECIFIED', primaryKey: true } },
        { name: 'role_name', type: 'pg_catalog.name', nullability: { explicit: 'NOT_NULL', primaryKey: false } },
        { name: 'role_oid', type: 'pg_catalog.oid', nullability: { explicit: 'NOT_NULL', primaryKey: false } },
        { name: 'pg_settings_oid', type: 'pg_catalog.oid', nullability: { explicit: 'NOT_NULL', primaryKey: false } },
        { name: 'pg_settings_definition', type: 'pg_catalog.text', nullability: { explicit: 'NOT_NULL', primaryKey: false } },
        { name: 'pg_settings_rules', type: 'pg_catalog.text[]', nullability: { explicit: 'NOT_NULL', primaryKey: false } },
      ],
    });
    expect(tables[0].constraints.filter(constraint => ['DEFAULT', 'FOREIGN_KEY'].includes(constraint.kind))).toEqual([]);
  });

  it('retains distinct kind primary key and name/OID uniqueness, without a default binding', () => {
    const table = declaration();
    expect(table, 'storage is not an optional empty declaration').toBeDefined();
    const keys = table.constraints.filter(constraint => ['PRIMARY_KEY', 'UNIQUE'].includes(constraint.kind));
    expect(keys.map(constraint => [constraint.kind, names(constraint.columns)])).toEqual([
      ['PRIMARY_KEY', ['kind']], ['UNIQUE', ['role_name']], ['UNIQUE', ['role_oid']],
    ]);
    expect(table.constraints.some(constraint => constraint.kind === 'DEFAULT')).toBe(false);
  });

  it('preserves the reviewed APP/WORKER-only CHECK independently of requested proof kinds', () => {
    const table = declaration();
    expect(table).toBeDefined();
    const checks = table.constraints.filter(constraint => constraint.kind === 'CHECK');
    expect(checks).toHaveLength(1);
    expect(words(checks[0].expression!.raw)).toEqual(['(', 'KIND', 'IN', '(', "'APP'", ',', "'WORKER'", ')', ')']);
    expect(names(checks[0].columns)).toEqual(['kind']);
  });

  it('matches the frozen original installer declaration, including every declared constraint', () => {
    const match = existingFixture.match(/CREATE TABLE nevora_tenancy\.runtime_role_binding\([^\n]+?\)(?="\);)/);
    expect(match, 'existing source remains the reviewed table contract').not.toBeNull();
    const expected = parseDdlDeclarations(match![0] + ';').tables[0];
    const table = declaration();
    expect(table, 'the standalone source must contain the original declaration').toBeDefined();
    expect(tableContract(table)).toEqual(tableContract(expected));
  });

  it('encloses guard, creation and PUBLIC revocation within one fixed transaction', () => {
    expect(statements.map(part => part.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'REVOKE', 'REVOKE', 'COMMIT']);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(words(statements[statements.length - 1].text)).toEqual(['COMMIT', ';']);
    expect(statements.every(part => part.terminated)).toBe(true);
  });

  it('requires the existing exact schema and its current installer owner before CREATE', () => {
    const tokens = words(guardBody());
    expect(hasSequence(tokens, ['FROM', 'PG_CATALOG', '.', 'PG_NAMESPACE', 'AS', 'NAMESPACE'])).toBe(true);
    expect(hasSequence(tokens, ['NAMESPACE', '.', 'NSPNAME', '=', "'nevora_tenancy'"])).toBe(true);
    expect(hasSequence(tokens, ['IF', 'NOT', 'FOUND', 'THEN', 'RAISE', 'EXCEPTION', "'runtime_control_schema_missing'", 'USING', 'ERRCODE', '=', "'3F000'"])).toBe(true);
    expect(hasSequence(tokens, ['FROM', 'PG_CATALOG', '.', 'PG_ROLES', 'AS', 'INSTALLER'])).toBe(true);
    expect(hasSequence(tokens, ['INSTALLER', '.', 'ROLNAME', '=', 'CURRENT_USER'])).toBe(true);
    expect(hasSequence(tokens, ['IF', 'SCHEMA_OWNER', 'IS', 'DISTINCT', 'FROM', 'INSTALLER_OID', 'THEN', 'RAISE', 'EXCEPTION', "'runtime_control_schema_not_owned'", 'USING', 'ERRCODE', '=', "'42501'"])).toBe(true);
    expect(statements.findIndex(part => part.leadingKeyword === 'DO')).toBeLessThan(statements.findIndex(part => part.leadingKeyword === 'CREATE'));
  });

  it('rejects every existing same-schema relation before creation rather than replacing or accepting it', () => {
    const tokens = words(guardBody());
    expect(hasSequence(tokens, ['IF', 'EXISTS', '(', 'SELECT', '1', 'FROM', 'PG_CATALOG', '.', 'PG_CLASS', 'AS', 'RELATION'])).toBe(true);
    expect(hasSequence(tokens, ['RELATION', '.', 'RELNAMESPACE', '=', 'SCHEMA_OID', 'AND', 'RELATION', '.', 'RELNAME', '=', "'runtime_role_binding'"])).toBe(true);
    expect(hasSequence(tokens, ['THEN', 'RAISE', 'EXCEPTION', "'runtime_control_already_installed'", 'USING', 'ERRCODE', '=', "'42P07'"])).toBe(true);
    expect(parseDdlDeclarations(source).tables[0].ifNotExists).toBe(false);
  });

  it('revokes only PUBLIC schema/table access and contains no implicit role, seed, helper or grant effects', () => {
    const revokes = statements.filter(part => part.leadingKeyword === 'REVOKE').map(part => words(part.text));
    expect(revokes).toEqual([
      ['REVOKE', 'ALL', 'ON', 'SCHEMA', 'NEVORA_TENANCY', 'FROM', 'PUBLIC', ';'],
      ['REVOKE', 'ALL', 'ON', 'TABLE', 'NEVORA_TENANCY', '.', 'RUNTIME_ROLE_BINDING', 'FROM', 'PUBLIC', ';'],
    ]);
    const creates = statements.filter(part => part.leadingKeyword === 'CREATE').map(part => words(part.text));
    expect(creates).toHaveLength(1);
    expect(creates[0].slice(0, 6)).toEqual(['CREATE', 'TABLE', 'NEVORA_TENANCY', '.', 'RUNTIME_ROLE_BINDING', '(']);
    expect(words(guardBody()).filter(token => ['EXECUTE', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'GRANT', 'ALTER', 'CREATE'].includes(token))).toEqual([]);
  });

  it('retains lossless complete statement boundaries without interpreting the guard as proof or creating nested objects', () => {
    expect(journal.parts.map(part => part.text).join('')).toBe(source);
    expect(journal.diagnostics).toEqual([]);
    expect(journal.complete).toBe(true);
    expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    const parsed = parseDdlDeclarations(source);
    expect(parsed.tables.map(table => table.name.normalized)).toEqual([['nevora_tenancy', 'runtime_role_binding']]);
    expect(parsed.diagnostics.filter(diagnostic => diagnostic.severity === 'ERROR')).toEqual([]);
  });
});
