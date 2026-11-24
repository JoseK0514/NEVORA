// UI audit fixture (tools/ui-audit): a small fictional business for the Owner and Manager views. From tools/ui-scan.
// Owned disposable database only. Every step reuses the app's server functions or the integration fixtures' SQL recipes;
// a step that fails is logged and skipped. No real people, money, notifications or credentials.
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../../src/lib/notifications/types';
import {hashPassword} from '../../../src/lib/auth/password';
import {fictionalProfile} from '../../../src/test/fixtures/shift-changes';
import {fixtureProof,reviewedFixtureSource} from '../../../src/test/integration/shift-change-api';
import {publishScheduleWithRevision,reviewTimeOffRequest} from '../../../src/test/integration/management-api';
import {assignOwnedManagerCompanyAccess,TEST_PASSWORD} from '../../../src/test/integration/owned-app-fixture';
import {readEmployeeHours} from '../../../src/lib/data/employee-hours.server';
import {submitEmployeeHoursCorrection} from '../../../src/lib/data/employee-hours-write.server';
import {readTimecards,mutateTimecard} from '../../../src/lib/timecards/service';
import {mutateEmployeePlanning} from '../../../src/lib/data/employee-planning-write.server';
import {executeShiftChange} from '../../../src/lib/data/shift-changes';
import {previewCommunicationAudience,executeCommunicationCommand,readCommunication} from '../../../src/lib/communications/service.server';
import {addDays} from '../../../src/lib/date-utils';
import {runReminders} from '../../../src/lib/notifications/reminders';
import {sqlNotificationStateRepository} from '../../../src/lib/data/notification-state';
import {loadWorkspaceNotificationConfig} from '../../../src/lib/notifications/config';

type Log=unknown[];
const ZONE_OFFSET='-04:00'; // America/Puerto_Rico has no DST.
const at=(date:string,time:string)=>new Date(`${date}T${time}:00${ZONE_OFFSET}`).toISOString();
const hh=(m:number)=>{m=Math.max(0,Math.min(m,23*60+30));return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const mins=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));

type Person={id:string;first:string;last:string;loc:'loc-1'|'loc-2';pos:string;start:string;len:number;off:number[];email?:string;noLogin?:boolean;target:number;role?:'MANAGER'};
export const OWNER_PEOPLE:Person[]=[
 {id:'OWN-ELENA',first:'Elena',last:'Ruiz',loc:'loc-1',pos:'own-counter',start:'08:00',len:8,off:[5,6],email:'elena.ruiz@example.test',target:40,role:'MANAGER'},
 {id:'OWN-LUIS',first:'Luis',last:'Torres',loc:'loc-1',pos:'own-counter',start:'06:00',len:8,off:[2,6],email:'luis.torres@example.test',target:40},
 {id:'OWN-GABY',first:'Gabriela',last:'Santos',loc:'loc-1',pos:'qa-pos',start:'10:00',len:8,off:[0,3],target:32},
 {id:'OWN-VALE',first:'Valeria',last:'Díaz',loc:'loc-1',pos:'own-kitchen',start:'11:00',len:7,off:[1,5],email:'valeria.diaz@example.test',target:30},
 {id:'OWN-SOFI',first:'Sofía',last:'Méndez',loc:'loc-2',pos:'own-kitchen',start:'07:00',len:8,off:[3],target:40},
 {id:'OWN-CARL',first:'Carlos',last:'Vega',loc:'loc-2',pos:'qa-pos2',start:'08:00',len:8,off:[0,6],email:'carlos.vega@example.test',target:40},
 {id:'OWN-DANI',first:'Daniel',last:'Cruz',loc:'loc-2',pos:'own-counter',start:'14:00',len:8,off:[1],target:36},
 {id:'OWN-MIGU',first:'Miguel',last:'Reyes',loc:'loc-2',pos:'qa-pos2',start:'15:00',len:6,off:[2,4],noLogin:true,target:24},
];

function stepper(log:Log){
 const note=(m:string)=>log.push('owner: '+m);
 const step=async function<T>(name:string,fn:()=>Promise<T>):Promise<T|undefined>{try{const r=await fn();note(name+' ok'+(r!==undefined&&typeof r!=='object'?' '+String(r):r&&typeof r==='object'?' '+JSON.stringify(r).slice(0,300):''));return r;}catch(e){note(name+' FAILED '+String((e as Error)?.stack??e).slice(0,700));return undefined;}};
 return {note,step};
}

