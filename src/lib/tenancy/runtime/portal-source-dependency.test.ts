import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Source regression only. Native dependency admission and every runtime/domain
// privilege/current-proof/callsite gate require their own root-owned evidence.
const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const copies = [
  ['audited-role-guard.sql', '28ce7c57e59426c12437fb4c14ded3e48c074ff67c9051ac36ae3e180c83443f'],
  ['audited-role-guard-installer.sql', '9f8fd73c7a0f2711aaac38836377d9a1ca6e0b504ab899c32c6558a2366b6f99'],
  ['original-runtime-login.sql', 'd27ddb080930638b32557767b81d2d249cd46511351baad8eb9d4154a77533db'],
  ['original-runtime-login-installer.sql', '374b633ff50b3b89e01139c0e276758f2a2a50a3dac2349f6a78947967252c6e'],
] as const;
const helpers = [
  ['portal-source-observation.sql', '72b6509933ca2bbd73fbb11eae7232db40bf5f5eafd94be56e291f236ff83dc7', '$portal_source_observation$', '7a83fca46be2a8f5c877ac6e5ae60328d5a454c2a974b624c6edd4ff8463b7f9'],
  ['portal-source-locks.sql', 'fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03', '$portal_source_locks$', '6266924ebb3e4ef28875123798084447816ba96c44a8be76491a13e31fd8af77'],
] as const;
const sources = copies.map(([name]) => readFileSync(resolve('src/lib/tenancy/runtime/' + name), 'utf8'));
function section(text: string, name: string) {
  const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
  expect(text.split(start), start + ' exactly once').toHaveLength(2);
  expect(text.split(end), end + ' exactly once').toHaveLength(2);
  return text.slice(text.indexOf(start) + start.length, text.indexOf(end));
}
function withoutInsertion(text: string, name: string) {
  const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
  if (!text.includes(start) && !text.includes(end)) return text;
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  const after = text.indexOf(end) + end.length;
  expect(text.slice(after, after + 1)).toBe('\n');
  return text.slice(0, text.indexOf(start)) + text.slice(after + 1);
}

describe('fixed unused Portal source dependency source boundary', () => {
  it('uses the exact accepted whole helper sources and body pins rather than name-only dependency identities', () => {
    for (const [name, sourcePin, delimiter, bodyPin] of helpers) {
      const source = readFileSync(resolve('src/lib/tenancy/runtime/' + name), 'utf8');
      expect(hash(source)).toBe(sourcePin); expect(source.split(delimiter)).toHaveLength(3);
      expect(hash(source.split(delimiter)[1])).toBe(bodyPin);
    }
  });
  it('keeps all four complete native CTE copies byte-identical', () => {
    const all = sources.map(source => section(source, 'AUDITED_NATIVE_CTES'));
    for (const native of all) expect(native).toBe(all[0]);
  });
  it('retains the original terminal dependency and owner/current-context clauses exactly in all copies', () => {
    const original = section(sources[0], 'ORIGINAL_RUNTIME_TERMINAL_CTE');
    for (const source of sources) {
      expect(section(source, 'ORIGINAL_RUNTIME_TERMINAL_CTE')).toBe(original);
      const native = section(source, 'AUDITED_NATIVE_CTES');
      for (const clause of ['JOIN audit_owners AS o ON o.oid=current.owner_oid AND o.safe',
        'JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=o.oid',
        'c.owner_observation = o.observation AND c.owner_acl_observation = o.acl_observation',
        'terminal.function_oid=f.oid AND terminal.observation=f.observation']) expect(native).toContain(clause);
    }
  });
  describe.each(copies.map(([name, pin], index) => ({ name, pin, source: sources[index] })))('$name', ({ source, pin }) => {
    it('contains the marked fixed pair with complete accepted source body identities', () => {
      const ctes = section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES');
      for (const name of ['audit_portal_source_contracts', 'audit_portal_source_native', 'audit_portal_source_declaration_current', 'audit_portal_source_dependency_current']) expect(ctes).toContain(name);
      for (const name of ['read_portal_source_rows', 'lock_portal_source_rows']) expect(ctes).toContain("'" + name + "'");
      for (const [, , , bodyPin] of helpers) expect(ctes).toContain(bodyPin);
      for (const argument of ['p_workspace_id', 'p_employee_id', 'p_session_token_hash']) expect(ctes).toContain(argument);
    });
    it('preserves every byte outside the two authorized marked insertions', () => {
      const erased = withoutInsertion(withoutInsertion(source, 'PORTAL_SOURCE_DEPENDENCY_ADMISSION'), 'PORTAL_SOURCE_DEPENDENCY_CTES');
      expect(hash(erased)).toBe(pin);
    });
    it('uses native full signature/body/ACL/DAG checks with safe pre-capability owners and no cyclic capability bootstrap', () => {
      const ctes = section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES');
      for (const native of ['pg_catalog.pg_proc', 'pg_catalog.pg_depend', 'pg_catalog.aclexplode', 'pg_catalog.acldefault',
        'proargnames', 'proallargtypes', 'proargmodes', 'prorettype', 'proretset', 'prosupport', 'pronargdefaults', 'provariadic',
        'prosecdef', 'proleakproof', 'proparallel', 'proconfig', 'audit_owner_consistency', 'audit_function_current']) expect(ctes).toContain(native);
      expect(ctes).toContain('search_path=pg_catalog'); expect(ctes).toContain('plpgsql');
      expect(ctes).toContain('dependencies'); expect(ctes).toContain('acl.is_grantable');
      expect(ctes).not.toMatch(/(?:FROM|JOIN)\s+audit_capabilities\b/);
    });
    it('preserves called-on-null behavior independently of exact helper body equality', () => {
      const ctes = section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES');
      expect(ctes).toContain('NOT p.proisstrict');
    });
    it('denies either raw bound runtime as helper owner or ACL grantee even when its safe binding profile disappears', () => {
      const ctes = section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES');
      expect(ctes).toContain('FROM nevora_tenancy.runtime_role_binding AS bound_runtime');
      expect(ctes).toContain('bound_runtime.role_oid=p.proowner');
      expect(ctes).toContain('bound_runtime.role_oid=acl.grantee');
      expect(ctes.match(/bound_runtime.kind COLLATE pg_catalog."C" IN \('APP','WORKER'\)/g)).toHaveLength(2);
    });
    it('admits the pair only through an explicit root-scoped native observation matcher', () => {
      const ctes = section(source, 'PORTAL_SOURCE_DEPENDENCY_CTES');
      for (const name of ['resolve_portal', 'lock_and_assert_current_proof', 'assert_current_proof']) expect(ctes).toContain("'" + name + "'");
      const admission = section(source, 'PORTAL_SOURCE_DEPENDENCY_ADMISSION');
      expect(admission).toContain('audit_portal_source_dependency_current');
      for (const exact of ['dependency_profile.root_function_oid=c.function_oid',
        'dependency_profile.runtime_kind=c.runtime_kind', 'dependency_profile.route_kind=c.route_kind',
        'dependency_profile.route_oid=c.route_oid', 'dependency_profile.function_oid=f.oid',
        'dependency_profile.observation=f.observation']) expect(admission).toContain(exact);
      expect(admission).not.toContain('TRUE');
    });
  });
});
