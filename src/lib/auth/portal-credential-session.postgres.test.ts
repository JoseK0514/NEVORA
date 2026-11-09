import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { randomBytes, createHash } from 'node:crypto';
import { createPortalCredentialSessionNativeFixture, type NativeOptions } from './portal-credential-session.postgres-fixture';
import { verifyPassword } from './password';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from '../tenancy/runtime/catalog-fence.server';
import { definePortalCredentialSessionNativeCases } from './portal-credential-session.postgres-cases';
import { getPortalCredentialNativeFixture } from './portal-credential-session.postgres-adapter';
const opted=Boolean(process.env.F_PCS_OWNED_LEASE&&process.env.F_PCS_RUN_DIR&&process.env.F_PCS_ROOT_INVOCATION);
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
describe.skipIf(!opted)('owned local tenant credential and native session roots (not cutover or PortalProof)',()=>{
 async function scenario(id:string,options:NativeOptions,body:(f:Awaited<ReturnType<typeof createPortalCredentialSessionNativeFixture>>)=>Promise<void>) {
  const f=await createPortalCredentialSessionNativeFixture(id,options);try{await body(f);}finally{await f.cleanup();}
 }
 const count=async(f:Awaited<ReturnType<typeof createPortalCredentialSessionNativeFixture>>)=>(await f.admin.query('SELECT (SELECT count(*)::text FROM public.employee_sessions) sessions,(SELECT count(*)::text FROM nevora_tenancy.portal_session_issuance) live')).rows[0];
 async function acquire(f:Awaited<ReturnType<typeof createPortalCredentialSessionNativeFixture>>,key:'A'|'B'){
  await f.verifier.query('BEGIN ISOLATION LEVEL READ COMMITTED');await f.verifier.query(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  const s=f.subjects[key];return (await f.verifier.query('SELECT nevora_tenancy.acquire_portal_login_source($1,$2) source',[s.workspaceLocator,s.normalizedNumber])).rows[0].source;
 }
 it('PCS_NATIVE_01 selected workspace same number uses its real scrypt credential and atomic exact LIVE tuple',()=>scenario('P01',{},async f=>{
  for(const key of ['A','B'] as const){const observed=await acquire(f,key);const s=f.subjects[key],other=f.subjects[key==='A'?'B':'A'];
   expect(observed.workspaceId).toBe(s.workspaceId);expect(observed.employeeId).toBe(s.employeeId);expect(await verifyPassword(s.password,observed.passwordHash)).toBe(true);expect(await verifyPassword(other.password,observed.passwordHash)).toBe(false);
   const token=sha(randomBytes(32).toString('hex'));
   const before=(await f.admin.query('SELECT clock_timestamp()::text clock')).rows[0].clock;
   const receipt=(await f.verifier.query('SELECT nevora_tenancy.insert_portal_reviewed_session($1,$2,$3,$4::jsonb) receipt',[s.workspaceLocator,s.normalizedNumber,token,JSON.stringify(observed)])).rows[0].receipt;
   await f.verifier.query('COMMIT');
   expect(receipt).toMatchObject({workspaceId:s.workspaceId,employeeId:s.employeeId,workspaceIncarnation:'1',portalAccessVersion:'1',mustChangePassword:false});
   const native=(await f.admin.query('SELECT s.employee_id,s.created_at::text created,l.session_created_at::text issued,l.workspace_id,l.workspace_incarnation::text generation,l.portal_access_version::text access,extract(epoch FROM(s.expires_at-s.created_at))::text elapsed FROM public.employee_sessions s JOIN nevora_tenancy.portal_session_issuance l USING(token_hash) WHERE s.token_hash=$1',[token])).rows[0];
   expect(native.employee_id).toBe(s.employeeId);expect(native.workspace_id).toBe(s.workspaceId);expect(native.created).toBe(native.issued);expect(Number(native.elapsed)).toBeGreaterThanOrEqual(1209600);const after=(await f.admin.query('SELECT clock_timestamp()::text clock')).rows[0].clock;
   expect((await f.admin.query("SELECT $1::timestamptz-INTERVAL '336 hours'>=$2::timestamptz lower,$1::timestamptz-INTERVAL '336 hours'<=$3::timestamptz upper",[receipt.expiresAt,before,after])).rows).toEqual([{lower:true,upper:true}]);
  }
  expect(await count(f)).toEqual({sessions:'2',live:'2'});
 }),60000);
 it.each(['DISABLED','PROOF_PENDING','SUSPENDED'] as const)('PCS_NATIVE_02 explicit %s denies session without activation',state=>scenario('P02_'+state,{state},async f=>{
  const before=await count(f);let code='';try{const observed=await acquire(f,'A');await f.verifier.query('SELECT nevora_tenancy.insert_portal_reviewed_session($1,$2,$3,$4::jsonb)',[f.subjects.A.workspaceLocator,f.subjects.A.normalizedNumber,sha('dummy'),JSON.stringify(observed)]);}catch(e){code=(e as {code:string}).code;}finally{await f.verifier.query('ROLLBACK');}
  expect(code).toBe('55000');expect(await count(f)).toEqual(before);
 }),60000);
 it('PCS_NATIVE_03 original FENCED source insert denies without changing actor or bypassing guards',()=>scenario('P03',{fenced:true},async f=>{
  const observed=await acquire(f,'A');expect(await verifyPassword(f.subjects.A.password,observed.passwordHash)).toBe(true);
  await expect(f.verifier.query('SELECT nevora_tenancy.insert_portal_reviewed_session($1,$2,$3,$4::jsonb)',[f.subjects.A.workspaceLocator,f.subjects.A.normalizedNumber,sha('fenced'),JSON.stringify(observed)])).rejects.toMatchObject({code:'55000'});
  await f.verifier.query('ROLLBACK');expect(await count(f)).toEqual({sessions:'0',live:'0'});
  expect((await f.admin.query('SELECT phase,backfill_actor,capture_manifest_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26')).rows).toEqual([{phase:'FENCED',backfill_actor:null,capture_manifest_sha256:null}]);
 }),60000);
 it('PCS_NATIVE_04 rollback removes both native inserts and ordinary hard delete cascades LIVE',()=>scenario('P04',{},async f=>{
  let observed=await acquire(f,'A');const token=sha('rollback');await f.verifier.query('SELECT nevora_tenancy.insert_portal_reviewed_session($1,$2,$3,$4::jsonb)',[f.subjects.A.workspaceLocator,f.subjects.A.normalizedNumber,token,JSON.stringify(observed)]);await f.verifier.query('ROLLBACK');expect(await count(f)).toEqual({sessions:'0',live:'0'});
  observed=await acquire(f,'A');await f.verifier.query('SELECT nevora_tenancy.insert_portal_reviewed_session($1,$2,$3,$4::jsonb)',[f.subjects.A.workspaceLocator,f.subjects.A.normalizedNumber,token,JSON.stringify(observed)]);await f.verifier.query('COMMIT');
  await f.admin.query('BEGIN');await f.admin.query('SET LOCAL ROLE "'+f.writerOwner+'"');await expect(f.admin.query('UPDATE public.employee_sessions SET token_hash=$1 WHERE token_hash=$2',[sha('wrong-token'),token])).rejects.toMatchObject({code:'23514'});await f.admin.query('ROLLBACK');
  await f.admin.query('DELETE FROM public.employee_sessions WHERE token_hash=$1',[token]);expect(await count(f)).toEqual({sessions:'0',live:'0'});
 }),60000);
});

describe.skipIf(!opted)('root-owned real Node verifier native continuation',()=>definePortalCredentialSessionNativeCases(getPortalCredentialNativeFixture));
