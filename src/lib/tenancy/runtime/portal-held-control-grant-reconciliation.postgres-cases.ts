// SOURCE PREPARATION ONLY: every callback below is UNEXECUTED.
// Add to the existing exact ROOT-owned F_CI fixture after real CI-P02 succeeds.
// No standalone runner, env/URL discovery, resource creation or SQL on import.
// These calls test a private native comparison; they never invoke resolve_portal
// or issue a proof/grant. All DDL/DML below is fictional QA within owned rollback.
import { describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
type Fixture = Readonly<{
  admin: Client;
  captureCompleteCatalogAndRows: () => Promise<string>;
  record: (value: unknown) => void;
}>;
type Context = Readonly<{
  reader_oid: string; installer_oid: string; reader_name: string;
  installer_name: string; root_oid: string; other_root_oid: string; app_oid: string;
}>;
const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const fixed = (name: string) => readFileSync('src/lib/tenancy/runtime/' + name, 'utf8');
const contextSQL = `SELECT root.oid::pg_catalog.text AS root_oid,reader.oid::pg_catalog.text AS reader_oid,
 reader.rolname::pg_catalog.text AS reader_name,installer.oid::pg_catalog.text AS installer_oid,
 installer.rolname::pg_catalog.text AS installer_name,
 'nevora_tenancy.require_original_runtime_login_kind()'::pg_catalog.regprocedure::pg_catalog.oid::pg_catalog.text AS other_root_oid,
 (SELECT binding.role_oid::pg_catalog.text FROM nevora_tenancy.runtime_role_binding AS binding WHERE binding.kind='APP') AS app_oid
FROM pg_catalog.pg_proc AS root JOIN pg_catalog.pg_namespace AS schema ON schema.oid=root.pronamespace
JOIN pg_catalog.pg_roles AS reader ON reader.oid=root.proowner
JOIN pg_catalog.pg_roles AS installer ON installer.rolname=session_user
WHERE schema.nspname='nevora_tenancy' AND root.proname='resolve_portal';`;
function rootBody(): string {
  const raw = fixed('protected-portal-root-source.test.sql');
  expect(sha256(raw)).toBe('068776a706cebc22d5b402f433a7e4ca5756d836948f42dacd1d9c5d4d928873');
  const pieces = raw.split('$protected_portal_source_resolver$');
  expect(pieces).toHaveLength(3);
  return pieces[1];
}
async function held(client: Client): Promise<string> {
  const raw = fixed('installer-held-source-controls.test.sql');
  expect(sha256(raw)).toBe('7eab4266c224eded206cf81a6bd1c973a47f469c4a3a2d3184687f69b3eced6e');
  const result = await client.query(raw, []);
  expect(result.rows).toHaveLength(1); // a missing original prerequisite is SETUP, not feature RED
  expect(Object.keys(result.rows[0])).toEqual(['source_controls']);
  expect(typeof result.rows[0].source_controls).toBe('string');
  return result.rows[0].source_controls as string;
}
async function compare(client: Client, context: Context, before: string, after: string,
  override: Readonly<Partial<Context>> = {}, bodyOverride?: string): Promise<boolean> {
  const selected = { ...context, ...override };
  const sql = fixed('held-source-controls-grant-reconciliation.test.sql');
  expect(sha256(sql)).toBe('a3e6f9cac5efc9f8eb06423cc793213b0b5acceab91d967d470de0ebda985c17');
  const result = await client.query(sql, [before, after, selected.reader_oid, selected.installer_oid,
    selected.reader_name, selected.installer_name, selected.root_oid, bodyOverride ?? rootBody()]);
  expect(result.rows).toHaveLength(1);
  expect(Object.keys(result.rows[0])).toEqual(['source_controls_match']);
  expect(typeof result.rows[0].source_controls_match).toBe('boolean');
  return result.rows[0].source_controls_match as boolean;
}
async function nativeText(client: Client, original: string, path: readonly string[], value: string): Promise<string> {
  // Adversarial retained-text fixture only. PostgreSQL handles all numeric bytes;
  // no JS parse/float/re-serialization of native int8/catalog payloads.
  const result = await client.query(`SELECT pg_catalog.jsonb_set($1::pg_catalog.jsonb,$2::pg_catalog.text[],
    $3::pg_catalog.jsonb,false)::pg_catalog.text AS source_controls`, [original, [...path], value]);
  expect(result.rows).toHaveLength(1);
  expect(typeof result.rows[0].source_controls).toBe('string');
  return result.rows[0].source_controls as string;
}
export function definePortalHeldControlGrantReconciliationNativeCases(fixture: () => Fixture): void {
  async function ownCase(caseId: string, action: (f: Fixture, c: Context, initial: string) => Promise<void>): Promise<void> {
    const f = fixture(), client = f.admin;
    expect(client.getTransactionStatus()).toBe('I');
    const completeBefore = await f.captureCompleteCatalogAndRows();
    let owned = false;
    try {
      owned = true; await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
      await client.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text, []);
      await client.query('SET LOCAL search_path=pg_catalog');
      const context = await client.query(contextSQL, []);
      expect(context.rows).toHaveLength(1);
      const c = context.rows[0] as Context;
      for (const key of ['reader_oid','installer_oid','reader_name','installer_name','root_oid','other_root_oid','app_oid'] as const)
        expect(typeof c[key]).toBe('string');
      const initial = await held(client);
      const baseline = await compare(client, c, initial, initial);
      f.record({ caseId, phase: 'ACTUAL_COMPLETE_NATIVE_BASELINE', context: c, initial, baseline,
        claim: 'COMPARISON_QA_ONLY_NOT_PROOF_OR_AUTHORITY' });
      expect(baseline).toBe(true); // requires genuine root-owned CI-P02 installation first
      await action(f, c, initial);
    } finally {
      // pg error promises may reject before ReadyForQuery changes cached status.
      // This exact verified-idle caller owns BEGIN: always await its ROLLBACK.
      if (owned) { await client.query('ROLLBACK'); expect(client.getTransactionStatus()).toBe('I'); }
      const completeAfter = await f.captureCompleteCatalogAndRows();
      f.record({ caseId, phase: 'OWNED_ROLLBACK_SOURCE_RESTORED', beforeSHA256: sha256(completeBefore),
        afterSHA256: sha256(completeAfter), byteLength: Buffer.byteLength(completeBefore, 'utf8'),
        exactlyEqual: completeBefore === completeAfter });
      expect(completeAfter).toBe(completeBefore);
    }
  }
  async function observed(caseId: string, f: Fixture, c: Context, before: string, label: string, expected: boolean): Promise<void> {
    const after = await held(f.admin), result = await compare(f.admin, c, before, after);
    f.record({ caseId, label, phase: 'ACTUAL_COMPLETE_NATIVE_COMPARISON', before, after, result });
    expect(result).toBe(expected);
  }
  describe('held source controls exact intended schema grant; no authority claim', () => {
    it('HR01 retains the already-present exact owner-granted nongrantable USAGE', async () => {
      await ownCase('HR01', async (f, c, before) => { await observed('HR01', f, c, before, 'unchanged ACL and complete controls', true); });
    }, 30000);
    it('HR02 permits only the actual intended owner→reader nongrantable schema USAGE addition', async () => {
      await ownCase('HR02', async (f, c) => {
        await f.admin.query('REVOKE USAGE ON SCHEMA nevora_tenancy FROM ' + quote(c.reader_name));
        const before = await held(f.admin);
        await f.admin.query('GRANT USAGE ON SCHEMA nevora_tenancy TO ' + quote(c.reader_name));
        await observed('HR02', f, c, before, 'native owner nongrantable USAGE only', true);
      });
    }, 30000);
    it.each([
      ['HR03', 'additional reader CREATE', 'GRANT CREATE ON SCHEMA nevora_tenancy TO READER'],
      ['HR04', 'reader USAGE with grant option', 'GRANT USAGE ON SCHEMA nevora_tenancy TO READER WITH GRANT OPTION'],
      ['HR05', 'removed preexisting owner CREATE', 'REVOKE CREATE ON SCHEMA nevora_tenancy FROM INSTALLER'],
      ['HR06', 'removed preexisting reader USAGE', 'REVOKE USAGE ON SCHEMA nevora_tenancy FROM READER']
    ] as const)('%s denies %s', async (id, label, mutation) => {
      await ownCase(id, async (f, c, before) => {
        await f.admin.query(mutation.replace('READER', quote(c.reader_name)).replace('INSTALLER', quote(c.installer_name)));
        await observed(id, f, c, before, label, false);
      });
    }, 30000);
    it.each([
      ['HR07', 'reader OID equals installer', 'reader_oid'],
      ['HR08', 'installer OID equals reader', 'installer_oid'],
      ['HR09', 'root OID is the distinct native original-login helper', 'root_oid'],
      ['HR10', 'reader exact name mismatch', 'reader_name'],
      ['HR11', 'installer exact name mismatch', 'installer_name'],
      ['HR12', 'noncanonical reader OID spelling', 'reader_oid_noncanonical']
    ] as const)('%s denies %s independently of equal retained snapshots', async (id, label, field) => {
      await ownCase(id, async (f, c, before) => {
        const override: { -readonly [Key in keyof Context]?: Context[Key] } = {};
        if (field === 'reader_oid') override.reader_oid = c.installer_oid;
        if (field === 'installer_oid') override.installer_oid = c.reader_oid;
        if (field === 'root_oid') override.root_oid = c.other_root_oid;
        if (field === 'reader_name') override.reader_name = c.reader_name + '_wrong';
        if (field === 'installer_name') override.installer_name = c.installer_name + '_wrong';
        if (field === 'reader_oid_noncanonical') override.reader_oid = '0' + c.reader_oid;
        const result = await compare(f.admin, c, before, before, override);
        f.record({ caseId: id, label, phase: 'INDEPENDENT_NATIVE_BINDING_DENIAL', override, result }); expect(result).toBe(false);
      });
    }, 30000);
    it('HR13 denies fixed root-body mismatch despite identical native controls', async () => {
      await ownCase('HR13', async (f, c, before) => {
        const result = await compare(f.admin, c, before, before, {}, rootBody() + '\n');
        f.record({ caseId: 'HR13', label: 'source body bytes mismatch', result }); expect(result).toBe(false);
      });
    }, 30000);
    it.each([
      ['HR14', 'unsafe reader INHERIT', 'ALTER ROLE READER INHERIT'],
      ['HR15', 'root security guard changed', 'ALTER FUNCTION nevora_tenancy.resolve_portal(text,text) SECURITY INVOKER'],
      ['HR16', 'control column catalog/default changed', 'ALTER TABLE nevora_tenancy.owned_table_contract ALTER COLUMN source_line SET DEFAULT 1'],
      ['HR17', 'extra control table privilege', 'GRANT SELECT ON nevora_tenancy.owned_table_contract TO READER'],
      ['HR18', 'extra control column privilege', 'GRANT SELECT(source_line) ON nevora_tenancy.owned_table_contract TO READER'],
      ['HR19', 'native protocol row generation changed', 'UPDATE nevora_tenancy.expansion_protocol SET fence_generation=fence_generation+1 WHERE migration_id=26']
    ] as const)('%s denies %s without dropping any retained field', async (id, label, mutation) => {
      await ownCase(id, async (f, c, before) => {
        await f.admin.query(mutation.replace('READER', quote(c.reader_name)));
        await observed(id, f, c, before, label, false);
      });
    }, 30000);
    it('HR20 distinguishes neighboring native int8 above JS-safe range and restores original data', async () => {
      await ownCase('HR20', async (f, c) => {
        await f.admin.query("UPDATE nevora_tenancy.expansion_protocol SET fence_generation=9007199254740992::pg_catalog.int8 WHERE migration_id=26");
        const before = await held(f.admin);
        await f.admin.query("UPDATE nevora_tenancy.expansion_protocol SET fence_generation=9007199254740993::pg_catalog.int8 WHERE migration_id=26");
        await observed('HR20', f, c, before, 'exact neighboring native int8 without JS conversion', false);
      });
    }, 30000);
    it.each([
      ['HR21', 'numeric string instead of native int8', '"0"'],
      ['HR22', 'fractional native JSON number', '0.5'],
      ['HR23', 'negative native JSON number', '-1'],
      ['HR24', 'int8 overflow', '9223372036854775808'],
      ['HR25', 'native JSON boolean instead of int8', 'false'],
      ['HR26', 'native JSON null instead of int8', 'null']
    ] as const)('%s rejects equal malformed %s rather than certifying shape', async (id, label, value) => {
      await ownCase(id, async (f, c, before) => {
        const altered = await nativeText(f.admin, before, ['protocol','fence_generation'], value);
        const result = await compare(f.admin, c, altered, altered);
        f.record({ caseId: id, label, phase: 'HOSTILE_RETAINED_TEXT_NOT_ACTUAL_CONTROL_DATA', altered, result }); expect(result).toBe(false);
      });
    }, 30000);
    it.each([
      ['HR27', 'namespace owner changed in retained text', ['catalog','0','schema','nspowner'], '0'],
      ['HR28', 'control relation OID changed in retained text', ['catalog','1','relation','oid'], '0'],
      ['HR29', 'original anchor row changed in retained text', ['contracts','2','source_path'], '"unexpected.sql"'],
      ['HR30', 'native source line changed in retained text', ['contracts','2','source_line'], '4']
    ] as const)('%s rejects %s', async (id, label, path, value) => {
      await ownCase(id, async (f, c, before) => {
        const altered = await nativeText(f.admin, before, path, value), result = await compare(f.admin, c, before, altered);
        f.record({ caseId: id, label, phase: 'HOSTILE_RETAINED_TEXT_NOT_ACTUAL_CONTROL_DATA', altered, result }); expect(result).toBe(false);
      });
    }, 30000);
    it('HR31 rejects noncanonical numeric text before native JSONB semantic comparison', async () => {
      await ownCase('HR31', async (f, c, before) => {
        // Original fixture native fence generation is canonical, read rather than invented.
        const native = await f.admin.query("SELECT fence_generation::pg_catalog.text AS generation FROM nevora_tenancy.expansion_protocol WHERE migration_id=26");
        expect(native.rows).toHaveLength(1); const generation = native.rows[0].generation as string;
        const needle = '"fence_generation": ' + generation;
        expect(before.split(needle)).toHaveLength(2);
        const altered = before.replace(needle, '"fence_generation": ' + generation + 'e0');
        const result = await compare(f.admin, c, altered, altered);
        f.record({ caseId: 'HR31', phase: 'NONCANONICAL_RETAINED_NUMERIC_TEXT', altered, result }); expect(result).toBe(false);
      });
    }, 30000);
    it('HR32 rejects malformed JSON with measured 22P02 and always reconciles its owned transaction', async () => {
      await ownCase('HR32', async (f, c, before) => {
        let sqlstate: string | null = null;
        try { await compare(f.admin, c, before + ']', before); }
        catch (error) { sqlstate = (error as { code?: string }).code ?? null; }
        f.record({ caseId: 'HR32', phase: 'NATIVE_JSON_INPUT_REFUSED', sqlstate, immediateClientStatus: f.admin.getTransactionStatus() });
        expect(sqlstate).toBe('22P02');
      });
    }, 30000);
  });
}
// 32 distinct prepared callbacks; QA-only 30s per callback, not an SLA/SQL limit.
// No new role/client/schema/relation/function/trigger or durable object is created.
// Existing original source-guard route/body negatives remain unchanged in the
// separate 23-case enrollment block: this comparison does not replace them.
