import { beforeEach, expect, it, vi } from 'vitest';
import { managementProof } from '../../test/fixtures/management';
import { createTimeOffRequest } from './requests';
import { commitRequestTransition } from './request-notifications';
vi.mock('./notification-transactions',()=>({neonNotificationExecutor:()=>({})}));
vi.mock('./request-notifications',async original=>({...await original<typeof import('./request-notifications')>(),commitRequestTransition:vi.fn(async()=>true)}));
beforeEach(()=>vi.clearAllMocks());
it("keeps the form's unique request ID and session actor on repeated protected transaction attempts",async()=>{
 const request={proof:managementProof('FC-9004','EMPLOYEE'),requestId:'dc6b44c9-6e3f-4f0e-890c-328067ebfe9e',employeeId:'FC-9004',startDate:'2026-11-18',endDate:'2026-11-18'};
 await createTimeOffRequest(request);await createTimeOffRequest(request);
 expect(commitRequestTransition).toHaveBeenCalledTimes(2);
 for(const [attempt] of vi.mocked(commitRequestTransition).mock.calls){
  expect(attempt.actorEmployeeId).toBe(request.employeeId);
  expect(attempt.after.record.id).toBe(request.requestId);
  expect(attempt.mutation.values[0]).toBe(request.requestId);
 }
});

import {describe} from 'vitest';
import * as requests from './requests';
import {createDisposableFoundationDatabase} from '../../test/integration/local-postgres';
import {Client} from 'pg';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
const withdrawalId='dc6b44c9-6e3f-4f0e-890c-328067ebfe9e';
const command={requestId:withdrawalId,operationId:`TIME_OFF_WITHDRAW:${withdrawalId}`,employeeId:'employee',proof:managementProof('employee','EMPLOYEE')};
it('provides a narrow own-pending withdrawal writer without opening generic employee terminal writes',async()=>{
 expect(typeof requests.withdrawTimeOffRequest).toBe('function');
 await expect(requests.withdrawTimeOffRequest({...command,proof:managementProof('foreign','EMPLOYEE')},{} as SqlExecutor)).rejects.toThrow('management_authorization');
 const real=await vi.importActual<typeof import('./request-notifications')>('./request-notifications');
 await expect(real.commitRequestTransition({actorEmployeeId:'employee',selfServiceProof:command.proof,after:{kind:'TIME_OFF',source:{kind:'TIME_OFF',id:withdrawalId,version:'CANCELLED'},updatedAt:'2030-01-01',record:{id:withdrawalId,employeeId:'employee',employeeName:'Fictional',startDate:'2030-01-01',endDate:'2030-01-01',createdAt:'2030-01-01',status:'CANCELLED'}},mutation:{text:'SELECT 1',values:[]}},{} as SqlExecutor)).rejects.toThrow('management_authorization');
});

