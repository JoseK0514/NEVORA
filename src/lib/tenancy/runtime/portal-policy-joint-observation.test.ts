import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { tokenizeDdl, parseDdlDeclarations } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';
const path = resolve('src/lib/tenancy/runtime/portal-policy-joint-observation.sql');
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const original = readFileSync(resolve('src/lib/tenancy/runtime/portal-source-observation.sql'), 'utf8');
const installed = readFileSync(resolve('src/lib/tenancy/runtime/portal-installed-policy-observation.sql'), 'utf8');
const locks = readFileSync(resolve('src/lib/tenancy/runtime/portal-policy-joint-locks.sql'), 'utf8');
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function body(bytes: string, tag: string) {
  const raw = tokenizeDdl(bytes).find(t => t.kind === 'literal' && t.raw.startsWith(`$${tag}$`))?.raw;
  expect(raw, `missing ${tag} implementation`).toBeDefined();
  return raw!.slice(tag.length + 2, -(tag.length + 2));
}
const observation = () => body(source, 'portal_policy_source_observation');
const clauses = (text: string, expected: string[]) => { for (const value of expected) expect(text).toContain(value); };
// Source installation contracts only. Native behavior requires its own owned fixture.
describe('unused joint Portal and installed-policy raw source observer', () => {
  it('uses one owning RC installer and the exact exclusive catalog fence first', () => {
    const journal = lexSql(source); expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    const statements = journal.parts.filter(p => p.kind === 'statement');
    expect(statements.map(p => p.leadingKeyword)).toEqual(['BEGIN','WITH','SET','DO','DO','DO','CREATE','REVOKE','DO','COMMIT']);
    expect(tokenizeDdl(statements[0].text).map(t => t.kind === 'word' ? t.raw.toUpperCase() : t.raw)).toEqual(['BEGIN','ISOLATION','LEVEL','READ','COMMITTED',';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(statements[2].text.trim()).toBe('SET LOCAL search_path = pg_catalog;');
  });
  it('creates only one fixed ungranted INVOKER JSONB observer with no storage or source DML', () => {
    const created = lexSql(source).parts.filter(p => p.kind === 'statement' && p.leadingKeyword === 'CREATE'); expect(created).toHaveLength(1);
    clauses(created[0].text, ['CREATE FUNCTION nevora_tenancy.read_portal_policy_source_rows(', 'p_workspace_id pg_catalog.text', 'p_employee_id pg_catalog.text', 'p_session_token_hash pg_catalog.bpchar','RETURNS pg_catalog.jsonb','SECURITY INVOKER','SET search_path = pg_catalog']);
    expect(created[0].text).not.toMatch(/SECURITY DEFINER|OR REPLACE|IF NOT EXISTS/i); expect(parseDdlDeclarations(source).tables).toEqual([]);
    const words = tokenizeDdl(source).filter(t => t.kind === 'word').map(t => t.raw.toUpperCase());
    for (const word of ['GRANT','INSERT','UPDATE','DELETE','TRUNCATE']) expect(words).not.toContain(word);
  });
  it('requires original source keys references guards and private FORCE zero-policy holders', () => {
    const pre = body(source, 'portal_policy_source_observation_parent_prerequisites');
    clauses(pre, ['portal_source_observation_relation_invalid','portal_source_observation_column_invalid','portal_source_observation_key_invalid','portal_source_observation_reference_invalid','relation.relforcerowsecurity','pg_catalog.pg_policy','key_index.indisvalid','pg_catalog.pg_trigger']);
    expect(pre).not.toContain('portal_source_observation_already_installed');
  });
  it('retains the complete joint policy storage prerequisites without selecting an installer by name', () => {
    expect(body(source, 'portal_policy_source_observation_policy_prerequisites')).toBe(body(locks, 'portal_policy_source_policy_prerequisites'));
  });
  it('binds each of the three existing dependency bodies by exact prosrc bytes', () => {
    const pre = body(source, 'portal_policy_source_observation_dependencies');
    for (const [bytes,tag,pin] of [[original,'portal_source_observation','7a83fca46be2a8f5c877ac6e5ae60328d5a454c2a974b624c6edd4ff8463b7f9'],[locks,'portal_policy_source_locks','6a25dc1ce379ce176f5995328032ad03d2a6749026d4aeafd42bfe68fb5703d1'],[installed,'portal_installed_policy_observation','975487315f2e091f7659d5f9aa8c89cef4d13e1685e49f4a0162f5eb9a916baa']]) {
      expect(hash(body(bytes,tag))).toBe(pin); expect(pre).toContain(pin);
    }
    clauses(pre,["'read_portal_source_rows'","'lock_portal_policy_source_rows'","'read_portal_installed_policy'","pg_catalog.convert_to(function.prosrc,'UTF8')"]);
  });
  it('closes dependency argument names flags owner language configuration and complete native execution ACL', () => {
    const pre = body(source, 'portal_policy_source_observation_dependencies');
    clauses(pre, ['function.proargnames=expected.argument_names','function.proargtypes=expected.argument_types','function.prorettype=expected.result_type','function.proowner=installer_oid','NOT function.proisstrict','NOT function.proleakproof','function.provariadic=0','function.pronargdefaults=0','function.prosupport=0','function.proargmodes IS NULL','function.proallargtypes IS NULL','function.probin IS NULL',"language.lanname='plpgsql'","function.proconfig=ARRAY['search_path=pg_catalog']",'privilege.grantee<>function.proowner',"privilege.privilege_type<>'EXECUTE'",'privilege.is_grantable']);
  });
  it('refuses duplicate target names and altered dependency overloads without replacement', () => {
    clauses(body(source, 'portal_policy_source_observation_dependencies'), ["function.proname='read_portal_policy_source_rows'",'portal_policy_source_observation_already_installed','function.proname=expected.function_name) <> 1','portal_policy_source_observation_dependency_invalid']);
  });
  it('rejects non-RC before invoking its exact three-argument joint lock dependency', () => {
    const text = observation(); const check = text.indexOf('portal_policy_source_observation_isolation_required'), call = text.indexOf('PERFORM nevora_tenancy.lock_portal_policy_source_rows');
    expect(check).toBeGreaterThan(0); expect(check).toBeLessThan(call);
    expect(text).toContain('PERFORM nevora_tenancy.lock_portal_policy_source_rows(p_workspace_id,p_employee_id,p_session_token_hash);');
  });
  it('calls one joint kernel then one fresh joined read without reselecting a head or relocking rows', () => {
    const text = observation(); expect(text.match(/PERFORM nevora_tenancy\.lock_portal_policy_source_rows\(/g)).toHaveLength(1);
    expect(text.match(/SELECT pg_catalog\.jsonb_build_object\(/g)).toHaveLength(1);
    expect(text).not.toMatch(/PERFORM nevora_tenancy\.(lock_portal_source_rows|read_portal_installed_policy)|SELECT installation\.policy_id|FOR SHARE|FOR UPDATE|\bEXECUTE\b|\bCALL\b/);
    expect(text.indexOf('PERFORM nevora_tenancy.lock_portal_policy_source_rows')).toBeLessThan(text.indexOf('SELECT pg_catalog.jsonb_build_object'));
  });
  it('preserves the entire original Portal projection byte for byte beneath its outer key', () => {
    const old = body(original, 'portal_source_observation'), text = observation();
    const start = old.indexOf('pg_catalog.jsonb_build_object(', old.indexOf('  SELECT'));
    const projection = old.slice(start, old.indexOf(' INTO observed'));
    expect(hash(projection)).toBe('308470793ce2c03d70c78ad14237fb3c2b7ce1d686d93eb645f1e5fe2154af24');
    const nested = text.indexOf("'portalSource',") + "'portalSource',".length;
    expect(text.slice(nested,text.indexOf(",\n    'installedPolicy'"))).toBe(projection);
  });
  it('retains original Portal source joins and exact input identity predicate bytes', () => {
    const old = body(original, 'portal_source_observation'), text = observation();
    const from = old.slice(old.indexOf('  FROM public.workspaces'), old.indexOf('  WHERE workspace.id'));
    const where = old.slice(old.indexOf('  WHERE workspace.id'),old.indexOf(';\n  IF NOT FOUND'));
    expect(hash(from)).toBe('08ced0ab1995e8a00e40d6d82348e2813080526a45292e702c61ffc5445fdedc');
    expect(hash(where)).toBe('5dd55af77cafffc13451030f43cd3e8faab3cbe1ea1a2371f2bfbccafc31f5c6');
    expect(text).toContain(from); expect(text).toContain(where);
  });
  it('retains exact installed policy projection with only the shared counter alias substitution', () => {
    const old = body(installed, 'portal_installed_policy_observation'), text = observation();
    const marker = "    'kind','PORTAL_INSTALLED_POLICY_OBSERVATION_V1',";
    const start = old.lastIndexOf(marker), end = old.indexOf(",\n    'verification'",start);
    const projection = old.slice(start,end).replaceAll('counter.','incarnation.');
    const newStart = text.indexOf(marker), newEnd = text.indexOf(",\n    'verification'",newStart);
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start); expect(text.slice(newStart,newEnd)).toBe(projection);
  });
  it('requires current incarnation positive native int8 full three-source bytes and the exact closed source bundle', () => {
    clauses(observation(), ['installation.workspace_incarnation IS NOT DISTINCT FROM incarnation.incarnation','incarnation.incarnation > 0::pg_catalog.int8','installation.installation_epoch > 0::pg_catalog.int8','definition.revision > 0::pg_catalog.int8','definition.revision OPERATOR(pg_catalog.=) installation.policy_revision','definition.definition IS NOT DISTINCT FROM pg_catalog.jsonb_build_object(',"'format','NEVORA_CAPABILITY_SOURCE_BUNDLE_V1'"]);
    for (const name of ['canonical_policy_source','vocabulary_source','approved_prd_source']) clauses(observation(), [`pg_catalog.sha256(definition.${name})`,`pg_catalog.convert_from(definition.${name},'UTF8')`,`pg_catalog.encode(definition.${name},'base64')`,`pg_catalog.octet_length(definition.${name})::pg_catalog.text`]);
  });
  it('returns closed raw observations and rejects fresh-read drift without treating source bytes as authority', () => {
    const text = observation(); clauses(text, ["'kind','PORTAL_POLICY_SOURCE_OBSERVATION_V1'","'portalSource',pg_catalog.jsonb_build_object(","'installedPolicy',pg_catalog.jsonb_build_object(","'verification','SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION'",'IF NOT FOUND THEN','portal_policy_source_observation_missing_or_drift','RETURN observed;']);
    expect(text).not.toMatch(/password_hash|\bproof_issuer\b|RETURN (TRUE|FALSE)|\bALLOW\b|SET LOCAL ROLE|set_config|pg_sleep/i);
    expect(text.match(/IF NOT FOUND THEN/g)).toHaveLength(1);
  });
  it('closes the final native target body profile and PUBLIC or grantable execution privileges', () => {
    clauses(body(source, 'portal_policy_source_observation_final_acl'), ["function.proargtypes = '25 25 1042'",'NOT function.proisstrict','NOT function.proleakproof','function.proargnames=',"overload.proname=function.proname)=1",'privilege.grantee<>function.proowner',"privilege.privilege_type<>'EXECUTE'",'privilege.is_grantable','portal_policy_source_observation_acl_invalid']);
    expect(source).toContain('REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_policy_source_rows(pg_catalog.text,pg_catalog.text,pg_catalog.bpchar) FROM PUBLIC;');
  });
  it('documents missing phantom writer access and executing-source gates without claiming them implemented', () => {
    clauses(source,['Missing-head/admin-child phantoms','complete employee/credential sets','writer prelocks','FORCE RLS zero policies','private access/graph/current-source roots stay OPEN','executing-source authentication']);
  });
});
