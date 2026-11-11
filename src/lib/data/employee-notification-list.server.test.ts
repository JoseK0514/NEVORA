import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeNotificationList,notificationReadManifest} from './employee-notification-list.server';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof={employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('requires explicit environment independently of push and rejects forged/management proof before reads',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 expect(await readEmployeeNotificationList(proof,undefined,db)).toEqual({state:'unavailable',reason:'read_failed'});
 expect(await readEmployeeNotificationList({...proof,sessionTokenHash:'forged'},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readEmployeeNotificationList({...proof,employee:{...proof.employee,role:'OWNER'}},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.query).not.toHaveBeenCalled();expect(db.transaction).not.toHaveBeenCalled();
});
it('closed manifest rejects unknown/mutation/multi-statement/changed parameter queries and never falls back',()=>{
 const replay=notificationReadManifest();
 expect(()=>replay.identify({text:'SELECT private FROM arbitrary',values:[]})).toThrow();
 expect(()=>replay.identify({text:'DELETE FROM notifications',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT 1; SELECT 2',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT id FROM locations WHERE id=ANY($1::text[]) AND active=true',values:[undefined]})).toThrow();
});
it('applies owned SQL/abort budgets before the initial workspace read',async()=>{
 const query=vi.fn(async()=>{throw Error('Unbounded query must not run');});
 const transaction=vi.fn(async()=>[]);
 await readEmployeeNotificationList(proof,'test',{query,transaction} as SqlExecutor);
 expect(query).not.toHaveBeenCalled();
 expect(transaction).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({text:"SET LOCAL statement_timeout='2500ms'"})]),expect.any(AbortSignal));
});
it('projects current schedule confirmation independently from read receipts',async()=>{
 const m=await import('./employee-notification-list.server');expect(m.projectNotificationDisplayState).toBeTypeOf('function');
 const source={kind:'SCHEDULE',source:{kind:'SCHEDULE',id:'2030-10-07',version:'new'},employeePublications:{self:{acknowledgement:{acknowledged:false,needsAcknowledgement:true}}}};
 expect(m.projectNotificationDisplayState(source as never,'self',true,null)).toEqual({reviewState:'read',actionState:'required'});
 expect(m.projectNotificationDisplayState({...source,employeePublications:{self:{acknowledgement:{acknowledged:true,needsAcknowledgement:false}}}} as never,'self',false,null)).toEqual({reviewState:'confirmed',actionState:'complete'});
});
it('communication read cannot complete required acknowledgement and old acknowledgement cannot confirm a new version',async()=>{
 const m=await import('./employee-notification-list.server');expect(m.projectNotificationDisplayState).toBeTypeOf('function');
 const source={kind:'COMMUNICATION',source:{kind:'COMMUNICATION',id:'update',version:'new'}};
 expect(m.projectNotificationDisplayState(source as never,'self',true,{version:'new',requirement:'REQUIRED',acknowledged:false})).toEqual({reviewState:'read',actionState:'required'});
 expect(m.projectNotificationDisplayState(source as never,'self',false,{version:'old',requirement:'REQUIRED',acknowledged:true})).toEqual({reviewState:'unavailable',actionState:'unavailable'});
 expect(m.projectNotificationDisplayState(source as never,'self',false,{version:'new',requirement:'REQUIRED',acknowledged:true})).toEqual({reviewState:'confirmed',actionState:'complete'});
});
it('adds only authorized calendar subject facts, never private request text',async()=>{
 const {notificationSubject}=await import('./employee-notification-list.server');
 expect(notificationSubject({kind:'SCHEDULE',revision:{weekStart:'2026-11-16'}} as never)).toEqual({kind:'scheduleWeek',startDate:'2026-11-16',endDate:'2026-11-22'});
 expect(notificationSubject({kind:'TIME_OFF',record:{startDate:'2026-11-16',endDate:'2026-11-17',reason:'PRIVATE'}} as never)).toEqual({kind:'requestDate',startDate:'2026-11-16',endDate:'2026-11-17'});
 expect(notificationSubject({kind:'COMMUNICATION',private:'PRIVATE'} as never)).toBeNull();
 expect(notificationSubject({kind:'CALLOUT',record:{date:'invalid',reasonNote:'PRIVATE'}} as never)).toBeNull();
});
