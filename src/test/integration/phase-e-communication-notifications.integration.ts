import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {createECDH,randomUUID} from 'node:crypto';
import {createDisposableNotificationDatabase} from './local-postgres';
import {previewCommunicationAudience,executeCommunicationCommand} from '../../lib/communications/service.server';
import {sqlNotificationStateRepository} from '../../lib/data/notification-state';
import {sqlSubscriptionRepository} from '../../lib/data/push-subscriptions';
import {sqlDeliveryRepository} from '../../lib/data/push-deliveries';
import {readEmployeeNotificationList} from '../../lib/data/employee-notification-list.server';
import {createNotificationOpenHandler} from '../../lib/notifications/open';
import {notificationPolicyFor} from '../../lib/notifications/policy';
import {readNotificationConfig} from '../../lib/notifications/config';
import {encryptSubscriptionMaterial} from '../../lib/notifications/installation';
import {runDispatch,type WorkerDeps} from '../../lib/notifications/worker';
import type {CommunicationDraft} from '../../lib/communications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
let db:Awaited<ReturnType<typeof createDisposableNotificationDatabase>>;
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
 const config={...readNotificationConfig({PUSH_ENVIRONMENT:'test',PUSH_SUBSCRIPTION_ENCRYPTION_KEY:key.toString('base64url')}),featureEnabled:true,deliveryEnabled:true,testDeliveryEnabled:true,testAccountIds:['employee'],policy:notificationPolicyFor('America/Puerto_Rico')};
 const send=vi.fn(async()=>({kind:'accepted' as const}));
 const deps:WorkerDeps={config,clock:()=>new Date(),executor:db.executor,subscriptions,deliveries:sqlDeliveryRepository('test',db.executor),state:sqlNotificationStateRepository(db.executor),sender:{send}};
 return {deps,send};
}
beforeEach(async()=>{db=await createDisposableNotificationDatabase();await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','QA-NO-PHONE','OWNER','loc-1'),('employee','Fictional','Self','QA-NO-PHONE','EMPLOYEE','loc-1'),('foreign','Fictional','Other','QA-NO-PHONE','EMPLOYEE','loc-2')");for(const p of [owner,employee])await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[p.sessionTokenHash,p.employee.id]);});
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
 const {deps,send}=await worker();await publish();send.mockImplementationOnce(async()=>{throw Error('fictional lost provider result');});const first=await runDispatch({mode:'all',deps});expect(first.claimed).toBe(1);expect(send).toHaveBeenCalledTimes(1);await q("UPDATE push_deliveries SET lease_expires_at=now()-interval '1 second' WHERE status='processing'");const second=await runDispatch({mode:'retry',deps});expect(second.accepted,JSON.stringify({second,deliveries:await q('SELECT status,attempt_count,error_class FROM push_deliveries'),calls:send.mock.calls.length})).toBe(1);expect(send).toHaveBeenCalledTimes(2);const payload=(send.mock.calls as unknown[][])[1][0] as {payload:{title:string;body:string}};expect(payload.payload).toMatchObject({title:'NEVORA update',body:'Open NEVORA to review an update.'});expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
it('outbox fault leaves no partial publication and unmarked database activation is held',async()=>{
 await q("ALTER TABLE notifications ADD CONSTRAINT fixture_outbox_fault CHECK(type<>'COMMUNICATION')");const p=await previewCommunicationAudience(owner,draft,db.executor);if(p.state!=='ready')throw Error('preview');expect((await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:p.authority,draft,audienceFingerprint:p.fingerprint},db.executor)).status).not.toBe('committed');expect(await q('SELECT * FROM communications')).toEqual([]);await q('ALTER TABLE notifications DROP CONSTRAINT fixture_outbox_fault');
 const {intent,state}=await publish();if(!intent)throw Error('source');const [meta]=await q("SELECT current_database() AS name,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");try{await q('COMMENT ON DATABASE '+meta.name+' IS NULL');expect(await state.readSource(intent.source)).toBeNull();}finally{await q("COMMENT ON DATABASE "+meta.name+" IS '"+meta.marker+"'");}
});
