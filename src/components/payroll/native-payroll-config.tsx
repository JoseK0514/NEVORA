'use client';
import { useCallback, useState } from 'react';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/ssr';
import type { PayrollSettingsResponse } from '@/lib/payroll/contracts';
import type { NativeConfigurationRevision, NativeYtd, NativeProfilesResponse } from '@/lib/payroll/native/contracts';
import { readRuns } from './api';
import { readNativeProfiles } from './native-profile-api';
import { usePayrollOperation, usePayrollResource } from './use-payroll';
import { OperationFeedback, PayrollPanel, PayrollState } from './payroll-ui';
import { NativeProfileForm } from './native-profile-editor';
import { NativeOpeningForm, NativeScopeForm } from './native-opening-scope';
import type { FieldEntries } from './native-config-fields';
import { usePayrollCopy } from './payroll-copy';

export type NativeConfigurationSources={employees:{id:string;name:string;role:string;active:boolean}[];locations:{id:string;name:string;active:boolean}[];breakTypes:{id:string;name:string;active:boolean}[]};
export type NativeDraft={employeeId:string;configuration:NativeConfigurationRevision|null;opening:NativeYtd|null;scope:NativeProfilesResponse['managerScopes'][number]|null;profileFields:FieldEntries;openingFields:FieldEntries;scopeFields:FieldEntries;wageIds:string[];employerIds:string[];deductionIds:string[];policyId:string;taxId:string};
function draftFor(employeeId:string,data:NativeProfilesResponse):NativeDraft {const configuration=data.configurations.find(c=>c.employeeId===employeeId)??null;return {employeeId,configuration,opening:data.openingYtd.filter(o=>o.employeeId===employeeId).sort((a,b)=>b.ytd.year-a.ytd.year)[0]?.ytd??null,scope:data.managerScopes.find(s=>s.employeeId===employeeId)??null,profileFields:null,openingFields:null,scopeFields:null,wageIds:configuration?.wages.map(w=>w.id)??[crypto.randomUUID()],employerIds:configuration?.tax?.employerContributions.map((_,i)=>String(i))??['0','1','2'],deductionIds:configuration?.deductions.map(d=>d.id)??[],policyId:configuration?.wages.find(w=>w.workweekPolicy)?.workweekPolicy?.id??crypto.randomUUID(),taxId:configuration?.tax?.id??crypto.randomUUID()};}
export function NativePayrollConfig({settings,sources,recoveryScope}:{settings:PayrollSettingsResponse|null;sources:NativeConfigurationSources|null;recoveryScope:string}) {
 const {native:{config:t,fields:{inactive:nativeInactive}},lang}=usePayrollCopy();
 const decode=useCallback((value:unknown)=>readNativeProfiles(value,lang),[lang]);
 const resource=usePayrollResource('/api/payroll/native-profiles',decode);
 const history=usePayrollResource('/api/payroll/runs',readRuns);
 const operation=usePayrollOperation('/api/payroll/native-profiles',resource.reload,`${recoveryScope}:native-profiles`,false);
 const [draft,setDraft]=useState<NativeDraft|null>(null);const [reset,setReset]=useState(0);const [resetConfirm,setResetConfirm]=useState(false);const [openingReset,setOpeningReset]=useState(0);const [openingChoice,setOpeningChoice]=useState<string|null>(null);
 const data=!resource.loading&&!resource.error&&settings?.capabilities.canConfigure?resource.data:null;
 if(!settings?.capabilities.canConfigure)return null;
 const change=(patch:Partial<NativeDraft>)=>setDraft(d=>d?{...d,...patch}:d);
 const select=(employeeId:string)=>{if(data)setDraft(employeeId?draftFor(employeeId,data):null);setResetConfirm(false);setReset(n=>n+1);};
 const frozen=!!draft?.opening&&!!history.data?.runs?.some(r=>r.sourceAuthority==='NATIVE_RECORDED_TIME'&&r.status==='APPROVED'&&r.nativeCalculation?.employees.some(e=>e.employeeId===draft.employeeId&&e.breakdown.ytdBefore.year===draft.opening?.year));
 const current=draft&&data?.configurations.find(c=>c.employeeId===draft.employeeId);
 return <div className="pw-native-config"><OperationFeedback operation={operation}/>
   {resource.loading&&<PayrollState title={t.loadingTitle}>{t.loadingLine}</PayrollState>}
   {resource.error&&<PayrollState title={t.unavailableTitle} error retry={()=>void resource.reload()}>{resource.error}</PayrollState>}
   {data&&!sources&&<PayrollState title={t.sourcesTitle} error>{t.sourcesLine}</PayrollState>}
   {data&&sources&&<>
    <PayrollPanel title={t.factsTitle} description={t.factsDescription}>
      <label>{t.employee}<select aria-label={t.employeeAria} value={draft?.employeeId??''} disabled={operation.locked} onChange={e=>select(e.target.value)}><option value="">{t.chooseEmployee}</option>{settings.employees.map(e=><option value={e.id} key={e.id}>{e.name}{!e.active?nativeInactive:''}</option>)}</select></label>
      {!draft&&<p className="pw-small">{t.chooseEmployeeLine}</p>}
      {draft&&<><div className="pw-config-status"><span className="pw-status">{t.currentRevision(current?.revision??0)}</span><span>{t.draftRevision(draft.configuration?.revision??0)}</span></div>
        {current&&<div className="pw-saved-summary"><strong>{t.savedFacts}</strong><p>{current.reason}</p><small>{t.wageRecords(current.wages.length)} · {current.tax?t.taxSaved:t.taxMissing} · {current.wages.every(w=>!!w.workweekPolicy)?t.workweekSaved:t.workweekMissing}</small></div>}
        {current?.revision!==draft.configuration?.revision&&current&&<p className="pw-notice" role="status">{t.factsChanged}</p>}
        <div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={operation.locked} onClick={()=>setResetConfirm(true)}><ArrowCounterClockwiseIcon size={18} weight="bold" aria-hidden/>{t.reviewCurrent}</button></div>
        {resetConfirm&&<div className="pw-state"><p>{t.replaceQuestion}</p><div className="pw-actions"><button type="button" className="pw-button" onClick={()=>select(draft.employeeId)}>{t.replaceDraft}</button><button type="button" className="pw-button pw-secondary" onClick={()=>setResetConfirm(false)}>{t.keepEditing}</button></div></div>}
        <NativeProfileForm key={`${draft.employeeId}:${reset}`} draft={draft} sources={sources} operation={operation} change={change}/>
      </>}
    </PayrollPanel>
    <PayrollPanel title={t.openingTitle} description={t.openingDescription}>{draft?<>
       <label>{t.openingRecord}<select aria-label={t.openingRecord} value={draft.opening?String(draft.opening.year):'NEW'} disabled={operation.locked} onChange={e=>setOpeningChoice(e.target.value)}><option value="NEW">{t.newYear}</option>{data.openingYtd.filter(o=>o.employeeId===draft.employeeId).map(o=><option key={o.ytd.year} value={String(o.ytd.year)}>{t.yearRevision(o.ytd.year,o.ytd.revision)}</option>)}</select></label>
       {openingChoice!==null&&<div className="pw-state"><p>{t.loadQuestion}</p><div className="pw-actions"><button type="button" className="pw-button" onClick={()=>{change({opening:data.openingYtd.find(o=>o.employeeId===draft.employeeId&&String(o.ytd.year)===openingChoice)?.ytd??null,openingFields:null});setOpeningReset(n=>n+1);setOpeningChoice(null);}}>{t.loadOpening}</button><button type="button" className="pw-button pw-secondary" onClick={()=>setOpeningChoice(null)}>{t.keepDraft}</button></div></div>}
       {history.error&&<button type="button" className="pw-button pw-secondary" onClick={()=>void history.reload()}>{t.reloadHistory}</button>}
       <NativeOpeningForm key={`${draft.employeeId}:${reset}:${openingReset}`} draft={draft} sources={sources} operation={operation} change={change} frozen={frozen} verifying={history.loading} historyError={history.error}/>
     </>:<p className="pw-small">{t.chooseAbove}</p>}</PayrollPanel>
    <PayrollPanel title={t.scopeTitle} description={t.scopeDescription}>{draft&&sources.employees.some(e=>e.id===draft.employeeId&&e.active&&e.role==='MANAGER')?<NativeScopeForm key={`${draft.employeeId}:${reset}`} draft={draft} sources={sources} operation={operation} change={change}/>:<p className="pw-small">{t.chooseManager}</p>}</PayrollPanel>
   </>}
 </div>;
}
