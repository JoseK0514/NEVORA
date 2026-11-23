'use client';

import {DiscardGuard} from './kit/discard-dialog';
import Link from 'next/link';
import {useEffect,useState,type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import { ReturnToNext } from './team/return-to-next';
import {EmployeeAccessForm,EmployeeSavedBlock,type EmployeeSavedReceipt,type EmployeeSavedState} from './company-access/employee-access-form';
import {DecisionAsk} from './owner-b/decision-parts';
import {coreCommandFromForm} from './company-access/commands';
import {ManagerOperationalScopeFields} from './company-access/manager-operational-scope-fields';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import {CorpField} from '@/components/corp/corp';
import {FormHead,FormHeadLink,PhoneField} from '@/components/team/team-forms';
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";
import type { EmploymentDates } from "@/lib/employment-dates";
import { EmploymentDateFields } from "./employment-date-fields";
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {employeeTeamCopy} from './employee-team-copy';

type EmployeeCoreProfileProps={
 employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;
 ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>;
 /** Where Cancel goes (the person's page). */
 cancelHref?:string;
 /** Picker rows that open their own sheets (Positions, Hours and rules), after the role and location. */
 more?:ReactNode;
 /** Hire, termination and birth dates, read with this profile version for an actor who may edit them. Without them the
  * sheet shows no date fields and the save leaves the stored dates unchanged. */
 employmentDates?:EmploymentDates;
 /** Review 30 (D38): the workspace is in Puerto Rico, so the hire date's line names Christmas bonus hours. */
 bonusApplies?:boolean;
 /** Review 30 (D21): opened from a report to add a hire date. The hire date takes focus, and the saved state's next step
  * goes back to that report. */
 returnTo?:{href:string;label:string;focusHire?:boolean};
};

export function EmployeeCoreProfileForm(props:EmployeeCoreProfileProps){
 return <EmployeeCoreProfileEditor key={JSON.stringify([props.actorId,props.actorRole,props.employee.id])} {...props}/>;
}

/** Edit employee (Release 1, board O-EditEmployee): a sheet with Cancel · Edit employee · Save. The same command as before;
 * the account status is unchanged here (Access and sign-in deactivates and reactivates). */
function EmployeeCoreProfileEditor({employee,locations,actorRole,ownerScope=null,action,cancelHref,more,employmentDates,bonusApplies=true,returnTo}:EmployeeCoreProfileProps){
  // Editable drafts retain the versions they were opened against. An RSC refresh
  // must not silently attach dirty fields to a newer employee/access revision.
  const t=employeeTeamCopy(usePortalLang()),roleNames=t.roles;
  const [baseline]=useState(()=>({employee,ownerScope,employmentDates}));
  const [role,setRole]=useState(employee.role),[scope,setScope]=useState<ScopeSelection|null>(null),[saved,setSaved]=useState(false);
  const active=String(employee.active);
  const needsScope=actorRole==='OWNER'&&role==='MANAGER'&&active==='true'&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active);
  const roleOptions = [
    { value: "EMPLOYEE", label: roleNames.EMPLOYEE },
    { value: "LEAD", label: roleNames.LEAD },
    { value: "MANAGER", label: roleNames.MANAGER },
    ...(actorRole === "OWNER" ? [{ value: "OWNER", label: roleNames.OWNER }] : []),
  ];
  const primary=locations.find(location=>location.id===employee.primaryLocationId);
  const locationOptions = locations
    .filter((location) => location.active || location.id === employee.primaryLocationId)
    .map((location) => ({
      value: location.id,
      label:
        location.id === employee.primaryLocationId && !location.active
          ? t.inactiveLocationOption(location.shortName)
          : location.shortName,
    }));
  const formId=`employee-core-${employee.id}`;
  // Final verification F (F12): Save appears once something differs from what the sheet opened with (DESIGN.MD Forms, as
  // Shift matching and Availability do), on the band from 768px and in the phone's header. What the form holds is read
  // after the first frame (the phone field formats its value), then compared on every edit; undoing an edit hides Save.
  const [changed,setChanged]=useState(false);
  useEffect(()=>{
    const form=document.getElementById(formId);
    if(!(form instanceof HTMLFormElement))return;
    const read=()=>new URLSearchParams([...new FormData(form)].map(([key,value])=>[key,typeof value==='string'?value:value.name])).toString();
    let opened:string|null=null;
    const frame=requestAnimationFrame(()=>{opened=read();});
    const check=()=>{if(opened===null)opened=read();setChanged(read()!==opened);};
    form.addEventListener('input',check);form.addEventListener('change',check);
    return()=>{cancelAnimationFrame(frame);form.removeEventListener('input',check);form.removeEventListener('change',check);};
  },[formId]);

  return <>
    {/* Review 30 (D04): once the save is confirmed the sheet's Save goes and Cancel reads Done; the result replaces the form. */}
    <FormHead titleId="person-edit-title" title={t.editEmployee} left={<FormHeadLink href={cancelHref??`/app/employees/${encodeURIComponent(employee.id)}`}>{saved?t.done:t.cancel}</FormHeadLink>}
      right={saved||!changed?undefined:<button type="submit" form={formId}>{t.save}</button>}/>
    <EmployeeAccessForm id={formId} action={action} employeeId={employee.id} build={(fields,id)=>coreCommandFromForm(fields,baseline.employee,baseline.ownerScope,actorRole,scope,id)} className="c-teamform employee-core-profile-form"
      done={{title:({first,last})=>t.savedTitle([first,last].filter(Boolean).join(' ')),line:returnTo?t.savedLineBonus:t.savedLine,
        next:()=>returnTo??{href:`/app/employees/${encodeURIComponent(employee.id)}`,label:t.openProfile}}}
      onSaved={()=>setSaved(true)}>
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="active" value={active} />
      <ReturnToNext />
      <div className="c-field__row">
        <CorpField label={t.firstName} htmlFor="edit-first"><input id="edit-first" className="c-in" name="firstName" defaultValue={employee.firstName} autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing={t.enterFirstName} /></CorpField>
        <CorpField label={t.lastName} htmlFor="edit-last"><input id="edit-last" className="c-in" name="lastName" defaultValue={employee.lastName} autoComplete="off" autoCapitalize="words" autoCorrect="off" enterKeyHint="next" required maxLength={160} data-missing={t.enterLastName} /></CorpField>
      </div>
      <CorpField label={t.mobilePhone} htmlFor="edit-phone"><PhoneField id="edit-phone" name="phone" defaultValue={employee.phone} autoComplete="off" enterKeyHint="next" required missing={t.enterPhone} /></CorpField>
      <CorpField label={t.emailOptional} htmlFor="edit-email"><input id="edit-email" className="c-in" name="email" type="email" inputMode="email" defaultValue={employee.email ?? ""} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done" maxLength={254} placeholder={t.emailPlaceholder} /></CorpField>
      <div className="c-field__row">
        <CorpField label={t.role} htmlFor="edit-role"><select id="edit-role" className="c-in" name="role" value={role} required onChange={event=>setRole(event.target.value as UserRole)}>
          {roleOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select></CorpField>
        <CorpField label={t.location} htmlFor="edit-location"><select id="edit-location" className="c-in" name="primaryLocationId" defaultValue={employee.primaryLocationId} required data-missing={t.chooseLocation}>
          {locationOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select></CorpField>
      </div>
      {primary?.active===false?<p className="c-note c-note--warn">{t.chooseActiveLocation}</p>:null}
      {role!==baseline.employee.role?<p className="c-callout" role="status"><span><b>{t.roleChange(roleNames[baseline.employee.role],roleNames[role])}</b>
        {role==='MANAGER'&&actorRole!=='OWNER'?t.ownerAssignsAccess:null}</span></p>:null}
      {needsScope&&(baseline.ownerScope?<ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p role="alert" className="c-error">{t.scopeUnavailablePromote}</p>)}
      {baseline.employmentDates?<EmploymentDateFields idPrefix="edit" value={baseline.employmentDates} bonusApplies={bonusApplies} focusHire={returnTo?.focusHire}/>:null}
      {more}
    </EmployeeAccessForm>
    {/* Leaving with details that are not saved asks first (Nov 21, 2026): the same signal that shows Save. */}
    <DiscardGuard dirty={changed&&!saved}/>
  </>;
}

/** A picker-looking field that opens its own sheet ("Positions › Barista"). */
export function SheetField({label,value,href,placeholder}:{label:string;value?:string;href:string;placeholder?:string}){
 const none=employeeTeamCopy(usePortalLang()).none;
 return <div className="c-field"><span className="c-field__label">{label}</span>
  <Link className="c-in c-pick" href={href} aria-label={`${label}: ${value||placeholder||none}`}>
   <span className={value?'c-pick__value':'c-pick__value c-pick__value--none'}>{value||placeholder||none}</span>
   <CaretRightIcon className="c-ic c-ic--s c-chev" weight="bold" aria-hidden="true"/>
  </Link></div>;
}

/** Deactivate or reactivate (board O-PersonAccess): the same core command with only the account status changed.
 * Reactivating a Manager asks the Owner to choose their management access first, as the edit form did. */
export function EmployeeStatusForm({employee,locations,actorId,actorRole,ownerScope=null,action}:{employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>}){
 // Confirmations B (#1): the server's confirmed answer replaces the buttons with the kit's done state: what is now true
 // and one step back to Team. The page refreshes itself after the save (the rows above show the new account state) and
 // that refresh remounts the editor below, so the result is kept here, above it, for the rest of the visit.
 const [result,setResult]=useState<{done:EmployeeSavedState;receipt:EmployeeSavedReceipt}|null>(null);
 if(result)return <EmployeeSavedBlock done={result.done} names={{first:employee.firstName,last:employee.lastName}} receipt={result.receipt}/>;
 return <StatusEditor key={JSON.stringify([actorId,actorRole,employee.id,employee.updatedAt])} employee={employee} locations={locations} actorRole={actorRole} ownerScope={ownerScope} action={action} onResult={setResult}/>;
}
function StatusEditor({employee,locations,actorRole,ownerScope,action,onResult}:{employee:EmployeeManagementProfile;locations:Location[];actorRole:UserRole;ownerScope:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>;onResult:(result:{done:EmployeeSavedState;receipt:EmployeeSavedReceipt})=>void}){
 const t=employeeTeamCopy(usePortalLang());
 const [baseline]=useState(()=>({employee,ownerScope}));
 const [confirming,setConfirming]=useState(false),[scope,setScope]=useState<ScopeSelection|null>(null);
 const needsScope=!employee.active&&employee.role==='MANAGER'&&actorRole==='OWNER';
 const next=!employee.active;
 const first=employee.firstName;
 const fields=<>
  <input type="hidden" name="employeeId" value={employee.id}/>
  <input type="hidden" name="firstName" value={employee.firstName}/>
  <input type="hidden" name="lastName" value={employee.lastName}/>
  <input type="hidden" name="phone" value={employee.phone}/>
  <input type="hidden" name="email" value={employee.email??''}/>
  <input type="hidden" name="role" value={employee.role}/>
  <input type="hidden" name="primaryLocationId" value={employee.primaryLocationId}/>
  <input type="hidden" name="active" value={String(next)}/>
 </>;
 // Confirmations B (#15): the confirm is the shared question block. The command, its fields and the one submit are
 // unchanged; the confirmed result is handed to the form above (see EmployeeStatusForm).
 const done:EmployeeSavedState={className:'c-status-done',title:()=>next?t.activeAgain(first):t.deactivated(first),line:next?t.activeAgainLine:t.deactivatedLine,
  next:()=>({href:'/app/employees',label:t.backToTeam})};
 return <EmployeeAccessForm action={action} employeeId={employee.id} build={(data,id)=>coreCommandFromForm(data,baseline.employee,baseline.ownerScope,actorRole,scope,id)} className="c-status-form"
  done={done} onSaved={receipt=>onResult({done,receipt})}>
  {fields}
  {needsScope&&(baseline.ownerScope?<ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p role="alert" className="c-error">{t.scopeUnavailableReactivate}</p>)}
  {next
   ? <button type="submit" className="c-btn c-btn--secondary c-btn--full">{t.reactivate(first)}</button>
   : confirming
    ? <DecisionAsk className="c-status-ask" groupLabel={t.deactivateAsk(first)} question={t.deactivateAsk(first)} consequence={t.deactivateConsequence}
       keep={t.keepActive} onKeep={()=>setConfirming(false)} go={t.deactivate} goLabel={t.deactivateName(first)} goValue="deactivate"/>
    : <button type="button" className="c-btn c-btn--danger c-btn--full" onClick={()=>setConfirming(true)}>{t.deactivateName(first)}</button>}
  {confirming?null:<p className="c-note c-note--center">{next?t.reactivateNote:t.deactivateConsequence}</p>}
 </EmployeeAccessForm>;
}
