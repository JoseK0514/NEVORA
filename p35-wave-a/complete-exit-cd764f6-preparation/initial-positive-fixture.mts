// PREPARED ONLY. Invoked by the private initializer before the first Next spawn.
// Every library import targets the frozen Wave A review; no inspected DB is reused.
import assert from 'node:assert/strict';
import {randomUUID,randomInt,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {seedOwnedScenario} from '/workspace/exit-wave-a-cd764f6/src/test/integration/owned-app-fixture.ts';
import {fictionalProfile} from '/workspace/exit-wave-a-cd764f6/src/test/fixtures/shift-changes.ts';
import {fixtureProof} from '/workspace/exit-wave-a-cd764f6/src/test/integration/shift-change-api.ts';
import {publishScheduleWithRevision} from '/workspace/exit-wave-a-cd764f6/src/test/integration/management-api.ts';
import {readShiftChangeTerms} from '/workspace/exit-wave-a-cd764f6/src/lib/data/shift-change-snapshot.ts';
import {executeShiftChange,readShiftChangeAvailability} from '/workspace/exit-wave-a-cd764f6/src/lib/data/shift-changes.ts';
import {executeScheduleCopy,readScheduleCopyReceipt,readScheduleCopyCommand} from '/workspace/exit-wave-a-cd764f6/src/lib/data/schedule-copy.ts';
import {readGenerationSource} from '/workspace/exit-wave-a-cd764f6/src/lib/data/generation-guards.ts';
import {readOperationalRuleProfileView} from '/workspace/exit-wave-a-cd764f6/src/lib/data/shift-change-views.ts';
import {readCoverageRepair,readCoverageRepairSelection} from '/workspace/exit-wave-a-cd764f6/src/lib/data/coverage-repair.server.ts';
import {coverageRepairUrl} from '/workspace/exit-wave-a-cd764f6/src/lib/scheduling/coverage-repair.ts';
import {stableExportJson} from '/workspace/exit-wave-a-cd764f6/src/lib/payroll-export/json.ts';
import {addDays} from '/workspace/exit-wave-a-cd764f6/src/lib/date-utils.ts';
import {setEmployeeClockerPin,readEmployeeClockerPin} from '/workspace/exit-wave-a-cd764f6/src/lib/clocker/pins.server.ts';
import type {SqlExecutor} from '/workspace/exit-wave-a-cd764f6/src/lib/notifications/types.ts';
import type {ShiftChangeCommand,SessionMutationProof} from '/workspace/exit-wave-a-cd764f6/src/lib/shift-changes/types.ts';
const SHA='cd764f614be8ca5b5215be19d46e07cf968638d7';
type Owned={database:{executor:SqlExecutor};identity:{name:string;oid:number;marker:string};root:string;source:string;clockerPinKey?:string};
const digest=(v:unknown)=>createHash('sha256').update(stableExportJson(v)).digest('hex');

export async function prepareWaveAPositive(owned:Owned,evidence:string){
 assert.equal(process.env.WA_BROWSER_RELEASED,'yes','Root resource release required for initial fixture writes');
 assert.equal(process.env.WA_BROWSER_RELEASE_SHA,SHA,'Exact review release required');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:owned.source,encoding:'utf8'}).trim(),SHA);
 assert.match(owned.identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);
 const ex=owned.database.executor,q=(text:string,values:readonly unknown[]=[])=>ex.query<any>({text,values});
 const [identity]=await q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
 assert.deepEqual(identity,owned.identity,'Positive fixtures require exact owned identity');
 // Base + payroll + seed-extra must be part of the SAME initial callback.
 const [nextRow]=await q("SELECT week_start::text AS week FROM schedules WHERE id='audit-next'");assert.ok(nextRow);
 const next=nextRow.week as string;
 await writeFile(join(owned.root,'wave-a-positive-initialization.started'),randomUUID(),{flag:'wx'});
 const actors=new Map<string,SessionMutationProof>();
 const proof=async(id:string)=>{if(!actors.has(id))actors.set(id,await fixtureProof(ex,id));return actors.get(id)!;};
 const profile=JSON.stringify(fictionalProfile());
 assert.match(owned.clockerPinKey??'',/^[a-f0-9]{64}$/,'Private beforeListen context must forward its existing in-memory PIN key');
 async function reviewed(id:string,week:string){
  await q('INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) VALUES($1,80,$2::jsonb) ON CONFLICT(employee_id) DO UPDATE SET maximum_weekly_hours=80,operational_rule_profile=excluded.operational_rule_profile',[id,profile]);
  for(let d=0;d<7;d++)await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,'06:00','22:00') ON CONFLICT(id) DO NOTHING",['wa-positive-av-'+id+'-'+d,id,d]);
  await q('INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES($1,$2,true) ON CONFLICT DO NOTHING',[id,week]);
 }
 // Lead's source is a designated-Lead shift: the receiving peer is a Lead too.
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('WA-LEAD-PEER','Fictional','Lead Peer','555-0199','LEAD','loc-1')");
 await q("INSERT INTO employee_location_eligibility VALUES('WA-LEAD-PEER','loc-1'),('WA-LEAD-PEER','loc-2')");
 await q("INSERT INTO employee_positions VALUES('WA-LEAD-PEER','qa-pos')");
 for(const id of ['AUDIT-LEAD','WA-LEAD-PEER','AUDIT-LONG'])await reviewed(id,next);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES('wa-lead-peer-5','audit-next','WA-LEAD-PEER',$1,'08:00','16:00','qa-pos',false)",[addDays(next,5)]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:next,managerId:'QAOWNER'},ex);
 const owner=await proof('QAOWNER');
 // Existing configured target is separate from canonical AUDIT-E Save PIN view.
 // Digits remain in memory only; the original runtime key is never serialized.
 await setEmployeeClockerPin({employeeId:owner.employee.id,sessionTokenHash:owner.sessionTokenHash},{employeeId:'AUDIT-LONG',pin:String(randomInt(1000,10000)),expectedVersion:0},Buffer.from(owned.clockerPinKey!,'hex'),ex);
 const offerSources:Record<string,string>={};
 for(const [i,actor]of ['AUDIT-E','AUDIT-LEAD'].entries()){
  const week=addDays(next,(60+i)*7),schedule='wa-offer-'+i,shift=schedule+'-source';offerSources[actor]=shift;
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER')",[schedule,week]);
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,'08:00','16:00','qa-pos',$5)",[shift,schedule,actor,week,actor==='AUDIT-LEAD']);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},ex);
 }
 // A bounded, real uncovered window with an Employee available for its whole span.
 const updated=await q("UPDATE location_coverage_windows SET start_time='08:00',end_time='16:00' WHERE id='qa-loc-2-0' RETURNING id");assert.equal(updated.length,1);
 const [{shift_change_policy:originalPolicy}]=await q('SELECT shift_change_policy FROM workspaces WHERE singleton=true');
 const manual={revision:1,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};
 await q('UPDATE workspaces SET shift_change_policy=$1::jsonb',[JSON.stringify({version:1,revision:1,swap:manual,coverage:manual})]);
 const requests:Record<string,{id:string;revision:number;kind:string}>=Object.create(null);
 const terms=async(actor:string,sourceId:string,targetId?:string)=>{const value=await readShiftChangeTerms(await proof(actor),sourceId,targetId,ex);assert.ok(value,'Coherent published terms required');return value;};
 const sourceFields=(t:NonNullable<Awaited<ReturnType<typeof readShiftChangeTerms>>>)=>({sourceShiftId:t.source.shiftId,sourceEpisodeId:t.source.assignmentEpisodeId,sourceTermsFingerprint:t.sourceTermsFingerprint});
 const run=async(actor:string,command:ShiftChangeCommand)=>{const value=await executeShiftChange(await proof(actor),command,ex);assert.ok(['pending','completed','closed'].includes(value.status),'Fixture transition failed: '+JSON.stringify(value));if(!('requestId' in value))throw Error('No fixture request');return value;};
 try{
  for(const [label,kind,offset]of [['WASWAP','swap',4],['WAPICKUP','coverage',5],['WACALLOUT','callout',6],['WAOPEN','open',7],['WAACTIVITY','activity',8]] as const){
   const s=await seedOwnedScenario(ex,label,offset),t=await terms(s.actors[0],s.sourceId,kind==='swap'?s.targetId:undefined);
   if(kind==='callout'){
    const r=await run(s.actors[0],{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...sourceFields(t),reasonCode:'OTHER',reasonNote:'Fictional appointment requiring review.'});requests[kind]={id:r.requestId,revision:r.revision,kind:'APPROVE_CALLOUT'};
   }else{
    const proposed=kind==='swap'?await run(s.actors[0],{kind:'PROPOSE_SWAP',operationId:randomUUID(),...sourceFields(t),targetShiftId:t.target!.shiftId,targetEpisodeId:t.target!.assignmentEpisodeId,targetTermsFingerprint:t.targetTermsFingerprint!}):await run(s.actors[0],{kind:'OFFER_COVERAGE',operationId:randomUUID(),...sourceFields(t)});
    if(kind==='swap'||kind==='coverage'){
     const accepted=await run(s.actors[kind==='swap'?1:2],{kind:'ACCEPT',operationId:randomUUID(),requestId:proposed.requestId,expectedRevision:proposed.revision});assert.equal(accepted.status,'pending');requests[kind]={id:accepted.requestId,revision:accepted.revision,kind:'MANAGER_APPROVE'};
    }else if(kind==='activity')await run('QAOWNER',{kind:'MANAGER_DECLINE',operationId:randomUUID(),requestId:proposed.requestId,expectedRevision:proposed.revision});
    else requests.open={id:proposed.requestId,revision:proposed.revision,kind:'MANAGER_CLOSE'};
   }
  }
 }finally{await q('UPDATE workspaces SET shift_change_policy=$1::jsonb',[JSON.stringify(originalPolicy)]);}
 // Actual copy executor and immutable receipts in unused weeks. One null assignee
 // provides a deterministic described SKIPPED row without altering any real actor.
 const copyPerson='QA-WASWAP-C',templates:Record<string,string>={};
 for(const type of ['full','partial']){
  const id='wa-copy-'+type;templates[type]=id;
  await q('INSERT INTO schedule_templates(id,name,created_by,workspace_id) VALUES($1,$2,\'QAOWNER\',\'workspace-fuel\')',[id,'Fictional Wave A '+type+' receipt']);
  await q("INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,is_designated_lead,position_id,workspace_id) VALUES($1,$2,'loc-1',0,'08:00','12:00',$3,false,'qa-pos','workspace-fuel')",[id+'-named',id,copyPerson]);
  if(type==='partial')await q("INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id,is_designated_lead,position_id,workspace_id) VALUES($1,$2,'loc-1',1,'10:00','14:00',NULL,false,'qa-pos','workspace-fuel')",[id+'-unassigned',id]);
 }
 const copy:Record<string,Record<string,string>>={};let offset=100;
 for(const actor of ['QAOWNER','AUDIT-M']){
  copy[actor]={};
  for(const type of ['full','partial','unavailable']){
   const operationId=randomUUID(),weekStart=addDays(next,offset*7);offset++;
   const receipt=await executeScheduleCopy(await proof(actor),{operationId,weekStart,kind:'TEMPLATE',templateId:type==='unavailable'?'wa-missing-template':templates[type]},ex);
   if(type==='unavailable')assert.equal(receipt.reason,'TEMPLATE_UNAVAILABLE');
   else{assert.ok(receipt.rows.some(r=>r.status==='COMMITTED'),'Positive copy requires a committed row');assert.equal(receipt.rows.some(r=>r.status==='SKIPPED'),type==='partial');assert.ok(receipt.rows.every(r=>r.date&&r.startTime&&r.endTime&&r.locationName),'Described copy rows required');}
   copy[actor][type]=operationId;
  }
  const operationId=randomUUID(),command={operationId,weekStart:addDays(next,offset++*7),kind:'TEMPLATE' as const,templateId:templates.full};
  await q('INSERT INTO schedule_copy_operations(workspace_id,actor_employee_id,operation_id,command_hash,command,source) VALUES(\'workspace-fuel\',$1,$2::uuid,$3,$4::jsonb,$5::jsonb)',[actor,operationId,digest(command),JSON.stringify(command),JSON.stringify({version:{parent:null,children:[]},rows:[]})]);
  copy[actor].unconfirmed=operationId;
 }
 return{owned,evidence,next,requests,copy,actors,proof,sourceFields,offerSources};
}

