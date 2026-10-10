import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
import { lexSql } from '../inventory/sql-lexer';
import { tokenizeDdl } from '../inventory/ddl';

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

const source = readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login-installer.sql'), 'utf8');
const validator = readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login.sql'), 'utf8');
const existingInstaller = readFileSync(resolve('src/lib/tenancy/runtime/audited-role-guard-installer.sql'), 'utf8');
const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
const journal = lexSql(source);
const statements = journal.parts.filter(part => part.kind === 'statement');
const words = (text: string) => tokenizeDdl(text).map(token => token.kind === 'word' ? token.raw.toUpperCase() : token.raw);
function block(text: string, marker: string): string {
  const start = 'DO $' + marker + '$'; const end = '$' + marker + '$;';
  expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
  return text.slice(text.indexOf(start), text.indexOf(end) + end.length);
}
const prerequisite = () => block(source, 'original_login_installer_prerequisites');
const finalGuard = () => block(source, 'original_login_installer_final');
function expectedPrerequisite(): string {
  return block(existingInstaller, 'helper_installer_prerequisites')
    .replaceAll('helper_installer_', 'original_login_installer_')
    .replaceAll("p.proname='assert_audited_runtime_role'", "p.proname='require_original_runtime_login_kind'");
}

// Source-only contracts: journal/token checks do not parse PL/pgSQL semantics,
// run installation, grant permissions, or verify any native/runtime behavior.
describe('unused original LOGIN validator fresh installer source', () => {
  it('preserves lossless complete inert boundaries without claiming semantic SQL execution', () => {
    expect(journal.parts.map(part => part.text).join('')).toBe(source);
    expect(journal.complete).toBe(true); expect(journal.diagnostics).toEqual([]);
    expect(journal.semanticAnalysis).toBe('NOT_PERFORMED');
    expect(statements.every(part => part.terminated)).toBe(true);
  });
  it('owns one explicit ReadCommitted transaction with the exact exclusive fence first', () => {
    expect(statements.map(part => part.leadingKeyword)).toEqual(['BEGIN', 'WITH', 'SET', 'DO', 'CREATE', 'REVOKE', 'DO', 'COMMIT']);
    expect(words(statements[0].text)).toEqual(['BEGIN', 'ISOLATION', 'LEVEL', 'READ', 'COMMITTED', ';']);
    expect(statements[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(statements.filter(part => part.text === '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text)).toHaveLength(1);
    expect(words(statements[2].text)).toEqual(['SET', 'LOCAL', 'SEARCH_PATH', '=', 'PG_CATALOG', ';']);
    expect(words(statements[7].text)).toEqual(['COMMIT', ';']);
  });
  it('retains the entire already-tested prerequisite envelope with only fixed installer target/labels changed', () => {
    expect(hash(beforePortalDependencyInsertions(existingInstaller))).toBe('9f8fd73c7a0f2711aaac38836377d9a1ca6e0b504ab899c32c6558a2366b6f99');
    expect(prerequisite()).toBe(expectedPrerequisite());
  });
  it('requires current installer ownership of the pre-existing exact controlled schema before any CREATE', () => {
    const guard = prerequisite();
    for (const clause of ['SELECT r.oid INTO installer_oid FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user',
      "n.nspname='nevora_tenancy'", 'n.oid=schema_oid AND n.nspowner=installer_oid',
      "'original_login_installer_schema_missing' USING ERRCODE='3F000'",
      "'original_login_installer_schema_not_owned' USING ERRCODE='42501'"]) expect(guard).toContain(clause);
    expect(statements[3].text).toContain(guard);
  });
  it.each(['runtime_role_binding', 'audited_helper_capability'] as const)
  ('rejects malformed %s native storage instead of creating or accepting a partial control contract', table => {
    const guard = prerequisite();
    expect(guard).toContain("c.relname='" + table + "' AND c.relkind='r' AND c.relpersistence='p'");
    expect(guard).toContain('c.relowner=installer_oid AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity');
    expect(guard).toContain("'original_login_installer_storage_invalid:" + table + "' USING ERRCODE='55000'");
    for (const native of ['a.atthasdef OR a.attidentity', 'NOT co.convalidated OR co.condeferrable', 'conenforced',
      'pg_catalog.pg_index', 'i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate',
      'pg_catalog.pg_opclass', 'pg_catalog.pg_inherits', 'pg_catalog.pg_trigger', 'pg_catalog.pg_rewrite']) expect(guard).toContain(native);
  });
  it('keeps schema/table/column default and named ACL closure without silent repair or grant expansion', () => {
    const guard = prerequisite();
    for (const clause of ['pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault',
      'pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault', 'pg_catalog.aclexplode(a.attacl)',
      'acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable',
      "'original_login_installer_control_acl_invalid' USING ERRCODE='55000'"]) expect(guard).toContain(clause);
    expect(words(guard).filter(word => ['GRANT', 'REVOKE', 'CREATE', 'ALTER', 'DROP', 'EXECUTE', 'INSERT', 'UPDATE', 'DELETE'].includes(word))).toEqual([]);
  });
  it('rejects every existing target overload before creation rather than replacing or adopting it', () => {
    const guard = prerequisite();
    expect(guard).toContain("IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace=schema_oid AND p.proname='require_original_runtime_login_kind') THEN");
    expect(guard).toContain("'original_login_installer_duplicate_function' USING ERRCODE='42723'");
    expect(guard.slice(guard.lastIndexOf('IF EXISTS'))).not.toContain('proargtypes');
    expect(source).not.toContain('CREATE OR REPLACE FUNCTION');
    expect(words(source).filter(word => ['DROP', 'ALTER'].includes(word))).toEqual([]);
  });
  it('embeds the exact frozen validator body and comments with only the fresh CREATE declaration changed', () => {
    expect(hash(beforePortalDependencyInsertions(validator))).toBe('d27ddb080930638b32557767b81d2d249cd46511351baad8eb9d4154a77533db');
    const fresh = validator.replace('CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION');
    expect(source.split(fresh)).toHaveLength(2);
    const declaration = 'CREATE FUNCTION nevora_tenancy.require_original_runtime_login_kind()';
    expect(statements[4].text).toContain(declaration);
    const start = source.indexOf(declaration), end = source.indexOf('$original_runtime_login$;', start) + '$original_runtime_login$;'.length;
    expect(source.slice(start, end)).toBe(fresh.slice(fresh.indexOf(declaration)).trimEnd());
    expect(source).not.toContain('CREATE FUNCTION nevora_tenancy.assert_audited_runtime_role');
  });
  it('rechecks the fixed native zero-argument text PLpgSQL INVOKER contract before commit', () => {
    const final = finalGuard();
    for (const clause of ["p.proname='require_original_runtime_login_kind'", 'p.pronargs=0',
      "p.proargtypes=''::pg_catalog.oidvector", 'p.proallargtypes IS NULL AND p.proargmodes IS NULL AND p.proargnames IS NULL',
      "p.prokind='f' AND NOT p.prosecdef AND p.provolatile='v' AND p.prorettype=25::pg_catalog.oid",
      "NOT p.proleakproof AND p.proparallel='u'", 'p.provariadic=0::pg_catalog.oid',
      'NOT p.proretset AND p.pronargdefaults=0 AND p.prosupport=0::pg_catalog.oid',
      "language.lanname='plpgsql'", "p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]",
      'p.proowner=(SELECT r.oid FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user)']) expect(final).toContain(clause);
    expect(final).toContain("'original_login_installer_private_function_invalid' USING ERRCODE='55000'");
    expect(statements[6].text).toContain(final); expect(statements[7].leadingKeyword).toBe('COMMIT');
  });
  it('revokes only PUBLIC target-function EXECUTE and rejects ambient named/default grants rather than repairing them', () => {
    const revokes = statements.filter(part => part.leadingKeyword === 'REVOKE');
    expect(revokes).toHaveLength(1);
    expect(words(revokes[0].text)).toEqual(['REVOKE', 'ALL', 'ON', 'FUNCTION', 'NEVORA_TENANCY', '.', 'REQUIRE_ORIGINAL_RUNTIME_LOGIN_KIND', '(', ')', 'FROM', 'PUBLIC', ';']);
    const final = finalGuard();
    expect(final).toContain("pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner)))");
    expect(final).toContain("acl.grantee<>p.proowner OR acl.grantor<>p.proowner OR acl.privilege_type<>'EXECUTE' OR acl.is_grantable");
    expect(words(final).filter(word => ['GRANT', 'REVOKE', 'EXECUTE', 'UPDATE', 'INSERT', 'DELETE'].includes(word))).toEqual([]);
  });
  it('contains no role, binding, policy, table, grants or runtime activation side effects', () => {
    const creations = statements.filter(part => part.leadingKeyword === 'CREATE');
    expect(creations).toHaveLength(1); expect(words(creations[0].text).slice(0, 2)).toEqual(['CREATE', 'FUNCTION']);
    expect(statements.map(part => part.leadingKeyword)).not.toContain('GRANT');
    expect(statements.map(part => part.leadingKeyword).filter(keyword => ['INSERT', 'UPDATE', 'DELETE', 'ALTER', 'DROP'].includes(keyword!))).toEqual([]);
    expect(source).toContain('unused private dependency only');
    expect(source).toContain('native verification and caller integration remain pending');
    expect(source).toContain('does not authenticate installer or review authority');
    expect(source).toContain('No named grants, role/binding seeds or activation');
  });
});