/** Before the employee seed: the team (roles, people, positions, eligibility, availability) and the review policy. */
export async function seedOwnerBefore(ex:SqlExecutor,input:{actors:string[]},log:Log){
 const q=function<T extends Record<string,unknown>=Record<string,unknown>>(text:string,values:unknown[]=[]){return ex.query<T>({text,values});};
 const {step}=stepper(log);
 const [maria,james,ana]=input.actors;
 await step('shift change policy: manager review',async()=>{const scope={revision:2,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};await q('UPDATE workspaces SET shift_change_policy=$1',[JSON.stringify({version:1,revision:2,swap:scope,coverage:scope})]);});
 await step('business names',async()=>{await q("UPDATE workspaces SET name='Northside Café & Bakery'");await q("UPDATE locations SET name=CASE id WHEN 'loc-1' THEN 'Northside Café — Calle Loíza' ELSE 'Northside Bakery — Condado' END,short_name=CASE id WHEN 'loc-1' THEN 'Calle Loíza' ELSE 'Condado' END");});
 await step('positions',async()=>{await q("UPDATE positions SET name=CASE id WHEN 'qa-pos' THEN 'Barista' WHEN 'qa-pos2' THEN 'Baker' ELSE name END WHERE id IN ('qa-pos','qa-pos2')");
  await q("INSERT INTO positions(id,workspace_id,name) VALUES('own-counter','workspace-fuel','Front counter'),('own-kitchen','workspace-fuel','Kitchen') ON CONFLICT DO NOTHING");return 4;});
 await step('fixture roles (Maria, James and Ana Employees)',async()=>{
  await q("UPDATE employees SET email='maria.rivera@example.test' WHERE id=$1",[maria]);
  await q("UPDATE employees SET role='EMPLOYEE',updated_at=clock_timestamp() WHERE id=ANY($1::text[])",[[maria,james,ana]]);
  for(const id of [maria,james,ana])await q("INSERT INTO employee_positions(employee_id,position_id) VALUES($1,'own-counter'),($1,'own-kitchen') ON CONFLICT DO NOTHING",[id]);
  return 'ok';});
 await step('employees',async()=>{const hash=await hashPassword(TEST_PASSWORD);
  for(const [i,p] of OWNER_PEOPLE.entries()){
   await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$7,$6)",[p.id,p.first,p.last,'555-01'+String(20+i),p.email??null,p.loc,p.role??'EMPLOYEE']);
   if(!p.noLogin)await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[p.id,hash]);
   const locs=p.id==='OWN-MIGU'?['loc-2']:['loc-1','loc-2'];
   for(const l of locs)await q('INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES($1,$2)',[p.id,l]);
   for(const pos of ['qa-pos','qa-pos2','own-counter','own-kitchen'])await q('INSERT INTO employee_positions(employee_id,position_id) VALUES($1,$2)',[p.id,pos]);
   await q('INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES($1,$2,80,$3)',[p.id,p.target,JSON.stringify(fictionalProfile())]);
   for(let d=0;d<7;d++){if(p.id==='OWN-VALE'&&d===0)continue;await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,$4,$5)",[`${p.id}-${d}`,p.id,d,p.id==='OWN-MIGU'?'12:00':'00:00','24:00']);}
  }
  return OWNER_PEOPLE.length;});
 await step('Elena Ruiz company-wide Manager access',async()=>{const r=await assignOwnedManagerCompanyAccess(ex,'OWN-ELENA');return typeof r==='object'?'assigned':String(r);});
}