export async function finalizeWaveAPositive(state:Awaited<ReturnType<typeof prepareWaveAPositive>>){
 const {owned,evidence,next,requests,copy,proof,sourceFields,offerSources}=state,ex=owned.database.executor;
 const receiptReads:any[]=[],approvalReads:any[]=[],swapReads:any[]=[],pinReads:any[]=[],offerReads:any[]=[],calloutReads:any[]=[];
 const actions:Record<string,Record<string,any>>={};
 const bind=(action:string,actor:string,value:any)=>{(actions[action]??={})[actor]=value;};
 for(const actor of ['QAOWNER','AUDIT-M']){
  for(const [kind,r]of Object.entries(requests)){
   const available=await readShiftChangeAvailability(await proof(actor),{kind:r.kind,operationId:randomUUID(),requestId:r.id,expectedRevision:r.revision} as ShiftChangeCommand,ex);assert.equal(available.allowed,true,'Manager decision must be genuinely eligible: '+actor+'/'+kind);approvalReads.push({actor,kind,requestId:r.id,allowed:available.allowed});
  }
  for(const [type,id]of Object.entries(copy[actor])){
   const receipt=await readScheduleCopyReceipt(await proof(actor),id,ex),command=await readScheduleCopyCommand(await proof(actor),id,ex);assert.ok(command);assert.equal(receipt===null,type==='unconfirmed');receiptReads.push({actor,type,operationId:id,hasCommand:!!command,hasReceipt:!!receipt,committed:receipt?.rows.filter(r=>r.status==='COMMITTED').length??0,skipped:receipt?.rows.filter(r=>r.status==='SKIPPED').length??0});
  }
  const p=await proof(actor);for(const [employeeId,configured]of [['AUDIT-E',false],['AUDIT-LONG',true]] as const){const pin=await readEmployeeClockerPin({employeeId:p.employee.id,sessionTokenHash:p.sessionTokenHash},employeeId,ex);assert.equal(pin.configured,configured);pinReads.push({actor,employeeId,configured:pin.configured,version:pin.version});}
 }
 for(const [actor,source,target]of [['AUDIT-E','audit-next-0-1','x-swap-5'],['AUDIT-LEAD','x-audit-next-AUDIT-LEAD-2','wa-lead-peer-5']]){
  const p=await proof(actor),t=await readShiftChangeTerms(p,source,target,ex);assert.ok(t?.target);
  const availability=await readShiftChangeAvailability(p,{kind:'PROPOSE_SWAP',operationId:randomUUID(),...sourceFields(t),targetShiftId:t.target.shiftId,targetEpisodeId:t.target.assignmentEpisodeId,targetTermsFingerprint:t.targetTermsFingerprint!},ex);assert.equal(availability.allowed,true,'Positive swap fixture must qualify');swapReads.push({actor,source,target,allowed:true});
 }
 for(const [actor,source]of Object.entries(offerSources)){const p=await proof(actor),t=await readShiftChangeTerms(p,source,undefined,ex);assert.ok(t);const availability=await readShiftChangeAvailability(p,{kind:'OFFER_COVERAGE',operationId:randomUUID(),...sourceFields(t)},ex);assert.equal(availability.allowed,true,'Positive no-target coverage offer must qualify');offerReads.push({actor,source,allowed:true});}
 for(const [actor,source]of [['AUDIT-E','audit-shift-1-1'],['AUDIT-E','audit-next-0-1'],['AUDIT-LEAD','x-audit-next-AUDIT-LEAD-3']]){const p=await proof(actor),t=await readShiftChangeTerms(p,source,undefined,ex);assert.ok(t,'Canonical callout source must be readable');assert.equal(t.source.employeeId,actor,'Callout belongs to its actual actor');const available=await readShiftChangeAvailability(p,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...sourceFields(t),reasonCode:'ILLNESS'},ex);assert.equal(available.allowed,true,'Canonical callout must be genuinely eligible: '+actor+'/'+source);calloutReads.push({actor,source,allowed:true});}
 assert.ok(await readOperationalRuleProfileView(await proof('QAOWNER'),'AUDIT-LONG',ex),'Canonical owner operational-review form requires a real scheduling settings row');
 const locator={version:1 as const,weekStart:next,gapKey:`loc-2|${addDays(next,6)}|08:00|16:00`,locationId:'loc-2',date:addDays(next,6),startTime:'08:00',endTime:'16:00',target:'STAFFING' as const,reported:{missingStaff:1,requiresLead:false,positions:[]}};
 const coverage:Record<string,string>={},reviewReplacement:Record<string,string>={},repairReads:any[]=[];
 for(const actor of ['QAOWNER','AUDIT-M']){
  bind('add',actor,{route:'/app/schedule/new',prepare:[{op:'select',selector:'select[name=locationId]',value:'loc-1'},{op:'select',selector:'select[name=employeeId]',value:'AUDIT-E'},{op:'fill',selector:'input[name=startTime]',value:'18:00'},{op:'fill',selector:'input[name=endTime]',value:'20:00'}],button:{name:'Save shift'}});
  bind('edit',actor,{route:'/app/schedule/edit?shiftId=audit-shift-0-1',button:{name:'Save changes'}});
  bind('delete',actor,{route:'/app/schedule/edit?shiftId=audit-shift-0-1',prepare:[{op:'click',selector:'#edit-delete summary'}],button:{name:'Delete this shift'}});
  for(const [action,value]of [['timeoff-approve','APPROVED'],['timeoff-decline','DENIED']])bind(action,actor,{route:'/app/requests?tab=pending',button:{selector:`#request-audit-timeoff button[name=decision][value=${value}]`}});
  bind('member-details',actor,{route:'/app/employees/AUDIT-LONG',button:{name:'Save details'}});
  bind('member-scheduling',actor,{route:'/app/employees/AUDIT-LONG',prepare:[{op:'click',role:'tab',name:'Scheduling'}],button:{name:'Save scheduling profile'}});
  bind('new-employee',actor,{route:'/app/employees/new',prepare:[{op:'fill',selector:'input[name=firstName]',value:'Fictional'},{op:'fill',selector:'input[name=lastName]',value:'Browser Draft'},{op:'fill',selector:'input[name=id]',value:'WA-BROWSER-DRAFT'},{op:'fill',selector:'input[name=phone]',value:'7875550199'},{op:'select',selector:'select[name=primaryLocationId]',value:'loc-1'}],button:{name:'Add employee'}});
  for(const [action,employee,button]of [['pin-save','AUDIT-E','Save PIN'],['pin-reset','AUDIT-LONG','Reset PIN']])bind(action,actor,{route:'/app/employees/'+employee+'/clocker-pin',prepare:[{op:'pinPair',selectors:['#new-clocker-pin','#confirm-clocker-pin']}],button:{name:button}});
  const p=await proof(actor),read=await readCoverageRepair(locator,p,false,ex);assert.equal(read.status,'READY');assert.ok(read.candidates.length,'At least one eligible whole-gap candidate required');
  const candidate=read.candidates.find(c=>c.employeeId==='AUDIT-E')??read.candidates[0];const selected=await readCoverageRepairSelection(candidate.review,p,ex);assert.equal(selected.employeeId,candidate.employeeId);
  coverage[actor]=coverageRepairUrl(read.locator);reviewReplacement[actor]='/app/schedule/new?review='+encodeURIComponent(candidate.review);repairReads.push({actor,status:read.status,candidates:read.candidates.length,selectedEmployeeId:selected.employeeId,date:selected.locator.date,start:selected.locator.startTime,end:selected.locator.endTime});
 }
 bind('operational-review','QAOWNER',{route:'/app/employees/AUDIT-LONG',prepare:[{op:'click',role:'tab',name:'Scheduling'},{op:'click',selector:'#member-rules summary.wa-disclosure__summary'}],button:{name:'Save operational review'}});
 const source=await readGenerationSource(ex),fixtureFingerprint=digest(source.source);
 for(const actor of ['QAOWNER','AUDIT-M']){
  bind('replacement',actor,{route:reviewReplacement[actor],button:{selector:'.wa-form button[type=submit]'}});
  bind('copy-retry',actor,{route:'/app/schedule/copy-receipt?operation='+copy[actor].unconfirmed,button:{name:'Retry this copy'},retryButton:{name:'Check / retry original copy'}});
  for(const kind of ['swap','coverage','callout'])for(const decision of ['approve','decline']){
   const r=requests[kind],value=kind==='callout'?(decision==='approve'?'APPROVE_CALLOUT':'DECLINE_CALLOUT'):(decision==='approve'?'MANAGER_APPROVE':'MANAGER_DECLINE');
   bind(kind+'-'+decision,actor,{route:'/app/exchange?tab=pending&requestId='+r.id+'#request-'+r.id,button:{selector:`#request-${r.id} button[name=kind][value=${value}]`}});
  }
  bind('coverage-close',actor,{route:'/app/exchange?tab=coverage',button:{selector:`form:has(input[name=requestId][value="${requests.open.id}"]) button[type=submit]`}});
 }
 for(const actor of ['AUDIT-E','AUDIT-LEAD']){
  const lead=actor==='AUDIT-LEAD';bind('swap-send',actor,{route:'/app/exchange/swap?sourceShiftId='+(lead?'x-audit-next-AUDIT-LEAD-2':'audit-next-0-1'),prepare:[{op:'check',selector:`input[name=targetShiftId][value="${lead?'wa-lead-peer-5':'x-swap-5'}"]`}],button:{name:'Send swap request'}});
  bind('callout-send',actor,{route:'/app/exchange/callout?shiftId='+(lead?'x-audit-next-AUDIT-LEAD-3':'audit-next-1-1'),prepare:[{op:'select',selector:'select[name=reasonCode]',value:'ILLNESS'}],button:{name:'Send report'}});
  bind('swap-offer',actor,{route:'/app/exchange/swap?sourceShiftId='+offerSources[actor],button:{name:'Offer for coverage'}});
 }
 for(const name of ['swap-approve','swap-decline','coverage-approve','coverage-decline','coverage-close','callout-approve','callout-decline','swap-send','swap-offer','callout-send'])for(const action of Object.values(actions[name]??{}))action.retryButton={name:'Check & retry same request'};
 const privateDir=join(process.env.PREVIEW_OUT!,'private-state-jobs');await mkdir(privateDir,{recursive:true,mode:0o700});
 const receiptRoute=(type:string)=>Object.fromEntries(['QAOWNER','AUDIT-M'].map(actor=>[actor,'/app/schedule/copy-receipt?operation='+copy[actor][type]]));
 // ROUND's canonical Coverage route is the first actual Inbox href. Discover it
 // read-only after login; keep this distinct positive candidate fixture too.
 const bindings={fixtureProfile:'wave-a-complete-v3-combinedcd764f6-initial-before-listen',fixtureFingerprint,fixturesReady:true,needsInboxDiscovery:true,coverage:{},coveragePositive:coverage,reviewReplacement,copy,copyFull:receiptRoute('full'),copyPartial:receiptRoute('partial'),copyUnavailable:receiptRoute('unavailable'),copyUnconfirmed:receiptRoute('unconfirmed'),requests,actions};
 const bindingsPath=join(privateDir,'wave-a-bindings.json');await writeFile(bindingsPath,JSON.stringify(bindings,null,2),{mode:0o600});
 const record={sourceSha:SHA,initializedBeforeListen:true,identity:owned.identity,fixtureFingerprint,approvalReads,swapReads,calloutReads,offerReads,pinReads,receiptReads,repairReads,notificationsLocalOnly:true,bindingsPrivate:true};
 await writeFile(join(evidence,'wave-a-positive-fixture.json'),JSON.stringify(record,null,2));
 return{bindingsPath,record};
}
