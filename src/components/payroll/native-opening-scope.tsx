'use client';
import { useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import type { EditorProps } from './native-profile-editor';
import { validateForm } from './native-profile-editor';
import { formKeys } from './form-keys';
import { DraftFields, Input, Check, LocationFields, usd, captureForm } from './native-config-fields';
import { openingFromForm, scopeFromForm } from './native-profile-form';
import { usePayrollCopy } from './payroll-copy';

export function NativeOpeningForm({draft,sources,operation,change,frozen=false,verifying=false,historyError=''}:EditorProps&{frozen?:boolean;verifying?:boolean;historyError?:string}){const {native:{opening:t},lang}=usePayrollCopy();const y=draft.opening;const [error,setError]=useState('');const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError('');const form=event.currentTarget;if(frozen||verifying||historyError)return;if(!validateForm(form,setError))return;change({openingFields:captureForm(form)});const f=new FormData(form);try{const ytd=openingFromForm(f,y?.revision??0,lang);void operation.submit({action:'ATTEST_OPENING_YTD',expectedRevision:y?.revision??0,employeeId:draft.employeeId,reason:String(f.get('openingReason')??'').trim(),ytd});}catch(e){setError(e instanceof Error?e.message:t.check);}};
 return <DraftFields entries={draft.openingFields}><form className="pw-form pw-config-form" {...formKeys} onSubmit={save} onChange={e=>change({openingFields:captureForm(e.currentTarget)})}><fieldset disabled={operation.locked||frozen||verifying||!!historyError}>
  {frozen&&<p className="pw-notice" role="status">{t.frozen}</p>}{verifying&&<p role="status">{t.verifying}</p>}{historyError&&<p className="pw-error" role="alert">{t.historyError}</p>}
  <p className="pw-small">{y?t.loaded(y.revision,y.year,y.evidenceReference):t.none}{t.explain}</p>
  <div className="pw-fields"><Input name="year" label={t.year} type="number" min={2026} max={2100} value={y?.year} readOnly={!!y}/><Input name="gross" label={t.gross} value={usd(y?.grossMinor)}/><Input name="net" label={t.net} value={usd(y?.netMinor)}/><Input name="socialSecurity" label={t.socialSecurity} value={usd(y?.socialSecurityWagesMinor)}/><Input name="medicare" label={t.medicare} value={usd(y?.medicareWagesMinor)}/><Input name="sinot" label={t.sinot} value={usd(y?.sinotWagesMinor)}/></div>
  <p className="pw-small">{t.separately}</p>
  <LocationFields name="openingLocations" locations={sources.locations} selected={y?.locationIds}/>
  <BalanceMap kind="deductions" title={t.withheld} prior={y?.deductions??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/><BalanceMap kind="employerContributions" title={t.assessed} prior={y?.employerContributions??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/><BalanceMap kind="employerWages" title={t.wageBases} prior={y?.employerWagesMinor??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/>
  <details className="pw-config-disclosure" open><summary>{t.evidenceSummary}</summary><Input name="openingEvidence" label={t.evidence} value={y?.evidenceReference}/><Input name="openingFingerprint" label={t.fingerprint} value={y?.ledgerFingerprint} maxLength={64} help={t.fingerprintHelp}/><Check name="openingAttest" label={t.attest} required value={y?.attested}/></details>
  <Input name="openingReason" label={t.reason}/>{error&&<p className="pw-error" role="alert">{error}</p>}<button type="submit" className="pw-button" disabled={frozen||verifying||!!historyError}>{t.submit}</button>
 </fieldset></form></DraftFields>;
}
type BalanceRow = {id:string;code:string;amount:string};
function BalanceMap({kind,title,prior,entries,change}:{kind:string;title:string;prior:Record<string,string>;entries:[string,string][]|null;change:(fields:[string,string][])=>void}) {
 const {native:{opening:t}}=usePayrollCopy();
 const [rows,setRows]=useState<BalanceRow[]>(()=>{
  const codes=entries===null?Object.keys(prior):entries.filter(([k])=>k===kind+'Code').map(([,v])=>v);
  const ids=entries?.filter(([k])=>k===kind+'RowId').map(([,v])=>v)??[];
  return codes.map((code,i)=>({id:ids[i]??`${kind}-${i}`,code,amount:entries?.find(([k])=>k===`${kind}.${code}`)?.[1]??usd(prior[code])}));
 });
 const update=(next:BalanceRow[],form:HTMLFormElement|null)=>{
  setRows(next);
  if(!form)return;
  const fields=captureForm(form).filter(([k])=>k!==kind+'Code'&&k!==kind+'RowId'&&!k.startsWith(kind+'.'));
  for(const row of next)fields.push([kind+'RowId',row.id],[kind+'Code',row.code],[`${kind}.${row.code}`,row.amount]);
  change(fields);
 };
 return <section className="pw-section"><h4>{title}</h4>{rows.map((row,i)=><div className="pw-balance-row" key={row.id}>
  <input type="hidden" name={kind+'RowId'} value={row.id}/>
  <label>{t.balanceCode}<input name={kind+'Code'} value={row.code} required pattern="[A-Z][A-Z0-9_]{0,79}" maxLength={80} onChange={e=>{e.stopPropagation();update(rows.map(r=>r.id===row.id?{...r,code:e.target.value}:r),e.currentTarget.form);}}/></label>
  <label>{t.documentedAmount}<input name={`${kind}.${row.code}`} value={row.amount} required maxLength={300} onChange={e=>{e.stopPropagation();update(rows.map(r=>r.id===row.id?{...r,amount:e.target.value}:r),e.currentTarget.form);}}/></label>
  <button type="button" className="pw-icon-button" aria-label={t.removeRow(title,i+1)} onClick={e=>update(rows.filter(r=>r.id!==row.id),e.currentTarget.form)}><TrashIcon size={18} weight="bold" aria-hidden/></button>
 </div>)}{!rows.length&&<p className="pw-small">{t.noEntries}</p>}
 <button className="pw-button pw-secondary" type="button" onClick={e=>update([...rows,{id:crypto.randomUUID(),code:'',amount:''}],e.currentTarget.form)}><PlusIcon size={18} weight="bold" aria-hidden/>{t.addEntry}</button></section>;
}
export function NativeScopeForm({draft,sources,operation,change}:EditorProps){const {native:{scope:t},lang}=usePayrollCopy();const scope=draft.scope;const [error,setError]=useState('');const [review,setReview]=useState(draft.scopeFields===null?scope?.review??false:draft.scopeFields.some(([k])=>k==='review'));const [approve,setApprove]=useState(draft.scopeFields===null?scope?.approve??false:draft.scopeFields.some(([k])=>k==='approve'));const permissions=(form:HTMLFormElement|null,nextReview:boolean,nextApprove:boolean)=>{
 setReview(nextReview);setApprove(nextApprove);
 if(!form)return;
 const fields=captureForm(form).filter(([k])=>k!=='review'&&k!=='approve');
 if(nextReview)fields.push(['review','on']);if(nextApprove)fields.push(['approve','on']);
 change({scopeFields:fields});
};return <DraftFields entries={draft.scopeFields}><form className="pw-form pw-config-form" {...formKeys} onChange={e=>change({scopeFields:captureForm(e.currentTarget)})} onSubmit={e=>{e.preventDefault();setError('');const form=e.currentTarget;if(!validateForm(form,setError))return;change({scopeFields:captureForm(form)});const f=new FormData(form);try{void operation.submit({action:'SET_MANAGER_SCOPE',employeeId:draft.employeeId,expectedRevision:scope?.revision??0,reason:String(f.get('scopeReason')??'').trim(),...scopeFromForm(f,lang)});}catch(failure){setError(failure instanceof Error?failure.message:t.check);}}}><fieldset disabled={operation.locked}>
 <p className="pw-small">{t.revision(scope?.revision??0)}</p>
 <label className="pw-check"><input name="review" type="checkbox" checked={review} onChange={e=>{e.stopPropagation();permissions(e.currentTarget.form,e.target.checked,e.target.checked&&approve);}}/><span>{t.review}</span></label>
 <label className="pw-check"><input name="approve" type="checkbox" checked={approve} onChange={e=>{e.stopPropagation();permissions(e.currentTarget.form,e.target.checked||review,e.target.checked);}}/><span>{t.approve}</span></label>
 <LocationFields name="scopeLocations" locations={sources.locations} selected={scope?.locationIds}/><p className="pw-small">{t.line}</p>
 <Input name="scopeReason" label={t.reason}/>{error&&<p className="pw-error" role="alert">{error}</p>}<button className="pw-button" type="submit">{t.save}</button>
 </fieldset></form></DraftFields>;}
