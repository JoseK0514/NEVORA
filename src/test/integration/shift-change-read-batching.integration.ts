import {afterEach,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createDisposableExchangeDatabase} from './local-postgres';
import {fixtureShift,proof,seedShiftChanges} from './shift-change-fixture';
import {executeShiftChange,readShiftChangeReview} from '../../lib/data/shift-changes';
import {readEmployeeRequests} from '../../lib/data/employee-requests.server';
import {readEmployeeCreation} from '../../lib/data/employee-creation.server';
import type {SqlExecutor} from '../../lib/notifications/types';

let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
beforeEach(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedShiftChanges(db.executor,{companyAccess:true});});
afterEach(async()=>{await db?.dispose();});
function counted(executor:SqlExecutor){
 let calls=0;
 const wrapped:SqlExecutor={async query(statement,signal){calls++;return executor.query(statement,signal);},async transaction(statements,signal){calls++;return executor.transaction(statements,signal);}};
 return {executor:wrapped,calls:()=>calls};
}
async function offer(id:string,date:string){
 const terms=await fixtureShift(db.executor,id,'e1',date);
 const result=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);
 expect(result.status).toBe('pending');if(result.status!=='pending')throw Error('Fixture offer unavailable');return result.requestId;
}
it('Requests eligibility keeps real SQL round trips constant as coverage candidates grow',async()=>{
 await offer('batch-coverage-a','2035-10-03');
 const first=counted(db.executor),small=await readEmployeeRequests(proof('e2'),first.executor);
 expect(small.state).toBe('ready');if(small.state!=='ready')throw Error('Requests fixture unavailable');expect(small.open).toHaveLength(1);expect(small.open?.[0].check).toBe('eligible');
 await offer('batch-coverage-b','2035-10-04');await offer('batch-coverage-c','2035-10-05');
 const second=counted(db.executor),large=await readEmployeeRequests(proof('e2'),second.executor);
 expect(large.state).toBe('ready');if(large.state!=='ready')throw Error('Requests fixture unavailable');expect(large.open).toHaveLength(3);expect(large.open?.every(row=>row.check==='eligible')).toBe(true);
 expect(second.calls()-first.calls()).toBe(0);
});
it('one immutable planning source gives each candidate its own request projection',async()=>{
 const blocked=await offer('batch-conflict','2035-10-03'),eligible=await offer('batch-eligible','2035-10-04');await fixtureShift(db.executor,'batch-commitment','e2','2035-10-03');
 function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const item of Object.values(value))freeze(item);Object.freeze(value);}return value;}
 const frozen:SqlExecutor={async query(statement,signal){return freeze(await db.executor.query(statement,signal));},async transaction(statements,signal){return freeze(await db.executor.transaction(statements,signal));}};
 const measured=counted(frozen),review=await readShiftChangeReview(proof('e2'),measured.executor),loaded=measured.calls();
 const command=(requestId:string)=>({kind:'ACCEPT' as const,requestId,expectedRevision:1,operationId:randomUUID()});
 expect(review.availability(command(blocked)).allowed).toBe(false);
 expect(review.availability(command(eligible))).toMatchObject({allowed:true,outcome:'completed'});
 expect(review.availability(command(blocked)).allowed).toBe(false);
 expect(measured.calls()).toBe(loaded);
});
it('a later screen request obtains fresh source and refuses a revoked session',async()=>{
 await offer('batch-revoke','2035-10-03');const actor=proof('e2');expect((await readShiftChangeReview(actor,db.executor)).terms('batch-revoke')).toBeNull();
 await db.executor.query({text:'DELETE FROM employee_sessions WHERE token_hash=$1',values:[actor.sessionTokenHash]});
 await expect(readShiftChangeReview(actor,db.executor)).rejects.toThrow();
 expect(await readEmployeeRequests(actor,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('swap options share a real SQL planning source and retain every eligible target',async()=>{
 await fixtureShift(db.executor,'batch-own','e2','2035-10-02');await fixtureShift(db.executor,'batch-target-a','e1','2035-10-03');
 const first=counted(db.executor),small=await readEmployeeCreation(proof('e2'),first.executor,'swap','batch-own');
 expect(small.state).toBe('ready');if(small.state!=='ready')throw Error('Creation fixture unavailable');expect(small.targets).toHaveLength(1);
 await fixtureShift(db.executor,'batch-target-b','e1','2035-10-04');await fixtureShift(db.executor,'batch-target-c','e1','2035-10-05');
 const second=counted(db.executor),large=await readEmployeeCreation(proof('e2'),second.executor,'swap','batch-own');
 expect(large.state).toBe('ready');if(large.state!=='ready')throw Error('Creation fixture unavailable');expect(large.targets).toHaveLength(3);expect(large.check.allowed).toBe(true);
 expect(second.calls()-first.calls()).toBe(0);
});
