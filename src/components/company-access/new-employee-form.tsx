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

/** Add employee (Release 1, boards O-AddEmployee and O-AddEmployeePay): two steps in one form. Step 1 is who they are
 * (name, mobile phone, optional email, role and location); step 2 is their Employee ID (the server requires one), the
 * positions they can work and where. "Add" submits the same create command as before; nothing about access changes. */
export function NewEmployeeForm({actorRole,locations:activeLocations,positions,action,notice}:{actorRole:UserRole;locations:Location[];positions:Position[];action:(data:FormData)=>Promise<unknown>;notice?:ReactNode}){
 const [role,setRole]=useState<UserRole>('EMPLOYEE'),[scope,setScope]=useState<ScopeSelection|null>(null),[step,setStep]=useState<1|2>(1),[primary,setPrimary]=useState('');
 const stepOne=useRef<HTMLDivElement>(null);
 const blocked=!activeLocations.length;
 function next(){
  // Step 1 must be complete before step 2. Every missing field says so at once (P10): checkValidity() raises each
  // field's inline message through the shared form validation, which focuses the first one. No browser bubble.
  const fields=[...stepOne.current?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select')??[]];
  if(fields.map(field=>field.checkValidity()).includes(false))return;
  setStep(2);requestAnimationFrame(()=>document.getElementById('new-employee-title')?.focus());
 }
 const activePositions=positions.filter(position=>position.active);
 return <>
  <FormHead titleId="new-employee-title" title="Add employee" step={`Step ${step} of 2`}
   left={step===1?<FormHeadLink href="/app/employees">Cancel</FormHeadLink>:<FormHeadBack onClick={()=>setStep(1)}>Back</FormHeadBack>}
   right={step===1?<button type="button" onClick={next} disabled={blocked}>Next</button>:<button type="submit" form="new-employee-form" disabled={blocked}>Add</button>}/>
  <EmployeeAccessForm id="new-employee-form" action={action} build={(fields,id)=>createCommandFromForm(fields,actorRole,scope,id)} className="c-teamform">
   {notice}
   <ReturnToNext/>
   <input type="hidden" name="active" value="true"/>
   <div className="c-step" ref={stepOne} hidden={step!==1}>
    <div className="c-field__row">
     <CorpField label="First name" htmlFor="new-first"><input id="new-first" className="c-in" name="firstName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160}/></CorpField>
     <CorpField label="Last name" htmlFor="new-last"><input id="new-last" className="c-in" name="lastName" autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160}/></CorpField>
    </div>
    <CorpField label="Mobile phone" htmlFor="new-phone"><PhoneField id="new-phone" name="phone" autoComplete="off" enterKeyHint="next" required/></CorpField>
    <CorpField label="Email (optional)" htmlFor="new-email"><input id="new-email" className="c-in" name="email" type="email" inputMode="email" autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={254} placeholder="name@example.com"/></CorpField>
    <div className="c-field__row">
     <CorpField label="Role" htmlFor="new-role"><select id="new-role" className="c-in" name="role" value={role} onChange={event=>setRole(event.target.value as UserRole)}>
      <option value="EMPLOYEE">Employee</option><option value="LEAD">Lead</option><option value="MANAGER">Manager</option>
      {actorRole==="OWNER"?<option value="OWNER">Owner</option>:null}
     </select></CorpField>
     <CorpField label="Location" htmlFor="new-location"><select id="new-location" className="c-in" name="primaryLocationId" required value={primary} onChange={event=>setPrimary(event.target.value)}>
      <option value="" disabled>Choose</option>
      {activeLocations.map(location=><option key={location.id} value={location.id}>{location.shortName}</option>)}
     </select></CorpField>
    </div>
    {role==='MANAGER'&&actorRole!=='OWNER'?<p className="c-note">An Owner assigns management access after this.</p>:null}
   </div>
   <div className="c-step" hidden={step!==2}>
    <CorpField label="Employee ID" htmlFor="new-id" help="You can’t change this later."><input id="new-id" className="c-in" name="id" placeholder="e.g. 10482" autoComplete="off" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="done" required maxLength={128}/></CorpField>
    <ChoiceField label="Positions" name="positionIds" none="Choose positions" empty="No positions yet" choices={activePositions.map(position=>({value:position.id,label:position.name}))}/>
    <ChoiceField key={primary} label="Locations they can work at" name="eligibleLocationIds" choices={activeLocations.map(location=>({value:location.id,label:location.shortName,checked:location.id===primary,
     help:location.id===primary?'Their location, always included':undefined}))}/>
    {role==='MANAGER'&&actorRole==='OWNER'?<OperationalScopeSelectionFields locations={activeLocations.map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:null}
   </div>
   {/* Tablets and desktop (kit form grammar): the actions sit in the card's footer, Cancel or Back then Next or Add, auto
    width on the right. Phones keep them in the header. The same handlers and the same submit as the header. */}
   <CorpFormFooter>
    {step===1?<Link className="c-btn c-btn--secondary" href="/app/employees">Cancel</Link>:<button type="button" className="c-btn c-btn--secondary" onClick={()=>setStep(1)}>Back</button>}
    {step===1?<button type="button" className="c-btn" onClick={next} disabled={blocked}>Next</button>:<button type="submit" className="c-btn" disabled={blocked}>Add</button>}
   </CorpFormFooter>
  </EmployeeAccessForm>
 </>;
}
