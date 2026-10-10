import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { tokenizeDdl } from '../inventory/ddl';
import { lexSql } from '../inventory/sql-lexer';

const path = resolve('src/lib/tenancy/runtime/portal-installed-policy-observation.sql');
// Missing source is a required-feature failure, never a collection exception.
const source = existsSync(path) ? readFileSync(path, 'utf8') : '';
const body = (tag: string) => {
  const token = tokenizeDdl(source).find(t => t.kind === 'literal' && t.raw.startsWith('$' + tag + '$'));
  expect(token, 'missing required source feature ' + tag).toBeDefined();
  return token!.raw.slice(tag.length + 2, -(tag.length + 2));
};
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

// Source checks do not execute SQL or establish protected invocation/authority.
describe('unused private installed policy source observer contracts', () => {
  it('owns an exact first exclusive fence under explicit ReadCommitted with fresh-only installation', () => {
    const journal = lexSql(source), statements = journal.parts.filter(p => p.kind === 'statement');
    expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    expect(statements.map(s => s.leadingKeyword)).toEqual(['BEGIN','WITH','SET','DO','CREATE','REVOKE','DO','COMMIT']);
    expect(statements[0].text).toContain('BEGIN ISOLATION LEVEL READ COMMITTED;');
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(statements[4].text).toContain('CREATE FUNCTION nevora_tenancy.read_portal_installed_policy(p_workspace_id pg_catalog.text)');
    expect(statements[4].text).not.toMatch(/CREATE OR REPLACE|IF NOT EXISTS/i);
  });
  it('requires existing private storage and the exact accepted guard bodies without grants or repair', () => {
    const pre = body('portal_installed_policy_prerequisites');
    const counter = readFileSync(resolve('src/lib/tenancy/runtime/workspace-incarnation-storage.sql'), 'utf8');
    const policy = readFileSync(resolve('src/lib/tenancy/runtime/capability-policy-definition-storage.sql'), 'utf8');
    for (const name of ['workspace_incarnation_counter','capability_policy_definition','workspace_capability_policy_installation',
      'relforcerowsecurity','pg_policy','pg_attribute','pg_constraint','pg_index','aclexplode','prosupport','tgdeferrable']) expect(pre).toContain(name);
    const counterBody = tokenizeDdl(counter).find(t => t.kind === 'literal' && t.raw.startsWith('$workspace_incarnation_guard$'));
    expect(counterBody).toBeDefined();
    expect(pre).toContain(counterBody!.raw.slice('$workspace_incarnation_guard$'.length, -'$workspace_incarnation_guard$'.length));
    const policyBody = tokenizeDdl(policy).find(t => t.kind === 'literal' && t.raw.startsWith('$capability_policy_guard$'));
    expect(policyBody).toBeDefined();
    expect(pre).toContain(digest(policyBody!.raw.slice('$capability_policy_guard$'.length, -'$capability_policy_guard$'.length)));
    expect(tokenizeDdl(source).filter(t => t.kind === 'word' && ['GRANT','ALTER','INSERT','UPDATE','DELETE','TRUNCATE'].includes(t.raw.toUpperCase()))).toEqual([]);
  });
  it('checks isolation before all five immediate required-row checks in declared lock order', () => {
    const reader = body('portal_installed_policy_observation');
    const clauses = ["current_setting('transaction_isolation')",'PERFORM workspace.id','PERFORM counter.workspace_id',
      'SELECT installation.policy_id,installation.policy_revision', 'PERFORM definition.policy_id',
      'PERFORM installation.workspace_id','SELECT pg_catalog.jsonb_build_object('];
    const positions = clauses.map(c => reader.indexOf(c)); expect(positions.every(p => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a,b) => a-b));
    expect(reader.match(/FOR SHARE;/g)).toHaveLength(4);
    expect(reader.match(/;\s*IF NOT FOUND THEN/g)).toHaveLength(6);
    expect(reader).toContain("IS DISTINCT FROM 'read committed'");
    expect(reader).not.toMatch(/\b(?:EXECUTE|CALL|INSERT|UPDATE|DELETE|TRUNCATE|GRANT|SET)\b/i);
  });
  it('refuses a moved head and stale counter in a separate fresh comparison without reselecting', () => {
    const reader = body('portal_installed_policy_observation');
    for (const clause of ['installation.workspace_incarnation IS NOT DISTINCT FROM counter.incarnation',
      'installation.workspace_incarnation IS NOT DISTINCT FROM selected_incarnation',
      'installation.installation_epoch IS NOT DISTINCT FROM selected_epoch',
      'installation.policy_revision IS NOT DISTINCT FROM selected_revision',
      "pg_catalog.convert_to(installation.policy_id,'UTF8') IS NOT DISTINCT FROM pg_catalog.convert_to(selected_policy_id,'UTF8')",
      "MESSAGE = 'portal_installed_policy_source_drift'",'RETURN observed;']) expect(reader).toContain(clause);
    expect(reader.match(/INTO selected_policy_id/g)).toHaveLength(1);
    expect(reader).not.toMatch(/LOOP|RETRY|COALESCE\(/i);
  });
  it('retains native integer generations and lengths as text with exact source bytes and observed JSONB wire', () => {
    const reader = body('portal_installed_policy_observation');
    for (const field of ['counter.incarnation','installation.workspace_incarnation','installation.installation_epoch',
      'installation.policy_revision','definition.revision']) expect(reader).toContain(field + '::pg_catalog.text');
    for (const field of ['canonical_policy_source','vocabulary_source','approved_prd_source']) {
      expect(reader).toContain("pg_catalog.encode(definition." + field + ",'base64')");
      expect(reader).toContain('pg_catalog.sha256(definition.' + field + ')');
      expect(reader).toContain('pg_catalog.octet_length(definition.' + field + ')::pg_catalog.text');
      expect(reader).toContain("pg_catalog.convert_from(definition." + field + ",'UTF8')");
    }
    expect(reader).toContain("'sourceBundle',definition.definition");
    expect(reader).toContain("'sourceBundleWire',pg_catalog.jsonb_build_object('encoding','UTF8','text',definition.definition::pg_catalog.text");
    expect(reader).not.toMatch(/::(?:pg_catalog\.)?(integer|int4|numeric|float|real|double)|trim\(|lower\(|upper\(/i);
  });
  it('compares the complete closed retained source bundle, with no interpreter or authenticated-policy claim', () => {
    const reader = body('portal_installed_policy_observation');
    expect(reader).toContain('definition.definition IS NOT DISTINCT FROM pg_catalog.jsonb_build_object(');
    for (const value of ['NEVORA_CAPABILITY_SOURCE_BUNDLE_V1','src/lib/capabilities/policy.ts','src/lib/capabilities/types.ts',
      'F_IMPLEMENTATION_PRD.md','PORTAL_INSTALLED_POLICY_OBSERVATION_V1','SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION']) expect(reader).toContain("'" + value + "'");
    expect(reader).not.toMatch(/evaluateCapability|ALLOW|password_hash|set_config|session_user|current_user|USING\s+TRUE/i);
  });
  it('creates a fixed INVOKER helper, revokes PUBLIC, and rejects ambient named ACLs without runtime enrollment', () => {
    for (const clause of ['RETURNS pg_catalog.jsonb','LANGUAGE plpgsql','SECURITY INVOKER','SET search_path = pg_catalog',
      'REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_installed_policy(pg_catalog.text) FROM PUBLIC;']) expect(source).toContain(clause);
    const final = body('portal_installed_policy_final_acl');
    for (const clause of ['NOT function.prosecdef','NOT function.proisstrict','NOT function.proleakproof',
      'function.prosupport = 0',"function.proargtypes = '25'::pg_catalog.oidvector",'privilege.grantee <> function.proowner']) expect(final).toContain(clause);
    expect(source).not.toMatch(/SECURITY DEFINER|CREATE ROLE|CREATE POLICY/i);
  });
  it('preserves original Portal helpers and requires a joint adapter, access, source authentication and recovery gates', () => {
    for (const clause of ['employee -> credential -> counter -> definition','Neither this helper before the complete old kernel',
      'Missing heads deny','No automatic retry/reselection','Old backups can roll back these controls',
      'Future access/owner/root/body/ACL/dependency']) expect(source).toContain(clause);
    expect(source).not.toMatch(/CREATE FUNCTION nevora_tenancy\.(?:resolve_portal|lock_portal_source_rows|read_portal_source_rows)/);
  });
});
