'use client';

import Link from 'next/link';
import {useState,type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {EmployeeAccessForm} from './company-access/employee-access-form';
import {coreCommandFromForm} from './company-access/commands';
import {ManagerOperationalScopeFields} from './company-access/manager-operational-scope-fields';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import {CorpField} from '@/components/corp/corp';
import {FormHead,FormHeadLink,PhoneField} from '@/components/team/team-forms';
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";

type EmployeeCoreProfileProps={
 employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;
 ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>;
 /** Where Cancel goes (the person's page). */
 cancelHref?:string;
 /** Picker rows that open their own sheets (Positions, Hours and rules), after the role and location. */
 more?:ReactNode;
};
const roleNames:Record<UserRole,string>={OWNER:'Owner',MANAGER:'Manager',LEAD:'Lead',EMPLOYEE:'Employee'};

export function EmployeeCoreProfileForm(props:EmployeeCoreProfileProps){
 return <EmployeeCoreProfileEditor key={JSON.stringify([props.actorId,props.actorRole,props.employee.id])} {...props}/>;
}

/** Edit employee (Release 1, board O-EditEmployee): a sheet with Cancel · Edit employee · Save. The same command as before;
 * the account status is unchanged here (Access and sign-in deactivates and reactivates). */
function EmployeeCoreProfileEditor({employee,locations,actorRole,ownerScope=null,action,cancelHref,more}:EmployeeCoreProfileProps){
  // Editable drafts retain the versions they were opened against. An RSC refresh
  // must not silently attach dirty fields to a newer employee/access revision.
  const [baseline]=useState(()=>({employee,ownerScope}));
  const [role,setRole]=useState(employee.role),[scope,setScope]=useState<ScopeSelection|null>(null);
  const active=String(employee.active);
  const needsScope=actorRole==='OWNER'&&role==='MANAGER'&&active==='true'&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active);
  const roleOptions = [
    { value: "EMPLOYEE", label: "Employee" },
    { value: "LEAD", label: "Lead" },
    { value: "MANAGER", label: "Manager" },
    ...(actorRole === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
  ];
  const primary=locations.find(location=>location.id===employee.primaryLocationId);
  const locationOptions = locations
    .filter((location) => location.active || location.id === employee.primaryLocationId)
    .map((location) => ({
      value: location.id,
      label:
        location.id === employee.primaryLocationId && !location.active
          ? `${location.shortName} (Inactive — can only be retained while inactive)`
          : location.shortName,
    }));
  const formId=`employee-core-${employee.id}`;

  return <>
    <FormHead titleId="person-edit-title" title="Edit employee" left={<FormHeadLink href={cancelHref??`/app/employees/${encodeURIComponent(employee.id)}`}>Cancel</FormHeadLink>}
      right={<button type="submit" form={formId}>Save</button>}/>
    <EmployeeAccessForm id={formId} action={action} employeeId={employee.id} build={(fields,id)=>coreCommandFromForm(fields,baseline.employee,baseline.ownerScope,actorRole,scope,id)} className="c-teamform employee-core-profile-form">
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="active" value={active} />
      <div className="c-field__row">
        <CorpField label="First name" htmlFor="edit-first"><input id="edit-first" className="c-in" name="firstName" defaultValue={employee.firstName} autoComplete="off" required maxLength={160} /></CorpField>
        <CorpField label="Last name" htmlFor="edit-last"><input id="edit-last" className="c-in" name="lastName" defaultValue={employee.lastName} autoComplete="off" required maxLength={160} /></CorpField>
      </div>
      <CorpField label="Mobile phone" htmlFor="edit-phone"><PhoneField id="edit-phone" name="phone" defaultValue={employee.phone} autoComplete="off" required /></CorpField>
      <CorpField label="Email (optional)" htmlFor="edit-email"><input id="edit-email" className="c-in" name="email" type="email" defaultValue={employee.email ?? ""} autoComplete="off" maxLength={254} placeholder="name@example.com" /></CorpField>
      <div className="c-field__row">
        <CorpField label="Role" htmlFor="edit-role"><select id="edit-role" className="c-in" name="role" value={role} required onChange={event=>setRole(event.target.value as UserRole)}>
          {roleOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select></CorpField>
        <CorpField label="Location" htmlFor="edit-location"><select id="edit-location" className="c-in" name="primaryLocationId" defaultValue={employee.primaryLocationId} required>
          {locationOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
        </select></CorpField>
      </div>
      {primary?.active===false?<p className="c-note c-note--warn">Choose an active location before reactivating this employee.</p>:null}
      {role!==baseline.employee.role?<p className="c-callout" role="status"><span><b>{`${roleNames[baseline.employee.role]} to ${roleNames[role]} when you save`}</b>
        {role==='MANAGER'&&actorRole!=='OWNER'?'An Owner assigns their management access after this. No access is granted automatically.':null}</span></p>:null}
      {needsScope&&(baseline.ownerScope?<ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p role="alert" className="c-error">Current management access is unavailable. Reload this employee before promoting or reactivating a Manager.</p>)}
      {more}
    </EmployeeAccessForm>
  </>;
}

/** A picker-looking field that opens its own sheet ("Positions › Barista"). */
export function SheetField({label,value,href,placeholder}:{label:string;value?:string;href:string;placeholder?:string}){
 return <div className="c-field"><span className="c-field__label">{label}</span>
  <Link className="c-in c-pick" href={href} aria-label={`${label}: ${value||placeholder||'None'}`}>
   <span className={value?'c-pick__value':'c-pick__value c-pick__value--none'}>{value||placeholder||'None'}</span>
   <CaretRightIcon className="c-ic c-ic--s c-chev" weight="bold" aria-hidden="true"/>
  </Link></div>;
}

/** Deactivate or reactivate (board O-PersonAccess): the same core command with only the account status changed.
 * Reactivating a Manager asks the Owner to choose their management access first, as the edit form did. */
export function EmployeeStatusForm({employee,locations,actorId,actorRole,ownerScope=null,action}:{employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>}){
 return <StatusEditor key={JSON.stringify([actorId,actorRole,employee.id,employee.updatedAt])} employee={employee} locations={locations} actorRole={actorRole} ownerScope={ownerScope} action={action}/>;
}
function StatusEditor({employee,locations,actorRole,ownerScope,action}:{employee:EmployeeManagementProfile;locations:Location[];actorRole:UserRole;ownerScope:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>}){
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
 return <EmployeeAccessForm action={action} employeeId={employee.id} build={(data,id)=>coreCommandFromForm(data,baseline.employee,baseline.ownerScope,actorRole,scope,id)} className="c-status-form">
  {fields}
  {needsScope&&(baseline.ownerScope?<ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p role="alert" className="c-error">Current management access is unavailable. Reload this employee before reactivating a Manager.</p>)}
  {next
   ? <button type="submit" className="c-btn c-btn--secondary c-btn--full">{`Reactivate ${first}`}</button>
   : confirming
    ? <span className="c-btns"><button type="button" className="c-btn c-btn--secondary" onClick={()=>setConfirming(false)}>Keep active</button><button type="submit" className="c-btn c-btn--danger">{`Deactivate ${first}`}</button></span>
    : <button type="button" className="c-btn c-btn--danger c-btn--full" onClick={()=>setConfirming(true)}>{`Deactivate ${first}`}</button>}
  <p className="c-note c-note--center">{next?'Reactivating needs a fresh sign-in. Their history is preserved.':'Deactivation signs them out right away. Their history is preserved, and you can bring them back later.'}</p>
 </EmployeeAccessForm>;
}
