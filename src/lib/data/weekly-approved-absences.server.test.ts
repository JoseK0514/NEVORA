import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readWeeklyApprovedAbsences} from './weekly-approved-absences.server';
import {managementProof} from '../../test/fixtures/management';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
const workspace={id:'w',name:'Fictional',timeZone:'America/Puerto_Rico',active:true,createdAt:'2026-01-01',updatedAt:'2026-01-01'};
function database(rows:object[],failure?:Error){return {query:vi.fn(async(s:SqlStatement)=>s.text.includes('pg_catalog')?[{installed:0}]:[workspace]),transaction:vi.fn(async(s:readonly SqlStatement[])=>{if(failure)throw failure;return s.map(q=>q.text.startsWith('WITH scope')?rows:[]);})} as unknown as SqlExecutor;}
it('projects dates and times only, excluding private reason and other database fields',async()=>{
 const db=database([{employee_id:'qa',start_date:'2030-10-06',end_date:'2030-10-14',start_time:null,end_time:null,reason:'PRIVATE'}]);
 expect(await readWeeklyApprovedAbsences(managementProof('owner','OWNER'),'2030-10-07',db)).toEqual({state:'ready',employeeIds:['qa'],rows:[{employeeId:'qa',startDate:'2030-10-06',endDate:'2030-10-14'}]});
});
it.each(['EMPLOYEE','LEAD'] as const)('denies %s without reading private storage',async role=>{
 const db=database([]);expect(await readWeeklyApprovedAbsences(managementProof('actor',role),'2030-10-07',db)).toEqual({state:'unavailable',reason:'access_denied'});expect(db.query).not.toHaveBeenCalled();
});
it('returns unavailable on storage failure, invalid dates or incomplete partial leave',async()=>{
 for(const db of [database([],Error('offline')),database([{employee_id:'qa',start_date:'2030-02-30',end_date:'2030-10-14'}]),database([{employee_id:'qa',start_date:'2030-10-07',end_date:'2030-10-07',start_time:'09:00',end_time:null}])])expect(await readWeeklyApprovedAbsences(managementProof('owner','OWNER'),'2030-10-07',db)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('distinguishes a live session rejection from a storage failure and rejects invalid weeks',async()=>{
 expect(await readWeeklyApprovedAbsences(managementProof('owner','OWNER'),'2030-10-07',database([],Object.assign(Error('invalid input syntax for type integer: "management_authorization"'),{code:'22P02'})))).toEqual({state:'unavailable',reason:'access_denied'});
 const db=database([]);expect(await readWeeklyApprovedAbsences(managementProof('owner','OWNER'),'2030-10-08',db)).toEqual({state:'unavailable',reason:'read_failed'});expect(db.query).not.toHaveBeenCalled();
});
