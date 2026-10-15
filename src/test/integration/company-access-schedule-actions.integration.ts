import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});
 return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});

vi.mock('../../lib/auth/session',()=>({requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('../../lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('Owned redirect'),{destination});}}));
vi.mock('../../lib/data/notification-transactions',async original=>({...await original<typeof import('../../lib/data/notification-transactions')>(),neonNotificationExecutor:()=>ctx.ex!}));
import {createShiftAction,updateShiftAction,deleteShiftAction,publishScheduleAction} from '../../app/app/schedule/actions';
async function setup(){
 const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;
 try{
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('TARGET','Target','QA','555004','EMPLOYEE','loc-1'),('FOREIGN','Private','B','555005','EMPLOYEE','loc-2');
   INSERT INTO employee_location_eligibility VALUES('TARGET','loc-1'),('FOREIGN','loc-2');
   INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'normal-'||e||'-'||d,e,d,'00:00','24:00' FROM unnest(ARRAY['TARGET','FOREIGN'])e CROSS JOIN generate_series(0,6)d;
   INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('action-b','loc-2','2026-10-12','DRAFT','owner');
   INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('foreign-shift','action-b','FOREIGN','2026-10-12','08:00','09:00')`);
  const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Scope fixture');const c=v.data.current;
  expect((await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');return f;
 }catch(e){await f.db.dispose();throw e;}
}
function form(fields:Record<string,string>={}){const data=new FormData();for(const [k,v]of Object.entries({weekStart:'2026-10-12',locationId:'loc-1',employeeId:'TARGET',date:'2026-10-12',startTime:'10:00',endTime:'11:00',...fields}))data.set(k,v);return data;}
async function close(f:Awaited<ReturnType<typeof setup>>){ctx.proof=null;ctx.ex=null;await f.db.dispose();}
it('normal create action rolls its new parent back when assignment creation fails',async()=>{
 const f=await setup();try{
  await f.q(`CREATE FUNCTION test_owned_action_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.employee_id='TARGET' THEN RAISE EXCEPTION 'Owned action failure';END IF;RETURN NEW;END $$;CREATE TRIGGER test_owned_action_failure BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION test_owned_action_failure()`);
  await expect(createShiftAction(form())).rejects.toThrow('Owned action failure');
  expect(await f.q("SELECT id FROM schedules WHERE location_id='loc-1'")).toEqual([]);
  expect(await f.q("SELECT id FROM shifts WHERE employee_id='TARGET'")).toEqual([]);
 }finally{await close(f);}
});
it('normal actions deny B targets, forged foreign employee and A publication without private validation results or writes',async()=>{
 const f=await setup();try{
  const before=await f.q('SELECT to_jsonb(s) AS row FROM shifts s ORDER BY id');
  expect(await createShiftAction(form({employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  expect(await createShiftAction(form({locationId:'loc-2',employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  expect(await updateShiftAction(form({shiftId:'foreign-shift',employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  await expect(deleteShiftAction(form({shiftId:'foreign-shift'}))).rejects.toMatchObject({destination:'/app/schedule?error=ACCESS_DENIED'});
  await expect(publishScheduleAction(form())).rejects.toMatchObject({destination:'/app/schedule?error=ACCESS_DENIED'});
  expect(await f.q('SELECT to_jsonb(s) AS row FROM shifts s ORDER BY id')).toEqual(before);
  expect(await f.q('SELECT id FROM schedule_publication_revisions')).toEqual([]);
 }finally{await close(f);}
});
it('normal scoped create/update/delete A succeeds and preserves every B schedule timestamp',async()=>{
 const f=await setup();try{
  const before=await f.q("SELECT to_jsonb(s) AS row FROM schedules s WHERE id='action-b'");
  await expect(createShiftAction(form())).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&location=loc-1'});
  const [shift]=await f.q<{id:string}>("SELECT id FROM shifts WHERE employee_id='TARGET'");expect(shift).toBeDefined();
  await expect(updateShiftAction(form({shiftId:shift.id,endTime:'11:30'}))).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&updated=1'});
  await expect(deleteShiftAction(form({shiftId:shift.id}))).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&deleted=1'});
  expect(await f.q("SELECT to_jsonb(s) AS row FROM schedules s WHERE id='action-b'")).toEqual(before);
 }finally{await close(f);}
});
