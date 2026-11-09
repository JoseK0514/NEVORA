// Root test-only adapter for real native Client/SQL/locks and independent custody.
import { Client } from 'pg';
import { createHash } from 'node:crypto';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { expect } from 'vitest';
import { bindOwnedLocalPortalVerifier } from './portal-credential-session.server';
import { createPortalCredentialSessionNativeFixture, type NativeOptions } from './portal-credential-session.postgres-fixture';
import { makePortalNativeObserver } from './portal-credential-session.postgres-observer';
import type { PortalCredentialScenario, PortalCredentialSessionNativeFixture } from './portal-credential-session.postgres-cases';
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function getPortalCredentialNativeFixture(scenario:PortalCredentialScenario):Promise<PortalCredentialSessionNativeFixture> {
 const options:NativeOptions={mustChangePassword:true};
 if(scenario==='PC02')options.provenance='VERIFIED';
 if(['PC04_DISABLED','PC04_PROOF_PENDING','PC04_SUSPENDED'].includes(scenario))options.state=scenario.slice(5) as NativeOptions['state'];
 if(scenario==='PC04_INACTIVE_EMPLOYEE')options.inactive='employee';if(scenario==='PC04_INACTIVE_WORKSPACE')options.inactive='workspace';
 if(scenario==='PC03'){options.malformedHash=true;options.missingBCredential=true;}
 if(scenario==='PC05'){options.highCounters=true;options.timezone='America/New_York';}
 if(scenario==='PC07')options.fenced=true;
 const f=await createPortalCredentialSessionNativeFixture(scenario,options);
 let writer:Client|undefined;let observer:ReturnType<typeof makePortalNativeObserver>|undefined;
 try {
  // Fixture-only explicit source values are installed before admission. No policy
  // or lifecycle versions are inferred/reopened; imported kernel sees actual rows.
  writer=new Client({host:'127.0.0.1',port:f.lease.port,user:f.lease.user,password:readFileSync(f.lease.credentialFile,'utf8'),database:f.database,connectionTimeoutMillis:3000,statement_timeout:15000});await writer.connect();
  const identities=(await f.verifier.query('SELECT pg_backend_pid() pid,session_user::text name,(SELECT usesysid::text FROM pg_stat_activity WHERE pid=pg_backend_pid()) oid')).rows[0];
  const routines=(await f.admin.query("SELECT proname,oid::text oid FROM pg_proc WHERE pronamespace='nevora_tenancy'::regnamespace AND proname IN('capture_portal_verifier_native_profile','assert_original_portal_verifier_service','acquire_portal_login_source','insert_portal_reviewed_session') ORDER BY proname")).rows;
  expect(routines).toHaveLength(4);const routineOids=Object.fromEntries(routines.map(r=>[r.proname,r.oid]));
  const installerRoleOid=(await f.admin.query('SELECT oid::text oid FROM pg_roles WHERE rolname=session_user')).rows[0].oid;
  const verifierSourceText=readFileSync(resolve('src/lib/tenancy/runtime/portal-verifier-service.sql'),'utf8');
  const ledger=JSON.parse(readFileSync(f.leasePath,'utf8'));expect(ledger.invocation).toBe(f.lease.invocation);expect(ledger.closed).toBe(false);
  ledger.portalVerifierInstallations.push({format:'OWNED_LOCAL_PORTAL_VERIFIER_ENROLLMENT_V1',invocation:f.lease.invocation,database:f.database,databaseOid:f.databaseOid,marker:f.marker,verifierRole:f.verifierRole,verifierRoleOid:f.verifierRoleOid,writerOwner:f.writerOwner,writerOwnerOid:f.writerOwnerOid,installerRoleOid,verifierSourceSha256:sha(verifierSourceText),verifierSourceText,routineOids,nativeProfileCapsuleText:f.capsuleText});
  writeFileSync(f.leasePath,JSON.stringify(ledger,null,2),{mode:0o600});
  const binding={format:'OWNED_LOCAL_PORTAL_VERIFIER_ENROLLMENT_V1',clusterRoot:f.lease.root,leaseSha256:sha(readFileSync(f.leasePath,'utf8')),invocation:f.lease.invocation,database:f.database,databaseOid:f.databaseOid,marker:f.marker,verifierRole:f.verifierRole,verifierRoleOid:f.verifierRoleOid,writerOwner:f.writerOwner,writerOwnerOid:f.writerOwnerOid};
  const witness=await bindOwnedLocalPortalVerifier(f.verifier,binding);expect(witness).not.toEqual({status:'DENY'});
  observer=makePortalNativeObserver(f.verifier,identities.pid);
  async function captureSources(c:Client=f.admin) {
   const rows:string[]=[];
   for(const table of ['public.workspaces','public.locations','public.employees','public.employee_credentials','nevora_tenancy.employee_login_identity','nevora_tenancy.workspace_locator','nevora_tenancy.workspace_incarnation_counter','nevora_tenancy.portal_authority','nevora_tenancy.runtime_role_binding','nevora_tenancy.expansion_protocol','nevora_tenancy.owned_table_contract','nevora_tenancy.portal_verifier_service_binding']) {
    const text=(await c.query('SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text COLLATE "C"),\'[]\'::jsonb)::text body FROM '+table+' t')).rows[0].body;rows.push(JSON.stringify([table,text]));
   }
   const current=(await c.query('SELECT nevora_tenancy.capture_portal_verifier_native_profile($1::oid,$2::oid)::text body',[f.verifierRoleOid,f.writerOwnerOid])).rows[0].body;rows.push(JSON.stringify(['complete-fixed-native-profile',current]));return JSON.stringify(rows);
  }
  async function captureTargets(){return (await f.admin.query("SELECT jsonb_build_object('sessions',(SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.token_hash),'[]'::jsonb) FROM public.employee_sessions s),'live',(SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.token_hash),'[]'::jsonb) FROM nevora_tenancy.portal_session_issuance i))::text body")).rows[0].body as string;}
  async function nativeState(c:Client){const pid=(c as unknown as {processID:number}).processID;return (await f.admin.query('SELECT a.pid,a.usesysid::text oid,a.state,a.wait_event_type,pg_blocking_pids(a.pid) blocking,(SELECT jsonb_agg(to_jsonb(l) ORDER BY l.locktype,l.mode,l.granted) FROM pg_locks l WHERE l.pid=a.pid) locks FROM pg_stat_activity a WHERE a.pid=$1',[pid])).rows[0];}
  const waitForBlocked=async(waiting:Client,holder:Client)=>{const holdPid=(holder as unknown as {processID:number}).processID;const deadline=Date.now()+10000;while(Date.now()<deadline){const state=await nativeState(waiting);if(state?.wait_event_type==='Lock'&&state.blocking.includes(holdPid))return state;await new Promise<void>(ok=>setTimeout(ok,15));}throw Error('native_expected_source_wait_missing');};
  const waitForAborted=async(c:Client)=>{const deadline=Date.now()+10000;while(Date.now()<deadline){const state=await nativeState(c);if(state?.state==='idle in transaction (aborted)'&&c.getTransactionStatus()==='E')return state;await new Promise<void>(ok=>setTimeout(ok,15));}throw Error('native_expected_aborted_state_missing');};
  const record=(value:unknown)=>appendFileSync(join(process.env.F_PCS_RUN_DIR!,scenario+'-operations.jsonl'),JSON.stringify(value)+'\n',{mode:0o600});
  return {admin:f.admin,writer,verifier:f.verifier,witness,verifierIdentity:{name:identities.name,oid:identities.oid,backendPid:identities.pid},subjects:f.subjects,captureSources,captureTargets,observe:observer.observe,pauseAfterAcquire:observer.pauseAfterAcquire,waitForBlocked,waitForAborted,record,finishScenario:async()=>{observer!.uninstall();await writer!.end();await f.cleanup();}};
 }catch(e){observer?.uninstall();if(writer)await writer.end();await f.cleanup();throw e;}
}
