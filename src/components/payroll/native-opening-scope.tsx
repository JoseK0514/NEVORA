'use client';
import { useState, type FormEvent } from 'react';
import { PlusIcon, TrashIcon } from '@phosphor-icons/react/ssr';
import type { EditorProps } from './native-profile-editor';
import { validateForm } from './native-profile-editor';
import { formKeys } from './form-keys';
import { DraftFields, Input, Check, LocationFields, usd, captureForm } from './native-config-fields';
import { openingFromForm, scopeFromForm } from './native-profile-form';

export function NativeOpeningForm({draft,sources,operation,change,frozen=false,verifying=false,historyError=''}:EditorProps&{frozen?:boolean;verifying?:boolean;historyError?:string}){const y=draft.opening;const [error,setError]=useState('');const save=(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();setError('');const form=event.currentTarget;if(frozen||verifying||historyError)return;if(!validateForm(form,setError))return;change({openingFields:captureForm(form)});const f=new FormData(form);try{const ytd=openingFromForm(f,y?.revision??0);void operation.submit({action:'ATTEST_OPENING_YTD',expectedRevision:y?.revision??0,employeeId:draft.employeeId,reason:String(f.get('openingReason')??'').trim(),ytd});}catch(e){setError(e instanceof Error?e.message:'Check documented opening balances.');}};
 return <DraftFields entries={draft.openingFields}><form className="pw-form pw-config-form" {...formKeys} onSubmit={save} onChange={e=>change({openingFields:captureForm(e.currentTarget)})}><fieldset disabled={operation.locked||frozen||verifying||!!historyError}>
  {frozen&&<p className="pw-notice" role="status">Opening balances are frozen by approved native payroll. Select another documented opening record to review a different year.</p>}{verifying&&<p role="status">Checking approved opening references…</p>}{historyError&&<p className="pw-error" role="alert">Approval history is unavailable. Reload current history before attesting an opening.</p>}
  <p className="pw-small">{y?`Opening revision ${y.revision} · Year ${y.year} · ${y.evidenceReference}`:'No opening balance is loaded for this draft.'} These are same-employer cumulative balances before NEVORA’s first native payroll. Approved payroll freezes its referenced opening; editing is rejected by the server.</p>
  <div className="pw-fields"><Input name="year" label="Opening tax year" type="number" min={2026} max={2100} value={y?.year} readOnly={!!y}/><Input name="gross" label="Opening gross pay · USD" value={usd(y?.grossMinor)}/><Input name="net" label="Opening net pay · USD" value={usd(y?.netMinor)}/><Input name="socialSecurity" label="Opening Social Security wages · USD" value={usd(y?.socialSecurityWagesMinor)}/><Input name="medicare" label="Opening Medicare wages · USD" value={usd(y?.medicareWagesMinor)}/><Input name="sinot" label="Opening SINOT wages · USD" value={usd(y?.sinotWagesMinor)}/></div>
  <p className="pw-small">Enter each actual balance separately, including documented zero. Gross is not a substitute for every tax-specific wage base.</p>
  <LocationFields name="openingLocations" locations={sources.locations} selected={y?.locationIds}/>
  <BalanceMap kind="deductions" title="Employee amounts already withheld" prior={y?.deductions??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/><BalanceMap kind="employerContributions" title="Employer contributions already assessed" prior={y?.employerContributions??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/><BalanceMap kind="employerWages" title="Employer-specific opening wage bases" prior={y?.employerWagesMinor??{}} entries={draft.openingFields} change={fields=>change({openingFields:fields})}/>
  <details className="pw-config-disclosure" open><summary>Opening record evidence</summary><Input name="openingEvidence" label="Opening balance evidence reference" value={y?.evidenceReference}/><Input name="openingFingerprint" label="Opening record SHA-256" value={y?.ledgerFingerprint} maxLength={64} help="Use the documented 64-character fingerprint of the opening record. No fingerprint or ledger balance is inferred."/><Check name="openingAttest" label="I verified these documented balances before the first native payroll, including any entered zeros." required value={y?.attested}/></details>
  <Input name="openingReason" label="Opening balance change reason"/>{error&&<p className="pw-error" role="alert">{error}</p>}<button type="submit" className="pw-button" disabled={frozen||verifying||!!historyError}>Attest opening balances</button>
 </fieldset></form></DraftFields>;
}
type BalanceRow = {id:string;code:string;amount:string};
function BalanceMap({kind,title,prior,entries,change}:{kind:string;title:string;prior:Record<string,string>;entries:[string,string][]|null;change:(fields:[string,string][])=>void}) {
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
  <label>Balance code<input name={kind+'Code'} value={row.code} required pattern="[A-Z][A-Z0-9_]{0,79}" maxLength={80} onChange={e=>{e.stopPropagation();update(rows.map(r=>r.id===row.id?{...r,code:e.target.value}:r),e.currentTarget.form);}}/></label>
  <label>Documented amount · USD<input name={`${kind}.${row.code}`} value={row.amount} required maxLength={300} onChange={e=>{e.stopPropagation();update(rows.map(r=>r.id===row.id?{...r,amount:e.target.value}:r),e.currentTarget.form);}}/></label>
  <button type="button" className="pw-icon-button" aria-label={`Remove ${title} row ${i+1}`} onClick={e=>update(rows.filter(r=>r.id!==row.id),e.currentTarget.form)}><TrashIcon size={18} aria-hidden/></button>
 </div>)}{!rows.length&&<p className="pw-small">No opening entries supplied in this category.</p>}
 <button className="pw-button pw-secondary" type="button" onClick={e=>update([...rows,{id:crypto.randomUUID(),code:'',amount:''}],e.currentTarget.form)}><PlusIcon size={18} aria-hidden/>Add opening entry</button></section>;
}
export function NativeScopeForm({draft,sources,operation,change}:EditorProps){const scope=draft.scope;const [error,setError]=useState('');const [review,setReview]=useState(draft.scopeFields===null?scope?.review??false:draft.scopeFields.some(([k])=>k==='review'));const [approve,setApprove]=useState(draft.scopeFields===null?scope?.approve??false:draft.scopeFields.some(([k])=>k==='approve'));const permissions=(form:HTMLFormElement|null,nextReview:boolean,nextApprove:boolean)=>{
 setReview(nextReview);setApprove(nextApprove);
 if(!form)return;
 const fields=captureForm(form).filter(([k])=>k!=='review'&&k!=='approve');
 if(nextReview)fields.push(['review','on']);if(nextApprove)fields.push(['approve','on']);
 change({scopeFields:fields});
};return <DraftFields entries={draft.scopeFields}><form className="pw-form pw-config-form" {...formKeys} onChange={e=>change({scopeFields:captureForm(e.currentTarget)})} onSubmit={e=>{e.preventDefault();setError('');const form=e.currentTarget;if(!validateForm(form,setError))return;change({scopeFields:captureForm(form)});const f=new FormData(form);try{void operation.submit({action:'SET_MANAGER_SCOPE',employeeId:draft.employeeId,expectedRevision:scope?.revision??0,reason:String(f.get('scopeReason')??'').trim(),...scopeFromForm(f)});}catch(failure){setError(failure instanceof Error?failure.message:'Check current Manager scope.');}}}><fieldset disabled={operation.locked}>
 <p className="pw-small">Scope revision {scope?.revision??0}. The server verifies the current active Manager role and locations on every save and payroll action.</p>
 <label className="pw-check"><input name="review" type="checkbox" checked={review} onChange={e=>{e.stopPropagation();permissions(e.currentTarget.form,e.target.checked,e.target.checked&&approve);}}/><span>Review payroll amounts and private documents</span></label>
 <label className="pw-check"><input name="approve" type="checkbox" checked={approve} onChange={e=>{e.stopPropagation();permissions(e.currentTarget.form,e.target.checked||review,e.target.checked);}}/><span>Approve a separately reviewed payroll revision</span></label>
 <LocationFields name="scopeLocations" locations={sources.locations} selected={scope?.locationIds}/><p className="pw-small">Approval requires review and explicit locations. Clear both permissions to revoke payroll access; no wildcard or primary-location permission is inferred.</p>
 <Input name="scopeReason" label="Manager payroll access change reason"/>{error&&<p className="pw-error" role="alert">{error}</p>}<button className="pw-button" type="submit">Save Manager payroll access</button>
 </fieldset></form></DraftFields>;}
