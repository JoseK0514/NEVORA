import {readFile} from 'node:fs/promises';
// Real action/SQL regressions for own account-deletion requests. Only the framework context (cookies, headers)
// and the database transport are adapted; every statement runs on the disposable PostgreSQL.
import {createHash} from 'node:crypto';
import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
const context=await rs.hoisted(async()=>{const {AsyncLocalStorage}=await import('node:async_hooks');return {executor:null as SqlExecutor|null,cookie:'',lose:false,beforeAccept:null as null|(()=>Promise<void>),device:new AsyncLocalStorage<string>()};});
rs.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(r:unknown[])=>unknown,no:(e:unknown)=>unknown)=>context.executor!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((t,p,i)=>t+(i?'$'+i:'')+p,''),values),{
  query:statement,transaction:(queries:{statement:SqlStatement}[])=>context.executor!.transaction(queries.map(q=>q.statement)),
 });
 return {getDb:()=>tagged,queryRows:(r:unknown)=>r};
});
rs.mock('next/headers',()=>({cookies:async()=>{const cookie=context.device.getStore()??context.cookie;return {get:(n:string)=>n==='fuel_session'&&cookie?{value:cookie}:undefined};},headers:async()=>new Headers({'x-forwarded-for':'198.51.100.7'})}));
// The accepting transaction commits; only its reply is lost when `lose` is set. That is the Neon HTTP case.
rs.mock('@/lib/data/notification-transactions', ()=>{
 const implementation=rs.requireActual<typeof import('@/lib/data/notification-transactions')>('@/lib/data/notification-transactions');
 return {...implementation,neonNotificationExecutor:()=>{
  // Keep the actual session-contract adapter for reads and mutations; only its
  // installed-application transport above is substituted with owned PostgreSQL.
  const actual=implementation.neonNotificationExecutor();
  return {query:<T>(s:SqlStatement,signal?:AbortSignal)=>actual.query<T>(s,signal),transaction:async(s:SqlStatement[],signal?:AbortSignal)=>{
   if(s.some(x=>x.text.includes('INSERT INTO account_deletion_requests'))){const before=context.beforeAccept;context.beforeAccept=null;await before?.();}
   const rows=await actual.transaction(s,signal);if(context.lose&&s.some(x=>x.text.includes('INSERT INTO account_deletion_requests'))){context.lose=false;throw new TypeError('fetch failed');}return rows;
  }};
 }};
});
rs.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('redirect'),{destination});},notFound:()=>{throw new Error('notFound');}}));
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import {requestAccountDeletion,type DeletionFormState} from '../../app/app/account/delete/actions';
import {login} from '../../app/login/actions';
import {LOGIN_LIMITS} from '../../lib/auth/login-limits.server';
import {prepareSession} from '../../lib/auth/session-issuance';
import {submitDeletionRequest} from '../../lib/account-deletion/requests.server';
import {POLICY_VERSION} from '../../lib/legal/policies';
import {fixtureProof} from './shift-change-api';
import {updateEmployeeProfile} from '../../lib/data/employees';

let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const q=<T=Record<string,unknown>>(text:string,values:readonly unknown[]=[])=>db.executor.query<T>({text,values});
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const idle:DeletionFormState={kind:'idle'};
const form=(fields:Record<string,string>={})=>{const data=new FormData();for(const [key,value] of Object.entries({account:'DEL-OWN',password:TEST_PASSWORD,...fields}))data.set(key,value);return data;};
async function session(employee:string,token:string){await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[hash(token),employee]);return token;}
const as=(token:string)=>{context.cookie=token;};
const open=()=>q<{reference:string;status:string;channel:string;workspace_id:string}>("SELECT reference,status,channel,workspace_id FROM account_deletion_requests WHERE employee_id='DEL-OWN' AND status IN ('received','processing')");

beforeEach(async()=>{
 db=await createDisposableExchangeDatabase({mode:'current-runtime'});context.executor=db.executor;context.lose=false;context.beforeAccept=null;
 await seedOwnedApp(db.executor);
 const passwordHash=await hashPassword(TEST_PASSWORD);
 for(const [id,role] of [['DEL-OWN','EMPLOYEE'],['DEL-PEER','LEAD']] as const){
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional',$1,'555-0181',$2,'loc-1')",[id,role]);
  await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,passwordHash]);
  await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1')",[id]);
 }
 for(const id of ['DEL-OWN','DEL-PEER'])await q("INSERT INTO calendar_subscriptions(id,workspace_id,employee_id,digest,generation,allowed_location_ids) VALUES(gen_random_uuid(),'workspace-fuel',$1,$2,gen_random_uuid(),ARRAY['loc-1'])",[id,hash('calendar:'+id)]);
});
afterEach(async()=>{context.executor=null;context.cookie='';await db.dispose();});

