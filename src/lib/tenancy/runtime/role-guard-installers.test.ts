import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { lexSql } from '../inventory/sql-lexer';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';

const specifications = [
  { name: 'role-guard', helper: 'assert_runtime_role', sha256: '7c0ce83b99d401aac9a31db391cb750b676a22bf3c76e440194de986299bbd6a', controls: ['runtime_role_binding'] },
  { name: 'audited-role-guard', helper: 'assert_audited_runtime_role', sha256: 'd00f270f726111283289dc02a050125128541fdb414e08812660bc0ccb232f21', controls: ['runtime_role_binding', 'audited_helper_capability'] },
] as const;
// Source scaffolds only, never native privilege/installation evidence. Missing
// standalone RED observes the unchanged prior definition-only fragment.
describe.each(specifications)('$name fresh-only standalone source contract', spec => {
  const folder = resolve('src/lib/tenancy/runtime');
  const artifactPath = resolve(folder, spec.name + '-installer.sql');
  const original = readFileSync(resolve(folder, spec.name + '.sql'), 'utf8');
  const freshDefinition = original.replace('CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION');
  const written = existsSync(artifactPath);
  const artifact = written ? readFileSync(artifactPath, 'utf8') : original;
  const parts = lexSql(artifact).parts.filter(part => part.kind === 'statement');
  it('adds a distinct artifact while retaining every accepted original fragment byte', () => {
    expect(written).toBe(true);
    expect(createHash('sha256').update(original).digest('hex')).toBe(spec.sha256);
    expect(artifact.split(freshDefinition)).toHaveLength(2);
  });
  it('owns explicit ReadCommitted and takes the exact first exclusive fence', () => {
    expect(parts[0].text.trim()).toBe('BEGIN ISOLATION LEVEL READ COMMITTED;');
    expect(parts[1].text).toBe('\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
    expect(parts.filter(part => part.text === '\n' + INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text)).toHaveLength(1);
    expect(parts[2].text.trim()).toBe('SET LOCAL search_path = pg_catalog;');
  });
  it('validates owned native schema and controlled storage before the definition', () => {
    expect(parts[3].text.trim()).toMatch(/^DO \$helper_installer_prerequisites\$/);
    for (const table of spec.controls) expect(parts[3].text).toContain("'" + table + "'");
    for (const field of ['n.nspowner', 'c.relowner', 'c.relkind', 'c.relpersistence', 'c.relrowsecurity', 'c.relforcerowsecurity', 'a.attnotnull', 'a.atthasdef', 'a.attidentity', 'a.attgenerated', 'co.convalidated', 'co.condeferrable', 'co.condeferred']) expect(parts[3].text).toContain(field);
    expect(parts[3].text).toContain('current_user');
    expect(parts[3].text).toContain("ERRCODE='42501'");
    expect(parts[3].text).toContain("ERRCODE='55000'");
  });
  it('rejects any existing helper and cannot perform CREATE OR REPLACE', () => {
    expect(parts[3].text).toContain('pg_catalog.pg_proc');
    expect(parts[3].text).toContain("p.proname='" + spec.helper + "'");
    expect(parts[3].text).toContain("ERRCODE='42723'");
    expect(parts.filter(part => /CREATE FUNCTION/.test(part.text))).toHaveLength(1);
    expect(artifact).not.toContain('CREATE OR REPLACE FUNCTION');
  });
  it('requires the source-defined constraints and their native immediate backing indexes', () => {
    const prerequisite = parts[3].text;
    for (const name of ['runtime_role_binding_kind_check', 'runtime_role_binding_pkey', 'runtime_role_binding_role_name_key', 'runtime_role_binding_role_oid_key']) expect(prerequisite).toContain(name);
    if (spec.controls.length === 2) for (const name of ['audited_helper_capability_pkey', 'audited_helper_capability_check', 'audited_helper_capability_runtime_kind_check', 'audited_helper_capability_review_source_sha256_check']) expect(prerequisite).toContain(name);
    for (const field of ['pg_catalog.pg_get_constraintdef', 'co.conkey', 'co.conindid', 'i.indisvalid', 'i.indisready', 'i.indislive', 'i.indimmediate', 'i.indkey', 'i.indclass', 'i.indcollation', 'i.indoption', 'i.indexprs IS NULL', 'i.indpred IS NULL', 'index_relation.reloptions IS NULL', 'opclass.opcdefault']) expect(prerequisite).toContain(field);
  });
  it('refuses ambient schema table and column grants without repairing controlled storage', () => {
    const prerequisite = parts[3].text;
    for (const field of ['pg_catalog.aclexplode', 'pg_catalog.acldefault', 'n.nspacl', 'c.relacl', 'a.attacl', 'acl.grantee<>installer_oid', 'acl.is_grantable']) expect(prerequisite).toContain(field);
    expect(prerequisite).toContain('helper_installer_control_acl_invalid');
    expect(prerequisite).not.toMatch(/\b(?:GRANT|REVOKE|ALTER|UPDATE|DELETE|INSERT)\b/);
  });
  it('retains the complete reviewed invoker logic with only fresh CREATE declaration', () => {
    const oldPart = lexSql(original).parts.filter(part => part.kind === 'statement');
    expect(oldPart).toHaveLength(1);
    const create = parts.find(part => part.text.includes('CREATE FUNCTION nevora_tenancy.' + spec.helper));
    expect(create?.text.trim()).toBe(oldPart[0].text.trim().replace('CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION'));
    expect(create?.text).toContain('VOLATILE\nSECURITY INVOKER\nSET search_path = pg_catalog');
  });
  it('revokes PUBLIC then verifies private native ACL before commit', () => {
    const revoke = parts.findIndex(part => part.text.trim() === 'REVOKE ALL ON FUNCTION nevora_tenancy.' + spec.helper + '(text) FROM PUBLIC;');
    const final = parts.findIndex(part => part.text.trim().startsWith('DO $helper_installer_final$'));
    expect(revoke).toBeGreaterThan(4);
    expect(final).toBe(revoke + 1);
    for (const field of ['pg_catalog.aclexplode', 'pg_catalog.acldefault', 'acl.grantee<>p.proowner', "ERRCODE='55000'"]) expect(parts[final].text).toContain(field);
    expect(parts.at(-1)?.text.trim()).toBe('COMMIT;');
  });
  it('does not seed roles, records, named grants or a competing execution path', () => {
    expect(artifact.replace(freshDefinition, '')).not.toMatch(/\b(?:CREATE ROLE|ALTER ROLE|GRANT |INSERT INTO|UPDATE nevora|DELETE FROM|TRUNCATE |CREATE POLICY|SET ROLE)\b/);
    expect(parts).toHaveLength(8);
  });
});
