import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {beforeEach,afterEach,it,expect} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {readManagementProfile,saveManagementAlertChoice} from '../../lib/data/management-profile.server';
import {notificationIntentStatements} from '../../lib/data/notifications';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {NotificationIntent} from '../../lib/notifications/types';
import {sqlNotificationStateRepository} from '../../lib/data/notification-state';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const proof=(role:'OWNER'|'MANAGER'='OWNER'):SessionMutationProof=>({employee:{id:role.toLowerCase(),role,firstName:'Fictional',lastName:role,primaryLocationId:'loc-1'},sessionTokenHash:(role==='OWNER'?'a':'b').repeat(64)});
beforeEach(async()=>{
  db=await createDisposableFoundationDatabase({mode:'current-runtime'});
  await db.executor.query({text:await readFile('db/migrations/0033_management_alert_preferences.sql','utf8'),values:[]});
  await db.executor.query({text:`INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES
    ('owner','Fictional','Owner','owner@example.invalid','787-555-0100','OWNER','loc-1'),
    ('manager','Fictional','Manager',NULL,'','MANAGER','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'owner',clock_timestamp()+interval '1 day'),(repeat('b',64),'manager',clock_timestamp()+interval '1 day');`,values:[]});
});
afterEach(async()=>{await db?.dispose();});
it('reads Owner and legacy Manager snapshots using the real database clock and scope',async()=>{
  const owner=await readManagementProfile(proof(),db.executor),manager=await readManagementProfile(proof('MANAGER'),db.executor);
  expect(owner).toMatchObject({state:'ready',contact:{email:'owner@example.invalid'},locations:{scope:'all'}});
  expect(manager).toMatchObject({state:'ready',contact:{email:null,phone:''},locations:{scope:'all'}});
  if(owner.state==='ready')expect(owner.validForMs).toBeGreaterThan(45000);
});
it('supports zero active locations and expires an otherwise valid proof',async()=>{
  await db.executor.query({text:'UPDATE locations SET active=false',values:[]});
  expect(await readManagementProfile(proof('MANAGER'),db.executor)).toMatchObject({state:'ready',locations:{names:[]}});
  await db.executor.query({text:"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'",values:[]});
  expect(await readManagementProfile(proof('MANAGER'),db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});
});
it('reads installed Manager location scope and denies a missing administrative grant',async()=>{
  await db.executor.query({text:`CREATE SCHEMA IF NOT EXISTS nevora_tenancy;
    CREATE TABLE nevora_tenancy.portal_administrative_authority(workspace_id text,employee_id text,scope_kind text);
    CREATE TABLE nevora_tenancy.portal_administrative_location(workspace_id text,employee_id text,location_id text);
    INSERT INTO nevora_tenancy.portal_administrative_authority SELECT id,'manager','LOCATIONS' FROM workspaces;
    INSERT INTO nevora_tenancy.portal_administrative_location SELECT id,'manager','loc-2' FROM workspaces;`,values:[]});
  const profile=await readManagementProfile(proof('MANAGER'),db.executor);
  const locations=await db.executor.query<{name:string}>({text:"SELECT name FROM locations WHERE id='loc-2'",values:[]});
  expect(profile).toMatchObject({state:'ready',locations:{scope:'assigned',names:[locations[0].name]}});
  expect(await readManagementProfile(proof(),db.executor)).toMatchObject({state:'ready',locations:{scope:'all'}});
  await db.executor.query({text:'DELETE FROM nevora_tenancy.portal_administrative_authority',values:[]});
  expect(await readManagementProfile(proof('MANAGER'),db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});
});
it('keeps concurrent different topic saves and identical retries without changing another person',async()=>{
  await Promise.all(['time-off','shift-changes'].map(topicId=>saveManagementAlertChoice(proof(),{topicId,on:false},db.executor)));
  await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db.executor);
  const owner=await readManagementProfile(proof(),db.executor),manager=await readManagementProfile(proof('MANAGER'),db.executor);
  expect(owner.state==='ready'&&owner.alerts.filter(a=>['time-off','shift-changes'].includes(a.id)).every(a=>!a.on)).toBe(true);
  expect(manager.state==='ready'&&manager.alerts.every(a=>a.on)).toBe(true);
});
function intent(id:string,employeeId='owner',kind:'TIME_OFF'|'EXCHANGE'|'MANAGER_SUMMARY'='TIME_OFF'):NotificationIntent {
  return {id,employeeId,type:'MANAGER_REVIEW',title:'Fictional review',body:'Open to review.',eventKey:id,environment:'test',source:{kind,id,version:'1'},effectiveVersion:'1',purpose:'SUMMARY',urgency:'normal',dueAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString()};
}
it('suppresses new and queued opted-out notifications, preserves another person and restores future delivery on opt-in',async()=>{
  await db.executor.transaction(notificationIntentStatements([intent('before')]));
  await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db.executor);
  await db.executor.transaction(notificationIntentStatements([intent('off'),intent('other','manager')]));
  let rows=await db.executor.query<{id:string;push_state:string}>({text:'SELECT id,push_state FROM notifications ORDER BY id',values:[]});
  expect(rows).toEqual([{id:'before',push_state:'cancelled'},{id:'off',push_state:'cancelled'},{id:'other',push_state:'pending'}]);
  await saveManagementAlertChoice(proof(),{topicId:'time-off',on:true},db.executor);
  await db.executor.transaction(notificationIntentStatements([intent('on')]));
  rows=await db.executor.query({text:"SELECT id,push_state FROM notifications WHERE id='on'",values:[]});
  expect(rows).toEqual([{id:'on',push_state:'pending'}]);
});
it('keeps enabled members in mixed summaries and cancels a summary with only opted-out members',async()=>{
  await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db.executor);
  const off=JSON.stringify(['TIME_OFF','r','1','TIME_OFF:r','2026-10-19']),on=JSON.stringify(['EXCHANGE','x','1','EXCHANGE:x','2026-10-19']);
  await db.executor.transaction(notificationIntentStatements([{...intent('mixed','owner','MANAGER_SUMMARY'),itemKeys:[off,on]},{...intent('only-off','owner','MANAGER_SUMMARY'),itemKeys:[off]}]));
  expect(await db.executor.query({text:'SELECT id,item_keys,push_state FROM notifications ORDER BY id',values:[]})).toEqual([{id:'mixed',item_keys:[on],push_state:'pending'},{id:'only-off',item_keys:[],push_state:'cancelled'}]);
});
it('delivery rechecks preferences when a producer commits after an opt-out sweep',async()=>{
  await db.executor.query({text:"INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('request-race','manager','2030-01-01','2030-01-02','PENDING')",values:[]});
  const producer=new Client({connectionString:db.connectionString});await producer.connect();
  try {
    await producer.query('BEGIN');
    const statement=notificationIntentStatements([{...intent('race'),source:{kind:'TIME_OFF',id:'request-race',version:'PENDING'},effectiveVersion:'PENDING'}])[0];
    await producer.query(statement.text,[...statement.values]);
    await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db.executor);
    await producer.query('COMMIT');
    const repository=sqlNotificationStateRepository(db.executor),notification=await repository.findIntent('race');
    expect(notification).not.toBeNull();
    expect(await repository.check(notification!,'owner',new Date())).toMatchObject({deliverable:false,reason:'topic_disabled'});
  }finally{await producer.query('ROLLBACK');await producer.end();}
});
it('cancels an actual queued delivery and retains the audit notification',async()=>{
  await db.executor.transaction(notificationIntentStatements([intent('queued')]));
  await db.executor.query({text:`INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status)
    VALUES('fictional-sub','owner','fictional-install','test','fictional-endpoint','opaque-fictional','fictional-generation',repeat('a',64),'active');
    INSERT INTO push_deliveries(notification_id,subscription_id,generation,next_attempt_at,expires_at)
    VALUES('queued','fictional-sub','fictional-generation',clock_timestamp(),clock_timestamp()+interval '10 minutes');`,values:[]});
  await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db.executor);
  expect(await db.executor.query({text:'SELECT status FROM push_deliveries',values:[]})).toEqual([{status:'cancelled'}]);
  expect(await db.executor.query({text:"SELECT management_alert_suppressed FROM notifications WHERE id='queued'",values:[]})).toEqual([{management_alert_suppressed:true}]);
});