it('accepts once, ends every own session and calendar feed in the same commit, and leaves a peer untouched',async()=>{
 const phone=await session('DEL-OWN','own-phone'),desk=await session('DEL-OWN','own-desk'),peer=await session('DEL-PEER','peer');
 as(phone);const result=await requestAccountDeletion(idle,form());
 expect(result).toMatchObject({kind:'received',reference:expect.stringMatching(/^DEL-[A-HJ-NP-Z2-9]{8}$/)});
 expect(await open()).toEqual([{reference:(result as {reference:string}).reference,status:'received',channel:'web',workspace_id:'workspace-fuel'}]);
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=ANY($1) ORDER BY employee_id",[[phone,desk,peer].map(hash)])).toEqual([{employee_id:'DEL-PEER'}]);
 const feeds=await q<{employee_id:string;revoked:boolean;reason:string|null}>("SELECT employee_id,revoked_at IS NOT NULL AS revoked,revocation_reason AS reason FROM calendar_subscriptions ORDER BY employee_id");
 for(const feed of feeds)expect(feed).toEqual(feed.employee_id==='DEL-OWN'?{employee_id:'DEL-OWN',revoked:true,reason:'account_loss'}:{employee_id:'DEL-PEER',revoked:false,reason:null});
 // The browser's cookie now opens nothing: the same form resolves to the saved request with a counted password check.
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toEqual(result);
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:1}]);
 // Sign-in stays closed with the right password.
 const signIn=new FormData();signIn.set('employeeId','DEL-OWN');signIn.set('password',TEST_PASSWORD);
 await expect(login(signIn)).rejects.toMatchObject({destination:'/login?error=deleting'});
 expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([{n:0}]);
});

it('resolves concurrent confirmations from two devices to one request and one reference',async()=>{
 const tokens=[await session('DEL-OWN','own-a'),await session('DEL-OWN','own-b')];
 let arrivals=0,release!:()=>void;const gate=new Promise<void>(ready=>{release=ready;});
 const barrier=async()=>{arrivals++;if(arrivals===2){release();return;}context.beforeAccept=barrier;await gate;};context.beforeAccept=barrier;
 // Two devices, each with its own cookie, confirm at the same moment.
 const results=await Promise.all(tokens.map(token=>context.device.run(token,()=>requestAccountDeletion(idle,form()))));
 expect(arrivals).toBe(2); // Both passwords were verified before either accepting transaction began.
 const references=new Set(results.map(result=>'reference' in result?result.reference:result.kind));
 expect(references.size).toBe(1);
 expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([{n:0}]);
 expect(results.map(result=>result.kind).sort()).toEqual(['duplicate','received']);
 expect(await open()).toHaveLength(1);
});

it('keeps the reference when the reply is lost after COMMIT, on the server and after the browser retries',async()=>{
 as(await session('DEL-OWN','own-lost'));context.lose=true;
 const first=await requestAccountDeletion(idle,form());
 expect(context.lose).toBe(false); // the committed reply really was dropped
 // The action asked again before answering: it reports the saved request, never "nothing was saved".
 expect(first).toMatchObject({kind:'received'});
 const [saved]=await open();expect(first).toMatchObject({reference:saved.reference});
 // If the browser never saw that reply either, its retry has no session left and still recovers the same reference.
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toMatchObject({kind:'received',reference:saved.reference});
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:1}]);
});

it('reports a database-rejected request as failed, with nothing saved and the session still open',async()=>{
 const token=await session('DEL-OWN','own-rejected');as(token);
 await q(`CREATE FUNCTION fictional_reject_deletion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional rejection' USING ERRCODE='P0001'; END $$;
  CREATE TRIGGER fictional_reject_deletion BEFORE INSERT ON account_deletion_requests FOR EACH ROW EXECUTE FUNCTION fictional_reject_deletion();`);
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'failed'});
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:0}]);
 expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE token_hash=$1",[hash(token)])).toEqual([{n:1}]);
 // After an unknown earlier attempt, a rejection proves nothing about that attempt.
 expect(await requestAccountDeletion(idle,form({retry:'1'}))).toEqual({kind:'uncertain'});
});

