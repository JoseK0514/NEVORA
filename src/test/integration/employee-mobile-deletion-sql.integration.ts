// Real action/SQL regressions for own account-deletion requests. Only the framework context (cookies, headers)
// and the database transport are adapted; every statement runs on the disposable PostgreSQL.
import {createHash} from 'node:crypto';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
const context=await vi.hoisted(async()=>{const {AsyncLocalStorage}=await import('node:async_hooks');return {executor:null as SqlExecutor|null,cookie:'',lose:false,beforeAccept:null as null|(()=>Promise<void>),device:new AsyncLocalStorage<string>()};});
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(r:unknown[])=>unknown,no:(e:unknown)=>unknown)=>context.executor!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((t,p,i)=>t+(i?'$'+i:'')+p,''),values),{
  query:statement,transaction:(queries:{statement:SqlStatement}[])=>context.executor!.transaction(queries.map(q=>q.statement)),
 });
 return {getDb:()=>tagged,queryRows:(r:unknown)=>r};
});
vi.mock('next/headers',()=>({cookies:async()=>{const cookie=context.device.getStore()??context.cookie;return {get:(n:string)=>n==='fuel_session'&&cookie?{value:cookie}:undefined};},headers:async()=>new Headers({'x-forwarded-for':'198.51.100.7'})}));
// The accepting transaction commits; only its reply is lost when `lose` is set. That is the Neon HTTP case.
vi.mock('@/lib/data/notification-transactions',async original=>({...await original<Record<string,unknown>>(),neonNotificationExecutor:()=>({
 query:(s:SqlStatement)=>context.executor!.query(s),
 transaction:async(s:SqlStatement[])=>{if(s.some(x=>x.text.includes('INSERT INTO account_deletion_requests'))){const before=context.beforeAccept;context.beforeAccept=null;await before?.();}const rows=await context.executor!.transaction(s);if(context.lose&&s.some(x=>x.text.includes('INSERT INTO account_deletion_requests'))){context.lose=false;throw new TypeError('fetch failed');}return rows;},
})}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('redirect'),{destination});},notFound:()=>{throw new Error('notFound');}}));
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import {requestAccountDeletion,type DeletionFormState} from '../../app/app/account/delete/actions';
import {login} from '../../app/login/actions';
import {LOGIN_LIMITS} from '../../lib/auth/login-limits.server';
import {prepareSession} from '../../lib/auth/session-issuance';

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
