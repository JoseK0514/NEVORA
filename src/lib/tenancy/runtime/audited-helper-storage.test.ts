import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDdlDeclarations, tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const source = readFileSync(resolve('src/lib/tenancy/runtime/audited-helper-storage.sql'), 'utf8');
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
const table = () => parseDdlDeclarations(source).tables[0];
describe('audited helper registry inert source', () => {
  it('declares a separate permanent12-column registry, not role-binding replacement', () => {
    expect(parseDdlDeclarations(source).tables).toHaveLength(1);
    const t = table();
    expect(t.name.normalized).toEqual(['nevora_tenancy', 'audited_helper_capability']);
    expect(t.persistence).toBe('PERMANENT'); expect(t.ifNotExists).toBe(false);
    expect(t.columns.map(c => [c.name.normalized, c.dataType.raw])).toEqual([
      ['runtime_kind', 'pg_catalog.text'], ['route_kind', 'pg_catalog.text'], ['function_oid', 'pg_catalog.oid'],
      ['route_oid', 'pg_catalog.oid'], ['function_observation', 'pg_catalog.jsonb'], ['owner_observation', 'pg_catalog.jsonb'],
      ['owner_acl_observation', 'pg_catalog.jsonb'], ['dependencies', 'pg_catalog.jsonb'], ['route_observation', 'pg_catalog.jsonb'],
      ['review_reference', 'pg_catalog.text'], ['review_source_sha256', 'pg_catalog.text'], ['owner_lock_columns', 'pg_catalog.jsonb'],
    ]);
    expect(t.columns.filter(c => c.name.normalized !== 'route_observation').every(c => c.nullability.explicit === 'NOT_NULL')).toBe(true);
    expect(t.columns.find(c => c.name.normalized === 'route_observation')?.nullability.explicit).toBe('UNSPECIFIED');
  });
  it('uses the exact native capability tuple instead of a new operation ID or default approval', () => {
    const t = table(); expect(t).toBeDefined();
    expect(t.constraints.filter(c => c.kind === 'PRIMARY_KEY').map(c => c.columns.map(x => x.normalized))).toEqual([
      ['runtime_kind', 'route_kind', 'function_oid', 'route_oid'],
    ]);
    expect(t.constraints.filter(c => ['DEFAULT', 'FOREIGN_KEY'].includes(c.kind))).toEqual([]);
  });
  it('distinguishes SQL-null direct route from a required trigger object and native nonzero OIDs', () => {
    const t = table(); expect(t).toBeDefined();
    const checks = t.constraints.filter(c => c.kind === 'CHECK').map(c => words(c.expression!.raw).join(' '));
    expect(checks.some(c => c.includes("'APP' , 'WORKER'"))).toBe(true);
    expect(checks.some(c => c.includes("'DIRECT_CALL' , 'TRIGGER_ROUTE'"))).toBe(true);
    expect(checks.some(c => c.includes("ROUTE_KIND = 'DIRECT_CALL'") && c.includes('ROUTE_OBSERVATION IS NULL') && c.includes("'TRIGGER_ROUTE'") && c.includes("'object'"))).toBe(true);
    expect(checks.some(c => c.includes('FUNCTION_OID < > 0'))).toBe(true);
  });
  it('rejects SQL-null trigger observations instead of accepting UNKNOWN CHECK', () => {
    expect(source).toContain("route_kind='TRIGGER_ROUTE' AND route_oid<>0::pg_catalog.oid AND route_observation IS NOT NULL");
  });
  it('requires original binding constraints and no implicit value production', () => {
    for (const clause of ['NOT a.atthasdef', "a.attidentity=''", "a.attgenerated=''", 'co.convalidated', 'co.condeferrable', "co.contype<>'n'", 'runtime_role_binding_pkey', 'runtime_role_binding_role_name_key', 'runtime_role_binding_role_oid_key', 'runtime_role_binding_kind_check']) expect(source).toContain(clause);
  });
  it('uses byte-exact closed kind enums even under a nondeterministic database collation', () => {
    expect(source).toContain("CHECK(runtime_kind COLLATE pg_catalog.\"C\" IN ('APP','WORKER'))");
    expect(source).toContain("CHECK(route_kind COLLATE pg_catalog.\"C\" IN ('DIRECT_CALL','TRIGGER_ROUTE'))");
  });
  it('requires all native JSON observation envelopes and explicit owner-lock/dependency arrays', () => {
    const t = table(); expect(t).toBeDefined();
    const checks = t.constraints.filter(c => c.kind === 'CHECK').map(c => words(c.expression!.raw).join(' '));
    for (const name of ['FUNCTION_OBSERVATION', 'OWNER_OBSERVATION', 'OWNER_ACL_OBSERVATION']) expect(checks.some(c => c.includes(name) && c.includes("'object'"))).toBe(true);
    for (const name of ['DEPENDENCIES', 'OWNER_LOCK_COLUMNS']) expect(checks.some(c => c.includes(name) && c.includes("'array'"))).toBe(true);
  });
  it('guards the owned existing schema/storage and duplicate registry before a fixed atomic CREATE', () => {
    expect(statements.map(s => s.leadingKeyword)).toEqual(['BEGIN', 'SET', 'DO', 'CREATE', 'REVOKE', 'REVOKE', 'COMMIT']);
    const guard = statements.find(s => s.leadingKeyword === 'DO'); expect(guard).toBeDefined();
    for (const error of ['audited_helper_schema_missing', 'audited_helper_schema_not_owned', 'audited_helper_binding_missing', 'audited_helper_already_installed']) expect(guard!.text).toContain(error);
    expect(words(statements[1].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
  });
  it('has only PUBLIC revocation effects and no seed/role/helper/grant/customer DML', () => {
    expect(statements.filter(s => s.leadingKeyword === 'REVOKE').map(s => words(s.text))).toEqual([
      ['REVOKE', 'ALL', 'ON', 'SCHEMA', 'NEVORA_TENANCY', 'FROM', 'PUBLIC', ';'],
      ['REVOKE', 'ALL', 'ON', 'TABLE', 'NEVORA_TENANCY', '.', 'AUDITED_HELPER_CAPABILITY', 'FROM', 'PUBLIC', ';'],
    ]);
    expect(statements.filter(s => s.leadingKeyword === 'CREATE')).toHaveLength(1);
    expect(statements.some(s => ['INSERT', 'UPDATE', 'DELETE', 'ALTER', 'DROP', 'GRANT'].includes(s.leadingKeyword ?? ''))).toBe(false);
  });
  it('preserves complete lossless source without asserting installation or human review', () => {
    expect(journal.diagnostics).toEqual([]); expect(journal.complete).toBe(true);
    expect(journal.parts.map(p => p.text).join('')).toBe(source);
    expect(source).toContain('Matching observations never authenticate');
    expect(source).toContain('trusted-change fencing');
  });
});
