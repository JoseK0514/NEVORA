// UNEXECUTED root-owned opt-in native CASE BLOCK; not a fixture/controller.
// Root must supply the existing exact leased PG18.4 fixture after independent
// custody validation, real original 0001-0026 source objects and safe NOLOGIN
// reader. No SQL/resources on import. No root/proof TRUE stub or fake rows.
import { describe,it,expect } from 'vitest';
import type { Client } from 'pg';
import { readFileSync } from 'node:fs';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';
type AssignedNativeFixture=Readonly<{
 admin:Client;
 // Complete root-captured native catalog + original rows, never caller approval.
 captureCompleteCatalogAndRows:()=>Promise<string>;
 record:(value:unknown)=>void;
}>;
const variants = [
 ['missing locations','ALTER TABLE public.locations RENAME TO portal_enrollment_fixture_locations'],
 ['missing eligibility','ALTER TABLE public.employee_location_eligibility RENAME TO portal_enrollment_fixture_eligibility'],
 ['primary location FK missing','ALTER TABLE public.employees DROP CONSTRAINT employees_primary_location_id_fkey'],
 ['location PK nondefault options','ALTER INDEX public.locations_pkey SET (fillfactor=70)'],
 ['eligibility PK nondefault options','ALTER INDEX public.employee_location_eligibility_pkey SET (fillfactor=70)'],
 ['location identity route disabled','ALTER TABLE public.locations DISABLE TRIGGER f10_identity_guard'],
 ['location fence route disabled','ALTER TABLE public.locations DISABLE TRIGGER f10_write_fence'],
 ['eligibility identity route disabled','ALTER TABLE public.employee_location_eligibility DISABLE TRIGGER f10_identity_guard'],
 ['eligibility fence route disabled','ALTER TABLE public.employee_location_eligibility DISABLE TRIGGER f10_write_fence'],
 ['location calendar route disabled','ALTER TABLE public.locations DISABLE TRIGGER calendar_location_stamp'],
 ['eligibility calendar route disabled','ALTER TABLE public.employee_location_eligibility DISABLE TRIGGER calendar_eligibility_loss'],
 ['calendar native configuration drift','ALTER FUNCTION public.nevora_calendar_authority_loss() SET search_path=pg_catalog'],
 ['identity native security drift','ALTER FUNCTION nevora_tenancy.source_identity_guard() SECURITY INVOKER'],
 ['fence native configuration drift','ALTER FUNCTION nevora_tenancy.source_write_fence() SET search_path=pg_catalog'],
 ['calendar full source drift',"CREATE OR REPLACE FUNCTION public.nevora_calendar_source_stamp() RETURNS trigger LANGUAGE plpgsql AS $enrollment_fixture$ BEGIN RETURN NEW; END $enrollment_fixture$"],
 ['unexpected enabled location route','CREATE TRIGGER portal_enrollment_fixture_extra BEFORE UPDATE ON public.locations FOR EACH ROW EXECUTE FUNCTION public.nevora_calendar_source_stamp()']
] as const;
// Future fixed fixture evidence files must be adopted byte-exact beside this
// block, not discovered from arbitrary environment paths or caller SQL.
const probe=()=>readFileSync('src/lib/tenancy/runtime/current-source-envelope-probe.test.sql','utf8');
export function definePortalCurrentSourceEnvelopeNativeCases(fixture:()=>AssignedNativeFixture):void{
 describe('source geometry native negatives; no proof authority',()=>{
  it.each(variants)('denies coherently changed %s and restores every source row/catalog byte',async(label,mutation)=>{
   const f=fixture(),client=f.admin;expect(client.getTransactionStatus()).toBe('I');
   const before=await f.captureCompleteCatalogAndRows();let owned=false;
   try{
    owned=true;await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text,[]);await client.query('SET LOCAL search_path=pg_catalog');
    const baseline=await client.query(probe(),[]);f.record({label,phase:'native-original-envelope',rows:baseline.rows});
    expect(baseline.rows).toHaveLength(1); // setup failure is not feature RED
    await client.query(mutation);
    const changed=await client.query(probe(),[]);f.record({label,phase:'native-changed-envelope',rows:changed.rows});
    expect(changed.rows).toEqual([]);
   }finally{
    if(owned){await client.query('ROLLBACK');expect(client.getTransactionStatus()).toBe('I');}
    expect(await f.captureCompleteCatalogAndRows()).toBe(before);
   }
  },30000); // QA-only: avoid afterAll overlapping a pending native mutation.
 });
 describe('fully enrolled native reader column/control closure; no authorization claim',()=>{
  it.each([
   ['missing primary location read',"REVOKE SELECT(primary_location_id) ON public.employees FROM "],
   ['extra location column read',"GRANT SELECT(name) ON public.locations TO "],
   ['table-wide source read',"GRANT SELECT ON public.locations TO "],
   ['membership column write',"GRANT UPDATE(location_id) ON public.employee_location_eligibility TO "]
  ] as const)('denies %s independently of stored owner metadata',async(label,prefix)=>{
   const f=fixture(),client=f.admin;expect(client.getTransactionStatus()).toBe('I');
   const before=await f.captureCompleteCatalogAndRows();let owned=false;
   try{
    owned=true;await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
    await client.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text,[]);await client.query('SET LOCAL search_path=pg_catalog');
    const query=readFileSync('src/lib/tenancy/runtime/current-source-reader-columns-probe.test.sql','utf8');
    const baseline=await client.query(query,[]);f.record({label,phase:'native-column-original',rows:baseline.rows});expect(baseline.rows).toHaveLength(1);
    const owner=await client.query('SELECT rolname::text AS name FROM pg_catalog.pg_roles WHERE oid=$1::oid',[baseline.rows[0].reader_owner_oid]);
    expect(owner.rows).toHaveLength(1);expect(typeof owner.rows[0].name).toBe('string');const quoted='"'+(owner.rows[0].name as string).replaceAll('"','""')+'"';
    await client.query(prefix+quoted);
    const changed=await client.query(query,[]);f.record({label,phase:'native-column-changed',rows:changed.rows});expect(changed.rows).toEqual([]);
   }finally{if(owned){await client.query('ROLLBACK');expect(client.getTransactionStatus()).toBe('I');}expect(await f.captureCompleteCatalogAndRows()).toBe(before);}
  },30000);
  it.each([
   ['missing location contract',"DELETE FROM nevora_tenancy.owned_table_contract WHERE table_name='locations'"],
   ['changed identity columns',"UPDATE nevora_tenancy.owned_table_contract SET primary_key_columns=ARRAY['workspace_id']::name[] WHERE table_name='locations'"],
   ['changed source registry',"UPDATE nevora_tenancy.expansion_protocol SET registry_sha256=repeat('0',64) WHERE migration_id=26"]
  ] as const)('denies %s in held original source controls and restores native source',async(label,mutation)=>{
   const f=fixture(),client=f.admin;expect(client.getTransactionStatus()).toBe('I');const before=await f.captureCompleteCatalogAndRows();let owned=false;
   try{
    owned=true;await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');await client.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text,[]);await client.query('SET LOCAL search_path=pg_catalog');
    const query=readFileSync('src/lib/tenancy/runtime/installer-held-source-controls.test.sql','utf8');
    const baseline=await client.query(query,[]);f.record({label,phase:'native-controls-original',rows:baseline.rows});expect(baseline.rows).toHaveLength(1);
    await client.query(mutation);const changed=await client.query(query,[]);f.record({label,phase:'native-controls-changed',rows:changed.rows});expect(changed.rows).toEqual([]);
   }finally{if(owned){await client.query('ROLLBACK');expect(client.getTransactionStatus()).toBe('I');}expect(await f.captureCompleteCatalogAndRows()).toBe(before);}
  },30000);
 });

}
