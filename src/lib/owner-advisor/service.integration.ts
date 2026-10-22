import {fictionalProfile} from '@/test/fixtures/shift-changes';
import {it,expect,beforeEach,afterEach,vi} from 'vitest';
import {companyAccessFixture} from '@/test/integration/company-access-fixture';
import {advisorService} from './service.server';
import {AdvisorStore} from './store.server';
import {admitOwner} from './authority.server';
import {AdvisorTools} from './tools.server';
import {randomUUID} from 'node:crypto';
let f:Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async()=>{f=await companyAccessFixture();});afterEach(async()=>{await f?.db.dispose();});
const env={NEVORA_OWNER_ADVISOR_ENABLED:'true',NEVORA_OWNER_ADVISOR_PROVIDER:'openai',NEVORA_OWNER_ADVISOR_DATA_APPROVED:'true',NEVORA_OWNER_ADVISOR_MODEL:'test-model',NEVORA_OWNER_ADVISOR_DAILY_LIMIT:'10',OPENAI_API_KEY:'fictional'};
const answer=()=>new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Review coverage; no action performed.'}]}]}));
const command=()=>({op:'ask',requestId:randomUUID(),message:'Investigate'});
const signal=()=>new AbortController().signal;
it('denies manager and employee, and all missing config with zero provider side effects',async()=>{
 const fetch=vi.fn(async()=>answer());
 await expect(advisorService(f.manager,f.db.executor,env,signal(),command(),fetch)).rejects.toThrow();
 for(const key of Object.keys(env)){await expect(advisorService(f.owner,f.db.executor,{...env,[key]:undefined},signal(),command(),fetch)).rejects.toThrow();}
 await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");await expect(advisorService(f.owner,f.db.executor,env,signal(),command(),fetch)).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();expect(await f.q('SELECT count(*)::int n FROM owner_advisor_requests')).toEqual([{n:0}]);
});
it('runs typed tools with real data, persists answer once, replays without another charge',async()=>{
 let n=0;const fetch=vi.fn(async()=>++n===1?new Response(JSON.stringify({output:[{type:'function_call',name:'company_briefing',arguments:'{}',call_id:'c'}]})):answer());
 const c=command();const first=await advisorService(f.owner,f.db.executor,env,signal(),c,fetch);expect(first).toMatchObject({state:'answered',answer:{text:'Review coverage; no action performed.'}});const second=await advisorService(f.owner,f.db.executor,env,signal(),c,fetch);expect(second).toMatchObject({state:'answered'});expect(fetch).toHaveBeenCalledTimes(2);
 const state=await advisorService(f.owner,f.db.executor,env,signal());expect(state).toMatchObject({state:'ready',history:[{role:'user'},{role:'assistant'}],briefing:{partial:false,data:{companyName:'Fuel Coffee Drive',publication:'PUBLISHED'}}});
});
it.each(['demote','logout'])('discards provider output after %s and does not store private history',async change=>{
 const fetch=vi.fn(async()=>{await f.q(change==='demote'?"UPDATE employees SET role='MANAGER' WHERE id='owner'":"DELETE FROM employee_sessions WHERE employee_id='owner'");return answer();});await expect(advisorService(f.owner,f.db.executor,env,signal(),command(),fetch)).rejects.toThrow();expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([]);expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed'")).toEqual([{n:0}]);
});
it('published staffing reads publication snapshots, suppresses private text and draft edits; coverage uses existing engine',async()=>{
 await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('pub','2026-10-19',1,'PUBLISH','owner');
 INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES('ps','pub','draft','draft-s','loc-1','target','2026-10-22','08:00','12:00','SECRET LEAVE REASON');
 INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('draft-s','loc-1','2026-10-19','DRAFT','owner');
 INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('draft','draft-s','target','2026-10-22','14:00','18:00','SECRET DRAFT');`);
 const tools=new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));
 const result=await tools.run({name:'published_staffing',args:{date:'2026-10-22'}});expect(result).toMatchObject({data:{publication:'PUBLISHED',shifts:[{startTime:'08:00',minutes:240}]}});expect(JSON.stringify(result)).not.toMatch(/SECRET|555|example.invalid/);
 const coverage=await tools.run({name:'coverage_investigation',args:{date:'2026-10-22'}});expect(coverage).toMatchObject({data:{basis:'CURRENT_SCHEDULING_LEDGER_INCLUDES_DRAFT_COMMITMENTS'}});expect(JSON.stringify(coverage)).not.toMatch(/SECRET|555|example.invalid/);
});
it('reports fresh DB-clock remaining session life after a provider wait',async()=>{const fetch=vi.fn(async()=>{await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE employee_id='owner'");return answer();});const result=await advisorService(f.owner,f.db.executor,env,signal(),command(),fetch);expect(result.validForMs).toBeGreaterThan(0);expect(result.validForMs).toBeLessThanOrEqual(2000);});
it('cancelled provider attempts remain failed and cannot silently charge again',async()=>{const c=command(),controller=new AbortController(),fetch=vi.fn(async()=>{controller.abort();return answer();});await expect(advisorService(f.owner,f.db.executor,env,controller.signal,c,fetch)).rejects.toThrow();expect(await f.q('SELECT state FROM owner_advisor_requests')).toEqual([{state:'failed'}]);await expect(advisorService(f.owner,f.db.executor,env,signal(),c,fetch)).rejects.toThrow('prior_attempt_failed');expect(fetch).toHaveBeenCalledTimes(1);});
it('coverage candidates come from canonical availability and position validation',async()=>{
 await f.q(`UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false WHERE location_id='loc-1';
 INSERT INTO positions(id,workspace_id,name) VALUES('advisor-position','workspace-fuel','Barista');
 INSERT INTO employee_positions(employee_id,position_id) VALUES('target','advisor-position');
 INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1');
 INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('advisor-window','loc-1',4,'08:00','12:00');
 INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('advisor-window','advisor-position',1);
 INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('advisor-av','target',4,'00:00','24:00');
 INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('target','2026-10-19',true);`);
 await f.q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES('target',20,80,$1::jsonb)",[JSON.stringify(fictionalProfile())]);
 const tools=new AdvisorTools(new AdvisorStore(f.owner,await admitOwner(f.owner,f.db.executor),f.db.executor));
 const before=JSON.stringify(await tools.run({name:'coverage_investigation',args:{date:'2026-10-22'}}));expect(before).toContain('Target QA');expect(before).toContain('"eligible":true');
 await f.q("DELETE FROM employee_positions WHERE employee_id='target'");const after=await tools.run({name:'coverage_investigation',args:{date:'2026-10-22'}});expect(after).toMatchObject({data:{gaps:[{options:expect.arrayContaining([{target:'POSITION',needed:1,status:'READY',candidates:[]}])}]}});
});
it('fences authority changed while a coverage tool is waiting',async()=>{
 const ex={...f.db.executor,transaction:async(...args:Parameters<typeof f.db.executor.transaction>)=>{const result=await f.db.executor.transaction(...args);if(args[0].some(s=>s.text.includes('AS source,clock_timestamp()'))){await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");}return result;}};
 const fetch=vi.fn(async()=>new Response(JSON.stringify({output:[{type:'function_call',name:'coverage_investigation',arguments:'{"date":"2026-10-22"}',call_id:'coverage'}]})));
 await expect(advisorService(f.owner,ex,env,signal(),command(),fetch)).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);expect(await f.q('SELECT history FROM owner_advisor_profiles')).toEqual([]);
});
