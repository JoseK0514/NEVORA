import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lexSql } from '../inventory/sql-lexer';
import { tokenizeDdl } from '../inventory/ddl';
const source = readFileSync(resolve('src/lib/tenancy/runtime/audited-role-guard.sql'), 'utf8');
const original = readFileSync(resolve('src/lib/tenancy/runtime/role-guard.sql'), 'utf8');
const installer = readFileSync(resolve('src/lib/tenancy/runtime/audited-role-guard-installer.sql'), 'utf8');
const login = readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login.sql'), 'utf8');
const lockColumns = source.slice(source.indexOf('), audit_lock_columns AS ('), source.indexOf('), audit_function_current AS ('));
const normalized = (text: string) => tokenizeDdl(text).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw).join(' ');
const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
function section(text: string, start: string, end: string): string {
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  return text.slice(text.indexOf(start) + start.length, text.indexOf(end)).trim();
}
const terminal = () => section(source, '-- ORIGINAL_RUNTIME_TERMINAL_CTE_BEGIN', '-- ORIGINAL_RUNTIME_TERMINAL_CTE_END');
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
  it('keeps the complete existing signature map, definer matcher and runtime denials byte-exact', () => {
    expect(hash(source.slice(source.indexOf('audit_contracts(name,route_kind,argument_types,return_type,runtime_kinds) AS ('), source.indexOf('), audit_runtime_bindings AS (')))).toBe('a5f08151bd046e7a09b3f85fe505796d69327eeaaa2bcb3ccf01b6c7c6fd2b7f');
    expect(hash(source.slice(source.indexOf('), audit_function_current AS ('), source.indexOf('), audit_owner_ids AS (')))).toBe('999cd6a441b9457165169842b721f5bef90143f19b3c0e42635cb6174f51f50b');
    expect(hash(source.slice(source.indexOf('    NOT EXISTS (SELECT 1 FROM nevora_tenancy.audited_helper_capability AS registered'), source.indexOf('\n);')))).toBe('d114b9eb70ebc35dddcfdfaf8e7c5825f007b877ea570f000e713f1ee97ad730');
  });
  it('allows only the exact fixed zero-argument native invoker terminal without registering a root', () => {
    const candidate = terminal();
    for (const clause of ["f.schema_name='nevora_tenancy'", "p.proname='require_original_runtime_login_kind'",
      "p.oid=pg_catalog.to_regprocedure('nevora_tenancy.require_original_runtime_login_kind()')::pg_catalog.oid",
      'p.pronargs=0', "p.proargtypes::pg_catalog.oid[]=''::pg_catalog.oidvector::pg_catalog.oid[]",
      'p.proallargtypes IS NULL AND p.proargmodes IS NULL AND p.proargnames IS NULL',
      "p.prorettype=25::pg_catalog.oid AND p.prokind='f' AND NOT p.proretset",
      "p.provolatile='v' AND NOT p.prosecdef AND NOT p.proleakproof AND p.proparallel='u'",
      'p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0', "f.observation->>'language'='plpgsql'",
      "p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]"]) expect(candidate).toContain(clause);
    const contracts = source.slice(source.indexOf('audit_contracts('), source.indexOf('), audit_runtime_bindings AS ('));
    expect(contracts).not.toContain('require_original_runtime_login_kind');
  });
  it('checks native/default terminal EXECUTE ACLs rather than granting named or PUBLIC authority', () => {
    const candidate = terminal();
    for (const clause of ['pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault',
      "acl.is_grantable OR acl.privilege_type<>'EXECUTE'", 'acl.grantee<>p.proowner',
      'allowed_owner.oid=acl.grantee AND allowed_owner.safe']) expect(candidate).toContain(clause);
    expect(candidate).not.toMatch(/\b(?:GRANT|REVOKE)\b/);
  });
  it('requires every extra grantee to be a consistent safe root owner explicitly retaining this descriptor', () => {
    const candidate = terminal();
    for (const clause of ['consistent.owner_oid=allowed_owner.oid', 'declared_root.owner_oid=allowed_owner.oid',
      'registered.runtime_kind=declared_root.runtime_kind AND registered.route_kind=declared_root.route_kind',
      'registered.function_oid=declared_root.function_oid AND registered.route_oid=declared_root.route_oid',
      'registered.owner_observation=allowed_owner.observation', 'registered.owner_acl_observation=allowed_owner.acl_observation',
      'pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)', 'retained.value=f.observation']) expect(candidate).toContain(clause);
    expect(candidate).not.toContain('audit_capabilities');
  });
  it('rejects unresolved and noncatalog native function edges including terminal self or root edges', () => {
    const candidate = terminal();
    for (const clause of ['FROM pg_catalog.pg_depend AS edge', "edge.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND edge.objid=p.oid",
      "edge.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass", 'AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS target',
      "target.oid=edge.refobjid AND target_schema.nspname='pg_catalog'"]) expect(candidate).toContain(clause);
    expect(candidate).not.toContain('edge.refobjid<>p.oid');
    expect(source).toContain('not a PL/pgSQL callgraph proof');
  });
  it('adds a separate descriptor/OID dependency branch while retaining global invalid-row denial', () => {
    const admission = section(source, '-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_BEGIN', '-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_END');
    expect(admission).toContain('OR EXISTS (SELECT 1 FROM audit_original_login_dependency_current AS terminal');
    expect(admission).toContain('terminal.function_oid=f.oid AND terminal.observation=f.observation');
    expect(source).toContain("f.schema_name='pg_catalog' OR EXISTS (SELECT 1 FROM audit_function_current AS target WHERE target.function_oid=f.oid)");
    expect(source).toContain('WHERE NOT EXISTS (SELECT 1 FROM audit_capabilities AS capability');
    expect(admission).not.toContain('NOT f.security_definer');
  });
  it('keeps all three complete native CTE copies identical without a callable validator graph loop', () => {
    const start = '-- AUDITED_NATIVE_CTES_BEGIN\n'; const end = '\n-- AUDITED_NATIVE_CTES_END';
    const rawNative = (text: string) => {
      expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
      return text.slice(text.indexOf(start) + start.length, text.indexOf(end));
    };
    const native = rawNative(source);
    expect(rawNative(installer)).toBe(native); expect(rawNative(login)).toBe(native);
    expect(normalized(terminal())).not.toContain('NEVORA_TENANCY . REQUIRE_ORIGINAL_RUNTIME_LOGIN_KIND (');
    expect(native).not.toContain('WITH RECURSIVE');
  });
});