describe.skipIf(!process.env.FUEL_TEST_DATABASE_URL)('owned PostgreSQL withdrawal',()=>{
 async function fixture(){
  const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
  const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('employee','Fictional','Employee','555001','EMPLOYEE','loc-1'),('manager','Fictional','Manager','555002','MANAGER','loc-1'),('foreign','Fictional','Foreign','555003','EMPLOYEE','loc-1')");
  for(const actor of ['employee','manager','foreign'])await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[managementProof(actor).sessionTokenHash,actor]);
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,reason,created_at) VALUES($1,'employee','2030-10-07','2030-10-08','Original fictional reason','2030-01-01T00:00:00Z')",[withdrawalId]);
  const real=await vi.importActual<typeof import('./request-notifications')>('./request-notifications');vi.mocked(commitRequestTransition).mockImplementation(real.commitRequestTransition);
  return {...db,q};
 }
 async function seedProcessingDelivery(q:(text:string,values?:unknown[])=>Promise<Record<string,unknown>[]>,notificationId:string){
  await q("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES('owned-subscription','manager','fictional-installation','test','fictional-endpoint','fictional-owned-material','fictional-generation',$1,'active')",[managementProof('manager').sessionTokenHash]);
  await q("INSERT INTO push_deliveries(id,notification_id,subscription_id,generation,status,next_attempt_at,expires_at,lease_token,lease_expires_at) VALUES($1,$2,'owned-subscription','fictional-generation','processing',clock_timestamp(),clock_timestamp()+interval '1 day','fictional-processing-lease',clock_timestamp()+interval '5 minutes')",[`delivery-${notificationId}`,notificationId]);
  return q('SELECT * FROM push_deliveries ORDER BY id');
 }
 it('replays the first real SQL cancellation receipt after its committed response is deliberately lost',async()=>{
  const db=await fixture();try{
   let original:Awaited<ReturnType<typeof requests.withdrawTimeOffRequest>>=null;
   const interruptedResponse=async()=>{original=await requests.withdrawTimeOffRequest(command,db.executor);throw Error('Owned response lost after SQL commit');};
   await expect(interruptedResponse()).rejects.toThrow('Owned response lost after SQL commit');
   expect(original).toMatchObject({status:'CANCELLED',requestId:withdrawalId,reviewedBy:'employee'});
   expect(await requests.withdrawTimeOffRequest(command,db.executor)).toEqual(original);
  }finally{await db.dispose();}
 });
 it('cancels pending intents atomically, preserves original facts and returns first own receipt on retry',async()=>{
  const db=await fixture();try{
   await db.q("INSERT INTO notifications(id,employee_id,type,title,body,source_kind,source_id,source_version,push_state,environment,effective_version,purpose,urgency,due_at,expires_at,event_key) VALUES('pending-intent','manager','TIME_OFF','Fictional','Fictional','TIME_OFF',$1,'PENDING','pending','test','PENDING','EVENT','normal',now(),now()+interval '1 day','fictional-pending')",[withdrawalId]);
   const deliveryBefore=await seedProcessingDelivery(db.q,'pending-intent');
   await db.q("UPDATE time_off_requests SET start_time='09:00',end_time='11:00',end_date=start_date WHERE id=$1",[withdrawalId]);
   const before=await db.q('SELECT * FROM time_off_requests WHERE id=$1',[withdrawalId]);
   const first=await requests.withdrawTimeOffRequest(command,db.executor);
   const deliveryAfterFirst=await db.q('SELECT * FROM push_deliveries ORDER BY id');expect(deliveryAfterFirst).toEqual([{...deliveryBefore[0],status:'cancelled',lease_token:null,lease_expires_at:null,updated_at:expect.any(Date)}]);
   const retry=await requests.withdrawTimeOffRequest(command,db.executor);expect(await db.q('SELECT * FROM push_deliveries ORDER BY id')).toEqual(deliveryAfterFirst);
   expect(first).toMatchObject({status:'CANCELLED',requestId:withdrawalId,operationId:`TIME_OFF_WITHDRAW:${withdrawalId}`,reviewedBy:'employee'});expect(retry).toEqual(first);
   const after=await db.q('SELECT * FROM time_off_requests WHERE id=$1',[withdrawalId]);expect(after[0]).toEqual({...before[0],status:'CANCELLED',reviewed_by:'employee',reviewed_at:expect.any(Date)});
   expect(await db.q('SELECT id,push_state FROM notifications')).toEqual([{id:'pending-intent',push_state:'cancelled'}]);
   const {sqlNotificationStateRepository,summarySourceItems}=await import('./notification-state');
   const source=await sqlNotificationStateRepository(db.executor).readSource({kind:'TIME_OFF',id:withdrawalId,version:'PENDING'});expect(source).toMatchObject({source:{kind:'TIME_OFF',id:withdrawalId,version:'CANCELLED'}});expect(summarySourceItems(source!)).toEqual([]);
   expect(await sqlNotificationStateRepository(db.executor).findIntent('pending-intent')).toBeNull();
  }finally{await db.dispose();}
 });
 it('rolls back obsolete-intent cancellation if the conditional request update becomes a no-op',async()=>{
  const db=await fixture();try{
   await db.q("INSERT INTO notifications(id,employee_id,type,title,body,source_kind,source_id,source_version,push_state,environment,effective_version,purpose,urgency,due_at,expires_at,event_key) VALUES('noop-intent','manager','TIME_OFF','Fictional','Fictional','TIME_OFF',$1,'PENDING','pending','test','PENDING','EVENT','normal',now(),now()+interval '1 day','fictional-noop')",[withdrawalId]);
   const originalDelivery=await seedProcessingDelivery(db.q,'noop-intent');
   await db.q("CREATE FUNCTION suppress_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$; CREATE TRIGGER suppress_withdrawal BEFORE UPDATE ON time_off_requests FOR EACH ROW EXECUTE FUNCTION suppress_withdrawal()");
   expect(await requests.withdrawTimeOffRequest(command,db.executor)).toBeNull();
   expect((await db.q('SELECT status,reviewed_by,reviewed_at FROM time_off_requests'))[0]).toEqual({status:'PENDING',reviewed_by:null,reviewed_at:null});
   expect(await db.q('SELECT id,push_state,cancelled_at FROM notifications')).toEqual([{id:'noop-intent',push_state:'pending',cancelled_at:null}]);
   expect(await db.q('SELECT * FROM push_deliveries ORDER BY id')).toEqual(originalDelivery);
  }finally{await db.dispose();}
 });
 it('rejects foreign ownership, changed identity, extra payload and prior manager terminal outcomes',async()=>{
  const db=await fixture();try{
   expect(await requests.withdrawTimeOffRequest({...command,employeeId:'foreign',proof:managementProof('foreign','EMPLOYEE')},db.executor)).toBeNull();
   await expect(requests.withdrawTimeOffRequest({...command,operationId:'TIME_OFF_WITHDRAW:other'},db.executor)).rejects.toThrow('invalid_withdrawal');
   await expect(requests.withdrawTimeOffRequest({...command,status:'DENIED'} as typeof command,db.executor)).rejects.toThrow('invalid_withdrawal');
   for(const status of ['APPROVED','DENIED','PENDING']){await db.q('UPDATE time_off_requests SET status=$2,reviewed_by=$3,reviewed_at=clock_timestamp() WHERE id=$1',[withdrawalId,status,'manager']);expect(await requests.withdrawTimeOffRequest(command,db.executor)).toBeNull();expect((await db.q('SELECT status,reviewed_by FROM time_off_requests WHERE id=$1',[withdrawalId]))[0]).toEqual({status,reviewed_by:'manager'});}
  }finally{await db.dispose();}
 });
 it.each(['expired','revoked','role-lost','inactive'] as const)('denies %s current authority even for a cancellation replay',async change=>{
  const db=await fixture();try{
   await requests.withdrawTimeOffRequest(command,db.executor);
   if(change==='expired')await db.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='employee'");
   if(change==='revoked')await db.q("DELETE FROM employee_sessions WHERE employee_id='employee'");
   if(change==='role-lost')await db.q("UPDATE employees SET role='MANAGER' WHERE id='employee'");
   if(change==='inactive')await db.q("UPDATE employees SET active=false WHERE id='employee'");
   await expect(requests.withdrawTimeOffRequest(command,db.executor)).rejects.toMatchObject({code:'22P02',message:'invalid input syntax for type integer: "management_authorization"'});
  }finally{await db.dispose();}
 });
 it.each(['withdrawal-first','manager-first'] as const)('allows only the canonical terminal winner in %s race',async order=>{
  const db=await fixture();let release:()=>void=()=>{};try{
   let locked:()=>void=()=>{};const acquired=new Promise<void>(resolve=>{locked=resolve;});const gate=new Promise<void>(resolve=>{release=resolve;});
   const held:SqlExecutor={...db.executor,transaction:async statements=>{
    const client=new Client({connectionString:db.connectionString});await client.connect();try{await client.query('BEGIN');const results:unknown[][]=[];for(const statement of statements){results.push((await client.query(statement.text,[...statement.values])).rows);if(statement.text.includes('time_off_requests WHERE id=$1 ORDER BY id FOR UPDATE')){locked();await gate;}}await client.query('COMMIT');return results;}catch(error){await client.query('ROLLBACK');throw error;}finally{await client.end();}
   }};
   const review=(executor:SqlExecutor)=>requests.reviewTimeOffRequest({requestId:withdrawalId,managerId:'manager',proof:managementProof('manager'),status:'APPROVED'},executor);
   const winner=order==='withdrawal-first'?requests.withdrawTimeOffRequest(command,held):review(held);await acquired;
   const loser=order==='withdrawal-first'?review(db.executor):requests.withdrawTimeOffRequest(command,db.executor);let waiting=false;for(let poll=0;poll<30&&!waiting;poll++){const rows=await db.q("SELECT count(*)::integer AS waiting FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%time_off_requests%'");waiting=Number(rows[0].waiting)>0;if(!waiting)await new Promise(resolve=>setTimeout(resolve,20));}expect(waiting).toBe(true);release();
   const [first,second]=await Promise.all([winner,loser]);expect(first).toBeTruthy();expect(second).toBe(order==='withdrawal-first'?false:null);
   expect((await db.q('SELECT status,reviewed_by FROM time_off_requests'))[0]).toEqual(order==='withdrawal-first'?{status:'CANCELLED',reviewed_by:'employee'}:{status:'APPROVED',reviewed_by:'manager'});
  }finally{release();await db.dispose();}
 });
 it.each(['after-row-wait','final-boundary'] as const)('rolls back cancellation when authority expires at %s',async boundary=>{
  const db=await fixture();let blocker:Client|undefined;try{
   await db.q("INSERT INTO notifications(id,employee_id,type,title,body,source_kind,source_id,source_version,push_state,environment,effective_version,purpose,urgency,due_at,expires_at,event_key) VALUES('boundary-intent','manager','TIME_OFF','Fictional','Fictional','TIME_OFF',$1,'PENDING','pending','test','PENDING','EVENT','normal',now(),now()+interval '1 day','fictional-boundary')",[withdrawalId]);
   const originalDelivery=await seedProcessingDelivery(db.q,'boundary-intent');
   await db.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '400 milliseconds' WHERE employee_id='employee'");
   let executor=db.executor;
   if(boundary==='after-row-wait'){
    blocker=new Client({connectionString:db.connectionString});await blocker.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM time_off_requests WHERE id=$1 FOR UPDATE',[withdrawalId]);
   }else{
    executor={...db.executor,transaction:statements=>db.executor.transaction(statements.flatMap((s:SqlStatement)=>s.text.includes('UPDATE time_off_requests')?[s,{text:'SELECT pg_sleep(0.5)',values:[]}]:[s]))};
   }
   const attempt=requests.withdrawTimeOffRequest(command,executor);
   if(blocker){await new Promise(resolve=>setTimeout(resolve,500));await blocker.query('COMMIT');}
   await expect(attempt).rejects.toMatchObject({code:'22P02',message:'invalid input syntax for type integer: "management_authorization"'});
   expect((await db.q('SELECT status,reviewed_by,reviewed_at FROM time_off_requests'))[0]).toEqual({status:'PENDING',reviewed_by:null,reviewed_at:null});
   expect(await db.q('SELECT id,push_state,cancelled_at FROM notifications')).toEqual([{id:'boundary-intent',push_state:'pending',cancelled_at:null}]);
   expect(await db.q('SELECT * FROM push_deliveries ORDER BY id')).toEqual(originalDelivery);
  }finally{if(blocker)await blocker.end();await db.dispose();}
 });
});
