'use client';
import { useState } from 'react';
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

export type NativeConfigurationSources={employees:{id:string;name:string;role:string;active:boolean}[];locations:{id:string;name:string;active:boolean}[];breakTypes:{id:string;name:string;active:boolean}[]};
export type NativeDraft={employeeId:string;configuration:NativeConfigurationRevision|null;opening:NativeYtd|null;scope:NativeProfilesResponse['managerScopes'][number]|null;profileFields:FieldEntries;openingFields:FieldEntries;scopeFields:FieldEntries;wageIds:string[];employerIds:string[];deductionIds:string[];policyId:string;taxId:string};
function draftFor(employeeId:string,data:NativeProfilesResponse):NativeDraft {const configuration=data.configurations.find(c=>c.employeeId===employeeId)??null;return {employeeId,configuration,opening:data.openingYtd.filter(o=>o.employeeId===employeeId).sort((a,b)=>b.ytd.year-a.ytd.year)[0]?.ytd??null,scope:data.managerScopes.find(s=>s.employeeId===employeeId)??null,profileFields:null,openingFields:null,scopeFields:null,wageIds:configuration?.wages.map(w=>w.id)??[crypto.randomUUID()],employerIds:configuration?.tax?.employerContributions.map((_,i)=>String(i))??['0','1','2'],deductionIds:configuration?.deductions.map(d=>d.id)??[],policyId:configuration?.wages.find(w=>w.workweekPolicy)?.workweekPolicy?.id??crypto.randomUUID(),taxId:configuration?.tax?.id??crypto.randomUUID()};}
export function NativePayrollConfig({settings,sources,recoveryScope}:{settings:PayrollSettingsResponse;sources:NativeConfigurationSources|null;recoveryScope:string}) {
 const resource=usePayrollResource('/api/payroll/native-profiles',readNativeProfiles);
 const history=usePayrollResource('/api/payroll/runs',readRuns);
 const operation=usePayrollOperation('/api/payroll/native-profiles',resource.reload,`${recoveryScope}:native-profiles`);
 const [draft,setDraft]=useState<NativeDraft|null>(null);const [reset,setReset]=useState(0);const [resetConfirm,setResetConfirm]=useState(false);const [openingReset,setOpeningReset]=useState(0);const [openingChoice,setOpeningChoice]=useState<string|null>(null);
 const data=!resource.loading&&!resource.error&&settings.capabilities.canConfigure?resource.data:null;
 if(!settings.capabilities.canConfigure)return null;
 const change=(patch:Partial<NativeDraft>)=>setDraft(d=>d?{...d,...patch}:d);
 const select=(employeeId:string)=>{if(data)setDraft(employeeId?draftFor(employeeId,data):null);setResetConfirm(false);setReset(n=>n+1);};
 const frozen=!!draft?.opening&&!!history.data?.runs?.some(r=>r.sourceAuthority==='NATIVE_RECORDED_TIME'&&r.status==='APPROVED'&&r.nativeCalculation?.employees.some(e=>e.employeeId===draft.employeeId&&e.breakdown.ytdBefore.year===draft.opening?.year));
 const current=draft&&data?.configurations.find(c=>c.employeeId===draft.employeeId);
 return <div className="pw-native-config"><OperationFeedback operation={operation}/>
   {resource.loading&&<PayrollState title="Loading employee payroll facts">Checking current Owner access.</PayrollState>}
   {resource.error&&<PayrollState title="Employee payroll facts unavailable" error retry={()=>void resource.reload()}>{resource.error}</PayrollState>}
   {data&&!sources&&<PayrollState title="Configuration choices unavailable" error>Reload this page to check the current employee, location and break-type sources before editing.</PayrollState>}
   {data&&sources&&<>
    <PayrollPanel title="Employee payroll facts" description="Document actual wages, withholding and workweek evidence. Saving facts does not approve payroll.">
      <label>Employee<select aria-label="Employee payroll facts recipient" value={draft?.employeeId??''} disabled={operation.locked} onChange={e=>select(e.target.value)}><option value="">Choose an employee</option>{settings.employees.map(e=><option value={e.id} key={e.id}>{e.name}{!e.active?' · Inactive':''}</option>)}</select></label>
      {!draft&&<p className="pw-small">Choose an employee to review saved facts and incomplete setup. Missing information remains missing.</p>}
      {draft&&<><div className="pw-config-status"><span className="pw-status">Current revision {current?.revision??0}</span><span>Draft based on revision {draft.configuration?.revision??0}</span></div>
        {current&&<div className="pw-saved-summary"><strong>Saved facts</strong><p>{current.reason}</p><small>{current.wages.length} effective wage {current.wages.length===1?'record':'records'} · {current.tax?'Withholding facts saved':'Withholding facts missing'} · {current.wages.every(w=>!!w.workweekPolicy)?'Workweek evidence saved':'Workweek evidence missing'}</small></div>}
        {current?.revision!==draft.configuration?.revision&&current&&<p className="pw-notice" role="status">Saved facts changed. Your draft is retained at its original revision. Review current facts before recording a replacement.</p>}
        <div className="pw-actions"><button className="pw-button pw-secondary" type="button" disabled={operation.locked} onClick={()=>setResetConfirm(true)}><ArrowCounterClockwiseIcon size={18} aria-hidden/>Review current facts</button></div>
        {resetConfirm&&<div className="pw-state"><p>Replace this unsaved draft with the latest saved facts? All three configuration forms for this employee will reset.</p><div className="pw-actions"><button type="button" className="pw-button" onClick={()=>select(draft.employeeId)}>Replace draft</button><button type="button" className="pw-button pw-secondary" onClick={()=>setResetConfirm(false)}>Keep editing</button></div></div>}
        <NativeProfileForm key={`${draft.employeeId}:${reset}`} draft={draft} sources={sources} operation={operation} change={change}/>
      </>}
    </PayrollPanel>
    <PayrollPanel title="Opening balances" description="Separately attest documented balances before the first native payroll. Missing differs from an attested zero.">{draft?<>
       <label>Opening record<select aria-label="Opening record" value={draft.opening?String(draft.opening.year):'NEW'} disabled={operation.locked} onChange={e=>setOpeningChoice(e.target.value)}><option value="NEW">New documented tax year</option>{data.openingYtd.filter(o=>o.employeeId===draft.employeeId).map(o=><option key={o.ytd.year} value={String(o.ytd.year)}>Year {o.ytd.year} · Revision {o.ytd.revision}</option>)}</select></label>
       {openingChoice!==null&&<div className="pw-state"><p>Load this opening record? Unsaved opening fields will be replaced. Employee payroll facts and Manager access drafts stay in place.</p><div className="pw-actions"><button type="button" className="pw-button" onClick={()=>{change({opening:data.openingYtd.find(o=>o.employeeId===draft.employeeId&&String(o.ytd.year)===openingChoice)?.ytd??null,openingFields:null});setOpeningReset(n=>n+1);setOpeningChoice(null);}}>Load opening record</button><button type="button" className="pw-button pw-secondary" onClick={()=>setOpeningChoice(null)}>Keep draft</button></div></div>}
       {history.error&&<button type="button" className="pw-button pw-secondary" onClick={()=>void history.reload()}>Reload approval history</button>}
       <NativeOpeningForm key={`${draft.employeeId}:${reset}:${openingReset}`} draft={draft} sources={sources} operation={operation} change={change} frozen={frozen} verifying={history.loading} historyError={history.error}/>
     </>:<p className="pw-small">Choose an employee above. Prior gross, net and tax-specific wage bases require their own records.</p>}</PayrollPanel>
    <PayrollPanel title="Manager payroll access" description="Grant review or approval only for specific payroll locations.">{draft&&sources.employees.some(e=>e.id===draft.employeeId&&e.active&&e.role==='MANAGER')?<NativeScopeForm key={`${draft.employeeId}:${reset}`} draft={draft} sources={sources} operation={operation} change={change}/>:<p className="pw-small">Choose an active Manager above. A scheduling assignment or an older grant does not establish current payroll permission.</p>}</PayrollPanel>
   </>}
 </div>;
}
