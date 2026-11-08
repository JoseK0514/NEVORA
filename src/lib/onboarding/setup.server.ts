import 'server-only';
import {createHash} from 'node:crypto';
import type {Workspace,Location,Position,Employee} from '../domain';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {managementSessionStatements} from '../data/management-session';
import {saveWorkspaceProfile,WorkspaceTimezoneLockedError} from '../data/workspaces';
import {createLocation,updateLocation} from '../data/locations';
import {createPosition,updatePosition} from '../data/positions';
import {saveScheduleHealthSettings,createCoverageWindow,deleteCoverageWindow,replaceCoverageWindowPositionRequirements,type CoverageWindow,type LocationStaffingSetting} from '../data/schedule-health';
import {evaluateLocationReadiness} from '../scheduling/location-readiness';
import {validateWorkspaceProfile} from '../workspace/validation';
import {assertWorkspaceBindingCurrent,workspaceBindingFacts,type WorkspaceBinding} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {deriveReadiness,onboardingDestinations} from './readiness.server';
import {parseSetupCommand} from './steps';
import type {OnboardingSnapshot,OnboardingResult,OperationReceipt} from './contracts';
export type OnboardingPerson=Omit<Employee,'email'>&{email:string|null;updatedAt:string;hasCredentials:boolean;invitationRevision:number;invitationPending:boolean;targetWeeklyHours:number|null;maximumWeeklyHours:number|null};
export type OnboardingConfiguration={workspace:Workspace;locations:(Location&{updatedAt:string})[];positions:Position[];people:OnboardingPerson[];staffing:LocationStaffingSetting[];coverage:CoverageWindow[];timekeepingConfigured:boolean;payrollConfigured:boolean};
export type OnboardingSetup={snapshot:OnboardingSnapshot;configuration:OnboardingConfiguration;destinations:typeof onboardingDestinations};
const check=(expression:string,values:readonly unknown[],reason:string):SqlStatement=>({text:`SELECT(CASE WHEN ${expression} THEN '1' ELSE '${reason}' END)::integer`,values});
export function onboardingOwnerGuards(proof:SessionMutationProof,workspaceId:string,write=false):SqlStatement[]{return [
 {text:'SELECT id FROM workspaces WHERE id=$1 AND singleton ORDER BY id '+(write?'FOR UPDATE':'FOR SHARE'),values:[workspaceId]},
 {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
 ...managementSessionStatements(proof,proof.employee.id,['OWNER']),
 check("EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id JOIN workspaces w ON w.id=l.workspace_id WHERE w.id=$1 AND w.singleton AND w.active AND e.id=$2 AND e.active AND e.role='OWNER')",[workspaceId,proof.employee.id],'onboarding_authorization'),
];}
const configurationSql=`SELECT p.version::text AS version,jsonb_build_object(
 'workspace',jsonb_build_object('id',w.id,'name',w.name,'timeZone',w.time_zone,'active',w.active,'createdAt',w.created_at::text,'updatedAt',w.updated_at::text),
 'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',l.id,'workspaceId',l.workspace_id,'clockerKey',l.clocker_key,'name',l.name,'shortName',l.short_name,'active',l.active,'updatedAt',l.updated_at::text) ORDER BY l.id) FROM locations l WHERE l.workspace_id=w.id),'[]'::jsonb),
 'positions',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',pos.id,'workspaceId',pos.workspace_id,'name',pos.name,'active',pos.active,'createdAt',pos.created_at::text,'updatedAt',pos.updated_at::text) ORDER BY pos.id) FROM positions pos WHERE pos.workspace_id=w.id),'[]'::jsonb),
 'people',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',e.id,'firstName',e.first_name,'lastName',e.last_name,'phone',e.phone,'email',e.email,'role',e.role,'active',e.active,'primaryLocationId',e.primary_location_id,'updatedAt',e.updated_at::text,
  'eligibleLocationIds',ARRAY(SELECT el.location_id FROM employee_location_eligibility el WHERE el.employee_id=e.id ORDER BY el.location_id),
  'positionIds',ARRAY(SELECT ep.position_id FROM employee_positions ep WHERE ep.employee_id=e.id ORDER BY ep.position_id),
  'hasCredentials',EXISTS(SELECT 1 FROM employee_credentials cc WHERE cc.employee_id=e.id),
  'invitationRevision',COALESCE((SELECT max(i.revision) FROM company_invitations i WHERE i.workspace_id=w.id AND i.employee_id=e.id),0),
  'invitationPending',EXISTS(SELECT 1 FROM company_invitations i WHERE i.workspace_id=w.id AND i.employee_id=e.id AND i.consumed_at IS NULL AND i.retired_at IS NULL AND i.expires_at>clock_timestamp() AND i.target_version=e.updated_at::text AND i.email_fingerprint=encode(sha256(convert_to('NEVORA invitation email v1','UTF8')||decode('00','hex')||convert_to(lower(trim(e.email)),'UTF8')),'hex') AND EXISTS(SELECT 1 FROM employees issuer JOIN operational_subject_versions iv ON iv.workspace_id=w.id AND iv.employee_id=issuer.id WHERE issuer.id=i.issuer_employee_id AND issuer.active AND issuer.role='OWNER' AND iv.generation=i.issuer_generation)),
  'targetWeeklyHours',es.target_weekly_hours,'maximumWeeklyHours',es.maximum_weekly_hours) ORDER BY e.id) FROM employees e JOIN locations home ON home.id=e.primary_location_id AND home.workspace_id=w.id LEFT JOIN employee_scheduling_settings es ON es.employee_id=e.id),'[]'::jsonb),
 'staffing',COALESCE((SELECT jsonb_agg(jsonb_build_object('locationId',l.id,'locationName',l.name,'minimumStaffPerShift',s.minimum_staff_per_shift,'requiresDesignatedLead',s.requires_designated_lead) ORDER BY l.id) FROM locations l LEFT JOIN location_staffing_settings s ON s.location_id=l.id WHERE l.workspace_id=w.id),'[]'::jsonb),
 'coverage',COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object('id',c.id,'locationId',c.location_id,'dayOfWeek',c.day_of_week,'startTime',left(c.start_time::text,5),'endTime',left(c.end_time::text,5),'minimumStaff',c.minimum_staff,
  'positionRequirements',COALESCE((SELECT jsonb_agg(jsonb_build_object('positionId',r.position_id,'quantity',r.quantity) ORDER BY r.position_id) FROM coverage_window_position_requirements r WHERE r.coverage_window_id=c.id),'[]'::jsonb))) ORDER BY c.id) FROM location_coverage_windows c JOIN locations l ON l.id=c.location_id AND l.workspace_id=w.id),'[]'::jsonb),
 'timekeepingConfigured',EXISTS(SELECT 1 FROM clocker_devices d JOIN locations l ON l.id=d.location_id WHERE l.workspace_id=w.id AND d.active),
 'payrollConfigured',EXISTS(SELECT 1 FROM native_payroll_setup_records pr WHERE pr.workspace_id=w.id AND pr.kind='COMPANY_DEFAULTS')
 ) AS configuration FROM onboarding_progress p JOIN workspaces w ON w.id=p.workspace_id WHERE w.id=$1 AND w.singleton AND w.active`;
export async function readOnboardingSetup(proof:SessionMutationProof,binding:WorkspaceBinding,ex:SqlExecutor=getWorkspaceDb(binding)):Promise<OnboardingSetup>{
 const f=await assertWorkspaceBindingCurrent(binding);if(f.purpose!=='APP')throw Error('onboarding_authorization');
 const prefix=onboardingOwnerGuards(proof,f.record.id),results=await ex.transaction([...prefix,{text:configurationSql,values:[f.record.id]},...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
 const row=results[prefix.length]?.[0] as {version:string;configuration:OnboardingConfiguration}|undefined;if(!row)throw Error('onboarding_unavailable');
 const c=row.configuration,locations=c.locations.filter(l=>l.active),issues=locations.flatMap(location=>evaluateLocationReadiness({workspace:c.workspace,location,staffing:c.staffing.find(s=>s.locationId===location.id)??null,coverageWindows:c.coverage,positions:c.positions,eligibleEmployees:c.people.map(e=>({...e,email:e.email??undefined}))}).issues.map(i=>i.code));
 if(!locations.length)issues.push('LOCATION_INACTIVE');
 let businessValid=false;try{validateWorkspaceProfile(c.workspace);businessValid=c.workspace.active;}catch{/* Invalid canonical data is never ready. */}
 const team=c.people.filter(e=>e.active&&e.id!==proof.employee.id),uninvited=team.filter(e=>e.email&&!e.hasCredentials&&!e.invitationPending);
 const sections=deriveReadiness({businessValid,activeLocations:locations.length,activePositions:c.positions.filter(p=>p.active).length,schedulingIssues:issues,teamCount:team.length,uninvitedCount:uninvited.length,missingEmailCount:team.filter(e=>!e.email&&!e.hasCredentials).length,payrollEnabled:process.env.NEVORA_PAYROLL_ENABLED==='true',timekeepingConfigured:c.timekeepingConfigured,payrollConfigured:c.payrollConfigured});
 const coreReady=sections.filter(s=>['BUSINESS','LOCATIONS','SCHEDULING'].includes(s.id)).every(s=>s.state==='READY');
 return {snapshot:{schemaVersion:1,version:row.version,registrationState:coreReady?'READY':'SETUP_IN_PROGRESS',workspace:{id:c.workspace.id,displayName:c.workspace.name,portalUrl:f.record.canonicalOrigin+'/'},sections,nextStep:sections.find(s=>s.state==='BLOCKED'||s.state==='IN_PROGRESS')?.id??null},configuration:c,destinations:{...onboardingDestinations}};
}
export async function readOnboardingState(proof:SessionMutationProof,binding:WorkspaceBinding,ex?:SqlExecutor):Promise<OnboardingSnapshot>{return (await readOnboardingSetup(proof,binding,ex)).snapshot;}
/** Receipt lookup is protected by current Owner authority, not a guessed UUID. */
export async function onboardingCommandReceipt(proof:SessionMutationProof,binding:WorkspaceBinding,operationId:string,ex:SqlExecutor):Promise<{kind:string;hash:string;receipt:OperationReceipt}|null>{
 const {record}=await assertWorkspaceBindingCurrent(binding),prefix=onboardingOwnerGuards(proof,record.id);
 const results=await ex.transaction([...prefix,{text:'SELECT command_kind AS kind,command_hash AS hash,result AS receipt FROM onboarding_commands WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3',values:[record.id,proof.employee.id,operationId]},...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
 return results[prefix.length]?.[0] as {kind:string;hash:string;receipt:OperationReceipt}|undefined??null;
}
/** Decorates only the selected canonical MUTATION transaction. Preflight reads
 * pass through untouched. Prefix/suffix are removed from domain result indices. */
export function onboardingMutationExecutor(input:{proof:SessionMutationProof;binding:WorkspaceBinding;operationId:string;expectedVersion:string;kind:string;hash:string;subjectId?:string;matches:(s:readonly SqlStatement[])=>boolean},ex:SqlExecutor){
 const id=workspaceBindingFacts(input.binding).record.id;let commits=0;let failureReason:string|null=null;
 const executor:SqlExecutor={query:(s,signal)=>ex.query(s,signal),async transaction(statements,signal){
  if(!input.matches(statements))return ex.transaction(statements,signal);
  if(commits)throw Error('onboarding_multiple_mutations');
  const prefix:SqlStatement[]=[{text:'SELECT id FROM workspaces WHERE id=$1 AND singleton ORDER BY id FOR UPDATE',values:[id]},{text:'SELECT workspace_id FROM onboarding_progress WHERE workspace_id=$1 FOR UPDATE',values:[id]},
   check('EXISTS(SELECT 1 FROM onboarding_progress WHERE workspace_id=$1 AND version=$2::bigint)',[id,input.expectedVersion],'onboarding_version_changed'),
   check('NOT EXISTS(SELECT 1 FROM onboarding_commands WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3)',[id,input.proof.employee.id,input.operationId],'onboarding_command_replay')];
  const suffix:SqlStatement[]=[...managementSessionStatements(input.proof,input.proof.employee.id,['OWNER']),
   {text:'UPDATE onboarding_progress SET version=version+1,updated_at=clock_timestamp() WHERE workspace_id=$1',values:[id]},
   {text:`INSERT INTO onboarding_commands(workspace_id,actor_employee_id,operation_id,command_kind,command_hash,resulting_version,result) SELECT $1,$2,$3,$4,$5,p.version,jsonb_strip_nulls(jsonb_build_object('operationId',$3::uuid::text,'commandKind',$4::text,'committedAt',clock_timestamp()::text,'resultingVersion',p.version::text,'subjectId',$6::text)) FROM onboarding_progress p WHERE p.workspace_id=$1`,values:[id,input.proof.employee.id,input.operationId,input.kind,input.hash,input.subjectId??null]}];
  try{const result=await ex.transaction([...prefix,...statements,...suffix],signal);commits++;return result.slice(prefix.length,prefix.length+statements.length);}
  catch(error){if(error instanceof Error&&error.message.includes('onboarding_version_changed'))failureReason='version_changed';throw error;}
 }};
 return {executor,commits:()=>commits,failureReason:()=>failureReason};
}
export async function saveOnboardingStep(proof:SessionMutationProof,binding:WorkspaceBinding,stepId:string,value:unknown,ex:SqlExecutor=getWorkspaceDb(binding)):Promise<OnboardingResult>{
 const command=parseSetupCommand(stepId,value);if(!command)return {state:'invalid',fieldErrors:[{field:stepId,code:'INVALID_COMMAND'}]};
 const kind='SETUP_'+stepId,hash=createHash('sha256').update(JSON.stringify({kind,command})).digest('hex');let started=false;
 const recover=async():Promise<OnboardingResult|null>=>{const prior=await onboardingCommandReceipt(proof,binding,command.operationId,ex);if(!prior)return null;return prior.kind===kind&&prior.hash===hash?{state:'saved',receipt:prior.receipt,snapshot:await readOnboardingState(proof,binding,ex)}:{state:'conflict',reason:'changed_replay'};};
 try{
  const prior=await recover();if(prior)return prior;
  const c=command.payload;
  const marker:Record<typeof c.kind,string>={BUSINESS:'UPDATE workspaces SET name=',LOCATION_CREATE:'INSERT INTO locations(',LOCATION_UPDATE:'UPDATE locations SET name=',POSITION_CREATE:'INSERT INTO positions(',POSITION_UPDATE:'UPDATE positions SET name=',STAFFING:'INSERT INTO location_staffing_settings(',COVERAGE_CREATE:'INSERT INTO location_coverage_windows(',COVERAGE_DELETE:'DELETE FROM location_coverage_windows ',COVERAGE_POSITIONS:'DELETE FROM coverage_window_position_requirements ',SKIP:'SELECT 1 AS onboarding_explicit_skip'};
  const composed=onboardingMutationExecutor({proof,binding,operationId:command.operationId,expectedVersion:command.expectedVersion,kind,hash,matches:statements=>statements.some(s=>s.text.startsWith(marker[c.kind])||(c.kind==='STAFFING'&&s.text.startsWith('INSERT INTO employee_scheduling_settings(')))},ex);
  const actor={proof,actorEmployeeId:proof.employee.id},sql=composed.executor;started=true;
  switch(c.kind){
   case 'BUSINESS':await saveWorkspaceProfile({...actor,name:c.name,timeZone:c.timeZone},sql);break;
   case 'LOCATION_CREATE':await createLocation({...actor,name:c.name,shortName:c.shortName,clockerKey:c.clockerKey},sql);break;
   case 'LOCATION_UPDATE':await updateLocation({...actor,...c},sql);break;
   case 'POSITION_CREATE':await createPosition({...actor,name:c.name},sql);break;
   case 'POSITION_UPDATE':await updatePosition({...actor,...c},sql);break;
   case 'STAFFING':if(!c.staffingSettings.length&&!c.hourTargets.length)return {state:'invalid',fieldErrors:[{field:'settings',code:'EMPTY_COMMAND'}]};await saveScheduleHealthSettings({...c,proof},sql);break;
   case 'COVERAGE_CREATE':await createCoverageWindow({...c,...actor},sql);break;
   case 'COVERAGE_DELETE':await deleteCoverageWindow(c.windowId,proof,sql);break;
   case 'COVERAGE_POSITIONS':await replaceCoverageWindowPositionRequirements({...c,...actor},sql);break;
   case 'SKIP':await sql.transaction([...onboardingOwnerGuards(proof,workspaceBindingFacts(binding).record.id,true),{text:marker.SKIP,values:[]}]);break;
  }
  if(composed.commits()!==1)return {state:'unavailable',reasonCode:'MUTATION_NOT_CONFIRMED'};
  return await recover()??{state:'outcome_unknown',operationId:command.operationId};
 }catch(error){
  try{const saved=await recover();if(saved)return saved;}catch{return {state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};}
  const message=error instanceof Error?error.message:'',code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  if(error instanceof WorkspaceTimezoneLockedError)return {state:'invalid',fieldErrors:[{field:'timeZone',code:'TIMEZONE_CONVERSION_REVIEW_REQUIRED'}]};
  if(/onboarding_version_changed|version_conflict|changed while|workspace_timezone_locked/.test(message))return {state:'conflict',reason:'version_changed'};
  if(/authorization|permission/.test(message))return {state:'unavailable',reasonCode:'ACCESS_DENIED'};
  if(code==='23505'||/invalid|valid company|valid coverage|active positions/.test(message))return {state:'invalid',fieldErrors:[{field:stepId,code:'CANONICAL_VALIDATION_FAILED'}]};
  return started&&(!/^[0-9A-Z]{5}$/.test(code)||code.startsWith('08'))?{state:'outcome_unknown',operationId:command.operationId}:{state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'};
 }
}
