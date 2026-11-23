'use client';
import { useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import type { NativeDraft, NativeConfigurationSources } from './native-payroll-config';
import type { usePayrollOperation } from './use-payroll';
import { profileFromForm } from './native-profile-form';
import { DraftFields,Input,Select,Check,LocationFields,localInstant,hourlyDollars,captureForm,savedValue } from './native-config-fields';
import { NativeTaxFields, NativeDeductionFields } from './native-tax-fields';
import { flagProblems, formKeys } from './form-keys';
import { usePayrollCopy } from './payroll-copy';
export type EditorProps={draft:NativeDraft;sources:NativeConfigurationSources;operation:ReturnType<typeof usePayrollOperation>;change:(patch:Partial<NativeDraft>)=>void};
/** Owner premium P10: every field that needs attention is marked at once and named in the form's one error line (no
 * browser bubble on the first field only); the rows holding them open and the first takes focus. */
export function validateForm(form:HTMLFormElement,report?:(message:string)=>void){const problem=flagProblems(form);if(problem){report?.(problem);return false;}return true;}
export function NativeProfileForm({draft,sources,operation,change}:EditorProps){
 const {native:{profile:t},lang}=usePayrollCopy();
 const [error,setError]=useState('');const c=draft.configuration;
 const [tax,setTax]=useState(draft.profileFields===null?!!c?.tax:draft.profileFields.some(([k])=>k==='taxEnabled'));
 const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError('');const form=event.currentTarget;if(!validateForm(form,setError))return;const values=new FormData(form);change({profileFields:captureForm(form)});try{const configuration=profileFromForm(values,draft.employeeId,c,lang);void operation.submit({action:'SAVE_NATIVE_PROFILE',expectedRevision:c?.revision??0,reason:String(values.get('profileReason')??'').trim(),configuration});}catch(e){setError(e instanceof Error?e.message:t.checkFacts);}};
 return <DraftFields entries={draft.profileFields}><form className="pw-form pw-config-form" {...formKeys} onSubmit={save} onChange={e=>change({profileFields:captureForm(e.currentTarget)})}><fieldset disabled={operation.locked}>
  <details className="pw-config-disclosure" open><summary>{t.wagesSummary}</summary><p className="pw-small">{t.wagesLine}</p>
  {draft.wageIds.map((id,index)=>{const w=c?.wages.find(w=>w.id===id),prefix=`wage.${id}.`;const types=[...sources.breakTypes,...(w?.breakRules??[]).filter(b=>!sources.breakTypes.some(t=>t.id===b.typeId)).map(b=>({id:b.typeId,name:t.savedBreak(b.typeId),active:false}))];return <section className="pw-rule" key={id}><input type="hidden" name="wageId" value={id}/><div className="pw-rule-heading"><h4>{t.effectiveWage(index+1)}</h4>{draft.wageIds.length>1&&<button className="pw-icon-button" type="button" aria-label={t.removeWage(index+1)} onClick={()=>change({wageIds:draft.wageIds.filter(v=>v!==id)})}><TrashIcon size={18} weight="bold" aria-hidden/></button>}</div><div className="pw-fields">
   <Input name={prefix+'rate'} label={t.hourlyWage} value={hourlyDollars(w?.hourlyRateMinor)} help={t.hourlyHelp}/>
   <Input name={prefix+'from'} label={t.wageFrom} type="datetime-local" step="any" value={localInstant(w?.effectiveFrom)}/><Input name={prefix+'to'} label={t.wageTo} type="datetime-local" step="any" required={false} value={localInstant(w?.effectiveTo)}/>
   <Select name={prefix+'scope'} label={t.coverage} value={w?.minimumWageCoverage?'CONFIRMED':''} options={[[ 'CONFIRMED',t.coverageOption]]}/>
   <Select name={prefix+'overtime'} label={t.overtime} value={w?.overtime} options={[[ 'TIME_AND_HALF',t.timeAndHalf],['DOUBLE_PRESERVED',t.doublePreserved]]}/>
  </div><LocationFields name={prefix+'locations'} locations={sources.locations} selected={w?.locationIds}/>
   {!!types.length&&<div className="pw-fields">{types.map(bt=><div key={bt.id}><input type="hidden" name={prefix+'breakId'} value={bt.id}/><Select name={prefix+'break.'+bt.id} label={`${bt.name}${!bt.active?t.savedInactive:''}`} value={w?.breakRules.find(b=>b.typeId===bt.id)?.treatment} required={false} options={[[ 'PAID_REST',t.paidRest],['UNPAID_RELIEVED_MEAL',t.unpaidMeal]]}/></div>)}</div>}
   <Input name={prefix+'evidence'} label={t.wageEvidence} value={w?.evidenceReference}/><Check name={prefix+'attest'} label={t.wageAttest} value={w?.standardContextAttested} required/>
   {w?.workweekAnchorDate&&<p className="pw-small">{t.legacy(w.workweekAnchorDate,w.workweekStartTime??'')}</p>}
  </section>;})}<button type="button" className="pw-button pw-secondary" onClick={()=>change({wageIds:[...draft.wageIds,crypto.randomUUID()]})}><PlusIcon size={18} weight="bold" aria-hidden/>{t.addWage}</button></details>
  <details className="pw-config-disclosure"><summary>{t.workweekSummary}</summary><p className="pw-small">{t.workweekLine}</p>
   {draft.wageIds.map((id,index)=><WorkweekFields key={id} prefix={`wage.${id}.`} index={index} p={c?.wages.find(w=>w.id===id)?.workweekPolicy??null} entries={draft.profileFields}/>)}
   <p className="pw-small">{t.shiftDayLine}</p>
  </details>
  <details className="pw-config-disclosure"><summary>{t.taxSummary}</summary><Check name="taxEnabled" label={t.taxEnabled} value={!!c?.tax} onChange={setTax}/>{tax?<NativeTaxFields draft={draft} change={change}/>:<p className="pw-small">{t.taxMissing}</p>}</details>
  <details className="pw-config-disclosure"><summary>{t.deductionSummary}</summary><p className="pw-small">{t.deductionLine}</p><NativeDeductionFields draft={draft} change={change}/><Check name="deductionsReviewed" label={t.deductionsReviewed} required/></details>
  <section className="pw-section"><Input name="profileReason" label={t.reason}/><p className="pw-small">{t.saveLine(c?.revision??0)}</p>{error&&<p className="pw-error" role="alert">{error}</p>}<button type="submit" className="pw-button">{t.save}</button></section>
 </fieldset></form></DraftFields>;
}

