/** Complete fictional setup for a NEW marked owned DB, awaited BEFORE Next starts.
 * Returns credentials/proofs in memory only. Never serialize this return value. */
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {createCoverageOffer,cancelExchange} from './shift-change-api';
import {fictionalProfile} from '../fixtures/shift-changes';
import {addDays} from '../../lib/date-utils';
import type {OwnedNextDatabaseInitializer} from './owned-next-app';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {UserRole} from '../../lib/domain';
import {hashPassword} from '../../lib/auth/password';
import {assignOperationalScope,readOwnerOperationalScope,readOperationalAuthority} from '../../lib/company-access/operational-scope.server';
import {registerClockerDevice,redeemClockerEnrollment} from '../../lib/clocker/devices.server';
import {setEmployeeClockerPin} from '../../lib/clocker/pins.server';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {readPeriodClose,savePeriodPopulation} from '../../lib/period-close/service';
import {saveSettings,command,readRun} from '../../lib/payroll/service';
import {saveNativeProfile} from '../../lib/payroll/native/profiles.server';
import {workerOnce} from '../../lib/payroll/worker';
import {input as nativeInput} from '../../lib/payroll/native/fixtures.test-support';
import {fictionalWorkweekPolicy} from '../../lib/payroll/native/workweek-fixtures.test-support';
import {createTimeOffRequest,reviewTimeOffRequest} from '../../lib/data/requests';
import {notificationIntentStatements} from '../../lib/data/notifications';
import type {NotificationIntent} from '../../lib/notifications/types';
export const companyAccessOwnedRuntimeOptions={payrollEnabled:true,clockerPinKey:'3d'.repeat(32),clockerPunchEnabled:false} as const;
const periods=[{startDate:'2026-09-21',endDate:'2026-09-27'},{startDate:'2026-09-28',endDate:'2026-10-04'}] as const;
const nativePeriod=periods[0],contextPeriod={startDate:'2026-09-14',endDate:'2026-09-27'};
const actors={owner:{employeeId:'QAOWNER',role:'OWNER'},legacy:{employeeId:'QALEGACY',role:'MANAGER'},company:{employeeId:'QACOMPANY',role:'MANAGER'},locations:{employeeId:'QALOCATIONS',role:'MANAGER'},financial:{employeeId:'QAFINANCIAL',role:'MANAGER'},unassigned:{employeeId:'QANEWMANAGER',role:'MANAGER'},employee:{employeeId:'QAEMPLOYEE',role:'EMPLOYEE'},lead:{employeeId:'QALEAD',role:'LEAD'},native:{employeeId:'QANATIVEB',role:'EMPLOYEE'},a7:{employeeId:'QAA7MEMBER',role:'EMPLOYEE'}} as const;
type ActorKey=keyof typeof actors;
export async function initializeCompanyAccessOwnedFixture(context:Parameters<OwnedNextDatabaseInitializer>[0]){
 const {executor,identity,signal}=context;
 const q=<T=Record<string,unknown>>(text:string,values:readonly unknown[]=[])=>{signal?.throwIfAborted();return executor.query<T>({text,values},signal);};
 const [actual]=await q<{name:string;oid:number;marker:string}>("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");
 if(!actual||actual.name!==identity.name||actual.oid!==identity.oid||actual.marker!==identity.marker||!/^nevora_(exchange|foundation)_test_[a-z0-9_]{1,40}$/.test(actual.name)||!/^fuel-phase3-disposable:[a-f0-9-]{36}$/.test(actual.marker))throw Error('Owned complete fixture identity mismatch');
 const [stage]=await q<{fresh:boolean}>("SELECT to_regclass('native_payroll_ledger') IS NULL AND to_regclass('company_access_adoption') IS NULL AS fresh");if(!stage?.fresh)throw Error('Owned complete fixture requires the fresh0030 boundary');
 const previousPayroll=process.env.NEVORA_PAYROLL_ENABLED,previousPushEnvironment=process.env.PUSH_ENVIRONMENT;
 process.env.NEVORA_PAYROLL_ENABLED='true';process.env.PUSH_ENVIRONMENT='test';
 try{
  await q(await readFile('db/migrations/0031_native_payroll.sql','utf8'));
  await seedOwnedApp(executor,{adoptCompanyAccess:false});
  // Capture the B-only native run against the COMPLETE real four-person B roster.
  // Later A actors are real new roster members, never a filtered payroll source.
  await q("UPDATE employees SET email='owner@example.invalid',primary_location_id='loc-2' WHERE id='QAOWNER';INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES('QALEGACY','Fictional','Legacy Manager','2025550101','legacy@example.invalid','MANAGER','loc-2')");
  const passwordHash=await hashPassword(TEST_PASSWORD);
  await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('QALEGACY',$1,false)",[passwordHash]);
  await q(await readFile('db/migrations/0032_company_access_invitations.sql','utf8'));
  const [adoption]=await q<{state:string;receipt:string;census:{employeeId:string}[]}>("SELECT state,owner_policy_receipt_id AS receipt,legacy_manager_census AS census FROM company_access_adoption");
  if(adoption?.state!=='ENFORCED'||adoption.receipt!=='01a13cda-e556-7652-8469-a18a77094364'||JSON.stringify(adoption.census.map(r=>r.employeeId))!==JSON.stringify(['QALEGACY']))throw Error('Owned complete fixture adoption mismatch');
  const proofs={} as Record<ActorKey,SessionMutationProof>;
  async function insertActor(key:ActorKey){
   const actor=actors[key],index=Object.keys(actors).indexOf(key),location=['native','financial','locations'].includes(key)?'loc-2':'loc-1',lastName=key==='a7'?'A7 Stable Member':key;
   await q('INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[actor.employeeId,'Fictional',lastName,'20255501'+String(index+2).padStart(2,'0'),key+'@example.invalid',actor.role,location]);
   await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[actor.employeeId,passwordHash]);
  }
  async function bindProof(key:ActorKey){
   const actor=actors[key],[employee]=await q<SessionMutationProof['employee']>('SELECT id,first_name AS "firstName",last_name AS "lastName",role,primary_location_id AS "primaryLocationId" FROM employees WHERE id=$1',[actor.employeeId]);
   const sessionTokenHash=createHash('sha256').update(randomBytes(32)).digest('hex');await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[sessionTokenHash,actor.employeeId]);proofs[key]={employee,sessionTokenHash};
  }
  for(const key of ['financial','native'] as const)await insertActor(key);
  for(const key of ['owner','legacy','financial','native'] as const)await bindProof(key);
  await q("INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT e.id,l.id FROM employees e CROSS JOIN locations l WHERE e.id LIKE 'QA%' AND (e.id<>'QANATIVEB' OR l.id='loc-2') ON CONFLICT DO NOTHING");
  await saveSettings(proofs.owner,{action:'SAVE_SETTINGS',operationId:randomUUID(),expectedRevision:0,effectiveFrom:'2026-01-01',reason:'Fictional full-source preservation',preferences:{companyName:'Fictional Access Native Company',language:'es',currency:'USD',schedule:{frequency:'WEEKLY',anchorDate:nativePeriod.startDate,paydayOffsetDays:2},rules:[],automation:{prepare:true,publish:false,reminders:false,reminderLeadDays:[]},bankProfile:null}},executor);
  await saveNativeProfile(proofs.owner,{action:'SET_MANAGER_SCOPE',operationId:randomUUID(),expectedRevision:0,employeeId:actors.financial.employeeId,review:true,approve:true,locationIds:['loc-2'],reason:'Fictional independent native B authority'},executor);
  async function seedNative(employeeId:string,locationId:string,period:{startDate:string;endDate:string},contextPeriod:{startDate:string;endDate:string},payday:string,dates:string[]){
   const pending=await registerClockerDevice({employeeId:actors.owner.employeeId,sessionTokenHash:proofs.owner.sessionTokenHash},{name:'Fictional native '+employeeId+' clock',locationId},executor),[location]=await q<{key:string}>("SELECT clocker_key AS key FROM locations WHERE id=$1",[locationId]);
  const device=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:location.key},executor);
   for(const date of dates)await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,$2,$3,$4,$5::timestamptz,$6::timestamptz,'CLOCKED_OUT',1)",['owned-native-'+employeeId+'-'+date,employeeId,locationId,device.device.id,date+'T12:00:00Z',date+'T20:00:00Z']);
  for(const action of ['APPROVE','FINALIZE'] as const){const view=await readTimecards(proofs.owner,contextPeriod,executor);if(view.state!=='ready')throw Error('Owned complete timecard unavailable');const card=view.cards.find(c=>c.card.employeeId===employeeId);if(!card)throw Error('Owned complete timecard absent');const result=await mutateTimecard(proofs.owner,{operationId:randomUUID(),employeeId:employeeId,...contextPeriod,action,expectedRevision:card.revision,expectedSourceHash:card.sourceHash},executor);if(result.status!==(action==='APPROVE'?'approved':'finalized'))throw Error('Owned complete timecard finalization');}
  const facts=nativeInput();facts.wages[0].locationIds=[locationId];facts.wages[0].hourlyRateMinor='2500';facts.wages[0].workweekPolicy=fictionalWorkweekPolicy(employeeId);facts.wages[0].wageCentRounding='UNVERIFIED';if(!facts.tax)throw Error('Owned native tax fixture absent');facts.tax.prCentRounding='UNVERIFIED';facts.tax.ruleEvidenceReference=null;
  await saveNativeProfile(proofs.owner,{action:'SAVE_NATIVE_PROFILE',operationId:randomUUID(),expectedRevision:0,reason:'Fictional exact-operation component facts',configuration:{schema:'NEVORA_NATIVE_CONFIGURATION_V1',employeeId:employeeId,wages:facts.wages,tax:facts.tax,deductions:facts.deductions}},executor);
  await saveNativeProfile(proofs.owner,{action:'ATTEST_OPENING_YTD',operationId:randomUUID(),expectedRevision:0,reason:'Fictional attested opening zero',employeeId:employeeId,ytd:facts.ytd},executor);
  const close=await readPeriodClose(proofs.owner,period,executor);await savePeriodPopulation(proofs.owner,{operationId:randomUUID(),expectedRevision:0,sourceHash:close.sourceHash,...period,members:close.members.map(m=>({employeeId:m.employeeId,disposition:m.employeeId===employeeId?'INCLUDE' as const:'EXCLUDE' as const,reason:'Fictional explicitly reviewed population',employmentFacts:'Fictional owned test employee facts',employmentBasis:'MANAGER_ATTESTED' as const}))},executor);
  const prepared=await command(proofs.owner,{action:'PREPARE',operationId:randomUUID(),period,payday},executor);if(!prepared.runId)throw Error('Owned native run missing');const review=await readRun(proofs.owner,prepared.runId,executor);if(review.payload.status!=='REVIEW_REQUIRED'||!review.payload.reviewToken)throw Error('Owned native fixture not reviewable');
  await command(proofs.owner,{action:'APPROVE',operationId:randomUUID(),runId:prepared.runId,expectedRevision:review.payload.revision,reviewToken:review.payload.reviewToken},executor);await workerOnce(executor);await workerOnce(executor);
  const [document]=await q<{id:string;sha256:string}>("SELECT id::text,sha256 FROM payroll_documents WHERE employee_id=$1 AND kind='EMPLOYEE_STATEMENT'",[employeeId]);if(!document)throw Error('Owned native generated statement missing');
  const [publication]=await q<{published:boolean}>("SELECT EXISTS(SELECT 1 FROM payroll_publications WHERE run_id=$1) AS published",[prepared.runId]);if(!publication.published)throw Error('Owned native publication missing');
   return {runId:prepared.runId,document};
  }
  const native=await seedNative(actors.native.employeeId,'loc-2',nativePeriod,contextPeriod,'2026-09-29',[21,22,23,24,25].map(day=>'2026-09-'+day));
  // Add A actors only after the immutable historical B snapshot is approved.
  for(const key of ['company','locations','unassigned','employee','lead','a7'] as const){await insertActor(key);await bindProof(key);}
  const activationTargets=Array.from({length:24},(_,i)=>({employeeId:'QAINVITE'+String(i+1).padStart(3,'0'),registeredEmail:'activation'+String(i+1).padStart(3,'0')+'@example.invalid'}));
  for(const target of [{employeeId:'QAINVITE',registeredEmail:'activation@example.invalid'},...activationTargets])await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id,active) VALUES($1,'Fictional','Activation Target','2025550120',$2,'EMPLOYEE','loc-1',true)",[target.employeeId,target.registeredEmail]);
  await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id,active) VALUES('QAINACTIVE','Fictional','Inactive Target','2025550121','inactive@example.invalid','EMPLOYEE','loc-1',false)");
  await q("INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT e.id,l.id FROM employees e CROSS JOIN locations l WHERE e.id LIKE 'QA%' AND (e.id<>'QANATIVEB' OR l.id='loc-2') ON CONFLICT DO NOTHING");
  for(const key of ['company','locations','financial'] as const){const current=await readOwnerOperationalScope(proofs.owner,actors[key].employeeId,executor);if(current.state!=='ready')throw Error('Owned complete scope context');const c=current.data.current;const result=await assignOperationalScope(proofs.owner,actors[key].employeeId,{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:key==='company'?{mode:'COMPANY',locationIds:[]}:{mode:'LOCATIONS',locationIds:['loc-1']}},executor);if(result.state!=='saved')throw Error('Owned complete scope assignment');}
  const unassigned=await readOperationalAuthority(proofs.unassigned,executor);if(unassigned.state!=='ready'||unassigned.scope!==null)throw Error('Owned complete new Manager was implicitly assigned');
  const scenario=await seedOwnedScenario(executor,'ACCESS',0);
  const pinKey=Buffer.from(companyAccessOwnedRuntimeOptions.clockerPinKey,'hex');
  for(const [key,pin] of [['employee','0123'],['lead','4567'],['native','8901']] as const)await setEmployeeClockerPin({employeeId:actors.owner.employeeId,sessionTokenHash:proofs.owner.sessionTokenHash},{employeeId:actors[key].employeeId,pin,expectedVersion:0},pinKey,executor);
  for(const key of ['employee','lead'] as const){await q("INSERT INTO employee_positions VALUES($1,'qa-pos'),($1,'qa-pos2')",[actors[key].employeeId]);await q('INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES($1,40,80,$2)',[actors[key].employeeId,JSON.stringify(fictionalProfile())]);for(let day=0;day<7;day++)await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,'00:00','24:00')",[actors[key].employeeId+'-'+day,actors[key].employeeId,day]);}
  // Real offer/cancel history is retained when the fictional owned schedule is
  // returned to DRAFT for the manual deletion acceptance scenario.
  const historyRequestId=await createCoverageOffer({sourceShiftId:scenario.sourceId,requestedByEmployeeId:scenario.actors[0]},executor);if(!await cancelExchange({exchangeId:historyRequestId,employeeId:scenario.actors[0]},executor))throw Error('Owned real history cancellation failed');
  await q("UPDATE schedules SET status='DRAFT' WHERE id='qa-ACCESS-schedule-0'");
  const manualDrafts={editableShiftId:'qa-access-editable',midnightShiftId:'qa-access-midnight',historyShiftId:scenario.sourceId,historyRequestId,week:scenario.week,locationId:'loc-1'};
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead,assignment_origin) VALUES($1,'qa-ACCESS-schedule-0','QAEMPLOYEE',$2,'08:00','16:00','qa-pos',false,'MANAGER'),($3,'qa-ACCESS-schedule-0','QALEAD',$4,'16:00','24:00','qa-pos',true,'MANAGER')",[manualDrafts.editableShiftId,addDays(scenario.week,3),manualDrafts.midnightShiftId,addDays(scenario.week,4)]);
  const requestId=randomUUID();await createTimeOffRequest({requestId,employeeId:actors.employee.employeeId,proof:proofs.employee,startDate:scenario.sourceDate,endDate:scenario.sourceDate,reason:'Fictional access preservation fixture'},executor);if(!await reviewTimeOffRequest({requestId,managerId:actors.owner.employeeId,proof:proofs.owner,status:'APPROVED'},executor))throw Error('Owned complete request outcome');
  const managerNotice:NotificationIntent={id:randomUUID(),employeeId:actors.company.employeeId,type:'TIME_OFF_APPROVED',title:'NEVORA',body:'Open NEVORA.',eventKey:randomUUID(),environment:'test',source:{kind:'TIME_OFF',id:requestId,version:'APPROVED'},effectiveVersion:'APPROVED',purpose:'EVENT',urgency:'high',dueAt:new Date(Date.now()-1000).toISOString(),expiresAt:new Date(Date.now()+72*3600000).toISOString()};await executor.transaction(notificationIntentStatements([managerNotice]),signal);
  const foreign=await seedNative(actors.employee.employeeId,'loc-1',{startDate:'2026-10-05',endDate:'2026-10-11'},{startDate:'2026-09-28',endDate:'2026-10-11'},'2026-10-13',[5,6,7,8,9].map(day=>'2026-10-0'+day));
  for(const period of periods){const view=await readPeriodClose(proofs.company,period,executor);if(view.members.filter(m=>m.employeeId===actors.a7.employeeId&&m.name==='Fictional A7 Stable Member').length!==1)throw Error('Owned A7 unique roster member missing');}
  const [clock]=await q<{closed:boolean}>("SELECT $1::date<(clock_timestamp() AT TIME ZONE time_zone)::date AS closed FROM workspaces WHERE singleton",[periods[1].endDate]);if(!clock.closed)throw Error('Owned A7 periods must be closed');
  signal?.throwIfAborted();
  return {actors:Object.fromEntries(Object.entries(actors).map(([key,actor])=>[key,{...actor,password:TEST_PASSWORD}])) as Record<ActorKey,{employeeId:string;role:UserRole;password:string}>,serverProofs:proofs,activation:{employeeId:'QAINVITE',registeredEmail:'activation@example.invalid'},activationTargets,manualDrafts,a7:{employeeId:actors.a7.employeeId,displayName:'Fictional A7 Stable Member',period:periods[0],remountPeriod:periods[1]},financial:{employeeId:actors.native.employeeId,runId:native.runId,documentId:native.document.id,pdfSha256:native.document.sha256,period:nativePeriod,foreignDocumentId:foreign.document.id,foreignRunId:foreign.runId},operations:{week:scenario.week,sourceShiftId:scenario.sourceId,requestId,notificationId:managerNotice.id},manifest:{schema:'OWNED_COMPANY_ACCESS_FIXTURE_V1',adoption:'ENFORCED',legacyManagerCount:1,closedPeriods:2,financialSource:'ACTUAL_RECORDED_FINALIZED_NATIVE_APPROVED_PUBLISHED',notificationEnvironment:'test',backgroundWorkersStarted:0}};
 }finally{if(previousPayroll===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=previousPayroll;if(previousPushEnvironment===undefined)delete process.env.PUSH_ENVIRONMENT;else process.env.PUSH_ENVIRONMENT=previousPushEnvironment;}
}
