"use client";

import Link from 'next/link';
import {useRef,useState,type ReactNode} from 'react';
import type {Location,Position,UserRole} from '@/lib/domain';
import type {ScopeSelection} from '@/lib/company-access/model';
import {CorpField,CorpFormFooter} from '@/components/corp/corp';
import {ChoiceField,FormHead,FormHeadBack,FormHeadLink,PhoneField} from '@/components/team/team-forms';
import {ReturnToNext} from '@/components/team/return-to-next';
import {EmployeeAccessForm} from './employee-access-form';
import {createCommandFromForm} from './commands';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';
import {EmploymentDateFields} from '../employment-date-fields';
import {revealField} from '../form-validation';

/** Add employee (Release 1, boards O-AddEmployee and O-AddEmployeePay): two steps in one form. Step 1 is who they are
 * (name, mobile phone, optional email, role and location, then the optional employment dates); step 2 is their Employee ID
 * (the server requires one), the positions they can work and where. "Add" submits the same create command as before; nothing about access changes. */
export function NewEmployeeForm({actorRole,locations:activeLocations,positions,action,notice,bonusApplies=true}:{actorRole:UserRole;locations:Location[];positions:Position[];action:(data:FormData)=>Promise<unknown>;notice?:ReactNode;
 /** Review 30 (D38): the workspace is in Puerto Rico, so the hire date's line names Christmas bonus hours. */bonusApplies?:boolean}){
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
  <FormHead titleId="new-employee-title" title="Add employee" back={{href:'/app/employees',label:'Team'}} step={added?undefined:<><span className="c-formhead__dots" aria-hidden="true"><i data-on=""/><i data-on={step===2?'':undefined}/></span>
    {/* Phase 8 (a.md #42): the step line names the step. Final verification F (F14): the count and the name are two
      pieces, so on a narrow phone the name takes its own line and the separator never starts or ends one. */}
    <span className="c-formhead__stepn">{`Step ${step} of 2`}</span><span className="c-formhead__stepsep"> · </span><span className="c-formhead__stepname">{step===1?'Their details':'Where they work'}</span></>}
   left={added?<FormHeadLink href="/app/employees">Done</FormHeadLink>:step===1?<FormHeadLink href="/app/employees">Cancel</FormHeadLink>:<FormHeadBack onClick={()=>setStep(1)}>Back</FormHeadBack>}
   /* Review 30 (D02): Next and Add are separate buttons (their own keys), so the press that opens step 2 can never
    * submit the form: React used to reuse the one element, which had become type="submit" by the time the press ended. */
   right={added?undefined:step===1?<button key="next" type="button" onClick={next} disabled={blocked}>Next</button>:<button key="add" type="submit" form="new-employee-form" disabled={blocked}>Add</button>}/>
  <EmployeeAccessForm id="new-employee-form" action={action} build={(fields,id)=>createCommandFromForm(fields,actorRole,scope,id)} className="c-teamform"
   done={{title:({first,last})=>`${[first,last].filter(Boolean).join(' ')||'Employee'} added`,line:'Open their profile to review details and manage their account invitation.',next:receipt=>({href:'/app/employees/'+encodeURIComponent(receipt.employeeId),label:'Open profile'})}}
   onSaved={()=>setAdded(true)}
   /* D03: a refused date is on step 1, so the form goes back there before the field is marked. */
   onRefused={fields=>{if(fields.length)setStep(1);}}>
   {notice}
   <ReturnToNext/>
   <input type="hidden" name="active" value="true"/>
   <div className="c-step" ref={stepOne} hidden={step!==1}>
    <div className="c-field__row">
     <CorpField label="First name" htmlFor="new-first"><input id="new-first" className="c-in" name="firstName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing="Enter a first name"/></CorpField>
     <CorpField label="Last name" htmlFor="new-last"><input id="new-last" className="c-in" name="lastName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing="Enter a last name"/></CorpField>
    </div>
    <CorpField label="Mobile phone" htmlFor="new-phone"><PhoneField id="new-phone" name="phone" autoComplete="off" enterKeyHint="next" required missing="Enter a mobile phone number"/></CorpField>
    {/* Nov 14, 2026 inspection (BR-14): the field says what leaving it empty means. */}
    <CorpField label="Email (optional)" htmlFor="new-email" help={<span id="new-email-help">Without an email, this person can clock in on the tablet but can’t sign in to NEVORA.</span>}><input id="new-email" className="c-in" name="email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={254} placeholder="name@example.com" aria-describedby="new-email-help"/></CorpField>
    <div className="c-field__row">
     <CorpField label="Role" htmlFor="new-role"><select id="new-role" className="c-in" name="role" value={role} onChange={event=>setRole(event.target.value as UserRole)}>
      <option value="EMPLOYEE">Employee</option><option value="LEAD">Lead</option><option value="MANAGER">Manager</option>
      {actorRole==="OWNER"?<option value="OWNER">Owner</option>:null}
     </select></CorpField>
     <CorpField label="Location" htmlFor="new-location"><select id="new-location" className="c-in" name="primaryLocationId" required data-missing="Choose a location" value={primary} onChange={event=>setPrimary(event.target.value)}>
      <option value="" disabled>Choose a location</option>
      {activeLocations.map(location=><option key={location.id} value={location.id}>{location.shortName}</option>)}
     </select></CorpField>
    </div>
    {role==='MANAGER'&&actorRole!=='OWNER'?<p className="c-note">An Owner assigns management access after this.</p>:null}
    {/* Review 30 (D05): the dates are details about the person, so they sit on "Their details", after the role and location. */}
    <EmploymentDateFields idPrefix="new" bonusApplies={bonusApplies}/>
   </div>
   <div className="c-step" hidden={step!==2}>
    <CorpField label="Employee ID" htmlFor="new-id" help="You can’t change this later."><input id="new-id" className="c-in" name="id" placeholder="e.g. 10482" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="done" required maxLength={128} data-missing="Enter an employee ID"/></CorpField>
    <ChoiceField label="Positions" name="positionIds" none="Choose positions" empty="No positions yet" choices={activePositions.map(position=>({value:position.id,label:position.name}))}/>
    <ChoiceField key={primary} label="Locations they can work at" name="eligibleLocationIds" choices={activeLocations.map(location=>({value:location.id,label:location.shortName,checked:location.id===primary,
     help:location.id===primary?'Their location, always included':undefined}))}/>
    {role==='MANAGER'&&actorRole==='OWNER'?<OperationalScopeSelectionFields locations={activeLocations.map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:null}
   </div>
   {/* Tablets and desktop (kit form grammar): the actions sit in the card's footer, Cancel or Back then Next or Add, auto
    width on the right. Phones keep them in the header. The same handlers and the same submit as the header. */}
   <CorpFormFooter>
    {step===1?<Link className="c-btn c-btn--secondary" href="/app/employees">Cancel</Link>:<button type="button" className="c-btn c-btn--secondary" onClick={()=>setStep(1)}>Back</button>}
    {step===1?<button key="next" type="button" className="c-btn" onClick={next} disabled={blocked}>Next</button>:<button key="add" type="submit" className="c-btn" disabled={blocked}>Add</button>}
   </CorpFormFooter>
  </EmployeeAccessForm>
 </>;
}
