import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {createDisposableFoundationDatabase} from './local-postgres';
import {readEmployeeNotificationList} from '../../lib/data/employee-notification-list.server';
import {attentionSourceVersion} from '../../lib/data/employee-attention-receipts.server';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
const enabled=!!process.env.FUEL_TEST_DATABASE_URL&&process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN==='yes';
const proof={employee:{id:'QA-CAPACITY-A',firstName:'Fictional',lastName:'Inbox',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'c'.repeat(64)} as SessionMutationProof;
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
async function seed(count:number,mixed=false){
 for(let i=0;i<count;i++){
  const status=mixed&&i%2?'DENIED':'APPROVED';
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES($1,$2,'2030-10-07','2030-10-07',$3,'PRIVATE REASON')",['request-'+i,proof.employee.id,status]);
  await notice('notice-'+i,'request-'+i,status);
 }
}
async function notice(id:string,source:string,version='APPROVED',employee=proof.employee.id){
 await q(`INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state)
 VALUES($1,$2,'TIME_OFF_APPROVED','PRIVATE TITLE','PRIVATE BODY',$1,'test','TIME_OFF',$3,$4,$4,'EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending')`,[id,employee,source,version]);
}
async function receipt(id:string,actor=proof.employee.id,version?:string){
 const [row]=await q(`SELECT jsonb_build_object('id',id,'status',status,'startDate',start_date::text,'endDate',end_date::text,'startTime',start_time::text,'endTime',end_time::text,'reason',reason) AS detail FROM time_off_requests WHERE id=$1`,[id]);
 const current=version??attentionSourceVersion({kind:'TIME_OFF',id,version:''},row.detail as Record<string,unknown>);
 await q("INSERT INTO employee_attention_receipts(id,workspace_id,employee_id,source_kind,source_id,source_version) SELECT $1,id,$2,'TIME_OFF',$3,$4 FROM workspaces WHERE singleton",[randomUUID(),actor,id,current]);
}
async function inbox(beforeFinal?:()=>Promise<unknown>){
 let observations=0,finals=0;const batches:SqlStatement[]=[];
 const executor:SqlExecutor={query:db.executor.query,transaction:async(statements,signal)=>{
  const statement=statements.at(-1)!;
  if(statement.text.startsWith('SELECT (SELECT COALESCE(jsonb_agg')){observations++;if(statement.text.includes('AS detail FROM time_off_requests')||statement.text.includes('FROM employee_attention_receipts'))batches.push(statement);}
  if(statement.text.startsWith('WITH facts AS MATERIALIZED')){finals++;await beforeFinal?.();}
  return db.executor.transaction(statements,signal);
 }};
 const result=await readEmployeeNotificationList(proof,'test',executor);
 return {result,observations,finals,batches};
}
function items(result:Awaited<ReturnType<typeof inbox>>['result']){if(result.state!=='ready'||result.kind!=='notifications')throw Error('Expected current inbox');return result.items;}

describe.skipIf(!enabled)('bounded native own Time Off inbox capacity',()=>{
 beforeAll(async()=>{db=await createDisposableFoundationDatabase({mode:'current-runtime'});},30000);
 afterAll(async()=>{await db?.dispose();});
 beforeEach(async()=>{
  await q('TRUNCATE employees,notifications RESTART IDENTITY CASCADE');
  await q('UPDATE workspaces SET active=true');
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-CAPACITY-A','Fictional','Inbox','QA-NO-PHONE','EMPLOYEE','loc-1'),('QA-CAPACITY-B','Fictional','Other','QA-NO-PHONE','EMPLOYEE','loc-1')");
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 day')",[proof.sessionTokenHash,proof.employee.id]);
 });
 it.each([16,25])('returns all %s own current sources with native final observations',async count=>{
  await seed(count);await receipt('request-0');const actual=await inbox();
  expect(actual.result).toMatchObject({state:'ready',coverage:'complete'});expect(items(actual.result)).toHaveLength(count);
  expect(items(actual.result).filter(i=>i.reviewState==='read')).toHaveLength(1);expect(items(actual.result).every(i=>i.actionState==='none')).toBe(true);
  expect(actual.observations).toBe(2*count+4);expect(actual.observations).toBeLessThanOrEqual(64);expect(actual.finals).toBe(1);
  expect(actual.batches).toHaveLength(2);for(const batch of actual.batches){expect(batch.values[1]).toBe(proof.employee.id);expect(batch.values[2]).toHaveLength(count);}
  expect(JSON.stringify(actual.result)).not.toMatch(/PRIVATE|QA-CAPACITY-B|sessionTokenHash/);
 });
 it('keeps mixed approved and denied current sources at the 25 item limit',async()=>{await seed(25,true);const actual=await inbox();expect(actual.result).toMatchObject({state:'ready',coverage:'complete'});expect(items(actual.result)).toHaveLength(25);expect(actual.observations).toBe(54);});
 it('does not batch foreign requests or use foreign and historical receipts',async()=>{
  await seed(16);await receipt('request-0','QA-CAPACITY-B');await receipt('request-1',proof.employee.id,'old-version');
  await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('foreign-request','QA-CAPACITY-B','2030-10-07','2030-10-07','APPROVED')");
  await notice('foreign-source','foreign-request');await notice('foreign-recipient','request-0','APPROVED','QA-CAPACITY-B');await notice('missing-source','missing-request');
  const actual=await inbox();expect(items(actual.result)).toHaveLength(16);expect(items(actual.result).every(i=>i.reviewState==='unread')).toBe(true);
  expect(JSON.stringify(actual.batches.map(b=>b.values))).not.toMatch(/foreign-request|missing-request|QA-CAPACITY-B|old-version/);
 });
 it.each(['session','role'])('fresh final %s revocation denies the whole inbox',async kind=>{
  await seed(25);const actual=await inbox(()=>q(kind==='session'?"DELETE FROM employee_sessions WHERE token_hash=$1":"UPDATE employees SET role='MANAGER' WHERE id=$1",[kind==='session'?proof.sessionTokenHash:proof.employee.id]));
  expect(actual.finals).toBe(1);expect(actual.result.state).toBe('unavailable');
 });
 it('removed or resolved sources disappear under the final atomic observation',async()=>{
  await seed(16);const actual=await inbox(async()=>{await q("DELETE FROM time_off_requests WHERE id='request-0'");await q("UPDATE time_off_requests SET status='DENIED' WHERE id='request-1'");});
  expect(actual.result).toMatchObject({state:'ready',coverage:'complete'});expect(items(actual.result)).toHaveLength(14);expect(items(actual.result).map(i=>i.id)).not.toContain('notice-0');expect(items(actual.result).map(i=>i.id)).not.toContain('notice-1');
 });
 it('changed detail cannot reuse the original receipt observation or report unread as complete',async()=>{
  await seed(16);await receipt('request-0');const actual=await inbox(()=>q("UPDATE time_off_requests SET reason='PRIVATE CHANGED' WHERE id='request-0'"));
  expect(actual.finals).toBe(1);expect(actual.result.state).toBe('unavailable');
 });
 it('uses a receipt committed before the final observation without changing its immutable history',async()=>{
  await seed(16);await receipt('request-0');const actual=await inbox(()=>receipt('request-1'));
  expect(items(actual.result).filter(i=>i.reviewState==='read')).toHaveLength(2);expect(await q('SELECT count(*)::integer AS count FROM employee_attention_receipts')).toEqual([{count:2}]);
  await expect(q("DELETE FROM employee_attention_receipts WHERE source_id='request-0'")).rejects.toThrow(/attention_history_immutable/);
 });
});