/** Before the employee seed's shift changes: every week's shifts for the team, published once. */
export async function seedOwnerSchedules(ex:SqlExecutor,input:{actors:string[];today:string;week:string},log:Log){
 const q=function<T extends Record<string,unknown>=Record<string,unknown>>(text:string,values:unknown[]=[]){return ex.query<T>({text,values});};
 const {note,step}=stepper(log);
 const [,,ana]=input.actors,{today,week}=input;
 const lastWeek=addDays(week,-7),nextWeek=addDays(week,7);
 const t=Math.round((Date.parse(today)-Date.parse(week))/86400000);
 const localNow=new Date(Date.now()-4*3600000),nowMin=localNow.getUTCHours()*60+localNow.getUTCMinutes(),H=Math.floor(nowMin/30)*30;
 note(`clock: today ${today} (day ${t}), local ${hh(nowMin)}, H ${hh(H)}`);
 // ---------- Schedules: this week (today relative to now), last week, next week, both locations ----------
 type Shift={id:string;emp:string;loc:string;date:string;start:string;end:string;pos:string};
 const shifts:Shift[]=[];
 const todayOverride:Record<string,number|null>={'OWN-LUIS':H-120,'OWN-GABY':H-30,'OWN-SOFI':Math.max(300,H-510),'OWN-CARL':H-180,'OWN-DANI':H+60,'OWN-MIGU':H+120};
 const plan=(weekStart:string,tag:string,isThis:boolean)=>{for(const p of OWNER_PEOPLE)for(let d=0;d<7;d++){if(p.off.includes(d))continue;
  let start=mins(p.start);if(isThis&&d===t&&todayOverride[p.id]!=null)start=todayOverride[p.id]!;
  const end=Math.min(start+p.len*60,23*60+30);shifts.push({id:`own-${tag}-${p.id}-${d}`,emp:p.id,loc:p.loc,date:addDays(weekStart,d),start:hh(start),end:hh(end),pos:p.pos});}};
 plan(week,'this',true);plan(lastWeek,'last',false);plan(nextWeek,'next',false);
 // Ana worked last week too (the employee seed only gave last week to James and Maria).
 for(const d of [1,3,5])shifts.push({id:`own-last-ana-${d}`,emp:ana,loc:'loc-1',date:addDays(lastWeek,d),start:'12:00',end:'20:00',pos:'qa-pos'});
 const scheduleFor:Record<string,string>={[`${week}|loc-1`]:'scan-week',[`${lastWeek}|loc-1`]:'rich-last',[`${nextWeek}|loc-1`]:'rich-next'};
 await step('schedules (3 weeks × 2 locations)',async()=>{
  for(const [ws,tag] of [[week,'this'],[lastWeek,'last'],[nextWeek,'next']] as const){
   const key=`${ws}|loc-2`;await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-2',$2,'DRAFT','QAOWNER')",['own-'+tag+'-2',ws]);scheduleFor[key]='own-'+tag+'-2';
   await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING",[scheduleFor[`${ws}|loc-1`],ws]);
  }
  for(const s of shifts){const ws=s.date<week?lastWeek:s.date<nextWeek?week:nextWeek;
   await q('INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[s.id,scheduleFor[`${ws}|${s.loc}`],s.emp,s.date,s.start,s.end,s.pos]);}
  for(const ws of [lastWeek,week,nextWeek])for(const loc of ['loc-1','loc-2'])await publishScheduleWithRevision({locationId:loc,weekStart:ws,managerId:'QAOWNER'},ex);
  const [n]=await q<{n:number}>('SELECT count(*)::int AS n FROM shifts');return {ownerShifts:shifts.length,allShifts:n.n};});

}

/** After the employee seed: schedules for every week, attendance, timecards, requests, updates, notifications, payroll. */
export async function seedOwnerAfter(ex:SqlExecutor,input:{actors:string[];today:string;week:string},log:Log){
 const q=function<T extends Record<string,unknown>=Record<string,unknown>>(text:string,values:unknown[]=[]){return ex.query<T>({text,values});};
 const {note,step}=stepper(log);
 const [maria,james,ana]=input.actors,{today,week}=input;
 const lastWeek=addDays(week,-7),nextWeek=addDays(week,7),twoAgo=addDays(week,-14);
 const t=Math.round((Date.parse(today)-Date.parse(week))/86400000);
 const owner=await fixtureProof(ex,'QAOWNER');
 const localNow=new Date(Date.now()-4*3600000),nowMin=localNow.getUTCHours()*60+localNow.getUTCMinutes(),H=Math.floor(nowMin/30)*30;
 note(`clock: today ${today} (day ${t}), local ${hh(nowMin)}, H ${hh(H)}`);

 // ---------- Devices and the break type ----------
 const dev:Record<string,string>={};
 await step('devices',async()=>{const [d1]=await q<{id:string}>("SELECT id FROM clocker_devices WHERE location_id='loc-1' AND active LIMIT 1").catch(()=>[] as {id:string}[]);
  if(d1)dev['loc-1']=d1.id;else{await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('own-dev-1','loc-1','Front counter tablet')");dev['loc-1']='own-dev-1';}
  await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('own-dev-2','loc-2','Bakery back-office tablet')");dev['loc-2']='own-dev-2';return JSON.stringify(dev);});
 let breakType:{id:string;snapshot:string}|null=null;
 await step('break type',async()=>{const [b]=await q<{id:string;version:number;name:string;category:string;target_minutes:number}>('SELECT id,version,name,category,target_minutes FROM clocker_break_types ORDER BY created_at LIMIT 1');if(!b)throw Error('no break type');
  breakType={id:b.id,snapshot:JSON.stringify({id:b.id,version:b.version,name:b.name,category:b.category,targetMinutes:b.target_minutes})};return b.name;});

 // ---------- Time: last week and this week from the published shifts, two weeks ago (Mon–Fri) for payroll ----------
 const entries:Record<string,string>={};let made=0,rnd=7;
 const jitter=(span:number,base=0)=>{rnd=(rnd*1103515245+12345)%2147483648;return base+(rnd%span);};
 const closed=async(id:string,emp:string,loc:string,inAt:string,outAt:string,withBreak:boolean)=>{
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,$5,$6,'CLOCKED_OUT',$7)",[id,emp,loc,dev[loc],inAt,outAt,withBreak&&breakType?4:2]);
  if(withBreak&&breakType){const mid=Date.parse(inAt)+(Date.parse(outAt)-Date.parse(inAt))/2;await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot) VALUES($1,$2,$3,$4,2,$5,$6)',[id+'-break',id,new Date(mid-15*60000).toISOString(),new Date(mid+15*60000+jitter(4)*60000).toISOString(),breakType.id,breakType.snapshot]);}
  entries[id]=id;made++;};
 await step('time entries (past shifts)',async()=>{
  const past=await q<{id:string;emp:string;loc:string;date:string;s:string;e:string}>("SELECT sh.id,sh.employee_id AS emp,sc.location_id AS loc,sh.date::text AS date,to_char(sh.start_time,'HH24:MI') AS s,to_char(sh.end_time,'HH24:MI') AS e FROM shifts sh JOIN schedules sc ON sc.id=sh.schedule_id WHERE sh.date>=$1 AND sh.date<$2 AND sh.employee_id<>$3 AND sh.employee_id<>'QAOWNER' ORDER BY sh.date,sh.start_time",[lastWeek,today,james]);
  for(const s of past){
   const id='own-entry-'+s.id;
   if(s.emp==='OWN-MIGU'&&s.date===addDays(lastWeek,0))continue; // missed shift: no clock-in at all
   if(s.emp==='OWN-VALE'&&s.date===addDays(lastWeek,3)){ // forgot to clock out last Thursday
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,'CLOCKED_IN',1)",[id,s.emp,s.loc,dev[s.loc],new Date(Date.parse(at(s.date,s.s))-2*60000).toISOString()]);entries[id]=id;made++;continue;}
   if(s.emp==='OWN-DANI'&&s.date===addDays(today,-1)){ // yesterday: still clocked in (missing clock-out)
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,'CLOCKED_IN',1)",[id,s.emp,s.loc,dev[s.loc],new Date(Date.parse(at(s.date,s.s))+3*60000).toISOString()]);entries[id]=id;made++;continue;}
   const inAt=new Date(Date.parse(at(s.date,s.s))+jitter(9,-5)*60000).toISOString();
   let outAt=new Date(Date.parse(at(s.date,s.e))+jitter(9,0)*60000).toISOString();
   if(s.emp==='OWN-LUIS'&&s.date===addDays(week,3))outAt=new Date(Date.parse(at(s.date,s.e))+47*60000).toISOString(); // stayed late this Thursday
   if(s.emp==='OWN-GABY'&&s.date===addDays(lastWeek,1))outAt=new Date(Date.parse(at(s.date,s.e))+2*3600000).toISOString(); // a 10-hour day, no break
   const long=mins(s.e)-mins(s.s)>=360&&!(s.emp==='OWN-GABY'&&s.date===addDays(lastWeek,1));
   await closed(id,s.emp,s.loc,inAt,outAt,long);
  }
  // Two weeks ago (the payroll period that is ready): Mon–Fri for everyone, no published schedule.
  const everyone=[maria,james,ana,...OWNER_PEOPLE.map(p=>p.id)];
  for(const [i,emp] of everyone.entries())for(let d=0;d<5;d++){if((i+d)%4===3)continue;const p=OWNER_PEOPLE.find(x=>x.id===emp);const loc=p?.loc??'loc-1',start=p?.start??['07:00','09:00','12:00'][i]??'09:00',len=p?.len??8;
   const date=addDays(twoAgo,d),inAt=new Date(Date.parse(at(date,start))+jitter(7,-3)*60000).toISOString(),outAt=new Date(Date.parse(inAt)+(len*60+30+jitter(6))*60000).toISOString();
   await closed(`own-two-${emp}-${d}`,emp,loc,inAt,outAt,len>=6);}
  return made;});
 await step('today: on the clock, late, on break, done, not in yet',async()=>{
  const out:string[]=[];const now=Date.now();
  const todays=await q<{id:string;emp:string;loc:string;s:string;e:string}>("SELECT sh.id,sh.employee_id AS emp,sc.location_id AS loc,to_char(sh.start_time,'HH24:MI') AS s,to_char(sh.end_time,'HH24:MI') AS e FROM shifts sh JOIN schedules sc ON sc.id=sh.schedule_id WHERE sh.date=$1 ORDER BY sh.start_time",[today]);
  for(const s of todays){const id='own-today-'+s.emp,start=Date.parse(at(today,s.s)),end=Date.parse(at(today,s.e));
   if(s.emp===james||s.emp==='QAOWNER')continue; // James: the employee seed's open entry
   if(s.emp==='OWN-GABY'){out.push('Gabriela late (no clock-in, shift '+s.s+')');continue;}
   if(s.emp==='OWN-DANI'){out.push('Daniel still clocked in since yesterday; today '+s.s);continue;}
   if(start>now-5*60000){out.push(s.emp+' not started ('+s.s+')');continue;}
   if(end<now-10*60000){await closed(id,s.emp,s.loc,new Date(start-2*60000).toISOString(),new Date(end+4*60000).toISOString(),true);out.push(s.emp+' done');continue;}
   const late=s.emp==='OWN-CARL'?9:-3,inAt=new Date(start+late*60000).toISOString();
   if(s.emp===ana&&breakType){await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,'ON_BREAK',2)",[id,s.emp,s.loc,dev[s.loc],inAt]);
    await q('INSERT INTO break_entries(id,time_entry_id,break_start_at,version,break_type_id,break_type_snapshot) VALUES($1,$2,$3,1,$4,$5)',[id+'-break',id,new Date(now-12*60000).toISOString(),breakType.id,breakType.snapshot]);out.push('Ana on break');continue;}
   await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES($1,$2,$3,$4,$5,'CLOCKED_IN',1)",[id,s.emp,s.loc,dev[s.loc],inAt]);out.push(s.emp+(late>0?' clocked in 9 min late':' on the clock'));}
  return out.join('; ');});

 // ---------- Time corrections waiting on the manager ----------
 const correct=async(emp:string,command:Record<string,unknown>)=>{const proof=await fixtureProof(ex,emp);const r=await readEmployeeHours(proof,ex,'corrections','list');if(r.state!=='ready'||r.view!=='corrections'||r.data.snapshot.state!=='ready')throw Error('own corrections unavailable '+JSON.stringify(r).slice(0,200));
  const result=await submitEmployeeHoursCorrection(proof,{basis:r.data.basis,command:{operationId:randomUUID(),...command}},ex);if(result.status!=='recorded')throw Error('correction '+JSON.stringify(result).slice(0,300));return 'recorded';};
 const entryTimes=async(id:string)=>{const [e]=await q<{i:string;o:string}>('SELECT clock_in_at AS i,clock_out_at AS o FROM time_entries WHERE id=$1',[id]);if(!e)throw Error('no entry '+id);return {i:new Date(e.i).toISOString(),o:e.o?new Date(e.o).toISOString():null};};
 await step('correction waiting: Luis last Wednesday (left later)',async()=>{const id=`own-entry-own-last-OWN-LUIS-3`;const e=await entryTimes(id);return correct('OWN-LUIS',{kind:'ENTRY_BOUNDARY',timeEntryId:id,proposedStartAt:e.i,proposedEndAt:new Date(Date.parse(e.o!)+35*60000).toISOString(),reason:'Stayed to finish the closing inventory'});});
 await step('correction waiting: Sofía this Tuesday (started earlier)',async()=>{const id=`own-entry-own-this-OWN-SOFI-1`;const e=await entryTimes(id);return correct('OWN-SOFI',{kind:'ENTRY_BOUNDARY',timeEntryId:id,proposedStartAt:new Date(Date.parse(e.i)-20*60000).toISOString(),proposedEndAt:e.o,reason:'The tablet was updating when I arrived at 6:40'});});
 await step('correction waiting: Valeria last Monday (left early)',async()=>{const id=`own-entry-own-last-OWN-VALE-0`;const e=await entryTimes(id);return correct('OWN-VALE',{kind:'ENTRY_BOUNDARY',timeEntryId:id,proposedStartAt:e.i,proposedEndAt:new Date(Date.parse(e.o!)-40*60000).toISOString(),reason:'I left early for a doctor’s appointment; the tablet kept me clocked in'});});

 // ---------- Timecards: two weeks ago approved and finalized (payroll ready); last week partly approved ----------
 const approve=async(period:{startDate:string;endDate:string},who:string[]|null,finalize:boolean)=>{const cards=await readTimecards(owner,period,ex);if(cards.state!=='ready')throw Error('cards '+cards.state);const done:string[]=[];const skipped:string[]=[];
  for(const c of cards.cards){const id=c.card.employeeId;if(id==='QAOWNER'||(who&&!who.includes(id)))continue;
   if(c.card.issues.length){skipped.push(id+':'+c.card.issues.join('/'));continue;}
   try{let rev=c.revision;if(c.state!=='APPROVED'&&c.state!=='FINALIZED'){const r=await mutateTimecard(owner,{operationId:randomUUID(),employeeId:id,...period,expectedRevision:rev,expectedSourceHash:c.sourceHash,action:'APPROVE'},ex);if(r.status!=='approved')throw Error(r.status);rev++;}
    if(finalize&&c.state!=='FINALIZED'){const r=await mutateTimecard(owner,{operationId:randomUUID(),employeeId:id,...period,expectedRevision:rev,expectedSourceHash:c.sourceHash,action:'FINALIZE'},ex);if(r.status!=='finalized')throw Error(r.status);}
    done.push(id);}catch(e){skipped.push(id+':'+String((e as Error).message).slice(0,60));}}
  return {done:done.length,skipped};};
 await step('timecards two weeks ago approved + finalized',()=>approve({startDate:twoAgo,endDate:addDays(twoAgo,6)},null,true));
 await step('timecards last week partly approved',()=>approve({startDate:lastWeek,endDate:addDays(lastWeek,6)},[maria,ana,'OWN-SOFI','OWN-CARL','OWN-DANI'],false));

 // ---------- Time off: waiting, part-day waiting, approved, declined ----------
 const timeOff=async(emp:string,startDate:string,endDate:string,noteText:string,times:[string,string]|null=null)=>{const proof=await fixtureProof(ex,emp);const requestId=randomUUID();const r=await mutateEmployeePlanning(proof,{kind:'request',requestId,startDate,endDate,startTime:times?.[0]??null,endTime:times?.[1]??null,note:noteText},ex);if(r.state!=='complete')throw Error('time off '+JSON.stringify(r));return requestId;};
 await step('time off waiting: Gabriela',()=>timeOff('OWN-GABY',addDays(week,18),addDays(week,20),'Visiting family in Mayagüez'));
 await step('time off waiting: Carlos part-day',()=>timeOff('OWN-CARL',addDays(week,16),addDays(week,16),'Doctor appointment',['13:00','16:00']));
 await step('time off waiting: Luis',()=>timeOff('OWN-LUIS',addDays(week,29),addDays(week,31),'Brother’s graduation'));
 await step('time off approved: Sofía',async()=>{const id=await timeOff('OWN-SOFI',addDays(week,24),addDays(week,25),'Thanksgiving with family');return reviewTimeOffRequest({requestId:id,managerId:'QAOWNER',status:'APPROVED'},ex);});
 await step('time off declined: Daniel',async()=>{const id=await timeOff('OWN-DANI',addDays(week,12),addDays(week,12),'Concert');return reviewTimeOffRequest({requestId:id,managerId:'QAOWNER',status:'DENIED'},ex);});

 // ---------- Shift changes waiting on the manager, open cover, callouts ----------
 const change=async(who:string,command:Record<string,unknown>)=>{const r=await executeShiftChange(await fixtureProof(ex,who),{operationId:randomUUID(),...command} as Parameters<typeof executeShiftChange>[1],ex);if(!['pending','completed'].includes((r as {status:string}).status))throw Error(JSON.stringify(r).slice(0,300));return (r as {status:string}).status;};
 const exchangeOn=async(shiftId:string)=>{const [x]=await q<{id:string;rev:number;status:string}>("SELECT id,request_revision AS rev,status FROM shift_exchanges WHERE (source_shift_id=$1 OR target_shift_id=$1) AND status IN ('OPEN','EMPLOYEE_PENDING') ORDER BY created_at DESC LIMIT 1",[shiftId]);if(!x)throw Error('no open exchange on '+shiftId);return x;};
 const accept=async(who:string,shiftId:string)=>{const x=await exchangeOn(shiftId);return change(who,{kind:'ACCEPT',requestId:x.id,expectedRevision:x.rev});};
 const swap=async(who:string,sourceId:string,targetId:string)=>{const a=await reviewedFixtureSource(ex,sourceId),b=await reviewedFixtureSource(ex,targetId);return change(who,{kind:'PROPOSE_SWAP',...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint});};
 await step('swap waiting on manager: James accepts Ana Sat ↔ James Mon',()=>accept(james,'rich-n-a-sat'));
 await step('swap proposed: Luis Thu ↔ Gabriela Wed (next week)',()=>swap('OWN-LUIS','own-next-OWN-LUIS-3','own-next-OWN-GABY-2'));
 await step('swap waiting on manager: Gabriela accepts',()=>accept('OWN-GABY','own-next-OWN-LUIS-3'));
 await step('cover waiting on manager: Valeria takes Ana Tue',()=>accept('OWN-VALE','rich-n-a-tue'));
 await step('open shift: Sofía offers next Saturday',async()=>change('OWN-SOFI',{kind:'OFFER_COVERAGE',...await reviewedFixtureSource(ex,'own-next-OWN-SOFI-5')}));
 await step('callout waiting: Carlos next Tuesday',async()=>change('OWN-CARL',{kind:'SUBMIT_CALLOUT',...await reviewedFixtureSource(ex,'own-next-OWN-CARL-1'),reasonCode:'TRANSPORTATION',reasonNote:'Car is in the shop until Wednesday'}));
 await step('callout approved → open shift: Daniel next Thursday',async()=>{await change('OWN-DANI',{kind:'SUBMIT_CALLOUT',...await reviewedFixtureSource(ex,'own-next-OWN-DANI-3'),reasonCode:'FAMILY_EMERGENCY',reasonNote:'Need to drive my mother to an appointment'});
  const [c]=await q<{id:string;rev:number}>("SELECT id,request_revision AS rev FROM shift_callouts WHERE shift_id='own-next-OWN-DANI-3' ORDER BY created_at DESC LIMIT 1");return change('QAOWNER',{kind:'APPROVE_CALLOUT',requestId:c.id,expectedRevision:c.rev});});
 await step('exchange census',async()=>JSON.stringify({ex:await q("SELECT kind,status,count(*)::int AS n FROM shift_exchanges GROUP BY 1,2 ORDER BY 1,2"),callouts:await q("SELECT status,count(*)::int AS n FROM shift_callouts GROUP BY 1")}));

 // ---------- Availability submissions (after the shift changes: a submitted week is judged by its own windows) ----------
 await step('availability submissions (weekly windows copied from normal availability)',async()=>{
  const sub=async(ws:string,who:string[])=>{for(const id of who){await q('INSERT INTO weekly_availability_submissions(week_start,employee_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[ws,id]);
   await q("INSERT INTO weekly_availability_windows(id,week_start,employee_id,day_of_week,start_time,end_time) SELECT 'own-wk-'||$1||'-'||a.id,$1::date,a.employee_id,a.day_of_week,a.start_time,a.end_time FROM availability_windows a WHERE a.employee_id=$2 ON CONFLICT DO NOTHING",[ws,id]);}};
  const next=[james,ana,'OWN-LUIS','OWN-GABY','OWN-SOFI','OWN-CARL'];await sub(nextWeek,next);
  await sub(week,[james,ana,maria,'OWN-LUIS','OWN-GABY','OWN-VALE','OWN-SOFI','OWN-CARL','OWN-DANI']);return next.length+' of 11 for next week';});

 // ---------- Updates: acknowledgements on the must-read, one more for the bakery ----------
 await step('update: Bakery freezer repair (Condado)',async()=>{const draft={type:'LOCATION_ANNOUNCEMENT' as const,scope:{kind:'LOCATION' as const,locationId:'loc-2'},title:'Walk-in freezer repair on Tuesday',body:'A technician arrives Tuesday at 7:00 AM. Keep the walk-in closed until 9:00 AM and use the reach-in freezers.',acknowledgement:'OPTIONAL' as const,expiresAt:null};
  const audience=await previewCommunicationAudience(owner,draft,ex);if(audience.state!=='ready')throw Error('audience '+JSON.stringify(audience).slice(0,200));
  const result=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:audience.authority,draft,audienceFingerprint:audience.fingerprint},ex);if(result.status!=='committed')throw Error('publish '+JSON.stringify(result).slice(0,200));return audience.count;});
 await step('acknowledgements on the must-read (some, not all)',async()=>{const ids=await q<{id:string}>('SELECT id::text FROM communications ORDER BY created_at');const done:string[]=[];
  for(const emp of [ana,'OWN-LUIS','OWN-GABY']){const proof=await fixtureProof(ex,emp);
   for(const {id} of ids){const read=await readCommunication(proof,id,ex);if(read.state!=='ready'||read.acknowledgement!=='REQUIRED')continue;
    const r=await executeCommunicationCommand(proof,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:read.authority,communicationId:read.id,expectedRevisionId:read.revisionId,contentHash:read.contentHash},ex);done.push(emp+':'+(r as {status:string}).status);}}
  return done.join(',');});

 // ---------- Notifications for the Owner and Maria: due now, spread over today / yesterday / earlier ----------
 await step('owner/manager notifications spread',async()=>{const out:Record<string,unknown>={};
  for(const emp of ['QAOWNER',maria]){
   await q("UPDATE notifications SET due_at=created_at WHERE employee_id=$1 AND (due_at IS NULL OR due_at>clock_timestamp())",[emp]).catch(e=>note('due_at '+String(e)));
   const rows=await q<{id:string}>('SELECT id FROM notifications WHERE employee_id=$1 AND cancelled_at IS NULL ORDER BY created_at DESC,id DESC',[emp]);
   for(const [i,row] of rows.entries()){const bucket=i<Math.ceil(rows.length*0.4)?0:i<Math.ceil(rows.length*0.7)?1:2;const shift=bucket===0?`${i*9} minutes`:bucket===1?`1 day ${i%12} hours`:`${2+i%5} days ${i%12} hours`;
    await q(`UPDATE notifications SET created_at=created_at-interval '${shift}',due_at=least(due_at,created_at)-interval '${shift}' WHERE id=$1`,[row.id]);}
   out[emp]=await q("SELECT type,count(*)::int AS n FROM notifications WHERE employee_id=$1 AND cancelled_at IS NULL GROUP BY type ORDER BY type",[emp]);}
  return JSON.stringify(out);});

 // ---------- Owner's in-app list: the reminder collection turns the Owner's review seeds into "Operations need review"
 // groups (database rows only: runReminders never dispatches, deliveryEnabled stays false, no device is enrolled). ----------
 await step('owner in-app notifications (collection only, no delivery)',async()=>{
  const config={...await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},ex),featureEnabled:true,deliveryEnabled:false,testDeliveryEnabled:false,testAccountIds:[]};
  const report=await runReminders({executor:ex,state:sqlNotificationStateRepository(ex),config,clock:()=>new Date()} as never);
  await q("UPDATE notifications SET due_at=least(due_at,created_at) WHERE employee_id='QAOWNER' AND source_kind='MANAGER_SUMMARY'");
  const rows=await q<{id:string}>("SELECT id FROM notifications WHERE employee_id='QAOWNER' AND source_kind='MANAGER_SUMMARY' AND cancelled_at IS NULL ORDER BY created_at DESC,id DESC");
  const shifts=['3 minutes','40 minutes','5 hours','1 day 2 hours','2 days 4 hours','4 days 1 hour'];
  for(const [i,row] of rows.entries()){const shift=shifts[Math.min(i,shifts.length-1)];
   await q(`UPDATE notifications SET created_at=created_at-interval '${shift}',due_at=least(due_at,created_at)-interval '${shift}'${i>=Math.ceil(rows.length/2)?",read_at=created_at-interval '"+shift+"'+interval '30 minutes'":''} WHERE id=$1`,[row.id]);}
  return JSON.stringify({report,summaries:await q("SELECT id,urgency,cardinality(item_keys)::int AS items,(read_at IS NOT NULL) AS read,due_at::text,expires_at::text FROM notifications WHERE employee_id='QAOWNER' AND source_kind='MANAGER_SUMMARY' ORDER BY created_at DESC")});});

 const census=await q(`SELECT (SELECT count(*) FROM employees WHERE active)::int AS employees,(SELECT count(*) FROM shifts)::int AS shifts,(SELECT count(*) FROM time_entries)::int AS entries,
  (SELECT count(*) FROM time_entries WHERE clock_out_at IS NULL)::int AS open_entries,(SELECT count(*) FROM time_correction_requests)::int AS corrections,(SELECT count(*) FROM time_off_requests)::int AS timeoff,
  (SELECT count(*) FROM shift_exchanges)::int AS exchanges,(SELECT count(*) FROM shift_callouts)::int AS callouts,(SELECT count(*) FROM communications)::int AS updates,(SELECT count(*) FROM notifications)::int AS notifications,
  (SELECT count(*) FROM payroll_runs)::int AS payroll_runs,(SELECT count(*) FROM weekly_availability_submissions)::int AS availability_submissions`).catch(e=>[{error:String(e)}]);
 log.push({ownerCensus:census[0]});
}

