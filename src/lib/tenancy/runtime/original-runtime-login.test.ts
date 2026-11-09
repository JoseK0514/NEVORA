import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lexSql } from '../inventory/sql-lexer';

// Keep prior byte custody checks while allowing only the reviewed marked additions.
function beforePortalDependencyInsertions(text: string): string {
  for (const name of ['PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION', 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES', 'PORTAL_SOURCE_DEPENDENCY_ADMISSION', 'PORTAL_SOURCE_DEPENDENCY_CTES']) {
    const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
    if (!text.includes(start) && !text.includes(end)) continue;
    expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
    const after = text.indexOf(end) + end.length;
    expect(text.slice(after, after + 1)).toBe('\n');
    text = text.slice(0, text.indexOf(start)) + text.slice(after + 1);
  }
  return text;
}

const source = readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login.sql'), 'utf8');
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
function section(start: string, end: string): string {
  expect(source.split(start)).toHaveLength(2);
  expect(source.split(end)).toHaveLength(2);
  return source.slice(source.indexOf(start) + start.length, source.indexOf(end)).trim();
}
function withoutAddedSection(text: string, start: string, end: string): string {
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  const after = text.indexOf(end) + end.length;
  expect(text.slice(after, after + 1)).toBe('\n');
  return text.slice(0, text.indexOf(start)) + text.slice(after + 1);
}

describe('unused original runtime login dependency inert source', () => {
  it('declares a zero-argument invoker text function, with no own transaction or installation', () => {
    const parsed = lexSql(source);
    expect(parsed.complete).toBe(true); expect(parsed.diagnostics).toEqual([]);
    expect(parsed.parts.filter(part => part.kind === 'statement')).toHaveLength(1);
    expect(source).toContain('FUNCTION nevora_tenancy.require_original_runtime_login_kind()');
    expect(source).toContain('RETURNS pg_catalog.text');
    for (const clause of ['LANGUAGE plpgsql', 'VOLATILE', 'PARALLEL UNSAFE', 'SECURITY INVOKER', 'SET search_path = pg_catalog']) expect(source).toContain(clause);
    expect(source).not.toMatch(/^\s*SECURITY DEFINER\b/m);
    expect(source).not.toMatch(/^\s*(?:GRANT|REVOKE|INSERT|UPDATE|DELETE|CREATE TABLE|BEGIN ISOLATION|COMMIT)\b/m);
  });
  it('has a fixed denial rather than a partially permissive current-proof return', () => {
    expect(source).toContain("RAISE EXCEPTION 'original_runtime_login_denied' USING ERRCODE='42501'");
    expect(source).not.toMatch(/RETURN\s+(?:true|false|'APP'|'WORKER')\s*;/i);
  });
  it('derives native kind from exact original backend/login and registered OID/name binding', () => {
    const caller = section('-- ORIGINAL_RUNTIME_CALLER_BEGIN', '-- ORIGINAL_RUNTIME_CALLER_END');
    for (const clause of ['b.kind AS runtime_kind', 'b.role_oid = r.oid AND b.role_name = r.rolname',
      'r.rolname = session_user', 'activity.pid = pg_catalog.pg_backend_pid() AND activity.usesysid = r.oid',
      "pg_catalog.current_setting('role') = 'none'"]) expect(caller).toContain(clause);
    expect(caller).not.toContain('session_user = current_user');
    expect(caller).not.toContain('requested_kind');
    expect(source).not.toMatch(/current_setting\('nevora\./);
  });
  it('keeps the complete original runtime denial predicates after context separation', () => {
    const predicates = section('-- ORIGINAL_RUNTIME_DENIAL_PREDICATES_BEGIN', '-- ORIGINAL_RUNTIME_DENIAL_PREDICATES_END');
    expect(hash(predicates)).toBe('77ca1fb00979e625f84cdc3061a3a8268738cc2f5bfbd05c4ab724edd1cb2173');
  });
  it('reuses the exact pinned native audit closure including policies without a relaxed duplicate', () => {
    const native = section('-- AUDITED_NATIVE_CTES_BEGIN', '-- AUDITED_NATIVE_CTES_END');
    const withoutTerminal = withoutAddedSection(beforePortalDependencyInsertions(native), '-- ORIGINAL_RUNTIME_TERMINAL_CTE_BEGIN', '-- ORIGINAL_RUNTIME_TERMINAL_CTE_END');
    const preserved = withoutAddedSection(withoutTerminal, '\n-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_BEGIN', '-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_END');
    expect(hash(preserved)).toBe('fba1c31e39cf91ef4f3287968d2a2ec3fa93ca6faf32d796b6fd03fbf53c137f');
    expect(native).toContain('AND p.provolatile=\'v\' AND p.prosecdef');
    expect(native).toContain("'policies',COALESCE(");
    expect(native).toContain('target.function_oid=f.oid');
  });
  it.each(['r.rolcanlogin', 'NOT r.rolsuper AND NOT r.rolbypassrls',
    'NOT r.rolcreaterole AND NOT r.rolcreatedb', 'NOT r.rolreplication AND NOT r.rolinherit'])
  ('retains original native LOGIN flags %s', clause => {
    expect(section('-- ORIGINAL_RUNTIME_CALLER_BEGIN', '-- ORIGINAL_RUNTIME_CALLER_END')).toContain(clause);
  });
  it('requires an actual selected-kind capability owned by the exact current safe NOLOGIN context', () => {
    const context = section('-- ORIGINAL_RUNTIME_OWNER_CONTEXT_BEGIN', '-- ORIGINAL_RUNTIME_OWNER_CONTEXT_END');
    for (const clause of ['owner.rolname = current_user', 'owner.oid = current.owner_oid', 'observed_owner.safe',
      'capability.runtime_kind = r.runtime_kind', 'current.function_oid = capability.function_oid',
      'current.route_kind = capability.route_kind AND current.route_oid = capability.route_oid',
      'NOT owner.rolcanlogin', 'NOT owner.rolsuper AND NOT owner.rolbypassrls']) expect(context).toContain(clause);
    expect(context).not.toContain('pg_trigger_depth');
    expect(source).not.toContain('PG_CONTEXT');
  });
  it('requires the exact currently observed self descriptor in the selected root dependencies', () => {
    const context = section('-- ORIGINAL_RUNTIME_OWNER_CONTEXT_BEGIN', '-- ORIGINAL_RUNTIME_OWNER_CONTEXT_END');
    for (const clause of ['pg_catalog.jsonb_array_elements(registered.dependencies)', 'dependency.value = validator.observation',
      "pg_catalog.to_regprocedure('nevora_tenancy.require_original_runtime_login_kind()')", 'pg_catalog.has_function_privilege(owner.oid, native_validator.oid,\'EXECUTE\')',
      "native_validator.proargtypes::pg_catalog.oid[] = ''::pg_catalog.oidvector::pg_catalog.oid[]", 'native_validator.prorettype = 25::pg_catalog.oid',
      'NOT native_validator.prosecdef', 'NOT native_validator.proretset', 'native_validator.proconfig = ARRAY[\'search_path=pg_catalog\']::pg_catalog.text[]']) expect(context).toContain(clause);
    expect(context).not.toMatch(/review_source_sha256\s*=\s*'[0-9a-f]{64}'/);
  });
  it('rejects PUBLIC/runtime/foreign EXECUTE and grant options on the new dependency', () => {
    const context = section('-- ORIGINAL_RUNTIME_OWNER_CONTEXT_BEGIN', '-- ORIGINAL_RUNTIME_OWNER_CONTEXT_END');
    for (const clause of ['pg_catalog.aclexplode', 'pg_catalog.acldefault', 'acl.is_grantable', "acl.privilege_type <> 'EXECUTE'",
      'allowed_owner.oid = acl.grantee AND allowed_owner.safe', 'acl.grantee <> native_validator.proowner']) expect(context).toContain(clause);
  });
  it('returns only validated observed kind and suppresses fixed-denial internal SQL diagnostics', () => {
    expect(source).toContain('SELECT r.runtime_kind INTO observed_kind');
    expect(source).toContain("observed_kind COLLATE pg_catalog.\"C\" NOT IN ('APP','WORKER')");
    expect(source).toContain('RETURN observed_kind;');
    expect(source).toContain('EXCEPTION WHEN OTHERS THEN');
    expect(source).not.toContain('SQLERRM');
  });
  it('documents source-prepared dependency admission with native and caller integration still pending', () => {
    for (const text of ['DEPENDENCY_ONLY INVOKER contract is source-prepared, native invocation remains pending', 'immediate calling function',
      'fixed literal service kind', 'source observations are not reviewer/operator authority', 'shared catalog fence',
      'cannot prove PL/pgSQL callgraph', 'No counter access, proof issuance']) expect(source).toContain(text);
  });
  it('requires even a safe extra EXECUTE grantee to declare the exact self descriptor in a full approved root tuple', () => {
    const context = section('-- ORIGINAL_RUNTIME_OWNER_CONTEXT_BEGIN', '-- ORIGINAL_RUNTIME_OWNER_CONTEXT_END');
    for (const clause of ['declared.runtime_kind=approved.runtime_kind AND declared.route_kind=approved.route_kind',
      'declared.function_oid=approved.function_oid AND declared.route_oid=approved.route_oid',
      'pg_catalog.jsonb_array_elements(declared.dependencies) AS retained(value)',
      'retained.value=validator.observation']) expect(context).toContain(clause);
  });
  it('shares only the fixed terminal dependency instead of an invoker direct/trigger/root capability', () => {
    const native = section('-- AUDITED_NATIVE_CTES_BEGIN', '-- AUDITED_NATIVE_CTES_END');
    expect(native).toContain('audit_original_login_dependency_current AS (');
    expect(native).toContain('terminal.function_oid=f.oid AND terminal.observation=f.observation');
    const contracts = native.slice(native.indexOf('audit_contracts('), native.indexOf('), audit_runtime_bindings AS ('));
    expect(contracts).not.toContain('require_original_runtime_login_kind');
    expect(source).not.toMatch(/review_source_sha256\s*=\s*'[0-9a-f]{64}'/);
  });
});