it('never acts for another account, and a signed-out page without a request says nothing was deleted',async()=>{
 as(await session('DEL-PEER','peer-now'));
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'changed'});
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:0}]);
 as('expired-or-signed-out');
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'signed_out'});
 expect(await requestAccountDeletion(idle,form({password:'wrong-fictional'}))).toEqual({kind:'wrong_password'});
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:0}]);
});

it('counts every password check against the sign-in limit, with or without a session',async()=>{
 as(await session('DEL-OWN','own-guess'));
 for(let attempt=0;attempt<LOGIN_LIMITS.perId;attempt++)expect(await requestAccountDeletion(idle,form({password:'wrong-'+attempt}))).toEqual({kind:'wrong_password'});
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'busy'});
 as('no-session');
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toEqual({kind:'busy'});
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests")).toEqual([{n:0}]);
});

it('fences a sign-in verified before acceptance even without the 0035 trigger',async()=>{
 // Remove the trigger's updated_at bump so only the accepting transaction's own bump can fence issuance.
 await q('DROP TRIGGER auth_passkey_deletion_loss ON account_deletion_requests');
 const [reviewed]=await q<{updated_at:string;password_hash:string;password_updated_at:string}>("SELECT e.updated_at::text,c.password_hash,c.password_updated_at::text FROM employees e JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id='DEL-OWN'");
 const issuance=prepareSession('DEL-OWN',reviewed);
 as(await session('DEL-OWN','own-fence'));
 expect(await requestAccountDeletion(idle,form())).toMatchObject({kind:'received'});
 await expect(db.executor.transaction([...issuance.guards,issuance.insert])).rejects.toThrow(/session_login_changed/);
 expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([{n:0}]);
});
it.each([true,false])('keeps the employee login fence strictly monotonic from a future prior token, passkey trigger=%s',async trigger=>{
 if(!trigger)await q('DROP TRIGGER auth_passkey_deletion_loss ON account_deletion_requests');
 await q("UPDATE employees SET updated_at=clock_timestamp()+interval '1 day' WHERE id='DEL-OWN'");
 const [reviewed]=await q<{updated_at:string;password_hash:string;password_updated_at:string}>("SELECT e.updated_at::text,c.password_hash,c.password_updated_at::text FROM employees e JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id='DEL-OWN'"),issuance=prepareSession('DEL-OWN',reviewed);
 as(await session('DEL-OWN','future-token-fence'));expect(await requestAccountDeletion(idle,form())).toMatchObject({kind:'received'});
 expect(await q("SELECT updated_at>$1::timestamptz AS advanced FROM employees WHERE id='DEL-OWN'",[reviewed.updated_at])).toEqual([{advanced:true}]);
 await expect(db.executor.transaction([...issuance.guards,issuance.insert])).rejects.toThrow(/session_login_changed/);expect(await q("SELECT count(*)::int AS n FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([{n:0}]);
});

it('is unavailable, not lost, before migration 0034',async()=>{
 as(await session('DEL-OWN','own-old'));
 await q('DROP TABLE account_deletion_requests CASCADE');
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'unavailable'});
 as('no-session');
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'unavailable'});
});

// Each boundary runs after the real password check and before the real accepting SQL transaction.
// Removing the transaction's current-session/credential guard must make these create an unauthorized request.
it.each(['signed-out','expired','password-reset','inactive'] as const)('refuses %s authority lost after password verification, with no deletion consequences',async boundary=>{
 const token=await session('DEL-OWN','own-boundary-'+boundary);as(token);
 let boundaryFeeds:unknown;
 const feeds=()=>q("SELECT id,revoked_at::text,revocation_reason FROM calendar_subscriptions WHERE employee_id='DEL-OWN' ORDER BY id");
 context.beforeAccept=async()=>{
  if(boundary==='signed-out')await q('DELETE FROM employee_sessions WHERE token_hash=$1',[hash(token)]);
  if(boundary==='expired')await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[hash(token)]);
  if(boundary==='password-reset')await q("UPDATE employee_credentials SET password_hash=$1,password_updated_at=clock_timestamp() WHERE employee_id='DEL-OWN'",[await hashPassword('different-fictional-password')]);
  if(boundary==='inactive')await q("UPDATE employees SET active=false WHERE id='DEL-OWN'");
  // Password reset/deactivation themselves revoke feeds through canonical triggers.
  boundaryFeeds=await feeds();
 };
 expect(await requestAccountDeletion(idle,form())).toEqual({kind:'failed'});
 expect(await open()).toEqual([]);
 expect(await feeds()).toEqual(boundaryFeeds);
});

