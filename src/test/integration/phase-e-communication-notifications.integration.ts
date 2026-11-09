import {readFile} from 'node:fs/promises';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createECDH,randomUUID} from 'node:crypto';
import {createDisposableNotificationDatabase} from './local-postgres';
import {previewCommunicationAudience,executeCommunicationCommand,readCommunication} from '../../lib/communications/service.server';
import {businessTime} from '../../lib/business-time';
import {sqlNotificationStateRepository} from '../../lib/data/notification-state';
import {sqlSubscriptionRepository} from '../../lib/data/push-subscriptions';
import {sqlDeliveryRepository} from '../../lib/data/push-deliveries';
import type {SqlStatement} from '../../lib/notifications/types';
import {readPortalNotificationList,markManagementNotificationRead} from '../../lib/data/portal-notification-list.server';
import {readEmployeeNotificationList} from '../../lib/data/employee-notification-list.server';
import {createNotificationOpenHandler} from '../../lib/notifications/open';
import {notificationPolicyFor} from '../../lib/notifications/policy';
import {readNotificationConfig} from '../../lib/notifications/config';
import {encryptSubscriptionMaterial} from '../../lib/notifications/installation';
import {runDispatch,type WorkerDeps} from '../../lib/notifications/worker';
import type {CommunicationDraft} from '../../lib/communications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
let db:Awaited<ReturnType<typeof createDisposableNotificationDatabase>>;
let fixtureTimeZone:string;
// Set only the disposable workspace's civil hour. Keep real DB/service clocks
// and the actual quiet-hours policy; immediate-delivery tests must not depend on
// the engineer's wall clock. Select a supported named IANA zone using its actual
// current civil hour, preserving the workspace's named-zone validation.
function fixtureZoneForHour(hour:number){const now=new Date(),zone=Intl.supportedValuesOf('timeZone').find(value=>Number(businessTime(now,value).slice(0,2))===hour);if(!zone)throw Error('No controlled named fixture timezone');notificationPolicyFor(zone);return zone;}
const owner:SessionMutationProof={employee:{id:'owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const employee:SessionMutationProof={employee:{id:'employee',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Private operational title',body:'Private body and location',acknowledgement:'REQUIRED',expiresAt:null};
const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
async function publish(value=draft){const p=await previewCommunicationAudience(owner,value,db.executor);if(p.state!=='ready')throw Error('No preview');const c={kind:'PUBLISH' as const,operationId:randomUUID(),authority:p.authority,draft:value,audienceFingerprint:p.fingerprint};const r=await executeCommunicationCommand(owner,c,db.executor);if(r.status!=='committed')throw Error('No publish');const [n]=await q('SELECT id FROM notifications WHERE source_id=$1',[r.id]);const state=sqlNotificationStateRepository(db.executor),intent=await state.findIntent(String(n.id));return {c,r,state,intent};}
async function worker(){
 const key=Buffer.alloc(32,3),pair=createECDH('prime256v1');pair.setPrivateKey(Buffer.alloc(32,1));
 const enrollment={employeeId:'employee',installationHash:'c'.repeat(64),endpointFingerprint:'fictional-endpoint',encryptedMaterial:'fixture',sessionHash:employee.sessionTokenHash,generation:randomUUID(),expectedGeneration:null,environment:'test' as const,expiresAt:null};
 const subscriptions=sqlSubscriptionRepository(db.executor);expect((await subscriptions.enroll(enrollment)).state).toBe('active');
 const material=encryptSubscriptionMaterial({endpoint:'https://fcm.googleapis.com/fcm/send/QA-never-contact',expirationTime:null,keys:{p256dh:pair.getPublicKey().toString('base64url'),auth:Buffer.alloc(16,2).toString('base64url')}},key,enrollment);await q('UPDATE push_subscriptions SET encrypted_material=$1',[material]);
 const config={...readNotificationConfig({PUSH_ENVIRONMENT:'test',PUSH_SUBSCRIPTION_ENCRYPTION_KEY:key.toString('base64url')}),featureEnabled:true,deliveryEnabled:true,testDeliveryEnabled:true,testAccountIds:['employee'],policy:notificationPolicyFor(fixtureTimeZone)};
 const send=vi.fn(async()=>({kind:'accepted' as const}));
 const deps:WorkerDeps={config,clock:()=>new Date(),executor:db.executor,subscriptions,deliveries:sqlDeliveryRepository('test',db.executor),state:sqlNotificationStateRepository(db.executor),sender:{send}};
 return {deps,send};
}
async function seedActors(beforePayrollNotices=false){fixtureTimeZone=fixtureZoneForHour(12);await q('UPDATE workspaces SET time_zone=$1 WHERE singleton=true',[fixtureTimeZone]);const hour=Number(businessTime(new Date(),fixtureTimeZone).slice(0,2));expect(hour).toBeGreaterThanOrEqual(7);expect(hour).toBeLessThan(21);await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','QA-NO-PHONE','OWNER','loc-1'),('employee','Fictional','Self','QA-NO-PHONE','EMPLOYEE','loc-1'),('foreign','Fictional','Other','QA-NO-PHONE','EMPLOYEE','loc-2')");for(const p of [owner,employee])await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[p.sessionTokenHash,p.employee.id]);
 // Preserve the old source-enum upgrade schema, adding only independent auth.
 for(const file of beforePayrollNotices?['0032_company_access_invitations.sql']:['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
}
beforeEach(async()=>{db=await createDisposableNotificationDatabase();await seedActors();});
afterEach(async()=>{await db?.dispose();});
it('duplicate intent one event per version recipient; inbox and safe open work without push',async()=>{
 const {c,r,state,intent}=await publish();expect(intent).not.toBeNull();if(!intent)throw Error('missing current communication source');
 expect(await state.readSource(intent.source)).toMatchObject({recipientIds:['employee']});
 expect(await executeCommunicationCommand(owner,c,db.executor)).toEqual(r);expect(await q('SELECT * FROM notifications')).toHaveLength(1);
 expect(await state.check(intent,'employee',new Date(),'open')).toMatchObject({deliverable:true,destination:'/app/updates/'+r.id});
 const list=await readEmployeeNotificationList(employee,'test',db.executor);expect(list).toMatchObject({state:'ready',coverage:'complete',items:[{label:'Team update'}]});
 const open=createNotificationOpenHandler({session:async()=>employee.employee,state,environment:'test',clock:()=>new Date()});expect((await open(new Request('https://fictional.invalid/app/notifications/open?notificationId='+intent.id))).headers.get('Location')).toBe('/app/updates/'+r.id);
 expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
it('quiet hours retain the exact-version intent and Updates content while deferring routine transport',async()=>{
 fixtureTimeZone=fixtureZoneForHour(22);await q('UPDATE workspaces SET time_zone=$1 WHERE singleton=true',[fixtureTimeZone]);const hour=Number(businessTime(new Date(),fixtureTimeZone).slice(0,2));expect(hour>=21||hour<7).toBe(true);
 const {deps,send}=await worker(),{r,intent}=await publish();if(!intent)throw Error('missing quiet-hours intent');expect(Date.parse(intent.dueAt)).toBeGreaterThan(Date.now());
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'ready',id:r.id,revisionId:r.version});
 expect(await readEmployeeNotificationList(employee,'test',db.executor)).toMatchObject({state:'ready',coverage:'complete',items:[]});
 await runDispatch({mode:'all',deps});expect(send).not.toHaveBeenCalled();expect(await q('SELECT * FROM push_deliveries')).toEqual([]);expect(await q('SELECT * FROM notifications')).toHaveLength(1);expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
it.each(['recipient','location','withdraw'] as const)('revocation before materialize send and open denies %s',async kind=>{
 const {deps,send}=await worker();const {r,state,intent}=await publish();if(!intent)throw Error('missing source');
 if(kind==='recipient')await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'");else if(kind==='location')await q("UPDATE locations SET active=false WHERE id='loc-1'");else expect(await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:r.status==='committed'?(await previewCommunicationAudience(owner,draft,db.executor) as {authority:string}).authority:'',communicationId:r.id,expectedRevisionId:r.version},db.executor)).toMatchObject({status:'committed'});
 expect((await state.check(intent,'employee',new Date(),'open')).deliverable).toBe(false);await runDispatch({mode:'all',deps});expect(send).not.toHaveBeenCalled();expect(await q('SELECT * FROM push_deliveries')).toEqual([]);
 const open=createNotificationOpenHandler({session:async()=>employee.employee,state,environment:'test',clock:()=>new Date()});expect((await open(new Request('https://fictional.invalid/app/notifications/open?notificationId='+intent.id))).status).toBe(404);
});
it('superseded version cancels after lease and last source check prevents transport',async()=>{
 const {deps,send}=await worker(),{r}=await publish();const original=deps.subscriptions.listActive.bind(deps.subscriptions);let revised=false;
 deps.subscriptions={...deps.subscriptions,listActive:async(...args)=>{const devices=await original(...args);if(!revised){revised=true;const d={...draft,body:'New content'},p=await previewCommunicationAudience(owner,d,db.executor);if(p.state!=='ready')throw Error('preview');expect(await executeCommunicationCommand(owner,{kind:'REVISE',operationId:randomUUID(),authority:p.authority,communicationId:r.id,expectedRevisionId:r.version,draft:d,audienceFingerprint:p.fingerprint},db.executor)).toMatchObject({status:'committed'});}return devices;}};
 await runDispatch({mode:'all',deps});expect(revised).toBe(true);expect(send).not.toHaveBeenCalled();expect(await q("SELECT * FROM push_deliveries WHERE status='provider_accepted'")).toEqual([]);
});
it('provider ambiguous retry may repeat generic payload but never creates acknowledgement',async()=>{
 const {deps,send}=await worker();await publish();send.mockImplementationOnce(async()=>{throw Error('fictional lost provider result');});const first=await runDispatch({mode:'all',deps});expect(first.claimed).toBe(1);expect(first.retried).toBe(1);expect(send).toHaveBeenCalledTimes(1);await q("UPDATE push_deliveries SET next_attempt_at=now()-interval '1 second' WHERE status='retry_pending'");const second=await runDispatch({mode:'retry',deps});expect(second.accepted,JSON.stringify({second,deliveries:await q('SELECT status,attempt_count,error_class FROM push_deliveries'),calls:send.mock.calls.length})).toBe(1);expect(send).toHaveBeenCalledTimes(2);const payload=(send.mock.calls as unknown[][])[1][0] as {payload:{title:string;body:string}};expect(payload.payload).toMatchObject({title:'NEVORA update',body:'Open NEVORA to review an update.'});expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
it('outbox fault leaves no partial publication and unmarked database activation is held',async()=>{
 await q("ALTER TABLE notifications ADD CONSTRAINT fixture_outbox_fault CHECK(type<>'COMMUNICATION')");const p=await previewCommunicationAudience(owner,draft,db.executor);if(p.state!=='ready')throw Error('preview');expect((await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:p.authority,draft,audienceFingerprint:p.fingerprint},db.executor)).status).not.toBe('committed');expect(await q('SELECT * FROM communications')).toEqual([]);await q('ALTER TABLE notifications DROP CONSTRAINT fixture_outbox_fault');
 const {intent,state}=await publish();if(!intent)throw Error('source');const [meta]=await q("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");try{await q('COMMENT ON DATABASE '+meta.name+' IS NULL');expect(await state.readSource(intent.source)).toBeNull();}finally{await q("COMMENT ON DATABASE "+meta.name+" IS '"+meta.marker+"'");}
});

it('upgrade retains historical communication notifications through payroll and forward repair',async()=>{
 await db.dispose();db=await createDisposableNotificationDatabase({beforePayrollNotices:true});await seedActors(true);
 const {c,r}=await publish();const history=await q('SELECT id,source_id,source_kind FROM notifications ORDER BY id');
 for(const file of ['0029_payroll_private_notices.sql','0030_notification_source_kinds.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
 expect(await q('SELECT id,source_id,source_kind FROM notifications ORDER BY id')).toEqual(history);
 expect(await executeCommunicationCommand(owner,c,db.executor)).toEqual(r);
 expect(await q('SELECT * FROM notifications')).toHaveLength(1);
 const [constraint]=await q("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='notifications_source_kind_check'");
 for(const kind of ['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','MANAGER_SUMMARY','SELF_TEST','COMMUNICATION','PAYROLL_PREPARATION','PAYROLL_STATEMENT'])expect(constraint.definition).toContain(kind);
 expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});

async function managementTestNotification(){
 const subscriptions=sqlSubscriptionRepository(db.executor),generation=randomUUID(),installationHash='d'.repeat(64);
 expect(await subscriptions.enroll({employeeId:owner.employee.id,installationHash,endpointFingerprint:'fictional-owner-device',encryptedMaterial:'fixture',sessionHash:owner.sessionTokenHash,generation,expectedGeneration:null,environment:'test',expiresAt:null})).toMatchObject({state:'active'});
 const [device]=await q('SELECT id FROM push_subscriptions WHERE employee_id=$1',[owner.employee.id]);const id=randomUUID(),now=new Date();
 expect(await subscriptions.queueSelfTest({proof:{installationHash,environment:'test',generation},employeeId:owner.employee.id,sessionHash:owner.sessionTokenHash,intent:{id,employeeId:owner.employee.id,type:'SELF_TEST',title:'NEVORA update',body:'Open NEVORA to review an update.',eventKey:'fictional-read:'+id,environment:'test',source:{kind:'SELF_TEST',id:String(device.id),version:generation},effectiveVersion:generation,purpose:'TEST',urgency:'normal',dueAt:now.toISOString(),expiresAt:new Date(now.getTime()+3600000).toISOString()}})).toBe(true);
 return id;
}

it('management inbox preserves recipient authority, idempotent read status and separate acknowledgement',async()=>{
 const id=await managementTestNotification();
 const deniedProof={...owner,sessionTokenHash:'f'.repeat(64)};
 const beforeDenied=await q('SELECT to_jsonb(n) AS row FROM notifications n WHERE id=$1',[id]);
 expect(await markManagementNotificationRead(deniedProof,id,'test',db.executor)).toBe(false);
 expect(await q('SELECT to_jsonb(n) AS row FROM notifications n WHERE id=$1',[id])).toEqual(beforeDenied);
 expect(await readPortalNotificationList(deniedProof,'test',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readPortalNotificationList(owner,'test',db.executor)).toMatchObject({state:'ready',items:[{id,reviewState:'unread'}]});
 expect(await markManagementNotificationRead(owner,id,'test',db.executor)).toBe(true);
 const [first]=await q('SELECT read_at::text AS read FROM notifications WHERE id=$1',[id]);
 expect(await markManagementNotificationRead(owner,id,'test',db.executor)).toBe(true);
 expect(await q('SELECT read_at::text AS read FROM notifications WHERE id=$1',[id])).toEqual([first]);
 expect(await readPortalNotificationList(owner,'test',db.executor)).toMatchObject({state:'ready',items:[{id,reviewState:'read'}]});
 expect(await markManagementNotificationRead(employee,id,'test',db.executor)).toBe(false);
 expect(await markManagementNotificationRead(deniedProof,id,'test',db.executor)).toBe(false);
 expect(await q('SELECT read_at::text AS read FROM notifications WHERE id=$1',[id])).toEqual([first]);
 expect(await markManagementNotificationRead(owner,id,'production',db.executor)).toBe(false);
 expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
 await q('DELETE FROM employee_sessions WHERE employee_id=$1',[owner.employee.id]);
 expect(await readPortalNotificationList(owner,'test',db.executor)).toMatchObject({state:'unavailable'});
});

it('management inbox suppresses a source revoked before its final observation',async()=>{
 const id=await managementTestNotification();let revoked=false;
 const revoke=async()=>{revoked=true;await q("UPDATE push_subscriptions SET status='detached',encrypted_material=NULL WHERE employee_id=$1",[owner.employee.id]);};
 const racing:typeof db.executor={
  query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>{if(statement.text.startsWith('SELECT (SELECT expires_at'))await revoke();return db.executor.query<T>(statement,signal);},
  transaction:async(statements,signal)=>{if(statements.some(statement=>statement.text.startsWith('WITH facts AS MATERIALIZED')))await revoke();return db.executor.transaction(statements,signal);},
 };
 expect(await readPortalNotificationList(owner,'test',racing)).toMatchObject({state:'ready',coverage:'complete',items:[]});
 expect(revoked).toBe(true);expect(await q('SELECT id FROM notifications WHERE id=$1',[id])).toHaveLength(1);
 expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
