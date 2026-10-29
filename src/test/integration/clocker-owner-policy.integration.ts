import {randomUUID} from 'node:crypto';
import {expect,it} from 'vitest';
import {companyAccessFixture} from './company-access-fixture';
import {readEmployeeClockerPin,setEmployeeClockerPin} from '../../lib/clocker/pins.server';
import {readClockerRecoveryReview} from '../../lib/clocker/recovery-review.server';
import type {SqlStatement} from '../../lib/notifications/types';
const key=Buffer.alloc(32,61);
it.each(['MANAGER','EMPLOYEE','LEAD'] as const)('%s has no Clocker administration even with company access',async role=>{
 const f=await companyAccessFixture();try{
  if(role!=='MANAGER')await f.q('UPDATE employees SET role=$1 WHERE id=$2',[role,'manager']);
  const proof={...f.manager,employee:{...f.manager.employee,role}},actor={employeeId:'manager',sessionTokenHash:proof.sessionTokenHash};
  await expect(readEmployeeClockerPin(actor,'target',f.db.executor)).rejects.toMatchObject({code:'FORBIDDEN'});
  await expect(setEmployeeClockerPin(actor,{employeeId:'target',pin:'0246',expectedVersion:0},key,f.db.executor)).rejects.toMatchObject({code:'FORBIDDEN'});
  expect(await readClockerRecoveryReview(proof,randomUUID(),f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  expect(await f.q('SELECT count(*)::int AS n FROM employee_clocker_pins')).toEqual([{n:0}]);
  expect(await f.q('SELECT count(*)::int AS n FROM clocker_pin_events')).toEqual([{n:0}]);
 }finally{await f.db.dispose();}
});
it('a forged Owner proof cannot elevate a current Manager',async()=>{
 const f=await companyAccessFixture();try{
  expect(await readClockerRecoveryReview({...f.manager,employee:{...f.manager.employee,role:'OWNER'}},randomUUID(),f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  await expect(readEmployeeClockerPin({employeeId:'owner',sessionTokenHash:f.manager.sessionTokenHash},'target',f.db.executor)).rejects.toMatchObject({code:'FORBIDDEN'});
 }finally{await f.db.dispose();}
});
it('Owner downgrade during PIN write admission cannot mutate PINs or audit',async()=>{
 const f=await companyAccessFixture();try{
  const base=f.db.executor;let reached=false;
  const ex={...base,transaction:async(s:readonly SqlStatement[],signal?:AbortSignal)=>{
   if(s.some(q=>q.text.includes('INSERT INTO employee_clocker_pins('))){reached=true;await f.q("UPDATE employees SET role='MANAGER' WHERE id='owner'");}
   return base.transaction(s,signal);
  }};
  await expect(setEmployeeClockerPin({employeeId:'owner',sessionTokenHash:f.owner.sessionTokenHash},{employeeId:'target',pin:'0246',expectedVersion:0},key,ex)).rejects.toMatchObject({code:'FORBIDDEN'});
  expect(reached).toBe(true);expect(await f.q('SELECT count(*)::int AS n FROM employee_clocker_pins')).toEqual([{n:0}]);expect(await f.q('SELECT count(*)::int AS n FROM clocker_pin_events')).toEqual([{n:0}]);
 }finally{await f.db.dispose();}
});
it('Owner downgrade after receipt read suppresses private evidence',async()=>{
 const f=await companyAccessFixture();try{
  const base=f.db.executor;let reached=false;
  const ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const r=await base.query<T>(s,signal);if(s.text.includes('AS remaining')){reached=true;await f.q("UPDATE employees SET role='MANAGER' WHERE id='owner'");}return r;}};
  expect(await readClockerRecoveryReview(f.owner,randomUUID(),ex)).toEqual({state:'unavailable',reason:'access_denied'});expect(reached).toBe(true);
 }finally{await f.db.dispose();}
});