async function runbookStatements(heading:string){
 const runbook=await readFile('docs/compliance/account-deletion-runbook.md','utf8');
 const start=runbook.indexOf(heading+'\n');
 expect(start,'Runbook must include '+heading).toBeGreaterThanOrEqual(0);
 const section=runbook.slice(start+heading.length).split(/\n## /,1)[0];
 const statements=Array.from(section.matchAll(/```sql\n([\s\S]*?)```/g),match=>match[1]);
 expect(statements,'Runbook must supply SQL for '+heading).not.toHaveLength(0);
 return statements;
}
it('rehearses the runbook withdrawal only for the exact received request and never reuses revoked access',async()=>{
 const [statement]=await runbookStatements('## Withdrawing');as(await session('DEL-OWN','withdraw-own'));
 const accepted=await requestAccountDeletion(idle,form());expect(accepted.kind).toBe('received');if(accepted.kind!=='received')throw Error('Missing receipt');
 for(const values of [[accepted.reference,'foreign-workspace','DEL-OWN'],[accepted.reference,'workspace-fuel','DEL-PEER']])expect(await q(statement,values)).toEqual([]);
 expect(await q(statement,[accepted.reference,'workspace-fuel','DEL-OWN'])).toEqual([{reference:accepted.reference,employee_id:'DEL-OWN',workspace_id:'workspace-fuel',status:'withdrawn'}]);
 expect(await q(statement,[accepted.reference,'workspace-fuel','DEL-OWN'])).toEqual([]);
 expect(await q("SELECT token_hash FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([]);
 expect(await q("SELECT id FROM calendar_subscriptions WHERE employee_id='DEL-OWN' AND revoked_at IS NULL")).toEqual([]);
});
it('refuses the runbook withdrawal once processing started',async()=>{
 const [statement]=await runbookStatements('## Withdrawing');as(await session('DEL-OWN','processing-own'));
 const accepted=await requestAccountDeletion(idle,form());expect(accepted.kind).toBe('received');if(accepted.kind!=='received')throw Error('Missing receipt');
 await q("UPDATE account_deletion_requests SET status='processing' WHERE reference=$1",[accepted.reference]);
 expect(await q(statement,[accepted.reference,'workspace-fuel','DEL-OWN'])).toEqual([]);
 expect(await open()).toMatchObject([{reference:accepted.reference,status:'processing'}]);
});

it('rehearses manual verification, retained work evidence and a lost completion reply on the exact request',async()=>{
 const [queue]=await runbookStatements('## 1. See open requests');
 const [claim]=await runbookStatements('## 2. Start one');
 const [finish,readback]=await runbookStatements('## 6. Record completion');
 const workspace='workspace-fuel',subject='DEL-OWN';
 const correction='60000000-0000-4000-8000-000000000001';
 const payroll='60000000-0000-4000-8000-000000000003';
 const retention='Employer work and payroll evidence through 2029-11-29. Revoked calendar/access history under a simulated security disposition. Privacy evidence 24 months from closure.';
 await q(`
  UPDATE employees SET email='deletion@example.invalid',birth_date='1990-01-01' WHERE id='DEL-OWN';
  INSERT INTO clocker_devices(id,location_id,name) VALUES('deletion-device','loc-1','Fictional device');
  INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
    VALUES('deletion-time','DEL-OWN','loc-1','deletion-device','2026-11-26T12:00Z','2026-11-26T20:00Z','CLOCKED_OUT');
  INSERT INTO time_correction_requests(id,workspace_id,employee_id,requested_by_employee_id,kind,location_id,source_revision,source_snapshot,proposal,reason,request_hash)
    VALUES('${correction}','workspace-fuel','DEL-OWN','DEL-OWN','MISSING_ENTRY','loc-1',0,'{}',
      '{"startAt":"2026-11-25T12:00:00Z","endAt":"2026-11-25T20:00:00Z"}','Fictional correction',repeat('a',64));
  INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result)
    VALUES(gen_random_uuid(),'${correction}',1,'REQUESTED','DEL-OWN',repeat('b',64),'{}');
  INSERT INTO payroll_period_populations(workspace_id,start_date,end_date,revision,operation_id,actor_employee_id,command_hash,source_hash,payload)
    VALUES('workspace-fuel','2026-11-23','2026-11-29',1,'${payroll}','QAOWNER','fictional-command','fictional-source','{"fixtureEmployee":"DEL-OWN"}');
 `);
 await q('INSERT INTO auth_passkey_users(employee_id,user_handle) VALUES($1,$2)',[subject,createHash('sha256').update(subject).digest('base64url')]);
 await q("INSERT INTO employee_passkeys(id,employee_id,credential_id,public_key,sign_counter,rp_id,name) VALUES(gen_random_uuid(),$1,'fictional-key',decode('42','hex'),0,'localhost','Fictional key')",[subject]);
 const phone=await session(subject,'manual-fulfillment-phone'),desk=await session(subject,'manual-fulfillment-desk');
 const peer=await session('DEL-PEER','manual-fulfillment-peer');
 as(phone);
 expect(await requestAccountDeletion(idle,form({password:'wrong-fictional'}))).toEqual({kind:'wrong_password'});
 expect(await q(queue,[workspace])).toEqual([]);
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=$1",[hash(phone)])).toEqual([{employee_id:subject}]);
 const accepted=await requestAccountDeletion(idle,form());
 if(accepted.kind!=='received')throw Error('Missing receipt');
 const {reference}=accepted;
 expect(await q(queue,[workspace])).toMatchObject([{reference,status:'received',workspace_id:workspace}]);
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=ANY($1)",[[phone,desk,peer].map(hash)])).toEqual([{employee_id:'DEL-PEER'}]);
 expect(await q("SELECT employee_id,revocation_reason FROM calendar_subscriptions WHERE employee_id IN ($1,'DEL-PEER') ORDER BY employee_id",[subject]))
  .toEqual([{employee_id:subject,revocation_reason:'account_loss'},{employee_id:'DEL-PEER',revocation_reason:null}]);
 expect(await q('SELECT revocation_reason FROM employee_passkeys WHERE employee_id=$1',[subject])).toEqual([{revocation_reason:'account_deletion'}]);

 expect(await q(claim,[reference,'foreign-workspace',subject])).toEqual([]);
 expect(await q(claim,[reference,workspace,'DEL-PEER'])).toEqual([]);
 const [claimed]=await q<{id:string}>(claim,[reference,workspace,subject]);
 expect(claimed).toMatchObject({reference,status:'processing',policy_version:POLICY_VERSION,verified_at:expect.anything(),confirmed_at:expect.anything()});
 const key=[reference,workspace,claimed.id];
 expect(await q(claim,[reference,workspace,subject])).toEqual([]);
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toEqual(accepted);
 const signIn=new FormData();signIn.set('employeeId',subject);signIn.set('password',TEST_PASSWORD);
 await expect(login(signIn)).rejects.toMatchObject({destination:'/login?error=deleting'});

 // The employer records the pending correction and payroll dependency before releasing the manifest.
 const work=()=>q(`SELECT
   (SELECT to_jsonb(t) FROM time_entries t WHERE t.id='deletion-time') AS attendance,
   (SELECT to_jsonb(c) FROM time_correction_requests c WHERE c.id=$1) AS correction,
   (SELECT array_agg(event_kind ORDER BY revision) FROM time_correction_events WHERE request_id=$1) AS decisions,
   (SELECT to_jsonb(p) FROM payroll_period_populations p WHERE p.operation_id=$2) AS payroll`,[correction,payroll]);
 expect(await work()).toMatchObject([{attendance:{status:'CLOCKED_OUT'},correction:{employee_id:subject},decisions:['REQUESTED'],payroll:{operation_id:payroll}}]);
 expect(await q(readback,key)).toMatchObject([{status:'processing',completed_at:null}]);
 await q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result,decision_note) VALUES(gen_random_uuid(),$1,2,'REJECTED','QAOWNER',repeat('c',64),'{}','Fictional employer disposition')",[correction]);
 const retained=await work();
 expect(retained).toMatchObject([{decisions:['REQUESTED','REJECTED']}]);
 await expect(q('DELETE FROM calendar_subscriptions WHERE employee_id=$1',[subject])).rejects.toThrow('calendar_credential_history');
 expect(await q(readback,key)).toMatchObject([{status:'processing',completed_at:null}]);

 // Scoped fictional manifest. Work rows remain linked to the neutralized employee.
 await db.executor.transaction([
  {text:"UPDATE employees SET first_name='Former',last_name='team member',email=NULL,phone='',birth_date=NULL,active=false WHERE id=$1",values:[subject]},
  {text:'DELETE FROM employee_credentials WHERE employee_id=$1',values:[subject]},
  {text:'DELETE FROM auth_passkey_users WHERE employee_id=$1',values:[subject]},
 ]);
 expect(await q('SELECT first_name,last_name,email,phone,birth_date,active FROM employees WHERE id=$1',[subject]))
  .toEqual([{first_name:'Former',last_name:'team member',email:null,phone:'',birth_date:null,active:false}]);
 expect(await q(`SELECT
  (SELECT count(*)::int FROM employee_credentials WHERE employee_id=$1) AS credentials,
  (SELECT count(*)::int FROM employee_sessions WHERE employee_id=$1) AS sessions,
  (SELECT count(*)::int FROM employee_passkeys WHERE employee_id=$1) AS passkeys,
  (SELECT count(*)::int FROM calendar_subscriptions WHERE employee_id=$1 AND revoked_at IS NULL) AS feeds,
  (SELECT count(*)::int FROM auth_passkey_audit WHERE employee_id=$1 AND reason='account_deletion') AS audit`,[subject]))
  .toEqual([{credentials:0,sessions:0,passkeys:0,feeds:0,audit:1}]);
 expect(await q("SELECT revocation_reason FROM calendar_subscriptions WHERE employee_id=$1",[subject])).toEqual([{revocation_reason:'account_loss'}]);
 expect(await work()).toEqual(retained);

 // Support notice and backup receipts are simulated in this rehearsal. The explicit close follows verification.
 expect(await q(readback,key)).toMatchObject([{status:'processing',completed_at:null,retained_note:null}]);
 expect(await q(finish,[reference,workspace,'60000000-0000-4000-8000-000000000099',retention])).toEqual([]);
 expect(await q(finish,[reference,'foreign-workspace',claimed.id,retention])).toEqual([]);
 expect(await q(finish,[...key,'  '])).toEqual([]);
 await q(finish,[...key,retention]); // Discard the first result to model a lost acknowledgement.
 const [completed]=await q(readback,key);
 expect(completed).toMatchObject({id:claimed.id,reference,workspace_id:workspace,status:'completed',completed_at:expect.anything(),retained_note:retention});
 expect(await q(finish,[...key,'Changed note on retry'])).toEqual([]);
 expect(await q(readback,key)).toEqual([completed]);
 expect(await q(queue,[workspace])).toEqual([]);
 expect(await q('SELECT employee_id FROM employee_sessions WHERE token_hash=$1',[hash(peer)])).toEqual([{employee_id:'DEL-PEER'}]);
 expect(await q("SELECT employee_id FROM calendar_subscriptions WHERE employee_id='DEL-PEER' AND revoked_at IS NULL")).toEqual([{employee_id:'DEL-PEER'}]);
});

it('leaves the request processing when protected ownership history blocks hard deletion',async()=>{
 const [claim]=await runbookStatements('## 2. Start one');
 const [,readback]=await runbookStatements('## 6. Record completion');
 const subject='DEL-REMOVABLE',workspace='workspace-fuel';
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Removable','','EMPLOYEE','loc-1')",[subject]);
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) SELECT $1,password_hash,false FROM employee_credentials WHERE employee_id=$2',[subject,'DEL-OWN']);
 as(await session(subject,'manual-fulfillment-remove'));
 const accepted=await requestAccountDeletion(idle,form({account:subject}));
 if(accepted.kind!=='received')throw Error('Missing receipt');
 const {reference}=accepted;
 const [claimed]=await q<{id:string}>(claim,[reference,workspace,subject]);
 await expect(db.executor.transaction([
  {text:'DELETE FROM employee_credentials WHERE employee_id=$1',values:[subject]},
  {text:'DELETE FROM employees WHERE id=$1',values:[subject]},
 ])).rejects.toThrow('operational_subject_versions_employee_id_fkey');
 expect(await q('SELECT employee_id FROM employee_credentials WHERE employee_id=$1',[subject])).toEqual([{employee_id:subject}]);
 expect(await q('SELECT employee_id FROM account_deletion_requests WHERE id=$1',[claimed.id])).toEqual([{employee_id:subject}]);
 const key=[reference,workspace,claimed.id];
 expect(await q(readback,key)).toMatchObject([{id:claimed.id,reference,status:'processing',completed_at:null,retained_note:null}]);
});

// A display-copy revision must not restart consent, replace acceptance evidence or strand an existing request.
it('continues a deletion accepted under the prior legal version after the display-copy revision',async()=>{
 const token=await session('DEL-OWN','prior-policy-own');as(token);
 const accepted=await submitDeletionRequest({employeeId:'DEL-OWN',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:'2026-11-04'});
 expect(accepted.outcome).toBe('received');if(accepted.outcome!=='received')throw Error('Missing historical receipt');
 const reference=accepted.request.reference;
 const before=await q("SELECT id::text,reference,policy_version,verified_at::text,confirmed_at::text FROM account_deletion_requests WHERE reference=$1",[reference]);
 expect(before).toMatchObject([{reference,policy_version:'2026-11-04'}]);
 // The old cookie has been revoked; the actual current action recovers the same receipt after password proof.
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toMatchObject({kind:'received',reference,confirmedAt:accepted.request.confirmedAt});
 // A duplicate confirmation carrying the current display version cannot rewrite the original acceptance.
 expect(await submitDeletionRequest({employeeId:'DEL-OWN',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION})).toMatchObject({outcome:'duplicate',request:{reference}});
 await q("UPDATE account_deletion_requests SET status='processing' WHERE reference=$1",[reference]);
 expect(await open()).toMatchObject([{reference,status:'processing'}]);
 expect(await requestAccountDeletion({kind:'uncertain'},form({retry:'1'}))).toMatchObject({kind:'received',reference,confirmedAt:accepted.request.confirmedAt});
 expect(await q("SELECT id::text,reference,policy_version,verified_at::text,confirmed_at::text FROM account_deletion_requests WHERE reference=$1",[reference])).toEqual(before);
 expect(await q("SELECT count(*)::int n FROM account_deletion_requests WHERE employee_id='DEL-OWN'")).toEqual([{n:1}]);
 expect(await q("SELECT token_hash FROM employee_sessions WHERE employee_id='DEL-OWN'")).toEqual([]);
});

it('refuses the final Owner deletion without saving a request or revoking access',async()=>{
 const token=await session('QAOWNER','last-owner');as(token);
 const before=await q("SELECT updated_at::text FROM employees WHERE id='QAOWNER'");
 const result=await submitDeletionRequest({employeeId:'QAOWNER',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION});
 expect(result).toEqual({outcome:'unavailable',reason:'LAST_OWNER'});
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=$1",[hash(token)])).toEqual([{employee_id:'QAOWNER'}]);
 expect(await q("SELECT id FROM account_deletion_requests WHERE employee_id='QAOWNER'")).toEqual([]);
 expect(await q("SELECT updated_at::text FROM employees WHERE id='QAOWNER'")).toEqual(before);
 expect(await requestAccountDeletion(idle,form({account:'QAOWNER'}))).toEqual({kind:'unavailable',reason:'LAST_OWNER'});
});

it('allows one of two Owners to delete, but does not count that pending account as a remaining Owner',async()=>{
 await q("UPDATE employees SET role='OWNER' WHERE id='DEL-OWN'");
 const tokens=[await session('DEL-OWN','first-owner'),await session('QAOWNER','remaining-owner')];
 const deletion=(employeeId:string,token:string)=>submitDeletionRequest({employeeId,sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION});
 expect((await deletion('DEL-OWN',tokens[0])).outcome).toBe('received');
 expect(await deletion('QAOWNER',tokens[1])).toEqual({outcome:'unavailable',reason:'LAST_OWNER'});
 expect((await deletion('DEL-OWN',tokens[0])).outcome).toBe('duplicate');
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=$1",[hash(tokens[1])])).toEqual([{employee_id:'QAOWNER'}]);
});

it('serializes concurrent Owner deletions so exactly one account remains accessible',async()=>{
 await q("UPDATE employees SET role='OWNER' WHERE id='DEL-OWN'");
 const ids=['DEL-OWN','QAOWNER'];
 const tokens=await Promise.all(ids.map(id=>session(id,'concurrent-owner-'+id)));
 const results=await Promise.all(ids.map((employeeId,i)=>submitDeletionRequest({employeeId,sessionTokenHash:hash(tokens[i]),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION})));
 expect(results.map(r=>r.outcome).sort()).toEqual(['received','unavailable']);
 expect(await q("SELECT count(*)::integer n FROM employees e WHERE active AND role='OWNER' AND NOT EXISTS(SELECT 1 FROM account_deletion_requests r WHERE r.employee_id=e.id AND r.status IN ('received','processing'))")).toEqual([{n:1}]);
 expect(await q("SELECT count(*)::integer n FROM employee_sessions WHERE employee_id=ANY($1)",[ids])).toEqual([{n:1}]);
});

it('prevents demotion from treating an Owner with an open deletion as a replacement',async()=>{
 await q("UPDATE employees SET role='OWNER' WHERE id='DEL-OWN'");
 const token=await session('DEL-OWN','departing-owner');
 expect((await submitDeletionRequest({employeeId:'DEL-OWN',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION})).outcome).toBe('received');
 const proof=await fixtureProof(db.executor,'QAOWNER');
 const [owner]=await q<{updated_at:string}>("SELECT updated_at::text FROM employees WHERE id='QAOWNER'");
 await expect(updateEmployeeProfile({employeeId:'QAOWNER',expectedUpdatedAt:owner.updated_at,firstName:'Fictional',lastName:'Owner',phone:'7875550100',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true,actorEmployeeId:'QAOWNER',proof},db.executor)).rejects.toThrow('employee_profile_last_owner');
 expect(await q("SELECT role FROM employees WHERE id='QAOWNER'")).toEqual([{role:'OWNER'}]);
});

it('serializes a deletion against a concurrent remaining-Owner demotion',async()=>{
 await q("UPDATE employees SET role='OWNER' WHERE id='DEL-OWN'");
 const token=await session('DEL-OWN','racing-departure');
 const proof=await fixtureProof(db.executor,'QAOWNER');
 const [owner]=await q<{updated_at:string}>("SELECT updated_at::text FROM employees WHERE id='QAOWNER'");
 const results=await Promise.allSettled([
  submitDeletionRequest({employeeId:'DEL-OWN',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION}),
  updateEmployeeProfile({employeeId:'QAOWNER',expectedUpdatedAt:owner.updated_at,firstName:'Fictional',lastName:'Owner',phone:'7875550100',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true,actorEmployeeId:'QAOWNER',proof},db.executor),
 ]);
 // Either operation may win. Both becoming unavailable is also safe; both
 // succeeding would leave no Owner able to operate the company.
 const deleted=results[0].status==='fulfilled'&&results[0].value.outcome==='received';
 const demoted=results[1].status==='fulfilled';
 expect(deleted&&demoted).toBe(false);
 expect(await q("SELECT count(*)::integer n FROM employees e WHERE active AND role='OWNER' AND NOT EXISTS(SELECT 1 FROM account_deletion_requests r WHERE r.employee_id=e.id AND r.status IN ('received','processing'))")).toEqual([{n:1}]);
});

it.each(['missing','replacement_required'] as const)('does not count an Owner with %s credentials as an operational replacement',async credentials=>{
 await q("UPDATE employees SET role='OWNER' WHERE id='DEL-OWN'");
 if(credentials==='missing')await q("DELETE FROM employee_credentials WHERE employee_id='DEL-OWN'");
 else await q("UPDATE employee_credentials SET must_change_password=true WHERE employee_id='DEL-OWN'");
 const token=await session('QAOWNER','activated-owner-'+credentials);
 expect(await submitDeletionRequest({employeeId:'QAOWNER',sessionTokenHash:hash(token),password:TEST_PASSWORD,channel:'web',policyVersion:POLICY_VERSION})).toEqual({outcome:'unavailable',reason:'LAST_OWNER'});
 const proof=await fixtureProof(db.executor,'QAOWNER');
 const [owner]=await q<{updated_at:string}>("SELECT updated_at::text FROM employees WHERE id='QAOWNER'");
 await expect(updateEmployeeProfile({employeeId:'QAOWNER',expectedUpdatedAt:owner.updated_at,firstName:'Fictional',lastName:'Owner',phone:'7875550100',role:'EMPLOYEE',primaryLocationId:'loc-1',active:true,actorEmployeeId:'QAOWNER',proof},db.executor)).rejects.toThrow('employee_profile_last_owner');
 expect(await q("SELECT id FROM account_deletion_requests WHERE employee_id='QAOWNER'")).toEqual([]);
 expect(await q("SELECT employee_id FROM employee_sessions WHERE token_hash=$1",[hash(token)])).toEqual([{employee_id:'QAOWNER'}]);
});
