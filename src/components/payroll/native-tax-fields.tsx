'use client';
import { useState } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import type { NativeTaxProfile } from '@/lib/payroll/native/contracts';
import type { NativeDraft } from './native-payroll-config';
import { Input, Select, Check, usd, savedValue } from './native-config-fields';
import { usePayrollCopy } from './payroll-copy';

type Props={draft:NativeDraft;change:(patch:Partial<NativeDraft>)=>void};
export function NativeTaxFields({draft,change}:Props){const {native:{tax:x,fields:f}}=usePayrollCopy();const t=draft.configuration?.tax;const c=t?.certificate;
 const [method,setMethod]=useState(savedValue(draft.profileFields,'certificateMethod',c?.additionalMethod??''));
 return <><input type="hidden" name="taxId" value={draft.taxId}/><div className="pw-fields"><Input name="taxFrom" label={x.from} type="date" value={t?.effectiveFrom}/><Input name="taxTo" label={x.to} type="date" required={false} value={t?.effectiveTo??''}/><Select name="taxCoverage" label={x.coverage} value={t?'CONFIRMED':''} options={[[ 'CONFIRMED',x.coverageOption]]}/><Input name="certificateEvidence" label={x.certificateEvidence} value={t?.certificateReference}/></div>
 <h4>{x.certificateTitle}</h4><div className="pw-fields">
  <Select name="personal" label={x.personal} value={c?.personal} options={[[ 'INDIVIDUAL_FULL',x.individual],['MARRIED_JOINT_FULL',x.marriedJoint],['MARRIED_HALF_OR_OPTIONAL_FULL',x.marriedHalf],['NONE',x.noPersonal]]}/>
  <Input name="fullDependents" label={x.fullDependents} type="number" min={0} max={99} value={c?.fullDependents}/><Input name="halfDependents" label={x.halfDependents} type="number" min={0} max={99} value={c?.halfDependents}/><Input name="deductionAllowances" label={x.allowances} type="number" min={0} max={1000} value={c?.deductionAllowances}/>
  <Select name="veteran" label={x.veteran} value={c?c.veteran?'YES':'NO':''} options={[[ 'YES',x.yes],['NO',x.no]]}/>
  <label>{x.method}<select aria-label={x.method} name="certificateMethod" required value={method} onChange={e=>setMethod(e.target.value)}><option value="">{f.choose}</option><option value="FIXED">{x.fixed}</option><option value="PERCENTAGE">{x.percentage}</option></select></label>
  {method==='FIXED'&&<Input name="certificateAmount" label={x.amount} value={usd(c?.additionalMinor)}/>}{method==='PERCENTAGE'&&<Input name="certificatePercent" label={x.percent} value={c?.additionalBasisPoints==null?'':usd(String(c.additionalBasisPoints))}/>}
  <Select name="wageDollarRounding" label={x.rounding} value={c?.wageDollarRounding} options={[[ 'NONE',x.noRounding],['NEAREST_DOLLAR',x.nearestDollar]]}/>
  <Input name="sinotRate" label={x.sinot} value={t?usd(String(t.sinotEmployeeBasisPoints)):''} help={x.sinotHelp}/>
 </div><p className="pw-small">{x.centLine}</p>
 <h4>{x.employerTitle}</h4><p className="pw-small">{x.employerLine}</p>
 {draft.employerIds.map((id,index)=>{const e=t?.employerContributions[Number(id)],prefix=`employer.${id}.`,standard=['FUTA','PR_UI','CFSE'][index]??'';return <EmployerFields key={id} id={id} prefix={prefix} item={e} standard={standard} entries={draft.profileFields} remove={draft.employerIds.length>3?()=>change({employerIds:draft.employerIds.filter(v=>v!==id)}):undefined}/>;})}
 <button type="button" className="pw-button pw-secondary" onClick={()=>change({employerIds:[...draft.employerIds,String(Math.max(2,...draft.employerIds.map(Number))+1)]})}><PlusIcon size={18} weight="bold" aria-hidden/>{x.addEmployer}</button>
 <Check name="employerAttest" label={x.employerAttest} required value={t?.employerCoverageAttested}/>
 </>;
}
function EmployerFields({id,prefix,item,standard,entries,remove}:{id:string;prefix:string;item:NativeTaxProfile['employerContributions'][number]|undefined;standard:string;entries:NativeDraft['profileFields'];remove?:()=>void}){
 const {native:{tax:x,fields:f}}=usePayrollCopy();
 const [applicability,setApplicability]=useState(savedValue(entries,prefix+'applicability',item?.applicability??''));
 return <section className="pw-rule"><input type="hidden" name="employerId" value={id}/><div className="pw-rule-heading"><h4>{item?.label??(standard||x.obligation)}</h4>{remove&&<button type="button" className="pw-icon-button" aria-label={x.removeObligation(item?.label??standard)} onClick={remove}><TrashIcon size={18} weight="bold" aria-hidden/></button>}</div><div className="pw-fields">
 <Input name={prefix+'code'} label={x.code} value={item?.code??standard}/><Input name={prefix+'label'} label={x.label} value={item?.label??standard}/>
 <label>{x.applicability}<select aria-label={x.applicability} name={prefix+'applicability'} required value={applicability} onChange={e=>setApplicability(e.target.value)}><option value="">{f.choose}</option><option value="APPLICABLE">{x.applicable}</option><option value="EXEMPT">{x.exempt}</option></select></label>
 {applicability==='APPLICABLE'&&<><Input name={prefix+'rate'} label={x.rate} value={item?.basisPoints==null?'':usd(String(item.basisPoints))}/><Input name={prefix+'cap'} label={x.cap} required={false} value={usd(item?.capMinor)} help={x.capHelp}/></>}
 <Input name={prefix+'opening'} label={x.opening} value={usd(item?.wagesBeforeMinor)}/><Input name={prefix+'evidence'} label={x.evidence} value={item?.evidenceReference}/></div></section>;
}
export function NativeDeductionFields({draft,change}:Props){const {native:{deduction:x}}=usePayrollCopy();return <>{draft.deductionIds.map((id,i)=><Deduction key={id} id={id} index={i} draft={draft} remove={()=>change({deductionIds:draft.deductionIds.filter(v=>v!==id)})}/>)}{!draft.deductionIds.length&&<p className="pw-small">{x.none}</p>}<button type="button" className="pw-button pw-secondary" onClick={()=>change({deductionIds:[...draft.deductionIds,crypto.randomUUID()]})}><PlusIcon size={18} weight="bold" aria-hidden/>{x.add}</button></>;}
function Deduction({id,index,draft,remove}:{id:string;index:number;draft:NativeDraft;remove:()=>void}){const {native:{deduction:x,tax:{fixed,percentage},fields:f}}=usePayrollCopy();const d=draft.configuration?.deductions.find(d=>d.id===id),p=`deduction.${id}.`;const [method,setMethod]=useState(savedValue(draft.profileFields,p+'method',d?.method??''));const [basis,setBasis]=useState(savedValue(draft.profileFields,p+'basis',d?.legalBasis??''));return <section className="pw-rule"><input type="hidden" name="deductionId" value={id}/><div className="pw-rule-heading"><h4>{x.title(index+1)}</h4><button type="button" className="pw-icon-button" aria-label={x.remove(index+1)} onClick={remove}><TrashIcon size={18} weight="bold" aria-hidden/></button></div><div className="pw-fields">
 <Input name={p+'code'} label={x.code} value={d?.code}/><Input name={p+'label'} label={x.label} value={d?.label}/><Input name={p+'from'} label={x.from} type="date" value={d?.effectiveFrom}/><Input name={p+'to'} label={x.to} type="date" required={false} value={d?.effectiveTo??''}/>
 <label>{x.method}<select aria-label={x.method} name={p+'method'} required value={method} onChange={e=>setMethod(e.target.value)}><option value="">{f.choose}</option><option value="FIXED">{fixed}</option><option value="PERCENTAGE">{percentage}</option></select></label>{method==='FIXED'&&<Input name={p+'amount'} label={x.amount} value={usd(d?.amountMinor)}/>}{method==='PERCENTAGE'&&<Input name={p+'rate'} label={x.rate} value={d?.basisPoints==null?'':usd(String(d.basisPoints))}/>}
 <Input name={p+'cap'} label={x.cap} required={false} value={usd(d?.capMinor)}/><Input name={p+'opening'} label={x.opening} value={usd(d?.deductedBeforeMinor)}/>
 <label>{x.authority}<select aria-label={x.authority} name={p+'basis'} required value={basis} onChange={e=>setBasis(e.target.value)}><option value="">{f.choose}</option><option value="PR_LAW_17_5_C">{x.lawC}</option><option value="PR_LAW_17_5_G">{x.lawG}</option></select></label>{basis==='PR_LAW_17_5_G'&&<Input name={p+'employerCode'} label={x.employerCode} value={d?.employerContributionCode??''}/>}
 <Input name={p+'evidence'} label={x.evidence} value={d?.authorizationReference}/><Input name={p+'compliance'} label={x.compliance} value={d?.complianceReference}/>
 </div><Check name={p+'authorization'} label={x.verified} required value={d?.authorization==='WRITTEN_POST_TAX'}/><Check name={p+'revoked'} label={x.revoked} value={d?.revoked}/></section>;}
