// UI audit fixture (tools/ui-audit), from tools/ui-scan: rich fictional records for one Employee (NEVORA_SCAN_RICH=1). Owned disposable database only.
// Every step reuses the app's own server functions or the integration fixtures' recipes; a step that fails is logged and skipped.
import {randomUUID,createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import type {SqlExecutor} from '../../../src/lib/notifications/types';
import {fixtureProof,reviewedFixtureSource} from '../../../src/test/integration/shift-change-api';
import {publishScheduleWithRevision,reviewTimeOffRequest} from '../../../src/test/integration/management-api';
import {registerClockerDevice,redeemClockerEnrollment} from '../../../src/lib/clocker/devices.server';
import {saveBreakType} from '../../../src/lib/clocker/break-types.server';
import {readEmployeeHours} from '../../../src/lib/data/employee-hours.server';
import {submitEmployeeHoursCorrection} from '../../../src/lib/data/employee-hours-write.server';
import {reviewTimeCorrection} from '../../../src/lib/time-corrections/service';
import {readTimecards,mutateTimecard} from '../../../src/lib/timecards/service';
import {mutateEmployeePlanning} from '../../../src/lib/data/employee-planning-write.server';
import {replaceAvailability} from '../../../src/lib/data/availability';
import {executeShiftChange} from '../../../src/lib/data/shift-changes';
import {newRun,saveSettings} from '../../../src/lib/payroll/service';
import {previewCommunicationAudience,executeCommunicationCommand} from '../../../src/lib/communications/service.server';
import {addDays} from '../../../src/lib/date-utils';
import {readEmployeeAttentionDetail,recordEmployeeAttentionReceipt} from '../../../src/lib/data/employee-attention-receipts.server';

type Log=unknown[];
const ZONE_OFFSET='-04:00'; // America/Puerto_Rico has no DST.
const at=(date:string,time:string)=>new Date(`${date}T${time}:00${ZONE_OFFSET}`).toISOString();

export async function seedEmployeeRich(ex:SqlExecutor,input:{actors:string[];actor:string;today:string;week:string;scenario:{sourceId:string;week:string};payWeeks?:number[];correctionWeek?:number;payAnchor?:string;payExtra?:(period:{startDate:string;endDate:string},payday:string,correction:boolean)=>Promise<Record<string,unknown>>},log:Log){
 const q=function<T extends Record<string,unknown>=Record<string,unknown>>(text:string,values:unknown[]=[]){return ex.query<T>({text,values});};
 const note=(m:string)=>log.push('rich: '+m);
 const step=async function<T>(name:string,fn:()=>Promise<T>):Promise<T|undefined>{try{const r=await fn();note(name+' ok'+(r!==undefined&&typeof r!=='object'?' '+String(r):''));return r;}catch(e){note(name+' FAILED '+String((e as Error)?.stack??e).slice(0,600));return undefined;}};
 const [maria,james,ana]=input.actors,{today,week}=input,actor=input.actor;
 const lastWeek=addDays(week,-7),nextWeek=addDays(week,7);
 let todayShift:{start:string;end:string}|null=null;
 const owner=await fixtureProof(ex,'QAOWNER');
 const ownerRef={employeeId:'QAOWNER',sessionTokenHash:owner.sessionTokenHash};
 let proof=await fixtureProof(ex,actor);

 // ---------- Schedules: James every day this week, a published last week and next week ----------
 await step('schedule this week (Tue/Fri added, republished)',async()=>{
  for(const d of [0,1,2,3,4,5,6]){const date=addDays(week,d);const [has]=await q<{n:number}>('SELECT count(*)::integer AS n FROM shifts WHERE schedule_id=$1 AND employee_id=$2 AND date=$3',['scan-week',actor,date]);if(!has.n)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'scan-week',$2,$3,'09:00','17:00','qa-pos')",['rich-this-'+d,actor,date]);}
  // Today's shift starts on the half hour about an hour before now (the open entry below clocks in on it).
  const local=new Date(Date.now()-4*3600000-60*60000),mins=Math.max(5*60,Math.floor((local.getUTCHours()*60+local.getUTCMinutes())/30)*30);
  // NEVORA_SCAN_NOWSHIFT=1: a fixed 12:00–23:30 shift today, so before and after scans show the same current shift.
  const late=process.env.NEVORA_SCAN_NOWSHIFT==='1';
  if(mins<=15*60||late){const hh=(m:number)=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');todayShift=late?{start:'12:00',end:'23:30'}:{start:hh(mins),end:hh(mins+8*60)};
   await q("UPDATE shifts SET start_time=$3,end_time=$4 WHERE schedule_id='scan-week' AND employee_id=$1 AND date=$2",[actor,today,todayShift.start,todayShift.end]);}
  // Lead scans (NEVORA_SCAN_EMPROLE=LEAD): the actor leads today's and the rest of this week's shifts.
  if(process.env.NEVORA_SCAN_EMPROLE==='LEAD')await q("UPDATE shifts SET is_designated_lead=true WHERE schedule_id='scan-week' AND employee_id=$1 AND date>=$2",[actor,today]);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},ex);
  return todayShift?todayShift.start+'-'+todayShift.end:'today unchanged';
 });
 await step('schedule last week',async()=>{
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('rich-last','loc-1',$1,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING",[lastWeek]);
  for(let d=0;d<5;d++)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'rich-last',$2,$3,'09:00','17:00','qa-pos')",['rich-last-'+d,actor,addDays(lastWeek,d)]);
  for(let d=0;d<6;d+=2)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'rich-last',$2,$3,'07:00','15:00','qa-pos')",['rich-last-m'+d,maria,addDays(lastWeek,d)]);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:lastWeek,managerId:'QAOWNER'},ex);
 });
 const next:[string,string,number,string,string][]=[
  ['rich-n-j-mon',james,0,'09:00','17:00'],['rich-n-j-wed',james,2,'09:00','17:00'],['rich-n-j-thu',james,3,'09:00','17:00'],['rich-n-j-fri',james,4,'09:00','17:00'],
  ['rich-n-m-mon',maria,0,'07:00','15:00'],['rich-n-m-tue',maria,1,'13:00','19:00'],['rich-n-m-thu',maria,3,'07:00','15:00'],['rich-n-m-sat',maria,5,'08:00','14:00'],
  ['rich-n-a-tue',ana,1,'12:00','20:00'],['rich-n-a-wed',ana,2,'12:00','20:00'],['rich-n-a-fri',ana,4,'12:00','20:00'],['rich-n-a-sat',ana,5,'12:00','20:00'],
 ];
 await step('schedule next week',async()=>{
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('rich-next','loc-1',$1,'DRAFT','QAOWNER') ON CONFLICT DO NOTHING",[nextWeek]);
  for(const [id,emp,d,s,e] of next)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES($1,'rich-next',$2,$3,$4,$5,'qa-pos')",[id,emp,addDays(nextWeek,d),s,e]);
  if(process.env.NEVORA_SCAN_EMPROLE==='LEAD')await q("UPDATE shifts SET is_designated_lead=true WHERE id='rich-n-j-mon'");
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:nextWeek,managerId:'QAOWNER'},ex);
 });

 // ---------- Availability: Sunday not available, Tuesday afternoons only ----------
 await step('availability',async()=>{
  const windows=[1,3,4,5,6].map(dayOfWeek=>({dayOfWeek,startTime:'07:00',endTime:'21:00'}));windows.push({dayOfWeek:2,startTime:'12:00',endTime:'20:00'});
  await replaceAvailability(actor,windows.sort((a,b)=>a.dayOfWeek-b.dayOfWeek),proof,ex);
 });

 // ---------- Time: entries Mon..today this week and Mon..Fri last week (8h, a 30-minute meal break) ----------
 const entries:Record<string,string>={};
 await step('time entries',async()=>{
  const pending=await registerClockerDevice(ownerRef,{name:'Front counter tablet',locationId:'loc-1'},ex);
  const device=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},ex);
  const type=await saveBreakType(ownerRef,{name:'Meal break',category:'MEAL',targetMinutes:30,active:true,expectedVersion:0},ex);
  const snapshot=JSON.stringify({id:type.id,version:type.version,name:type.name,category:type.category,targetMinutes:type.targetMinutes});
  const days=[...[0,1,2,3,4].map(d=>addDays(lastWeek,d))];for(let d=0;addDays(week,d)<=today;d++)days.push(addDays(week,d));
  const now=Date.now();let n=0;
  for(const date of days){
   const id='rich-entry-'+date,inAt=at(date,date===today?(todayShift?.start??'09:00'):['08:58','09:02','08:55','09:00','09:04'][n%5]);n++;
   if(date===today){
    // Today: still on the clock (clocked in an hour before now at the latest), no break yet.
    if(Date.parse(inAt)>now-5*60000){note('today: shift has not started, no open entry');continue;}
    const start=new Date(Date.parse(inAt)+2*60000).toISOString();
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES($1,$2,'loc-1',$3,$4,'CLOCKED_IN')",[id,actor,device.device.id,start]);entries[date]=id;continue;
   }
   const outAt=new Date(Date.parse(inAt)+8.5*3600000).toISOString(),bStart=at(date,'13:00'),bEnd=at(date,'13:30');
   await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,'loc-1',$3,$4,$5,'CLOCKED_OUT',4)",[id,actor,device.device.id,inAt,outAt]);
   await q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot) VALUES($1,$2,$3,$4,2,$5,$6)",[id+'-break',id,bStart,bEnd,type.id,snapshot]);
   entries[date]=id;
  }
  return Object.keys(entries).length;
 });

 // ---------- Corrections: one approved and one rejected (last week), one waiting (this week) ----------
 const basis=async()=>{const r=await readEmployeeHours(proof,ex,'corrections','list');if(r.state!=='ready'||r.view!=='corrections'||r.data.snapshot.state!=='ready')throw Error('own corrections unavailable '+JSON.stringify(r).slice(0,200));return r.data.basis;};
 const correct=async(command:Record<string,unknown>)=>{const result=await submitEmployeeHoursCorrection(proof,{basis:await basis(),command:{operationId:randomUUID(),...command}},ex);if(result.status!=='recorded')throw Error('correction '+JSON.stringify(result));const [row]=await q<{id:string}>('SELECT id FROM time_correction_requests WHERE employee_id=$1 ORDER BY created_at DESC LIMIT 1',[actor]);return row.id;};
 const decide=async(id:string,decision:'APPROVE'|'REJECT',why:string)=>{const [r]=await q<{revision:number}>('SELECT max(revision)::integer AS revision FROM time_correction_events WHERE request_id=$1',[id]);const out=await reviewTimeCorrection(owner,{operationId:randomUUID(),requestId:id,expectedRevision:r.revision,decision,note:why},ex);return out.status;};
 await step('correction approved',async()=>{const date=addDays(lastWeek,2),id=entries[date];const [e]=await q<{i:string;o:string}>('SELECT clock_in_at AS i,clock_out_at AS o FROM time_entries WHERE id=$1',[id]);
  const rid=await correct({kind:'ENTRY_BOUNDARY',timeEntryId:id,proposedStartAt:new Date(e.i).toISOString(),proposedEndAt:new Date(Date.parse(new Date(e.o).toISOString())+30*60000).toISOString(),reason:'Stayed 30 minutes to close the register'});return decide(rid,'APPROVE','Confirmed with the closing notes');});
 await step('correction rejected',async()=>{const date=addDays(lastWeek,0),id=entries[date];
  const rid=await correct({kind:'BREAK_BOUNDARY',timeEntryId:id,breakEntryId:id+'-break',proposedStartAt:at(date,'13:00'),proposedEndAt:at(date,'13:15'),reason:'My meal break was only 15 minutes'});return decide(rid,'REJECT','The tablet shows the full 30 minutes');});
 await step('correction waiting',async()=>{const date=addDays(week,1),id=entries[date];if(!id)throw Error('no entry this Tuesday');const [e]=await q<{i:string;o:string}>('SELECT clock_in_at AS i,clock_out_at AS o FROM time_entries WHERE id=$1',[id]);
  return correct({kind:'ENTRY_BOUNDARY',timeEntryId:id,proposedStartAt:new Date(Date.parse(new Date(e.i).toISOString())-20*60000).toISOString(),proposedEndAt:new Date(e.o).toISOString(),reason:'I started at 8:40 but the tablet was restarting'});});
 await step('last week timecard approved',async()=>{const period={startDate:lastWeek,endDate:addDays(lastWeek,6)};const cards=await readTimecards(owner,period,ex);if(cards.state!=='ready')throw Error('cards '+cards.state);
  const card=cards.cards.find(c=>c.card.employeeId===actor);if(!card)throw Error('no card for actor');const r=await mutateTimecard(owner,{operationId:randomUUID(),employeeId:actor,...period,expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action:'APPROVE'},ex);return r.status;});

 // ---------- Requests: time off waiting, part-day waiting, approved, declined, withdrawn ----------
 const timeOff=async(startDate:string,endDate:string,noteText:string,times:[string,string]|null=null)=>{const requestId=randomUUID();const r=await mutateEmployeePlanning(proof,{kind:'request',requestId,startDate,endDate,startTime:times?.[0]??null,endTime:times?.[1]??null,note:noteText},ex);if(r.state!=='complete')throw Error('time off '+JSON.stringify(r));return requestId;};
 await step('time off approved',async()=>{const id=await timeOff(addDays(week,24),addDays(week,25),'Cousin’s wedding in Ponce');return reviewTimeOffRequest({requestId:id,managerId:'QAOWNER',status:'APPROVED'},ex);});
 await step('time off declined',async()=>{const id=await timeOff(addDays(week,19),addDays(week,19),'Concert in San Juan');return reviewTimeOffRequest({requestId:id,managerId:'QAOWNER',status:'DENIED'},ex);});
 await step('time off withdrawn',async()=>{const id=await timeOff(addDays(week,18),addDays(week,18),'Moving apartments');const r=await mutateEmployeePlanning(proof,{kind:'withdraw',requestId:id,confirmed:true},ex);return r.state;});
 await step('time off waiting',()=>timeOff(addDays(week,21),addDays(week,23),'Family trip'));
 await step('time off waiting part-day',()=>timeOff(addDays(week,17),addDays(week,17),'Dentist appointment',['09:00','12:00']));

 // ---------- Shift changes: open coverage (eligible and refused), James's swap, an incoming swap, a callout ----------
 const change=async(who:string,command:Record<string,unknown>)=>{const r=await executeShiftChange(await fixtureProof(ex,who),{operationId:randomUUID(),...command} as Parameters<typeof executeShiftChange>[1],ex);if(!['pending','completed'].includes((r as {status:string}).status))throw Error(JSON.stringify(r).slice(0,300));return (r as {status:string}).status;};
 const offer=async(who:string,shiftId:string)=>change(who,{kind:'OFFER_COVERAGE',...await reviewedFixtureSource(ex,shiftId)});
 const swap=async(who:string,sourceId:string,targetId:string)=>{const a=await reviewedFixtureSource(ex,sourceId),b=await reviewedFixtureSource(ex,targetId);return change(who,{kind:'PROPOSE_SWAP',...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint});};
 await step('open shift Ana Tue next week (eligible)',()=>offer(ana,'rich-n-a-tue'));
 await step('open shift Maria Tue next week (eligible)',()=>offer(maria,'rich-n-m-tue'));
 await step('open shift Maria Sun this week (refused: overlaps)',async()=>{const [s]=await q<{id:string}>("SELECT id FROM shifts WHERE schedule_id='scan-week' AND employee_id=$1 AND date=$2",[maria,addDays(week,6)]);if(!s)throw Error('no Maria Sunday shift');return offer(maria,s.id);});
 await step('open shift Maria in two weeks (refused: availability)',()=>offer(maria,input.scenario.sourceId));
 await step('swap James Wed ↔ Maria Sat (James asks)',()=>swap(james,'rich-n-j-wed','rich-n-m-sat'));
 await step('swap Ana Sat ↔ James Mon (incoming)',()=>swap(ana,'rich-n-a-sat','rich-n-j-mon'));
 await step('callout James Fri next week',async()=>change(james,{kind:'SUBMIT_CALLOUT',...await reviewedFixtureSource(ex,'rich-n-j-fri'),reasonCode:'ILLNESS',reasonNote:'Fever since last night'}));
 const open=await q<{n:number}>("SELECT count(*)::integer AS n FROM shift_exchanges WHERE status='OPEN'").catch(()=>[{n:-1}]);note('open exchanges '+open[0].n);

 // ---------- Pay: weekly schedule and published statements (the pay journey's recipe: the worker's publication rows) ----------
 await step('pay settings',async()=>saveSettings(owner,{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:0,effectiveFrom:'2026-01-01',reason:'Fictional pay schedule',
  preferences:{companyName:'Northside QA Workforce',language:'en',currency:'USD',schedule:{frequency:'WEEKLY',anchorDate:input.payAnchor??'2026-09-21',paydayOffsetDays:5},rules:[],automation:{prepare:false,publish:false,reminders:false,reminderLeadDays:[1]},bankProfile:'NEUTRAL_UNVERIFIED'}} as Parameters<typeof saveSettings>[1],ex).then(r=>(r as {revision?:number}).revision));
 await step('pay statements',async()=>{
  type Period={startDate:string;endDate:string};
  const run=async(period:Period,payday:string,correctionOf:string|null=null)=>{const id=randomUUID();
   await q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES('workspace-fuel',$1,$2,$3,$4)",[id,period.startDate,period.endDate,correctionOf]);
   await q("INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES('workspace-fuel',$1,1,$2::jsonb)",[id,JSON.stringify({...newRun(id,period,payday,correctionOf),status:'APPROVED',...(input.payExtra?await input.payExtra(period,payday,!!correctionOf):{})})]);
   await q("INSERT INTO payroll_publications(workspace_id,run_id) VALUES('workspace-fuel',$1)",[id]);return {id,period,payday};};
  const statement=async(r:{id:string;period:Period;payday:string},label:string)=>{const doc=await PDFDocument.create();doc.addPage().drawText('Fictional pay statement '+label+' · James Ortiz');const bytes=Buffer.from(await doc.save());
   await q("INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES('workspace-fuel',$1,$2,$3,'EMPLOYEE_STATEMENT',$4,$5,$6,$7::jsonb)",[randomUUID(),r.id,actor,`statement-${label}.pdf`,createHash('sha256').update(bytes).digest('hex'),bytes,JSON.stringify({period:r.period,payday:r.payday,coverage:{complete:true,locationIds:['loc-1']}})]);};
  let made=0;
  for(const back of input.payWeeks??[3,2,1]){const start=addDays(week,-7*back),period={startDate:start,endDate:addDays(start,6)},payday=addDays(start,11);const r=await run(period,payday);await statement(r,payday);made++;
   if(back===(input.correctionWeek??2)){const fixed=await run(period,payday,r.id);await statement(fixed,payday+'-corrected');made++;}}
  return made;
 });

 // ---------- Updates: an older optional one, then a must-read to confirm ----------
 const commIds:string[]=[];
 for(const [title,body,ack] of [['Holiday hours for Thanksgiving week','We close at 3:00 PM on Wednesday, Nov 25, and stay closed on Thursday, Nov 26.\nEnjoy the time with your family.','OPTIONAL'],['New closing checklist','Starting Monday, every closing shift completes the new checklist on the back-office tablet.\nRead it before your next close and confirm below.','REQUIRED']] as const){
  await step('update '+title,async()=>{const draft={type:'LOCATION_ANNOUNCEMENT' as const,scope:{kind:'LOCATION' as const,locationId:'loc-1'},title,body,acknowledgement:ack,expiresAt:null};
   const audience=await previewCommunicationAudience(owner,draft,ex);if(audience.state!=='ready')throw Error('audience '+JSON.stringify(audience));
   const result=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:audience.authority,draft,audienceFingerprint:audience.fingerprint},ex);if(result.status!=='committed')throw Error('publish '+JSON.stringify(result));commIds.push((result as {id:string}).id);return audience.count;});
 }

 // ---------- Notifications: due now, spread over today / yesterday / earlier, older ones read ----------
 await step('notifications spread',async()=>{
  await q("UPDATE notifications SET due_at=created_at WHERE employee_id=$1 AND (due_at IS NULL OR due_at>clock_timestamp())",[actor]).catch(e=>note('due_at '+String(e)));
  const rows=await q<{id:string;type:string}>('SELECT id,type FROM notifications WHERE employee_id=$1 AND cancelled_at IS NULL ORDER BY created_at DESC,id DESC',[actor]);
  const required=commIds[1];
  for(const [i,row] of rows.entries()){
   const bucket=i<Math.ceil(rows.length*0.35)?0:i<Math.ceil(rows.length*0.65)?1:2;
   const shift=bucket===0?`${i*7} minutes`:bucket===1?`1 day ${i} hours`:`${2+i%5} days ${i} hours`;
   await q(`UPDATE notifications SET created_at=created_at-interval '${shift}',due_at=least(due_at,created_at)-interval '${shift}'${bucket===2?',read_at=created_at-interval \''+shift+'\'+interval \'2 hours\'':''} WHERE id=$1`,[row.id]);
  }
  void required;
  // The list's read state is the own attention receipt: mark the older informational ones read the app's way.
  const older=await q<{source_kind:string;source_id:string;source_version:string;type:string}>("SELECT source_kind,source_id,source_version,type FROM notifications WHERE employee_id=$1 AND cancelled_at IS NULL AND created_at<clock_timestamp()-interval '20 hours' AND source_kind<>'COMMUNICATION'",[actor]);
  const marks:string[]=[];
  for(const n of older){try{const ref={kind:n.source_kind,id:n.source_id,version:n.source_version??''} as Parameters<typeof readEmployeeAttentionDetail>[1];const d=await readEmployeeAttentionDetail(proof,ref,ex);
   if(d.state!=='ready'||!d.intent){marks.push(n.type+':'+(d.state==='ready'?(d.read?'already read':'no intent (required action)'):'unavailable'));continue;}
   const r=await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:d.ref,...d.intent},ex);marks.push(n.type+':'+r.status);}catch(e){marks.push(n.type+':error '+String(e).slice(0,80));}}
  note('mark read '+JSON.stringify(marks));
  const kinds=await q<{type:string;n:number;unread:number}>('SELECT type,count(*)::integer AS n,count(*) FILTER (WHERE read_at IS NULL)::integer AS unread FROM notifications WHERE employee_id=$1 AND cancelled_at IS NULL GROUP BY type ORDER BY type',[actor]);
  return JSON.stringify(kinds);
 });
 // A quick census of what the employee now has, for the report.
 const census=await q(`SELECT (SELECT count(*) FROM time_entries WHERE employee_id=$1)::int AS entries,(SELECT count(*) FROM time_correction_requests WHERE employee_id=$1)::int AS corrections,
  (SELECT count(*) FROM time_off_requests WHERE employee_id=$1)::int AS timeoff,(SELECT count(*) FROM shift_exchanges)::int AS exchanges,(SELECT count(*) FROM shift_callouts WHERE employee_id=$1)::int AS callouts,
  (SELECT count(*) FROM payroll_documents WHERE employee_id=$1)::int AS statements,(SELECT count(*) FROM notifications WHERE employee_id=$1)::int AS notifications`,[actor]).catch(e=>[{error:String(e)}]);
 log.push({richCensus:census[0]});
 proof=await fixtureProof(ex,actor);void proof;
}