function WorkweekFields({prefix,index,p,entries}:{prefix:string;index:number;p:import('@/lib/payroll/native/workweek-policy').NativeWorkweekPolicy|null;entries:NativeDraft['profileFields']}) {
 const {native:{workweek:t}}=usePayrollCopy();
 const [policyKind,setPolicyKind]=useState(savedValue(entries,prefix+'policyKind',p?.origin.kind??'UNKNOWN'));
 const [policyId]=useState(()=>savedValue(entries,prefix+'policyId',p?.id??crypto.randomUUID()));
 const origin=p?.origin;
 return <section className="pw-rule"><h4>{t.title(index+1)}</h4>{p&&<p className="pw-small">{t.savedPolicy(p.id,p.revision)}</p>}
   <input type="hidden" name={prefix+'policyId'} value={policyId}/><label>{t.status}<select aria-label={t.status} name={prefix+'policyKind'} value={policyKind} onChange={e=>setPolicyKind(e.target.value)}><option value="UNKNOWN">{t.unknown}</option><option value="STATUTORY_DEFAULT">{t.statutory}</option><option value="EMPLOYER_NOTICE">{t.notice}</option></select></label>
   {policyKind!=='UNKNOWN'&&<><div className="pw-fields"><Input name={prefix+'policyFrom'} label={t.policyFrom} type="datetime-local" step="any" value={localInstant(p?.effectiveFrom)}/><Input name={prefix+'policyTo'} label={t.policyTo} type="datetime-local" step="any" required={false} value={localInstant(p?.effectiveTo)}/></div>
    {policyKind==='STATUTORY_DEFAULT'?<><p className="pw-small">{t.statutoryLine}</p><Check name={prefix+'noticeAbsence'} label={t.absenceCheck} required value={origin?.kind==='STATUTORY_DEFAULT'&&origin.noticeAbsenceConfirmed}/><Input name={prefix+'policyEvidence'} label={t.searchEvidence} value={origin?.kind==='STATUTORY_DEFAULT'?origin.evidenceReference:''}/></>:<><div className="pw-fields">
     <Select name={prefix+'policyWeekday'} label={t.weekday} value={p?String(p.boundary.weekday):''} options={t.weekdays.map((d,i)=>[String(i+1),d])}/><Input name={prefix+'policyClock'} label={t.time} type="time" value={p?.boundary.startTime}/>
     <Input name={prefix+'noticeReference'} label={t.noticeReference} value={origin?.kind==='EMPLOYER_NOTICE'?origin.noticeReference:''}/><Input name={prefix+'noticeDelivered'} label={t.delivered} type="datetime-local" step="any" value={localInstant(origin?.kind==='EMPLOYER_NOTICE'?origin.deliveredAt:null)}/>
     <Select name={prefix+'noticeMethod'} label={t.method} value={origin?.kind==='EMPLOYER_NOTICE'?origin.deliveryMethod:''} options={[[ 'POSTED_ACCESSIBLE',t.posted],['WRITTEN_EMPLOYEE',t.written],['ELECTRONIC_ACCESSIBLE',t.electronic]]}/>
     <Select name={prefix+'noticeKind'} label={t.kind} value={origin?.kind==='EMPLOYER_NOTICE'?origin.noticeKind:''} options={[[ 'INITIAL',t.initial],['CHANGE',t.change]]}/><Input name={prefix+'previousPolicyReference'} label={t.previous} required={false} value={origin?.kind==='EMPLOYER_NOTICE'?origin.previousPolicyReference??'':''}/>
    </div><Check name={prefix+'noticeCoverage'} label={t.coverage} required value={origin?.kind==='EMPLOYER_NOTICE'&&origin.employeeCoverageConfirmed}/><p className="pw-small">{t.noticeLine}</p></>}
    <Check name={prefix+'federalMatch'} label={t.federalMatch} required value={p?.federalWorkweek==='SAME_VERIFIED_BOUNDARY'}/><Input name={prefix+'federalEvidence'} label={t.federalEvidence} value={p?.federalEvidenceReference}/>
   </>}
 </section>;
}
