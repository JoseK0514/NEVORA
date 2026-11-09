import 'server-only';
import {randomUUID} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {CREATION_MODES,parseEmployeeCreation,type CreationMode,type CreationCheck,type CreationSource,type CreationTarget,type EmployeeCreationSnapshot} from '../employee-creation';
import {employeeRequestId,exchangeSlot} from '../employee-exchange';
import {marketplaceDisplayName} from '../exchange-marketplace';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {assertEmployeeViewProof,employeeReadLimits,employeeViewGuards,readEmployeeWorkspace} from './employee-profile.server';
import {neonNotificationExecutor} from './notification-transactions';
import {isManagementAuthorizationError} from './management-session';
import {notificationReadSql,sqlNotificationStateRepository} from './notification-state';
import {readActivePresentation} from '../workspace-presentation/service';
import {getCalloutShift,getPublishedShift,listSwapTargets} from './exchanges';
import {readShiftChangeTerms} from './shift-change-snapshot';
import {matchesCalloutShift,matchesDisplayedShift} from '../shift-changes/displayed-terms';
import {readShiftChangeAvailability} from './shift-changes';
const unavailable:CreationCheck={allowed:false,notice:'This action couldn’t be checked. Refresh before continuing.'};
/** Own reviewed creation view. Existing candidate, terms and command readers retain all business decisions. */
export async function readEmployeeCreation(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor(),modeValue:string,selection:string):Promise<EmployeeCreationSnapshot>{
 try{assertEmployeeViewProof(proof);if(!CREATION_MODES.includes(modeValue as CreationMode)||!employeeRequestId(selection)||selection.length>128)throw Error('selection');}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const mode=modeValue as CreationMode,signal=AbortSignal.timeout(8000),workspace=await readEmployeeWorkspace(executor,signal),guards=[...employeeReadLimits,...employeeViewGuards(proof,workspace)];
  let scope:string[]|null=null;
  const scopeGuards=():SqlStatement[]=>scope===null?[]:[{text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM (${notificationReadSql.recipient()}) current_access WHERE allowed_location_ids=$2::text[]) THEN '1' ELSE 'management_authorization' END)::integer AS employee_location_scope_guard`,values:[proof.employee.id,scope]}];
  const guarded:SqlExecutor={
   async query<T>(statement:SqlStatement){const admission=[...guards,...scopeGuards()];const rows=await executor.transaction([...admission,statement,...employeeViewGuards(proof,workspace),...scopeGuards()],signal);return rows[admission.length] as T[];},
   async transaction(statements:SqlStatement[]){const admission=[...guards,...scopeGuards()];const rows=await executor.transaction([...admission,...statements,...employeeViewGuards(proof,workspace),...scopeGuards()],signal);return rows.slice(admission.length,admission.length+statements.length);},
  };
  const presentation=await readActivePresentation(workspace.id,guarded,{strict:true}),enabled=presentation.modules.marketplace;
  const access=await sqlNotificationStateRepository(guarded,workspace).recipientAccess(proof.employee.id);
  if(!access?.active||access.employeeId!==proof.employee.id||access.role!==proof.employee.role)return {state:'unavailable',reason:'access_denied'};
  scope=[...access.allowedLocationIds];const allowed=new Set(scope);
  let source:CreationSource|null=null,targets:CreationTarget[]|null=[],partial=false,check:CreationCheck={allowed:false,notice:'This shift isn’t available to your current account.'},coverage:CreationCheck={...unavailable};
  if(enabled){
   // "I can't work" also opens a shift with held edits, showing its published
   // version (Jose, 2026-10-31); swaps and cover offers keep refusing it.
   const callout=mode==='callout'?await getCalloutShift(selection,guarded):null;
   const shift=mode==='callout'?callout:await getPublishedShift(selection,guarded),reviewed=shift?.employeeId===proof.employee.id&&allowed.has(shift.locationId)?await readShiftChangeTerms(proof,selection,undefined,guarded):null;
   const slot=shift?exchangeSlot(shift):null;
   if(shift&&slot&&reviewed&&(callout?matchesCalloutShift(callout,reviewed.source):matchesDisplayedShift(shift,reviewed.source))){
    const fields={sourceShiftId:selection,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint};
    source={...slot,id:selection,weekStart:shift.weekStart,fields};
    if(mode!=='callout'){
     const result=await readShiftChangeAvailability(proof,{kind:'OFFER_COVERAGE',operationId:randomUUID(),...fields},guarded).catch(()=>unavailable);coverage={allowed:result.allowed===true,notice:result.notice};
    }
    if(mode==='cover')check=coverage;
    else if(mode==='callout'){
     // Admission is reason-independent; actual selected reason/note remain validated by the command parser on submit.
     const result=await readShiftChangeAvailability(proof,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...fields,reasonCode:'ILLNESS'},guarded).catch(()=>unavailable);check={allowed:result.allowed===true,notice:result.notice};
    }else{
     const candidates=await listSwapTargets(shift,proof.employee.id,guarded).catch(()=>null);
     if(candidates===null){targets=null;partial=true;check={...unavailable};}
     else{
      const reads=await Promise.all(candidates.filter(row=>allowed.has(row.locationId)).map(async row=>{
       try{
        const terms=await readShiftChangeTerms(proof,selection,row.id,guarded),display=exchangeSlot(row);
        if(!display||!terms?.target||!terms.targetTermsFingerprint||terms.sourceTermsFingerprint!==fields.sourceTermsFingerprint||!matchesDisplayedShift(shift,terms.source)||!matchesDisplayedShift(row,terms.target))return 'unavailable' as const;
        const targetFields={targetShiftId:row.id,targetEpisodeId:terms.target.assignmentEpisodeId,targetTermsFingerprint:terms.targetTermsFingerprint};
        const result=await readShiftChangeAvailability(proof,{kind:'PROPOSE_SWAP',operationId:randomUUID(),...fields,...targetFields},guarded);
        return result.allowed?{...display,id:row.id,person:marketplaceDisplayName(row.employeeName),fields:targetFields}:result.refusal==='review'||result.refusal==='other'?'unavailable' as const:null;
       }catch{return 'unavailable' as const;}
      }));
      partial=reads.includes('unavailable');targets=reads.filter((row):row is CreationTarget=>row!==null&&row!=='unavailable');
      check={allowed:targets.length>0,notice:partial?'Some shift options couldn’t be checked. Refresh to try again.':targets.length?null:'No eligible shifts to swap with right now.'};
     }
    }
    const latest=await readShiftChangeTerms(proof,selection,undefined,guarded);
    if(!latest||latest.sourceTermsFingerprint!==fields.sourceTermsFingerprint){source=null;targets=[];partial=false;check={allowed:false,notice:'This shift changed. Return to your schedule to review it.'};coverage={...check};}
   }
  }
  const current=await readActivePresentation(workspace.id,guarded,{strict:true});if(current.revision!==presentation.revision)throw Error('Modules changed');
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM (expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash]});
  return parseEmployeeCreation({state:'ready',kind:'creation',authority:employeeViewAuthority(proof,'creation'),...lease,timeZone:workspace.timeZone,enabled,mode,selection,source,targets,partial,check,coverage});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
