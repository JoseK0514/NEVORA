import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeRequests} from './employee-requests.server';
import {ownShiftActivity} from './exchanges';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof={employee:{id:'self',firstName:'Alex',lastName:'QA',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('refuses management or forged proofs before reading Requests data',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 for(const bad of [{...proof,sessionTokenHash:'fake'},{...proof,employee:{...proof.employee,role:'OWNER' as const}}])
  expect(await readEmployeeRequests(bad,db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.transaction).not.toHaveBeenCalled();expect(db.query).not.toHaveBeenCalled();
});
it('does not replace a storage error with a verified empty Requests view',async()=>{
 const db={query:vi.fn(),transaction:vi.fn().mockRejectedValue(Error('private storage detail'))} as unknown as SqlExecutor;
 expect(await readEmployeeRequests(proof,db)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('lists a swap sent to the employee only once it no longer waits on their answer (incoming counts it until then)',()=>{
 const row=(requestedByEmployeeId:string|null,targetEmployeeId:string|null,status:string)=>({requestedByEmployeeId,targetEmployeeId,status});
 expect(ownShiftActivity(row('self','ana','EMPLOYEE_PENDING'),'self')).toBe(true);
 expect(ownShiftActivity(row('ana','self','EMPLOYEE_PENDING'),'self')).toBe(false);
 for(const status of ['MANAGER_PENDING','APPROVED','DENIED','CANCELLED','EXPIRED'])expect(ownShiftActivity(row('ana','self',status),'self')).toBe(true);
 expect(ownShiftActivity(row('ana','maria','EMPLOYEE_PENDING'),'self')).toBe(false);
});
