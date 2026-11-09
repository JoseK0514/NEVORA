import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { tokenizeDdl, parseDdlDeclarations } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const path = resolve('src/lib/tenancy/runtime/portal-policy-joint-locks.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const original = readFileSync(resolve('src/lib/tenancy/runtime/portal-source-locks.sql'), 'utf8');
const installed = readFileSync(resolve('src/lib/tenancy/runtime/portal-installed-policy-observation.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function body(bytes: string, tag: string) {
  const raw = tokenizeDdl(bytes).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`))?.raw;
  expect(raw, `missing ${tag} implementation`).toBeDefined();
  return raw!.slice(tag.length + 2, -(tag.length + 2));
}
const joint = () => body(source, 'portal_policy_source_locks');
const clauses = (text: string, expected: string[]) => { for (const value of expected) expect(text).toContain(value); };
const additions: string[] = ["  IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN\n    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_policy_source_lock_isolation_required';\n  END IF;\n", "  -- Existing workspace/employee/credential/counter prefix is held; repeated observer prefix locks do not change order.\n  PERFORM nevora_tenancy.read_portal_installed_policy(p_workspace_id);\n"];
// Source contracts only; actual SQL/locks/RLS are verified separately.
describe('unused joint Portal and installed-policy source lock kernel', () => {
  it('installs in its own RC block with the exact exclusive catalog fence first', () => {
    const journal = lexSql(source); expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    const statements = journal.parts.filter(p => p.kind === 'statement');
    expect(statements.map(p => p.leadingKeyword)).toEqual(['BEGIN','WITH','SET','DO','DO','DO','CREATE','REVOKE','DO','COMMIT']);
    expect(tokenizeDdl(statements[0].text).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw)).toEqual(['BEGIN','ISOLATION','LEVEL','READ','COMMITTED',';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(statements[2].text.trim()).toBe('SET LOCAL search_path = pg_catalog;');
  });
  it('creates one fixed INVOKER void function without roles tables grants policies or replacement', () => {
    const statements = lexSql(source).parts.filter(p => p.kind === 'statement');
    const created = statements.filter(p => p.leadingKeyword === 'CREATE'); expect(created).toHaveLength(1);
    clauses(created[0].text, ['CREATE FUNCTION nevora_tenancy.lock_portal_policy_source_rows(', 'p_workspace_id pg_catalog.text', 'p_employee_id pg_catalog.text', 'p_session_token_hash pg_catalog.bpchar','RETURNS pg_catalog.void','SECURITY INVOKER','SET search_path = pg_catalog']);
    expect(created[0].text).not.toMatch(/SECURITY DEFINER|OR REPLACE|IF NOT EXISTS/i);
    expect(parseDdlDeclarations(source).tables).toEqual([]);
    const words = tokenizeDdl(source).filter(t => t.kind === 'word').map(t => t.raw.toUpperCase());
    for (const word of ['GRANT','INSERT','UPDATE','DELETE','TRUNCATE']) expect(words).not.toContain(word);
  });
  it('preserves accepted original kernel observer and policy storage source hashes', () => {
    expect(source).toContain('lock_portal_policy_source_rows');
    expect(hash(original)).toBe('fed4de46092c03be9a35d66c1d080444d9db5fc107d1c48b7b67ac95578cfa03');
    expect(hash(installed)).toBe('d25be72e0bede3e2ded9ce0ba782b060e41260b79db00e202e1db1d6c965573a');
    expect(hash(readFileSync(resolve('src/lib/tenancy/runtime/capability-policy-definition-storage.sql')))).toBe('75e8f70dbd5e2381cdde2c425aa634fafe0fe420392b07ab858cf9900382a386');
  });
  it('requires exact original native parents keys references source guards and empty private FORCE RLS', () => {
    const pre = body(source, 'portal_policy_source_parent_prerequisites');
    clauses(pre,['portal_source_lock_schema_not_owned','portal_source_lock_relation_invalid','portal_source_lock_key_invalid','portal_source_lock_reference_invalid','portal_source_lock_guard_invalid','relation.relforcerowsecurity','pg_catalog.pg_policy',"'f10_tenant_c49de3d265fb'",'key_index.indisvalid','NOT key_constraint.condeferrable']);
    expect(pre).not.toContain('portal_source_lock_already_installed');
  });
  it('requires exact private policy counter definition and head catalog profiles without adopting a new observer', () => {
    const pre=body(source,'portal_policy_source_policy_prerequisites');
    clauses(pre,['capability_policy_definition','workspace_capability_policy_installation','portal_installed_policy_guard_invalid','portal_installed_policy_acl_invalid','relation.relforcerowsecurity','attribute.attnotnull','key_index.indisvalid','pg_catalog.pg_policy']);
    expect(pre).not.toContain('portal_installed_policy_already_installed');
  });
  it('binds both exact dependency prosrc hashes independently of their names', () => {
    const pre=body(source,'portal_policy_source_lock_dependencies');
    for (const [bytes,tag,pin] of [[original,'portal_source_locks','6266924ebb3e4ef28875123798084447816ba96c44a8be76491a13e31fd8af77'],[installed,'portal_installed_policy_observation','975487315f2e091f7659d5f9aa8c89cef4d13e1685e49f4a0162f5eb9a916baa']]) {
      expect(hash(body(bytes,tag))).toBe(pin); expect(pre).toContain(pin);
    }
    clauses(pre,["'lock_portal_source_rows'","'read_portal_installed_policy'","pg_catalog.convert_to(function.prosrc,'UTF8')"]);
  });
  it('closes native dependency arguments flags configuration ownership language and complete ACL profiles', () => {
    const pre=body(source,'portal_policy_source_lock_dependencies');
    clauses(pre,['function.proargnames=expected.argument_names','function.proargtypes=expected.argument_types','function.prorettype=expected.result_type','function.proowner=installer_oid','NOT function.proisstrict','NOT function.proleakproof','function.provariadic=0','function.pronargdefaults=0','function.prosupport=0','function.proargmodes IS NULL','function.proallargtypes IS NULL','function.probin IS NULL',"language.lanname='plpgsql'",'function.proconfig',"privilege.privilege_type<>'EXECUTE'",'privilege.is_grantable']);
  });
  it('rejects duplicate new names and every altered dependency overload rather than replacing them', () => {
    const pre=body(source,'portal_policy_source_lock_dependencies');
    clauses(pre,["function.proname='lock_portal_policy_source_rows'",'portal_policy_source_lock_already_installed','function.proname=expected.function_name) <> 1','portal_policy_source_lock_dependency_invalid']);
  });
  it('reconstructs every original body byte after removing only the RC check and fixed policy insertion', () => {
    let retained=joint();for (const addition of additions) {expect(retained.split(addition)).toHaveLength(2);retained=retained.replace(addition,'');}
    expect(retained).toBe(body(original,'portal_source_locks'));
  });
  it('rejects non-RC before the first original source row acquisition', () => {
    const text=joint();expect(text.indexOf('portal_policy_source_lock_isolation_required')).toBeLessThan(text.indexOf('PERFORM workspace.id'));
    expect(text.indexOf('PERFORM workspace.id')).toBeGreaterThan(0);
  });
  it('adds exactly one fixed policy read after the existing counter FOUND denial before Portal locks', () => {
    const text=joint();expect(text.match(/PERFORM nevora_tenancy\.read_portal_installed_policy\(p_workspace_id\);/g)).toHaveLength(1);
    const call=text.indexOf('PERFORM nevora_tenancy.read_portal_installed_policy');
    expect(call).toBeGreaterThan(text.indexOf('PERFORM incarnation.workspace_id'));expect(call).toBeLessThan(text.indexOf('PERFORM authority.workspace_id'));
    expect(text.slice(0,call).trimEnd().endsWith('-- Existing workspace/employee/credential/counter prefix is held; repeated observer prefix locks do not change order.')).toBe(true);
    expect(text.slice(0,call)).toContain("RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';\n  END IF;");
  });
  it('retains exact required-source order and all original immediate FOUND refusals', () => {
    const text=joint(), names=[...text.matchAll(/FROM (public|nevora_tenancy)\.(\w+) AS \w+[\s\S]*?FOR SHARE;/g)].map(m=>m[1]+'.'+m[2]);
    expect(names).toEqual(['public.workspaces','public.employees','public.employee_credentials','nevora_tenancy.workspace_incarnation_counter','nevora_tenancy.portal_authority','public.employee_sessions','nevora_tenancy.portal_session_issuance','nevora_tenancy.portal_administrative_authority','nevora_tenancy.portal_administrative_capability','nevora_tenancy.portal_administrative_location']);
    expect(text.match(/IF NOT FOUND THEN/g)).toHaveLength(7);
  });
  it('preserves the entire downstream optional header and byte-ordered children block', () => {
    const oldBody=body(original,'portal_source_locks'),newBody=joint();const marker='  PERFORM authority.workspace_id';
    expect(newBody.slice(newBody.indexOf(marker))).toBe(oldBody.slice(oldBody.indexOf(marker)));
    clauses(newBody,['IF FOUND THEN',"ORDER BY pg_catalog.convert_to(capability.capability, 'UTF8')","ORDER BY pg_catalog.convert_to(location.location_id, 'UTF8')"]);
  });
  it('neither calls the complete old kernel nor upgrades row locks or issues a proof from void', () => {
    const text=joint();expect(text).not.toContain('PERFORM nevora_tenancy.lock_portal_source_rows');
    expect(text).not.toMatch(/FOR UPDATE|FOR NO KEY UPDATE|FOR KEY SHARE|\b(INSERT|UPDATE|DELETE|TRUNCATE|EXECUTE|CALL|SET)\b|RETURN (TRUE|FALSE)|password_hash|expires_at|authorityCurrent|ALLOW|proof_issuer/i);
    expect(text).toContain('session.token_hash = p_session_token_hash');
  });
  it('requires exact final native profile and rejects named PUBLIC or grantable execution ACLs', () => {
    const final=body(source,'portal_policy_source_lock_final_acl');
    clauses(final,["function.proargtypes = '25 25 1042'",'NOT function.proisstrict','NOT function.proleakproof','function.proargnames=',"overload.proname=function.proname)=1",'privilege.grantee <> function.proowner',"privilege.privilege_type<>'EXECUTE'",'privilege.is_grantable','portal_policy_source_lock_acl_invalid']);
    expect(source).toContain('REVOKE ALL ON FUNCTION nevora_tenancy.lock_portal_policy_source_rows(pg_catalog.text,pg_catalog.text,pg_catalog.bpchar) FROM PUBLIC;');
  });
  it('documents complete-set writer phantom access and fresh comparison requirements without treating them as implemented', () => {
    expect(source).toContain('complete workspace/employee/credential sets');expect(source).toContain('absent row phantoms');
    expect(source).toContain('Safe root/owner/access/graph enrollment is OPEN');expect(source).toContain('executing-source authentication');
    expect(source).toContain('Explicit post-lock fresh/final Portal source comparisons are still required');
  });
});
