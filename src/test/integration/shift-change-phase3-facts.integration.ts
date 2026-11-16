import {beforeAll,afterAll,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedShiftChanges,fixtureShift,proof,publishFixtureWeek} from './shift-change-fixture';
import {reviewedFixtureSource,fixtureProof,configureFictionalShiftChanges} from './shift-change-api';
import {executeShiftChange} from '../../lib/data/shift-changes';
import {getWorkspace} from '../../lib/data/workspaces';
import {withActionRequestFacts} from '../../lib/data/action-request-facts.server';
import {parseActionCenter,type ActionItem} from '../../lib/action-center/project';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {getCallout} from '../../lib/data/callouts';
import {readEmployeeExchange} from '../../lib/data/employee-exchange.server';
import {parseEmployeeExchange} from '../../lib/employee-exchange';
vi.mock('server-only',()=>({}));
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>,requestId:string;
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query({text,values});
const item=():ActionItem=>({id:'EXCHANGE:'+requestId,type:'EXCHANGE',category:'requests',priority:'REVIEW',title:'Fictional swap',detail:'Review requested',href:'/app/exchange'});
beforeAll(async()=>{
 db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 await seedShiftChanges(db.executor,{companyAccess:true});
 await configureFictionalShiftChanges(db.executor);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('other','loc-2','2035-10-01','PUBLISHED','owner')");
 const source=await fixtureShift(db.executor,'phase3-source','e1','2035-10-02');
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('phase3-target','other','e2','2035-10-03','08:00','16:00')");
 await publishFixtureWeek(db.executor);
 const target=await reviewedFixtureSource(db.executor,'phase3-target');
 const result=await executeShiftChange(proof('e1'),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...source,targetShiftId:target.sourceShiftId,targetEpisodeId:target.sourceEpisodeId,targetTermsFingerprint:target.sourceTermsFingerprint},db.executor);
 expect(result.status,JSON.stringify(result)).toBe('pending');if(result.status!=='pending')throw Error('Fictional swap fixture failed');requestId=result.requestId;
});
afterAll(async()=>{await db?.dispose();});
it('round trips both current authorized shifts through the client parser',async()=>{
 const workspace=await getWorkspace(db.executor),items=await withActionRequestFacts(proof('owner'),workspace,[item()],db.executor);
 expect(items[0].request).toMatchObject({exchangeKind:'SWAP',status:'EMPLOYEE_PENDING',shift:{date:'2035-10-02'},counterpartShift:{state:'ready',date:'2035-10-03'}});
 expect(parseActionCenter({state:'ready',weekStart:'2035-10-01',observedAt:'2035-10-01T12:00:00Z',validForMs:45000,items,counts:{total:1,scheduling:0,requests:1,timekeeping:0},limitedAttendance:false},'2035-10-01').state).toBe('ready');
});
it('does not enrich a Company-only decision read for a location-scoped Manager',async()=>{
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Fictional','Manager','NONE','MANAGER','loc-1')");
 const manager=await fixtureProof(db.executor,'manager');
 const current=await readOwnerOperationalScope(proof('owner'),'manager',db.executor);if(current.state!=='ready')throw Error('Missing fixture scope');
 expect(await assignOperationalScope(proof('owner'),'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:current.data.current.employeeUpdatedAt,expectedRoleGeneration:current.data.current.roleGeneration,expectedScopeRevision:current.data.current.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},db.executor)).toMatchObject({state:'saved'});
 const result=await withActionRequestFacts(manager,await getWorkspace(db.executor),[item()],db.executor);
 expect(result).toEqual([item()]);
});
it('uses a sanitized counterpart reason after the target material terms change',async()=>{
 await q("UPDATE shifts SET start_time='09:00' WHERE id='phase3-target'");
 const result=await withActionRequestFacts(proof('owner'),await getWorkspace(db.executor),[item()],db.executor);
 expect(result[0].request?.counterpartShift).toEqual({state:'unavailable',reason:'details_unavailable'});
 expect(result[0].request?.counterpartName).toBeUndefined();
});
it('retains actual linked coverage outcomes on the callout read after assignment changes',async()=>{
 const terms=await fixtureShift(db.executor,'phase3-callout','e1','2035-10-05');
 const submitted=await executeShiftChange(proof('e1'),{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...terms,reasonCode:'ILLNESS'},db.executor);
 expect(submitted.status,JSON.stringify(submitted)).toBe('pending');if(submitted.status!=='pending')throw Error('Callout fixture failed');
 const read=()=>getCallout(submitted.requestId,db.executor,{employeeView:true});
 expect(await read()).toMatchObject({coverage:{state:'not_requested',basis:'linked_request_history_v1'}});
 expect(await executeShiftChange(proof('owner'),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:submitted.requestId,expectedRevision:1},db.executor)).toMatchObject({status:'completed'});
 expect(await read()).toMatchObject({coverage:{state:'pending'}});
 const [linked]=await q('SELECT id,request_revision FROM shift_exchanges WHERE linked_callout_id=$1',[submitted.requestId]) as {id:string;request_revision:number}[];
 expect(await executeShiftChange(proof('e2'),{kind:'ACCEPT',operationId:randomUUID(),requestId:linked.id,expectedRevision:linked.request_revision},db.executor)).toMatchObject({status:'pending'});
 expect(await executeShiftChange(proof('owner'),{kind:'MANAGER_APPROVE',operationId:randomUUID(),requestId:linked.id,expectedRevision:linked.request_revision+1},db.executor)).toMatchObject({status:'completed'});
 expect(await read()).toMatchObject({status:'APPROVED',coverage:{state:'completed',basis:'linked_request_history_v1'}});
 const own=await readEmployeeExchange(proof('e1'),db.executor,submitted.requestId);
 expect(own).toMatchObject({state:'ready',detail:{summary:{coverage:{state:'completed',basis:'linked_request_history_v1'}}}});
 expect(parseEmployeeExchange(own).state).toBe('ready');
});
it('does not enrich after session revocation while waiting for its read batch',async()=>{
 let revoked=false;
 const executor={query:db.executor.query,transaction:async(statements:Parameters<typeof db.executor.transaction>[0])=>{
  if(!revoked&&statements.some(s=>s.text.includes("SELECT 'TIME_OFF' AS kind"))){revoked=true;await q("DELETE FROM employee_sessions WHERE employee_id='owner'");}
  return db.executor.transaction(statements);
 }};
 expect(await withActionRequestFacts(proof('owner'),await getWorkspace(db.executor),[item()],executor)).toEqual([item()]);
 expect(revoked).toBe(true);
});
