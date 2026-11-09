// Source correspondence does not establish native admission or proof behavior.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lexSql } from '../inventory/sql-lexer';

const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const copies = [
  ['audited-role-guard.sql', 'ba0b4617d66892ad350e42221e9ad1dc27b406c35d5103b9eba28b08ea6a02e0'],
  ['audited-role-guard-installer.sql', 'cfbe111978adc37a1ce0025ce843fb37e7e43b71f568c3dd01c68b126c23f7d5'],
  ['original-runtime-login.sql', '0993c3ba476cc8dab6d80ee2e0287ba9d18072b3dab99aee8bcab23814c4e6b8'],
  ['original-runtime-login-installer.sql', 'a63f71569af622928d879c1b6759440a42f20f9f599efd24eb80bfb2e1be584f'],
] as const;
const helpers = [
  ['portal-installed-policy-observation.sql', 'd25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a', '$portal_installed_policy_observation$', '975487315f2e091f7659d5f9aa8c89cef4d13e1685e49f4a0162f5eb9a916baa'],
  ['portal-policy-joint-locks.sql', 'a1394da4b29c86dbf9c87a2968325d359f2bbe4137cf4004e4e4d81245f1f79e', '$portal_policy_source_locks$', '6a25dc1ce379ce176f5995328032ad03d2a6749026d4aeafd42bfe68fb5703d1'],
  ['portal-policy-joint-observation.sql', '40283f6d7834a2dd01cbe4c418a8a12e6b4a8569d4680cf734c746e1cb55c9e3', '$portal_policy_source_observation$', '536d7d6dba8a9c709c8d89a558031617189653067c9ad677a2563f15a23ba9eb'],
] as const;
const sources = copies.map(([name]) => readFileSync(resolve('src/lib/tenancy/runtime/' + name), 'utf8'));
function section(text: string, name: string): string {
  const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  return text.slice(text.indexOf(start) + start.length, text.indexOf(end));
}
function withoutInsertion(text: string, name: string): string {
  const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  const after = text.indexOf(end) + end.length;
  expect(text.slice(after, after + 1)).toBe('\n');
  return text.slice(0, text.indexOf(start)) + text.slice(after + 1);
}
const ctes = () => section(sources[0], 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES');
function subpart(start: string, end: string): string {
  const text = ctes(); expect(text).toContain(start); expect(text).toContain(end);
  return text.slice(text.indexOf(start), text.indexOf(end));
}

describe('fixed complete Portal policy dependency source supplement', () => {
  it('binds all three unchanged accepted helper files and exact prosrc bytes, not just names', () => {
    for (const [name, sourcePin, delimiter, bodyPin] of helpers) {
      const text = readFileSync(resolve('src/lib/tenancy/runtime/' + name), 'utf8');
      expect(hash(text)).toBe(sourcePin); expect(text.split(delimiter)).toHaveLength(3);
      expect(hash(text.split(delimiter)[1])).toBe(bodyPin); expect(ctes()).toContain(bodyPin);
    }
  });
  it('keeps four native capsules identical and restores every accepted original byte outside two new additions', () => {
    const native = section(sources[0], 'AUDITED_NATIVE_CTES');
    for (const [index, [, baselinePin]] of copies.entries()) {
      expect(section(sources[index], 'AUDITED_NATIVE_CTES')).toBe(native);
      const restored = withoutInsertion(withoutInsertion(sources[index], 'PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION'), 'PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES');
      expect(hash(restored)).toBe(baselinePin);
    }
  });
  it('uses exactly the arity-one installed observer and two native text/text/bpchar helpers', () => {
    const contracts = subpart('audit_portal_policy_contracts(', '), audit_portal_policy_edges(');
    expect(contracts.match(/^    \('/gm)).toHaveLength(3);
    expect(contracts).toContain("'nevora_tenancy.read_portal_installed_policy(text)','25'::pg_catalog.oidvector,ARRAY['p_workspace_id']::pg_catalog.text[],3802::pg_catalog.oid");
    expect(contracts).toContain("'nevora_tenancy.lock_portal_policy_source_rows(text,text,bpchar)','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],2278::pg_catalog.oid");
    expect(contracts).toContain("'nevora_tenancy.read_portal_policy_source_rows(text,text,bpchar)','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],3802::pg_catalog.oid");
  });
  it('adds only combined-to-joint and joint-to-installed edges without changing the old pair or terminal', () => {
    const edges = subpart('audit_portal_policy_edges(', '), audit_portal_policy_native AS (');
    expect(edges.match(/^    \('/gm)).toHaveLength(2);
    expect(edges).toContain("('read_portal_policy_source_rows','nevora_tenancy.lock_portal_policy_source_rows(text,text,bpchar)')");
    expect(edges).toContain("('lock_portal_policy_source_rows','nevora_tenancy.read_portal_installed_policy(text)')");
    expect(edges).not.toContain('read_portal_source_rows'); expect(edges).not.toContain('lock_portal_source_rows');
    expect(edges).not.toContain('require_original_runtime_login_kind');
    for (const source of sources) {
      expect(section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES')).toBe(section(sources[0], 'PORTAL_SOURCE_DEPENDENCY_CTES'));
      expect(section(source, 'ORIGINAL_RUNTIME_TERMINAL_CTE')).toBe(section(sources[0], 'ORIGINAL_RUNTIME_TERMINAL_CTE'));
      expect(section(source, 'PORTAL_SOURCE_DEPENDENCY_ADMISSION')).toBe(section(sources[0], 'PORTAL_SOURCE_DEPENDENCY_ADMISSION'));
    }
  });
  it('checks native OID/no overload/types/names/full invoker profile independently of retained descriptors', () => {
    const native = subpart('audit_portal_policy_native AS (', '), audit_portal_policy_declaration_current AS (');
    for (const text of ["f.schema_name='nevora_tenancy'", 'p.oid=pg_catalog.to_regprocedure(contract.signature)::pg_catalog.oid',
      'overload.pronamespace=p.pronamespace AND overload.proname=p.proname)=1',
      'p.pronargs=pg_catalog.cardinality(contract.argument_names) AND p.proargtypes=contract.argument_types',
      'p.proargnames COLLATE pg_catalog."C"=contract.argument_names COLLATE pg_catalog."C"',
      'p.proallargtypes IS NULL AND p.proargmodes IS NULL',
      "p.prorettype=contract.return_type AND p.prokind='f' AND NOT p.proretset",
      "p.provolatile='v' AND NOT p.prosecdef AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'",
      'p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0', "(f.observation->>'language') COLLATE pg_catalog.\"C\"='plpgsql' COLLATE pg_catalog.\"C\"",
      "p.proconfig COLLATE pg_catalog.\"C\"=ARRAY['search_path=pg_catalog']::pg_catalog.text[] COLLATE pg_catalog.\"C\"", "pg_catalog.convert_to(p.prosrc,'UTF8')", 'contract.body_sha256 COLLATE pg_catalog."C"']) expect(native).toContain(text);
  });
  it('supplements exact body matching with closed native edge directions, never a recursive generic graph', () => {
    const native = subpart('audit_portal_policy_native AS (', '), audit_portal_policy_declaration_current AS (');
    for (const clause of ['FROM pg_catalog.pg_depend AS edge', "edge.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND edge.objid=p.oid",
      "edge.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass", 'target.oid=edge.refobjid', "target_schema.nspname='pg_catalog'",
      'permitted.source_name=contract.name', 'target.oid=pg_catalog.to_regprocedure(permitted.target_signature)::pg_catalog.oid']) expect(native).toContain(clause);
    expect(native).not.toContain('edge.refobjid<>p.oid'); expect(ctes()).not.toContain('WITH RECURSIVE');
    expect(ctes()).toContain('not callgraph proof');
  });
  it('reuses exact old DIRECT_CALL Portal/proof root tuples and pre-capability owner safety without a fixed point', () => {
    const declaration = subpart('audit_portal_policy_declaration_current AS (', '), audit_portal_policy_dependency_current AS (');
    expect(declaration).toContain('FROM audit_portal_source_declaration_current AS original');
    for (const clause of ['registered.runtime_kind=original.runtime_kind AND registered.route_kind=original.route_kind',
      'registered.function_oid=original.root_function_oid AND registered.route_oid=original.route_oid',
      'original.owner_oid', 'original.reader_oid', 'original.kernel_oid']) expect(declaration).toContain(clause);
    const old = section(sources[0], 'PORTAL_SOURCE_DEPENDENCY_CTES');
    expect(old).toContain("root.proname IN ('resolve_portal','lock_and_assert_current_proof','assert_current_proof')");
    expect(old).toContain("declared_root.route_kind='DIRECT_CALL' AND declared_root.route_oid=0::pg_catalog.oid");
    expect(old).toContain('allowed_owner.safe'); expect(old).toContain('audit_owner_consistency');
    expect(ctes()).not.toMatch(/(?:FROM|JOIN)\s+audit_capabilities\b/);
  });
  it('requires all five capsules cumulatively, including actual native access to every new member', () => {
    const declaration = subpart('audit_portal_policy_declaration_current AS (', '), audit_portal_policy_dependency_current AS (');
    for (const member of ['installed_policy', 'joint_kernel', 'combined_reader']) {
      expect(declaration).toContain('CROSS JOIN audit_portal_policy_native AS ' + member);
      expect(declaration).toContain('retained.value=' + member + '.observation');
    }
    expect(declaration).toContain("pg_catalog.has_function_privilege(original.owner_oid,member.function_oid,'EXECUTE')");
    expect(declaration).toContain("pg_catalog.has_schema_privilege(original.owner_oid,member.schema_oid,'USAGE')");
    expect(declaration).not.toContain('COALESCE');
  });
  it('closes native/default new-member ACLs over genuine complete declaring owners and excludes raw runtime bindings', () => {
    const c = ctes();
    for (const clause of ['pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault',
      "acl.is_grantable OR acl.privilege_type<>'EXECUTE'", 'acl.grantee<>p.proowner',
      'bound_runtime.role_oid=p.proowner', 'bound_runtime.role_oid=acl.grantee',
      'permitted.owner_oid=acl.grantee', 'permitted.reader_oid=declared.reader_oid AND permitted.kernel_oid=declared.kernel_oid',
      'permitted.installed_policy_oid=declared.installed_policy_oid',
      'permitted.joint_kernel_oid=declared.joint_kernel_oid AND permitted.combined_reader_oid=declared.combined_reader_oid']) expect(c).toContain(clause);
    expect(c.match(/bound_runtime.kind COLLATE pg_catalog."C" IN \('APP','WORKER'\)/g)).toHaveLength(2);
  });
  it('adds only an exact per-root/per-role/per-route/full-observation admission form', () => {
    for (const source of sources) {
      const admission = section(source, 'PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION');
      for (const clause of ['policy_dependency.root_function_oid=c.function_oid',
        'policy_dependency.runtime_kind=c.runtime_kind', 'policy_dependency.route_kind=c.route_kind',
        'policy_dependency.route_oid=c.route_oid', 'policy_dependency.function_oid=f.oid', 'policy_dependency.observation=f.observation']) expect(admission).toContain(clause);
      expect(admission).not.toContain('TRUE'); expect(admission).not.toContain('NOT f.security_definer');
      expect(source).toContain('WHERE NOT EXISTS (SELECT 1 FROM audit_capabilities AS capability');
    }
  });
  it('preserves full original lock/policy/source capsules and never grants their access from graph metadata', () => {
    for (const source of sources) {
      for (const clause of ["'policies',COALESCE(", "'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity",
        'lock_column.observation = declared.value', "pg_catalog.has_column_privilege(o.oid,lock_column.relation_oid,lock_column.attribute_number,'UPDATE')",
        'c.owner_observation = o.observation AND c.owner_acl_observation = o.acl_observation']) expect(source).toContain(clause);
    }
    expect(ctes()).not.toMatch(/^\s*(?:GRANT|REVOKE|INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|SET|EXECUTE)\b/m);
    expect(ctes()).not.toContain('BYPASSRLS'); expect(ctes()).not.toContain('USING (true)');
  });
  it('retains lossless SQL source boundaries while making no PLpgSQL/native behavior claim', () => {
    for (const source of sources) {
      const journal = lexSql(source);
      expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
      expect(journal.parts.map(part => part.text).join('')).toBe(source);
      expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    }
  });
});
