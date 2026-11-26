"use client";

import Link from 'next/link';
import {useRef,useState,type ReactNode} from 'react';
import {CaretLeftIcon} from '@phosphor-icons/react/dist/ssr/CaretLeft';
import type {Location,Position,UserRole} from '@/lib/domain';
import type {ScopeSelection} from '@/lib/company-access/model';
import {CorpField,CorpFormFooter} from '@/components/corp/corp';
import {ChoiceField,FormHead,FormHeadBack,FormHeadLink,PhoneField} from '@/components/team/team-forms';
import {ReturnToNext} from '@/components/team/return-to-next';
import {FormDiscardGuard} from '@/components/kit/discard-dialog';
import {EmployeeAccessForm} from './employee-access-form';
import {createCommandFromForm} from './commands';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';
import {EmploymentDateFields} from '../employment-date-fields';
import {revealField} from '../form-validation';
import {accessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

/** Add employee (Release 1, boards O-AddEmployee and O-AddEmployeePay): two steps in one form. Step 1 is who they are
 * (name, mobile phone, optional email, role and location, then the optional employment dates); step 2 is their Employee ID
 * (the server requires one), the positions they can work and where. "Add" submits the same create command as before; nothing about access changes. */
export function NewEmployeeForm({actorRole,locations:activeLocations,positions,action,notice,bonusApplies=true,lang:langProp}:{actorRole:UserRole;locations:Location[];positions:Position[];action:(data:FormData)=>Promise<unknown>;notice?:ReactNode;
 /** Review 30 (D38): the workspace is in Puerto Rico, so the hire date's line names Christmas bonus hours. */bonusApplies?:boolean;
 /** The person's language; usePortalLang() unless the caller names one (Signed-in Spanish, Nov 23, 2026). */lang?:AccessLang}){
 const portalLang=usePortalLang(),lang=langProp??portalLang,t=accessCopy(lang).newEmployee;
 const [role,setRole]=useState<UserRole>('EMPLOYEE'),[scope,setScope]=useState<ScopeSelection|null>(null),[step,setStep]=useState<1|2>(1),[primary,setPrimary]=useState(''),[added,setAdded]=useState(false);
 const stepOne=useRef<HTMLDivElement>(null);
 const blocked=!activeLocations.length;
 function next(){
  // Step 1 must be complete before step 2. Every missing field says so at once (P10): checkValidity() raises each
  // field's inline message through the shared form validation, which focuses the first one. No browser bubble.
  const fields=[...stepOne.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select')??[]];
  // Final verification F (F06): a blocked Next moves focus to the reason itself (the first field it stops at, brought
  // into view with its message), not only through the shared listener's timer.
  const invalid=fields.filter(field=>!field.checkValidity());
  if(invalid.length){invalid[0].focus({preventScroll:true});revealField(invalid[0]);return;}
  setStep(2);requestAnimationFrame(()=>document.getElementById('new-employee-title')?.focus());
 }
 const activePositions=positions.filter(position=>position.active);
 return <>
  {/* Closing F1 (NV-257): two dots show where the form is (the words stay); on tablets and desktop step 1 goes back to
    "‹ Team" above the title like every pushed page (the phone sheet keeps Cancel). */}
  <FormHead titleId="new-employee-title" title={t.title} back={{href:'/app/employees',label:t.team}} step={added?undefined:<><span className="c-formhead__dots" aria-hidden="true"><i data-on=""/><i data-on={step===2?'':undefined}/></span>
    {/* Phase 8 (a.md #42): the step line names the step. Final verification F (F14): the count and the name are two
      pieces, so on a narrow phone the name takes its own line and the separator never starts or ends one. */}
    <span className="c-formhead__stepn">{t.step(step)}</span><span className="c-formhead__stepsep"> · </span><span className="c-formhead__stepname">{step===1?t.details:t.where}</span></>}
   /* Final polish (finding 28): once the person is added the page is its finish (Open profile, Add another), so the
    * bar's left link no longer says "Done" beside it: it is the way back to Team, as the band's own link from 768px. */
   left={added?<Link className="c-formhead__link c-formhead__back" href="/app/employees"><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true"/>{t.team}</Link>:step===1?<FormHeadLink href="/app/employees">{t.cancel}</FormHeadLink>:<FormHeadBack onClick={()=>setStep(1)}>{t.back}</FormHeadBack>}
   /* Review 30 (D02): Next and Add are separate buttons (their own keys), so the press that opens step 2 can never
    * submit the form: React used to reuse the one element, which had become type="submit" by the time the press ended. */
   right={added?undefined:step===1?<button key="next" type="button" onClick={next} disabled={blocked}>{t.next}</button>:<button key="add" type="submit" form="new-employee-form" disabled={blocked}>{t.add}</button>}/>
  <EmployeeAccessForm id="new-employee-form" action={action} build={(fields,id)=>createCommandFromForm(fields,actorRole,scope,id)} className="c-teamform" lang={lang}
   /* Final polish (finding 28): the finish is a centred page finish (the 56px mark, "<Name> added", the one filled
    * Open profile and a quiet Add another); employee-access-form.tsx draws it from `finish` and `quiet`. */
   done={{finish:true,title:({first,last})=>t.added([first,last].filter(Boolean).join(' ')),line:t.addedLine,next:receipt=>({href:'/app/employees/'+encodeURIComponent(receipt.employeeId),label:t.openProfile}),quiet:{href:'/app/employees/new',label:t.addAnother}}}
   onSaved={()=>setAdded(true)}
   /* D03: a refused date is on step 1, so the form goes back there before the field is marked. */
   onRefused={fields=>{if(fields.length)setStep(1);}}>
   {notice}
   <ReturnToNext/>
   <input type="hidden" name="active" value="true"/>
   <div className="c-step" ref={stepOne} hidden={step!==1}>
    <div className="c-field__row">
     <CorpField label={t.firstName} htmlFor="new-first"><input id="new-first" className="c-in" name="firstName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing={t.firstMissing}/></CorpField>
     <CorpField label={t.lastName} htmlFor="new-last"><input id="new-last" className="c-in" name="lastName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing={t.lastMissing}/></CorpField>
    </div>
    <CorpField label={t.phone} htmlFor="new-phone"><PhoneField id="new-phone" name="phone" autoComplete="off" enterKeyHint="next" required missing={t.phoneMissing}/></CorpField>
    {/* Nov 14, 2026 inspection (BR-14): the field says what leaving it empty means. */}
    <CorpField label={t.email} htmlFor="new-email" help={<span id="new-email-help">{t.emailHelp}</span>}><input id="new-email" className="c-in" name="email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={254} placeholder={t.emailPlaceholder} aria-describedby="new-email-help"/></CorpField>
    <div className="c-field__row">
     <CorpField label={t.role} htmlFor="new-role"><select id="new-role" className="c-in" name="role" value={role} onChange={event=>setRole(event.target.value as UserRole)}>
      <option value="EMPLOYEE">{t.roles.EMPLOYEE}</option><option value="LEAD">{t.roles.LEAD}</option><option value="MANAGER">{t.roles.MANAGER}</option>
      {actorRole==="OWNER"?<option value="OWNER">{t.roles.OWNER}</option>:null}
     </select></CorpField>
     <CorpField label={t.location} htmlFor="new-location"><select id="new-location" className="c-in" name="primaryLocationId" required data-missing={t.chooseLocation} value={primary} onChange={event=>setPrimary(event.target.value)}>
      <option value="" disabled>{t.chooseLocation}</option>
      {activeLocations.map(location=><option key={location.id} value={location.id}>{location.shortName}</option>)}
     </select></CorpField>
    </div>
    {role==='MANAGER'&&actorRole!=='OWNER'?<p className="c-note">{t.ownerAssigns}</p>:null}
    {/* Review 30 (D05): the dates are details about the person, so they sit on "Their details", after the role and location. */}
    <EmploymentDateFields idPrefix="new" bonusApplies={bonusApplies}/>
   </div>
   <div className="c-step" hidden={step!==2}>
    <CorpField label={t.id} htmlFor="new-id" help={t.idHelp}><input id="new-id" className="c-in" name="id" placeholder={t.idPlaceholder} autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="done" required maxLength={128} data-missing={t.idMissing}/></CorpField>
    <ChoiceField label={t.positions} name="positionIds" none={t.choosePositions} empty={t.noPositions} choices={activePositions.map(position=>({value:position.id,label:position.name}))}/>
    <ChoiceField key={primary} label={t.workAt} name="eligibleLocationIds" choices={activeLocations.map(location=>({value:location.id,label:location.shortName,checked:location.id===primary,
     help:location.id===primary?t.primary:undefined}))}/>
    {role==='MANAGER'&&actorRole==='OWNER'?<OperationalScopeSelectionFields locations={activeLocations.map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null} lang={lang}/>:null}
   </div>
   {/* Tablets and desktop (kit form grammar): the actions sit in the card's footer, Cancel or Back then Next or Add, auto
    width on the right. Phones keep them in the header. The same handlers and the same submit as the header. */}
   <CorpFormFooter>
    {step===1?<Link className="c-btn c-btn--secondary b-rowact b-rowact--quiet" href="/app/employees">{t.cancel}</Link>:<button type="button" className="c-btn c-btn--secondary b-rowact b-rowact--quiet" onClick={()=>setStep(1)}>{t.back}</button>}
    {step===1?<button key="next" type="button" className="c-btn" onClick={next} disabled={blocked}>{t.next}</button>:<button key="add" type="submit" className="c-btn" disabled={blocked}>{t.add}</button>}
   </CorpFormFooter>
  </EmployeeAccessForm>
  {/* Leaving the flow with typed details that are not added asks first (Nov 21, 2026). Next and Back are steps of the
    same form and never ask; once the person is added there is nothing to lose. */}
  <FormDiscardGuard form="new-employee-form" off={added}/>
 </>;
}
