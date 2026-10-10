import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { tokenizeDdl, type Token } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const source = readFileSync(resolve('src/lib/tenancy/runtime/portal-source-observation.sql'), 'utf8');
const original = readFileSync(resolve('src/lib/tenancy/runtime/portal-source-locks.sql'), 'utf8');
const journal = lexSql(source);
const statements = journal.parts.filter(p => p.kind === 'statement');
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim();
function body(tag: string, bytes = source) {
  const token = tokenizeDdl(bytes).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`));
  expect(token, `missing ${tag} source feature`).toBeDefined();
  return token!.raw.slice(tag.length + 2, -(tag.length + 2));
}
function members(tokens: Token[], from: number) {
  expect(tokens[from]?.raw).toBe('(');
  let depth = 0, start = from + 1;
  const args: Token[][] = [];
  for (let n = start; n < tokens.length; n++) {
    if (tokens[n].raw === '(' || tokens[n].raw === '[') depth++;
    else if (tokens[n].raw === ')' || tokens[n].raw === ']') {
      if (tokens[n].raw === ')' && depth === 0) { args.push(tokens.slice(start, n)); return args; }
      depth--;
    } else if (tokens[n].raw === ',' && depth === 0) { args.push(tokens.slice(start, n)); start = n + 1; }
  }
  throw Error('missing closed inert object source');
}
function objectFields(group?: string) {
  const tokens = tokenizeDdl(body('portal_source_observation'));
  let from = tokens.findIndex(t => t.raw.toLowerCase() === 'jsonb_build_object');
  if (group) {
    const member = tokens.findIndex(t => t.raw === `'${group}'`);
    from = tokens.findIndex((t, i) => i > member && t.raw.toLowerCase() === 'jsonb_build_object');
  }
  expect(from).toBeGreaterThanOrEqual(0);
  const args = members(tokens, from + 1);
  expect(args.length % 2).toBe(0);
  return args.filter((_, i) => i % 2 === 0).map(a => a.map(t => t.raw).join(''));
}
const shape = {
  workspace: ['id', 'active', 'version'], employee: ['id', 'workspaceId', 'active', 'role', 'version'],
  credential: ['employeeId', 'version', 'mustChangePassword'], incarnation: ['workspaceId', 'version'],
  portal: ['workspaceId', 'employeeId', 'authorizationVersion', 'portalAccessVersion', 'capabilityPolicyRevision', 'state', 'proofProvenance', 'provenanceReference'],
  session: ['tokenHash', 'employeeId', 'expiresAt', 'createdAt'],
  issuance: ['tokenHash', 'workspaceId', 'employeeId', 'workspaceIncarnation', 'portalAccessVersion', 'sessionCreatedAt'],
  administrative: ['workspaceId', 'employeeId', 'scopeKind', 'scopeOrigin', 'provenanceReference', 'capabilityPolicyRevision', 'capabilities', 'locationIds'],
} as const;

// Inert source contracts: no SQL, PLpgSQL, native snapshots, RLS or locks execute.
describe('unused portal raw source observation source contract', () => {
  it('installs one fresh INVOKER JSONB reader behind exact first exclusive ReadCommitted fence', () => {
    expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    expect(statements.map(s => s.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'REVOKE', 'DO', 'COMMIT']);
    expect(normalize(statements[0].text)).toMatch(/BEGIN ISOLATION LEVEL READ COMMITTED;$/);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    const create = statements[4].text;
    for (const clause of ['CREATE FUNCTION nevora_tenancy.read_portal_source_rows(', 'p_workspace_id pg_catalog.text',
      'p_employee_id pg_catalog.text', 'p_session_token_hash pg_catalog.bpchar', 'RETURNS pg_catalog.jsonb',
      'LANGUAGE plpgsql', 'SECURITY INVOKER', 'SET search_path = pg_catalog']) expect(create).toContain(clause);
    expect(create).not.toMatch(/SECURITY DEFINER|CREATE OR REPLACE|IF NOT EXISTS/i);
  });
  it('requires ReadCommitted before exactly one accepted lock invocation and a separate query', () => {
    const reader = body('portal_source_observation');
    const isolation = reader.indexOf("pg_catalog.current_setting('transaction_isolation')");
    const lock = reader.indexOf('PERFORM nevora_tenancy.lock_portal_source_rows(p_workspace_id, p_employee_id, p_session_token_hash);');
    const query = reader.indexOf('SELECT pg_catalog.jsonb_build_object(');
    expect(isolation).toBeGreaterThanOrEqual(0); expect(lock).toBeGreaterThan(isolation); expect(query).toBeGreaterThan(lock);
    expect(reader).toContain("IS DISTINCT FROM 'read committed'");
    expect(reader).toContain("ERRCODE = '55000', MESSAGE = 'portal_source_observation_isolation_required'");
    expect([...reader.matchAll(/nevora_tenancy\.lock_portal_source_rows\(/g)]).toHaveLength(1);
    expect(reader).toContain('INTO observed'); expect(reader).toMatch(/;\s*IF NOT FOUND THEN/);
    expect(reader).toContain("ERRCODE = '55000', MESSAGE = 'portal_source_observation_missing'");
    expect(reader).toContain('RETURN observed;');
  });
  it('emits only the fixed kind and eight closed raw groups', () => {
    expect(objectFields()).toEqual(['kind', ...Object.keys(shape)].map(k => `'${k}'`));
    expect(body('portal_source_observation')).toContain("'kind', 'PORTAL_SOURCE_OBSERVATION_V1'");
  });
  it.each(Object.entries(shape))('retains exact closed %s observation fields', (group, keys) => {
    expect(objectFields(group)).toEqual(keys.map(k => `'${k}'`));
  });
  it('retains exact text generations, timestamps and booleans with distinct counter and issuance columns', () => {
    const reader = body('portal_source_observation');
    for (const pair of ["'version', workspace.updated_at::pg_catalog.text", "'version', employee.updated_at::pg_catalog.text",
      "'version', credential.password_updated_at::pg_catalog.text", "'version', incarnation.incarnation::pg_catalog.text",
      "'authorizationVersion', portal.authorization_version::pg_catalog.text", "'portalAccessVersion', portal.portal_access_version::pg_catalog.text",
      "'capabilityPolicyRevision', portal.capability_policy_revision::pg_catalog.text", "'expiresAt', session.expires_at::pg_catalog.text",
      "'createdAt', session.created_at::pg_catalog.text", "'workspaceIncarnation', issuance.workspace_incarnation::pg_catalog.text",
      "'portalAccessVersion', issuance.portal_access_version::pg_catalog.text", "'sessionCreatedAt', issuance.session_created_at::pg_catalog.text",
      "'capabilityPolicyRevision', administrative.capability_policy_revision::pg_catalog.text", "'active', workspace.active",
      "'active', employee.active", "'mustChangePassword', credential.must_change_password"]) expect(reader).toContain(pair);
    expect(reader).not.toContain('incarnation.workspace_incarnation');
    expect(reader).not.toMatch(/::(?:pg_catalog\.)?(integer|int4|numeric|float|real|double)|date_trunc|to_char|extract\(/i);
  });
  it('uses all required scoped rows with native index candidates and exact UTF8 postfilters', () => {
    const reader = body('portal_source_observation');
    for (const clause of ['FROM public.workspaces AS workspace', 'JOIN public.employees AS employee', 'JOIN public.employee_credentials AS credential',
      'JOIN nevora_tenancy.workspace_incarnation_counter AS incarnation', 'JOIN nevora_tenancy.portal_authority AS portal',
      'JOIN public.employee_sessions AS session', 'JOIN nevora_tenancy.portal_session_issuance AS issuance']) expect(reader).toContain(clause);
    for (const field of ['employee.id', 'employee.workspace_id', 'credential.employee_id', 'incarnation.workspace_id',
      'portal.workspace_id', 'portal.employee_id', 'session.employee_id', 'issuance.workspace_id', 'issuance.employee_id', 'workspace.id']) {
      expect(reader).toContain(`pg_catalog.convert_to(${field}, 'UTF8')`);
      expect(reader).toContain(`${field} OPERATOR(pg_catalog.=)`);
    }
    expect(reader).toContain('session.token_hash = p_session_token_hash');
    expect(reader).toContain('issuance.token_hash = p_session_token_hash');
    expect(reader).toContain("'tokenHash', session.token_hash::pg_catalog.text");
    expect(reader).toContain("'tokenHash', issuance.token_hash::pg_catalog.text");
  });
  it('retains absent administrative JSON null and complete byte-ordered existing arrays without inferred scope', () => {
    const reader = body('portal_source_observation');
    expect(reader).toContain('LEFT JOIN nevora_tenancy.portal_administrative_authority AS administrative');
    expect(reader).toContain("CASE WHEN administrative.workspace_id IS NULL THEN 'null'::pg_catalog.jsonb ELSE");
    expect(reader).toContain("pg_catalog.jsonb_agg(capability.capability ORDER BY pg_catalog.convert_to(capability.capability, 'UTF8'))");
    expect(reader).toContain("pg_catalog.jsonb_agg(location.location_id ORDER BY pg_catalog.convert_to(location.location_id, 'UTF8'))");
    expect(reader.match(/'\[\]'::pg_catalog\.jsonb/g)).toHaveLength(2);
    for (const field of ['administrative.workspace_id','administrative.employee_id','capability.workspace_id','capability.employee_id','location.workspace_id','location.employee_id']) {
      expect(reader).toContain(`pg_catalog.convert_to(${field}, 'UTF8')`);
      expect(reader).toContain(`${field} OPERATOR(pg_catalog.=)`);
    }
    expect(reader).not.toMatch(/ALL_TENANT|LEGACY_COMPATIBILITY|LIMIT|OFFSET|DISTINCT\s+capability|DISTINCT\s+location/);
  });
  it('does not filter or repair raw eligibility, expiry, state, policy or issuance consistency', () => {
    const reader = body('portal_source_observation');
    expect(reader).not.toMatch(/clock_timestamp|now\(|password_hash|salt|bearer|primary_location|phone|first_name|last_name|email|btrim|trim\(|upper\(|lower\(|ALLOW|RETURN (TRUE|FALSE)/i);
    expect(reader).not.toMatch(/(?:workspace|employee)\.active\s*(?:=|IS|AND)|portal\.portal_state\s*=|session\.expires_at\s*[><]|issuance\.workspace_incarnation\s*=|portal\.capability_policy_revision\s*=/i);
    expect(reader).not.toMatch(/\b(INSERT|UPDATE|DELETE|TRUNCATE|EXECUTE|CALL|GRANT|SET)\b/i);
    expect(reader).not.toMatch(/COALESCE\((?:issuance|portal|incarnation|administrative)\./i);
  });
  it('pins accepted lock body/signature/owner and retained bounded key FK guard ACL envelopes', () => {
    const pre = body('portal_source_observation_prerequisites');
    const lockBody = body('portal_source_locks', original);
    expect(pre).toContain(createHash('sha256').update(lockBody, 'utf8').digest('hex'));
    for (const clause of ["function.proname = 'lock_portal_source_rows'", "function.proargtypes = '25 25 1042'::pg_catalog.oidvector",
      "function.prorettype = 'pg_catalog.void'::pg_catalog.regtype", 'pg_catalog.convert_to(function.prosrc, \'UTF8\')',
      'function.proowner = installer_oid', "language.lanname = 'plpgsql'", "function.proconfig = ARRAY['search_path=pg_catalog']",
      'key_index.indisvalid', 'foreign_key.convalidated', "trigger.tgenabled = 'O'", 'trigger.tgfoid = function.oid',
      'relation.relrowsecurity', 'relation.relforcerowsecurity', 'pg_catalog.pg_policy', 'pg_catalog.aclexplode', 'privilege.grantee <>']) expect(pre).toContain(clause);
    expect(pre).toContain("function.proname = 'read_portal_source_rows'");
    expect(pre).toContain('portal_source_observation_already_installed');
  });
  it('binds all observed source columns and native original default expressions, with no cutover assumption', () => {
    const pre = body('portal_source_observation_prerequisites');
    for (const field of ['updated_at', 'active', 'role', 'password_updated_at', 'must_change_password', 'incarnation', 'authorization_version',
      'portal_access_version', 'capability_policy_revision', 'portal_state', 'proof_provenance', 'provenance_reference', 'expires_at', 'created_at',
      'workspace_incarnation', 'session_created_at', 'scope_kind', 'scope_origin']) expect(pre).toContain(`'${field}'`);
    expect(pre).toContain('pg_catalog.pg_attrdef'); expect(pre).toContain('pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid)');
    expect(pre).toContain('IS NOT DISTINCT FROM expected.default_expression');
    expect(pre).toContain("('public', 'employees', 'workspace_id', 'pg_catalog.text', -1, false)");
    expect(pre).not.toContain('f10_workspace_reference');
  });
  it('revokes PUBLIC and rejects named default ACLs in final fixed private function metadata', () => {
    expect(source).toContain('REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_source_rows(pg_catalog.text, pg_catalog.text, pg_catalog.bpchar) FROM PUBLIC;');
    const final = body('portal_source_observation_final_acl');
    for (const clause of ["function.proname = 'read_portal_source_rows'", "function.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype",
      'NOT function.prosecdef', 'function.proargtypes', 'function.proowner', 'pg_catalog.aclexplode', 'privilege.grantee <> function.proowner']) expect(final).toContain(clause);
    expect(tokenizeDdl(source).filter(t => t.kind === 'word' && ['GRANT', 'ALTER', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'].includes(t.raw.toUpperCase()))).toEqual([]);
  });
  it('retains caller transaction/fence, source equality, phantoms and multi-employment limitations', () => {
    for (const text of ['caller owns its ReadCommitted transaction', 'shared catalog fence before invocation', 'not authentication',
      'cooperative persistent portal_authority writer', 'complete employee set before downstream locks', 'fresh final equality', 'RLS access remain OPEN']) expect(source).toContain(text);
  });
});
