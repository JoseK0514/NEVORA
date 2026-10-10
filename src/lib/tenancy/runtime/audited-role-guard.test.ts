import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lexSql } from '../inventory/sql-lexer';
import { tokenizeDdl } from '../inventory/ddl';
const source = readFileSync(resolve('src/lib/tenancy/runtime/audited-role-guard.sql'), 'utf8');
const original = readFileSync(resolve('src/lib/tenancy/runtime/role-guard.sql'), 'utf8');
const installer = readFileSync(resolve('src/lib/tenancy/runtime/audited-role-guard-installer.sql'), 'utf8');
const lockColumns = source.slice(source.indexOf('), audit_lock_columns AS ('), source.indexOf('), audit_function_current AS ('));
const normalized = (text: string) => tokenizeDdl(text).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw).join(' ');
describe('distinct audited runtime guard inert source', () => {
  it('declares only the external invoker/VOLATILE fixed-searchpath boolean guard', () => {
    const parts = lexSql(source).parts.filter(p => p.kind === 'statement'); expect(parts).toHaveLength(1);
    expect(parts[0].text).toContain('CREATE OR REPLACE FUNCTION nevora_tenancy.assert_audited_runtime_role(requested_kind pg_catalog.text)');
    expect(parts[0].text).toContain('RETURNS pg_catalog.bool');
    expect(parts[0].text).toContain('VOLATILE\nSECURITY INVOKER\nSET search_path = pg_catalog');
    expect(parts[0].text).not.toContain('SECURITY DEFINER');
  });
  it('retains direct original-login/no-SET-ROLE checks rather than an owner-context argument', () => {
    for (const clause of ["requested_kind COLLATE pg_catalog.\"C\" IN ('APP', 'WORKER')", 'r.rolname = session_user', 'session_user = current_user', "pg_catalog.current_setting('role') = 'none'", 'activity.usesysid = r.oid']) expect(source).toContain(clause);
  });
  it.each(['m.member = r.oid OR m.roleid = r.oid OR m.grantor = r.oid', "d.refobjid = r.oid AND d.deptype = 'o'", "'CREATE,TEMPORARY'", "'TRUNCATE,TRIGGER,MAINTAIN'", 'pg_catalog.pg_parameter_acl', 'pg_catalog.has_foreign_data_wrapper_privilege', 'pg_catalog.has_server_privilege', 'pg_catalog.pg_init_privs'])('preserves original native privilege denial%s', clause => {
    expect(original).toContain(clause); expect(source).toContain(clause);
  });
  it('retains unsafe view/rule routes and controls including column mutation', () => {
    for (const clause of ["security_invoker=true", "w.ev_type <> '1' AND w.ev_enabled <> 'D'", "n.nspname IN ('pg_catalog', 'information_schema', 'nevora_tenancy')", "pg_catalog.has_any_column_privilege(r.oid, c.oid, 'UPDATE')"]) expect(source).toContain(clause);
  });
  it('has exact per-route signature/type vectors independently of identity-argument strings', () => {
    for (const name of ['resolve_portal', 'resolve_clocker', 'resolve_calendar', 'resolve_worker', 'resolve_provisioner', 'lock_and_assert_current_proof', 'assert_current_proof', 'source_write_fence', 'source_identity_guard', 'historical_pair_guard']) expect(source).toContain("'" + name + "'");
    for (const field of ['argumentTypeOids', 'returnTypeOid', 'returnsSet', 'defaultArgumentCount', 'supportFunctionOid', 'configuration']) expect(source).toContain("'" + field + "'");
    expect(source).toContain('p.proargtypes::pg_catalog.oid[] = contract.argument_types');
    expect(source).toContain('p.prorettype = contract.return_type');
  });
  it.each([
    ['resolve_portal', 'APP'], ['resolve_clocker', 'APP'], ['resolve_calendar', 'APP'],
    ['resolve_provisioner', 'APP'], ['resolve_worker', 'WORKER'],
  ])('pins %s to its existing runtime transport kind%s', (name, kind) => {
    const contract = source.split('\n').find(line => line.includes("('" + name + "','DIRECT_CALL'"));
    expect(contract).toContain("ARRAY['" + kind + "']::pg_catalog.text[]");
    expect(source).toContain('c.runtime_kind=ANY(contract.runtime_kinds)');
  });
  it('shares only the two bool proof guards and explicitly declared physical trigger routes', () => {
    for (const name of ['lock_and_assert_current_proof', 'assert_current_proof', 'source_write_fence', 'source_identity_guard', 'historical_pair_guard']) {
      const contract = source.split('\n').find(line => line.includes("('" + name + "'"));
      expect(contract).toContain("ARRAY['APP','WORKER']::pg_catalog.text[]");
    }
    expect(source).toContain("c.route_kind='TRIGGER_ROUTE' AND c.route_oid<>0");
    expect(source).toContain("pg_catalog.has_table_privilege(binding.role_oid,route.relation_oid,'INSERT,UPDATE,DELETE')");
  });
  it('captures native unsafe owners separately from profile acceptance without a false constructor', () => {
    const native = source.slice(source.indexOf('audit_owner_ids AS ('), source.indexOf('audit_owner_native_acls AS ('));
    expect(native).toContain('FROM audit_functions AS f'); expect(native).not.toContain('FROM audit_function_current');
    expect(source).toContain("'canLogin',owner.rolcanlogin");
    expect(source).toContain('JOIN audit_owners AS o ON o.oid=current.owner_oid AND o.safe');
  });
  it('recomputes reviewed definition UTF8 SHA rather than trusting format-only receipt metadata', () => {
    expect(source).toContain("pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')), 'hex')");
    expect(source).toContain('c.review_source_sha256 = f.source_sha256');
  });
  it('observes actual defaults/PUBLIC/global ACL routes without fabricated effective-check flags', () => {
    for (const native of ['pg_catalog.acldefault', 'pg_catalog.aclexplode', 'pg_catalog.pg_largeobject_metadata', 'pg_catalog.pg_default_acl', 'pg_catalog.pg_parameter_acl', 'pg_catalog.pg_shdepend']) expect(source).toContain(native);
    for (const field of ['aclRows', 'effectiveChecks', 'unreviewedCallableDefiners', 'controlRegistryMutation']) expect(source).toContain("'" + field + "'");
    expect(source).not.toMatch(/'effectiveChecks'\s*,\s*'\{/);
  });
  it('binds every named grantee and rejects inconsistent shared-owner/native observations', () => {
    for (const marker of ['audit_runtime_bindings', 'audit_function_current', 'audit_capabilities', 'audit_owner_consistency', 'DIRECT_CALL', 'TRIGGER_ROUTE']) expect(source).toContain(marker);
    expect(source).toContain('c.function_observation = f.observation');
    expect(source).toContain('c.owner_observation = o.observation');
    expect(source).toContain('c.owner_acl_observation = o.acl_observation');
    expect(source).toContain('binding.role_oid = acl.grantee');
  });
  it('closes every named direct grantee over the exact source kind map', () => {
    const named = source.slice(source.indexOf('WHERE binding.role_oid = acl.grantee'), source.indexOf('), audit_owner_ids AS ('));
    expect(named).toContain('binding.kind=ANY(contract.runtime_kinds)');
    expect(named).toContain("named.route_kind='DIRECT_CALL' AND named.route_oid=0 AND named.route_observation IS NULL");
    expect(named).toContain('named.function_observation=f.observation AND named.review_source_sha256=f.source_sha256');
  });
  it('retains exact literal route/kind validation independently of ambient collation', () => {
    expect(source).toContain("c.runtime_kind COLLATE pg_catalog.\"C\" IN ('APP','WORKER')");
    expect(source).toContain("c.route_kind COLLATE pg_catalog.\"C\" IN ('DIRECT_CALL','TRIGGER_ROUTE')");
  });
  it('keeps trigger OID/definition/flags/arguments/deferral/nulls distinct from direct calls', () => {
    for (const field of ['constraintOid', 'constraintRelationOid', 'constraintIndexOid', 'deferrable', 'initiallyDeferred', 'argumentsHex', 'attributeNumbers', 'qualifier', 'oldTransitionTable', 'newTransitionTable']) expect(source).toContain("'" + field + "'");
    expect(source).toContain('c.route_observation IS NULL');
    expect(source).toContain('c.route_observation = route.observation');
  });
  it('denies unreviewed owner column mutations and binds complete allowed source-column observations', () => {
    for (const marker of ['owner_lock_columns', 'audit_lock_columns', 'sourceObservation', "'INSERT,REFERENCES'", 'audited_helper_capability', 'runtime_role_binding']) expect(source).toContain(marker);
    expect(source).toContain('lock_column.observation = declared.value');
  });
  it('includes native policies in every lock-column source capsule rather than only RLS flags', () => {
    expect(lockColumns).toContain("'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(");
    expect(lockColumns).toContain('FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid=c.oid)');
    for (const existing of ['rls', 'forceRls', 'columns', 'constraints', 'triggers', 'rules']) expect(lockColumns).toContain("'" + existing + "'");
  });
  it('pins the exact native policy tuple including nullable USING and WITH CHECK expressions', () => {
    for (const clause of [
      "'oid',policy.oid::text,'name',policy.polname::text,'command',policy.polcmd::text",
      "'permissive',policy.polpermissive",
      "'using',pg_catalog.pg_get_expr(policy.polqual,policy.polrelid,false)",
      "'withCheck',pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid,false)",
    ]) expect(lockColumns).toContain(clause);
    expect(lockColumns).not.toContain('COALESCE(pg_catalog.pg_get_expr(policy.');
  });
  it('orders policies and native target OIDs deterministically while preserving PUBLIC and empty policy arrays', () => {
    expect(lockColumns).toContain("'roleOids',pg_catalog.to_jsonb(ARRAY(");
    expect(lockColumns).toContain('SELECT target.role_oid::text FROM pg_catalog.unnest(policy.polroles) AS target(role_oid) ORDER BY target.role_oid)');
    expect(lockColumns).toContain('ORDER BY policy.oid)');
    expect(lockColumns).toContain("FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid=c.oid),'[]'::pg_catalog.jsonb)");
    expect(lockColumns).not.toMatch(/WHERE\s+(?:target\.)?role_oid\s*(?:>|<>)\s*0/);
  });
  it('embeds the whole unchanged external guard contract in the fresh installer declaration', () => {
    const declaration = 'CREATE OR REPLACE FUNCTION nevora_tenancy.assert_audited_runtime_role';
    const fragment = source.slice(source.indexOf(declaration));
    const fresh = fragment.replace(declaration, 'CREATE FUNCTION nevora_tenancy.assert_audited_runtime_role');
    const start = installer.indexOf('CREATE FUNCTION nevora_tenancy.assert_audited_runtime_role');
    const end = installer.indexOf('$role_guard$;', start) + '$role_guard$;'.length;
    expect(start).toBeGreaterThan(0);
    expect(installer.slice(start, end)).toBe(fresh.trimEnd());
    expect(lexSql(installer).diagnostics).toEqual([]);
    expect(lexSql(installer).complete).toBe(true);
  });
  it('exposes native observation CTEs while retaining transitive/change-fencing uncertainty', () => {
    for (const text of ['AUDITED_NATIVE_CTES_BEGIN', 'AUDITED_NATIVE_CTES_END', 'cannot prove PL/pgSQL callgraph', 'trusted-change fencing remains OPEN', 'inherent ALTER/regrant']) expect(source).toContain(text);
    expect(lexSql(source).diagnostics).toEqual([]); expect(lexSql(source).complete).toBe(true);
    expect(normalized(source)).not.toContain('INSERT INTO');
  });
});
