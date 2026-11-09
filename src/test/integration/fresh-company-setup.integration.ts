import {describe, expect, it} from 'vitest';
import {Client} from 'pg';
import {bootstrapOwner, readCompanyInput, setupCompany} from '../../../scripts/company-setup';
import {createDisposableFoundationDatabase} from './local-postgres';

const config={
 COMPANY_NAME:'Cedar Current Fictional', COMPANY_TIME_ZONE:'America/Puerto_Rico',
 COMPANY_LOCATION_NAME:'Harbor Test', COMPANY_LOCATION_SHORT_NAME:'Harbor', COMPANY_LOCATION_KEY:'harbor-current-test',
 BOOTSTRAP_EMPLOYEE_ID:'CURRENT-OWNER', BOOTSTRAP_FIRST_NAME:'Cedar', BOOTSTRAP_LAST_NAME:'Owner',
 BOOTSTRAP_PHONE:'2025550123', BOOTSTRAP_PASSWORD:'Fictional-current-setup-only!',
};
type Database=Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
async function fresh<T>(run:(client:Client,database:Database)=>Promise<T>){
 const database=await createDisposableFoundationDatabase({mode:'empty'});
 const client=new Client({connectionString:database.connectionString});
 try{await client.connect();return await run(client,database);}
 finally{try{await client.end();}finally{await database.dispose();}}
}

describe('fresh company setup for the assembled application',()=>{
 it('installs current payroll and access against the configured company and real Owner',()=>fresh(async client=>{
  const result=await setupCompany(client,readCompanyInput(config));
  expect((await client.query("SELECT to_regclass('native_payroll_ledger') AS native, to_regclass('company_access_adoption') AS access, to_regclass('native_payroll_setup_records') AS setup")).rows)
   .toEqual([{native:'native_payroll_ledger',access:'company_access_adoption',setup:'native_payroll_setup_records'}]);
  expect((await client.query('SELECT workspace_id,state,legacy_manager_census FROM company_access_adoption')).rows)
   .toEqual([{workspace_id:result.workspaceId,state:'ENFORCED',legacy_manager_census:[]}]);
  expect((await client.query('SELECT workspace_id,employee_id,generation::text FROM operational_subject_versions')).rows)
   .toEqual([{workspace_id:result.workspaceId,employee_id:config.BOOTSTRAP_EMPLOYEE_ID,generation:'1'}]);
  for(const table of ['native_payroll_ledger','native_payroll_document_manifests','native_payroll_profile_revisions','native_payroll_manager_scope_revisions','company_invitations','operational_scope_revisions']){
   expect((await client.query('SELECT count(*)::int AS count FROM '+table)).rows[0].count).toBe(0);
  }
  const second=readCompanyInput({...config,BOOTSTRAP_EMPLOYEE_ID:'CURRENT-SECOND-OWNER'}).owner;
  await bootstrapOwner(client,second,{primaryLocationId:result.locationId,eligibleLocationIds:[result.locationId]});
  expect((await client.query('SELECT workspace_id,employee_id,generation::text FROM operational_subject_versions WHERE employee_id=$1',[second.id])).rows)
   .toEqual([{workspace_id:result.workspaceId,employee_id:second.id,generation:'1'}]);
  await client.query("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('CURRENT-MANAGER','Cedar','Manager','202-555-0199','MANAGER',$1)",[result.locationId]);
  expect((await client.query("SELECT count(*)::int AS count FROM operational_scopes_current WHERE employee_id='CURRENT-MANAGER'")).rows[0].count).toBe(0);
  expect((await client.query('SELECT id FROM workspaces')).rows).toEqual([{id:result.workspaceId}]);
 }));
 it('rolls back schema and Owner when the access migration fails, then supports a clean retry',()=>fresh(async client=>{
  // This owned disposable database needs a test-only DDL fault without occupying
  // an application schema, which the fresh-install safety guard now rejects.
  await client.query(`CREATE FUNCTION pg_catalog.qa_setup_stop_access() RETURNS event_trigger LANGUAGE plpgsql AS $$
   BEGIN IF position('CREATE TABLE operational_subject_versions' IN current_query())>0
    THEN RAISE EXCEPTION 'owned_setup_access_failure'; END IF; END $$;
   CREATE EVENT TRIGGER qa_setup_access_failure ON ddl_command_start WHEN TAG IN ('CREATE TABLE')
    EXECUTE FUNCTION pg_catalog.qa_setup_stop_access();`);
  await expect(setupCompany(client,readCompanyInput(config))).rejects.toThrow('owned_setup_access_failure');
  expect((await client.query("SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'")).rows[0].count).toBe(0);
  await client.query('DROP EVENT TRIGGER qa_setup_access_failure; DROP FUNCTION pg_catalog.qa_setup_stop_access()');
  const result=await setupCompany(client,readCompanyInput(config));
  expect((await client.query('SELECT workspace_id,state FROM company_access_adoption')).rows)
   .toEqual([{workspace_id:result.workspaceId,state:'ENFORCED'}]);
  expect((await client.query('SELECT id FROM employees')).rows).toEqual([{id:config.BOOTSTRAP_EMPLOYEE_ID}]);
 }));
 it('serializes concurrent current setup to one company, Owner and adoption',()=>fresh(async (client,database)=>{
  const second=new Client({connectionString:database.connectionString});
  try{
   await second.connect();const input=readCompanyInput(config);
   const outcomes=await Promise.allSettled([setupCompany(client,input),setupCompany(second,input)]);
   expect(outcomes.filter(x=>x.status==='fulfilled')).toHaveLength(1);
   expect(outcomes.filter(x=>x.status==='rejected')).toHaveLength(1);
   expect((await client.query('SELECT count(*)::int AS count FROM workspaces')).rows[0].count).toBe(1);
   expect((await client.query('SELECT id FROM employees')).rows).toEqual([{id:config.BOOTSTRAP_EMPLOYEE_ID}]);
   expect((await client.query('SELECT count(*)::int AS count FROM company_access_adoption')).rows[0].count).toBe(1);
   expect((await client.query('SELECT employee_id,generation::text FROM operational_subject_versions')).rows)
    .toEqual([{employee_id:config.BOOTSTRAP_EMPLOYEE_ID,generation:'1'}]);
  }finally{await second.end();}
 }));
});
