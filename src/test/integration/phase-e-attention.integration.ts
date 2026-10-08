import {afterEach,beforeEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {acknowledgeScheduleWeek} from '../../lib/data/acknowledgements';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
beforeEach(async()=>{db=await createDisposableFoundationDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);await db.executor.query({text:"INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QAEMP','Fictional','Self','555-0199','EMPLOYEE','loc-1')",values:[]});
 await db.executor.query({text:`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('attention-new','2030-10-07',1,'PUBLISH','QAOWNER');
 INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_designated_lead,is_callout_approved) VALUES('attention-rs','attention-new','source','schedule','loc-1','QAEMP','2030-10-07','08:00','16:00',false,false)`,values:[]});
});
afterEach(async()=>{await db?.dispose();});
it('unseen_republish_conflicts',async()=>{
 const result=await acknowledgeScheduleWeek({weekStart:'2030-10-07',employeeId:'QAEMP',expectedRevisionId:'attention-old',operationId:'old',authority:'old'} as Parameters<typeof acknowledgeScheduleWeek>[0],db.executor);
 expect(result).toMatchObject({status:'blocked'});
 expect(await db.executor.query({text:"SELECT * FROM schedule_acknowledgements WHERE employee_id='QAEMP'",values:[]})).toEqual([]);
});