/** Fictional team rows and totals for the employee seed's past approved runs (display only; nothing is paid). */
export function ownerPayExtra(ex:SqlExecutor){
 return async(period:{startDate:string;endDate:string},payday:string,correction:boolean)=>{
  const people=await ex.query<{id:string;name:string}>({text:"SELECT id,first_name||' '||last_name AS name FROM employees WHERE role<>'OWNER' AND active ORDER BY last_name,first_name",values:[]});
  const seed=Number(period.startDate.slice(8,10));
  const rows=people.map((p,i)=>{const gross=(28+((i*7+seed)%13))*(1500+((i*137)%700))+(correction&&i===0?4500:0);const fica=Math.round(gross*0.0765),tax=Math.round(gross*0.045);
   return {employeeId:p.id,employeeName:p.name,grossMinor:String(gross),netMinor:String(gross-fica-tax),employeeDeductions:[{code:'FICA',label:'Social Security and Medicare',amountMinor:String(fica)},{code:'PRTAX',label:'Income tax withholding',amountMinor:String(tax)}],employerContributions:[{code:'ER',label:'Employer taxes',amountMinor:String(fica)}]};});
  const sum=(f:(x:typeof rows[number])=>number)=>String(rows.reduce((a,x)=>a+f(x),0));
  return {rows,totals:{grossMinor:sum(x=>Number(x.grossMinor)),deductionsMinor:sum(x=>x.employeeDeductions.reduce((a,d)=>a+Number(d.amountMinor),0)),employerContributionsMinor:sum(x=>Number(x.employerContributions[0].amountMinor)),netMinor:sum(x=>Number(x.netMinor)),employeeCount:rows.length},
   sourceName:'Fictional accountant',sourceReference:'QA-'+payday,approvedBy:'QAOWNER',approvedAt:new Date(Date.parse(payday)-2*86400000).toISOString(),exceptions:[],coverage:{complete:true,locationIds:['loc-1','loc-2']}};};
}
