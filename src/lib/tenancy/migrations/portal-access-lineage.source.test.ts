// UNEXECUTED source declarations only; not PostgreSQL or authority behavior.
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,it,expect,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL} from '../runtime/catalog-fence.server';
import {lexSql} from '../inventory/sql-lexer';
import {tokenizeDdl} from '../inventory/ddl';
import {PORTAL_LEGACY_SOURCE_BINDINGS} from './portal-legacy-access-enrollment.server';
import {ownershipDigest} from './ownership';
const load=(name:string)=>{const path=resolve('src/lib/tenancy/runtime/'+name);return existsSync(path)?readFileSync(path,'utf8'):'';};
const storage=load('portal-access-lineage-storage.sql'),core=load('portal-request-authority-core.sql');
describe('captured legacy native lineage prerequisite source',()=>{
 it('requires missing storage and exact exclusive-first owning ReadCommitted installer',()=>{
  expect(storage.length).toBeGreaterThan(0);const p=lexSql(storage);expect(p.complete).toBe(true);expect(p.diagnostics).toEqual([]);
  const s=p.parts.filter(p=>p.kind==='statement');expect(tokenizeDdl(s[0].text).map(token=>token.raw)).toEqual(['BEGIN','ISOLATION','LEVEL','READ','COMMITTED',';']);
  expect(s[1].text).toBe('\n'+INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
 });
 it('has no initial rows/grants/default revision and makes lineage immutable, private, FORCERLS0',()=>{
  const words=tokenizeDdl(storage).filter(t=>t.kind==='word').map(t=>t.raw.toUpperCase());
  for(const name of ['GRANT','INSERT','REPLACE','DEFAULT'])expect(words).not.toContain(name);
  expect(storage).toContain('BEFORE UPDATE OR DELETE ON nevora_tenancy.portal_access_lineage');
  expect(storage).toContain('BEFORE TRUNCATE ON nevora_tenancy.portal_access_lineage');
  expect(storage).toContain('FORCE ROW LEVEL SECURITY');expect(storage).toContain('WHERE polrelid=table_oid');
  expect(storage).toContain('a.grantee<>installer_oid');expect(storage).not.toContain('employee_sessions(token_hash)');
 });
 it('requires current native lineage and grants separately from source comparison',()=>{
  expect(core.length).toBeGreaterThan(0);expect(core).toContain('FROM nevora_tenancy.portal_access_lineage l');
  expect(core).toContain('FOR SHARE;');expect(core).toContain("lineage.capture_source->>'legacyAccess' IS DISTINCT FROM 'PRESERVED'");
  expect(core).toContain("administrative->'capabilities' IS DISTINCT FROM lineage.effective_grants->'administrativeCapabilities'");
  expect(core).toContain("'PORTAL_REQUEST_AUTHORITY_V1'");expect(core).toContain("'PORTAL_REQUEST_CURRENT_PROOF_PAYLOAD_V1'");
  expect(core).toContain("p_facts->'nativeCurrentSource'");expect(core).not.toMatch(/set_config\s*\(|current_setting\s*\(\s*'nevora\./i);
 });
 it('keeps the native authority consumer bound to the exact enrolled lineage source version',()=>{
  const source=core.match(/lineage\.capture_source->'sourceBindings' IS DISTINCT FROM '([^']+)'::pg_catalog\.jsonb/);
  const digest=core.match(/lineage\.source_manifest_sha256 IS DISTINCT FROM '([a-f0-9]{64})'/);
  expect(source).not.toBeNull();expect(digest).not.toBeNull();
  expect(JSON.parse(source![1])).toEqual(PORTAL_LEGACY_SOURCE_BINDINGS);
  expect(digest![1]).toBe(ownershipDigest(PORTAL_LEGACY_SOURCE_BINDINGS));
 });
});
