import {fixtureProof} from './shift-change-api';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { reviewTimeOffRequest } from './management-api';
import { createTimeOffRequest } from './self-service-api';
import { listTemplateShifts } from '../../lib/data/schedule-templates';
let database: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q=(text:string,values:readonly unknown[]=[])=>database.executor.query<Record<string,unknown>>({text,values});
const request={requestId:'cf1aa1a1-2ad2-4b12-a990-93da17e8c319',employeeId:'legacy-worker',startDate:'2030-10-11',endDate:'2030-10-11',reason:'Fictional leave'};
beforeAll(async()=>{database=await createDisposableFoundationDatabase({mode:'current-runtime'});});
afterAll(async()=>{await database?.dispose();});
beforeEach(async()=>{
 await database.dispose(); database=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('legacy-worker','Fictional','Worker','NONE','EMPLOYEE','loc-1'),('legacy-other','Fictional','Other','NONE','EMPLOYEE','loc-1'),('legacy-manager','Fictional','Manager','NONE','MANAGER','loc-1'); INSERT INTO employee_location_eligibility SELECT id,'loc-1' FROM employees");
});
it('rejects archived and missing templates while retaining their history',async()=>{
 await q("INSERT INTO schedule_templates(id,name,created_by,active) VALUES('archived','Archived fictional','legacy-manager',false); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('archived-shift','archived','loc-1',0,'08:00','12:00','legacy-worker')");
 expect(await listTemplateShifts('archived',database.executor,await fixtureProof(database.executor,'legacy-manager'))).toBeNull();
 expect(await listTemplateShifts('missing',database.executor,await fixtureProof(database.executor,'legacy-manager'))).toBeNull();
 expect(await q("SELECT id FROM schedule_template_shifts WHERE template_id='archived'")).toEqual([{id:'archived-shift'}]);
});
it('distinguishes empty active templates and preserves assigned position/time data',async()=>{
 await q("INSERT INTO schedule_templates(id,name,created_by) VALUES('empty','Empty fictional','legacy-manager'),('assigned','Assigned fictional','legacy-manager'); INSERT INTO positions(id,workspace_id,name) VALUES('legacy-position','workspace-fuel','Fictional position') ON CONFLICT(id) DO NOTHING; INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,position_id) VALUES('assigned-shift','assigned','loc-1',2,'08:00','12:00','legacy-worker','legacy-position')");
 expect(await listTemplateShifts('empty',database.executor,await fixtureProof(database.executor,'legacy-manager'))).toEqual([]);
 expect(await listTemplateShifts('assigned',database.executor,await fixtureProof(database.executor,'legacy-manager'))).toEqual([expect.objectContaining({id:'assigned-shift',positionId:'legacy-position',dayOffset:2,startTime:'08:00',endTime:'12:00',employeeId:'legacy-worker'})]);
});
it('concurrent Time Off retries and lost-response replay create one row and one pending intent',async()=>{
 await Promise.all(Array.from({length:4},()=>createTimeOffRequest(request,database.executor)));
 const before=await q('SELECT * FROM notifications ORDER BY id');
 await createTimeOffRequest(request,database.executor);
 expect(await q('SELECT id,employee_id FROM time_off_requests')).toEqual([{id:request.requestId,employee_id:request.employeeId}]);
 expect(await q('SELECT employee_id,source_id FROM notifications')).toEqual([{employee_id:'legacy-manager',source_id:request.requestId}]);
 expect(await q('SELECT * FROM notifications ORDER BY id')).toEqual(before);
});
it('rejects reuse of a Time Off identifier by another actor or with changed payload',async()=>{
 await createTimeOffRequest(request,database.executor);
 const before=await q('SELECT * FROM notifications ORDER BY id');
 await expect(createTimeOffRequest({...request,employeeId:'legacy-other'},database.executor)).rejects.toThrow(/changed/);
 await expect(createTimeOffRequest({...request,reason:'Changed fictional leave'},database.executor)).rejects.toThrow(/changed/);
 expect(await q('SELECT id,employee_id,reason FROM time_off_requests')).toEqual([{id:request.requestId,employee_id:request.employeeId,reason:request.reason}]);
 expect(await q('SELECT * FROM notifications ORDER BY id')).toEqual(before);
});
it('outbox failure rolls back Time Off and permits a later retry of the same identifier',async()=>{
 await q("ALTER TABLE notifications ADD CONSTRAINT legacy_reject_intent CHECK(employee_id<>'legacy-manager')");
 try{
  await expect(createTimeOffRequest(request,database.executor)).rejects.toThrow(/legacy_reject_intent/);
  expect(await q('SELECT id FROM time_off_requests')).toEqual([]);expect(await q('SELECT id FROM notifications')).toEqual([]);
 }finally{await q('ALTER TABLE notifications DROP CONSTRAINT legacy_reject_intent');}
 await createTimeOffRequest(request,database.executor);
 expect(await q('SELECT id FROM time_off_requests')).toEqual([{id:request.requestId}]);
 expect(await q('SELECT source_id FROM notifications')).toEqual([{source_id:request.requestId}]);
});
it('replay after an actual manager decision retains the decision and does not emit pending again',async()=>{
 await createTimeOffRequest(request,database.executor);
 expect(await reviewTimeOffRequest({requestId:request.requestId,managerId:'legacy-manager',status:'APPROVED'},database.executor)).toBe(true);
 const before=await q('SELECT * FROM notifications ORDER BY id');
 await createTimeOffRequest(request,database.executor);
 expect(await q('SELECT id,status FROM time_off_requests')).toEqual([{id:request.requestId,status:'APPROVED'}]);
 expect(await q('SELECT * FROM notifications ORDER BY id')).toEqual(before);
});
