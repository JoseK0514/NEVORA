'use client';

import {useState} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {EmployeeAccessForm} from './company-access/employee-access-form';
import {coreCommandFromForm} from './company-access/commands';
import {ManagerOperationalScopeFields} from './company-access/manager-operational-scope-fields';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import { PhoneInput } from "@/components/phone-input";
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";
import { employeeRoleLabel } from "@/lib/employee-display";
import './quiet/u4.css';

type EmployeeCoreProfileProps={
 employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;
 ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>;
 /** Quiet (T-11): the page's top-right Save submits this form. */
 formId?:string;
};
export function EmployeeCoreProfileForm(props:EmployeeCoreProfileProps){
 return <EmployeeCoreProfileEditor key={JSON.stringify([props.actorId,props.actorRole,props.employee.id])} {...props}/>;
}

/** UX-O-53: a role change asks first; promoting to Owner says what it gives. */
export function roleChangeQuestion(name:string,from:UserRole,to:UserRole){
 if(from===to)return null;
 const label=employeeRoleLabel(to);
 return {title:'Change role',action:`Change to ${label}`,danger:to==='OWNER',
  body:to==='OWNER'?`${name} becomes an Owner: full access to payroll, settings and every person. You can change it back later.`
   :from==='OWNER'?`${name} stops being an Owner and loses payroll and settings access.`
   :`${name} becomes ${/^[AEIOU]/.test(label)?'an':'a'} ${label}. What they can see and do changes right away.`};
}

/* T-11 (final pass, Oct 25, 2026): Edit employee on the AddEmployee grammar. Name and contact as grey fields, then Work as
 * rows: the Employee ID (read only), Role and Location. Status is not here: Person has "Deactivate" with its own confirm.
 * The command, its versions and the Manager-scope rule are the same as before. */
function EmployeeCoreProfileEditor({employee,locations,actorId,actorRole,ownerScope=null,action,formId='edit-employee-form'}:EmployeeCoreProfileProps){
  // UX-O-70: editing yourself changes name, phone, email and location only; your own role is read only here.
  const self=employee.id===actorId;
  // Editable drafts retain the versions they were opened against. An RSC refresh
  // must not silently attach dirty fields to a newer employee/access revision.
  const [baseline]=useState(()=>({employee,ownerScope}));
  const [role,setRole]=useState(employee.role),[scope,setScope]=useState<ScopeSelection|null>(null);
  const active=baseline.employee.active;
  const needsScope=actorRole==='OWNER'&&role==='MANAGER'&&active&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active);
  const roleOptions = [
    ...(actorRole === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
    { value: "MANAGER", label: "Manager" },
    { value: "LEAD", label: "Lead" },
    { value: "EMPLOYEE", label: "Employee" },
  ];

  const locationOptions = locations
    .filter((location) => location.active || location.id === employee.primaryLocationId)
    .map((location) => ({
      value: location.id,
      label:
        location.id === employee.primaryLocationId && !location.active
          ? `${location.shortName} (Inactive — can only be retained while inactive)`
          : location.shortName,
    }));
  const name=`${baseline.employee.firstName} ${baseline.employee.lastName}`;

  return (
    <EmployeeAccessForm id={formId} action={action} employeeId={employee.id} build={(fields,id)=>coreCommandFromForm(fields,baseline.employee,baseline.ownerScope,actorRole,scope,id)}
      confirm={fields=>roleChangeQuestion(name,baseline.employee.role,String(fields.get('role')) as UserRole)}
      className="q-form q-u4-form employee-core-profile-form">
      <input type="hidden" name="employeeId" value={employee.id} />
      {/* Status stays as it is; Deactivate and Reactivate live on Person. */}
      <input type="hidden" name="active" value={String(active)} />
      <div className="q-fl q-first"><label className="q-fl__label" htmlFor="edit-first">First name</label><input id="edit-first" className="q-in" style={{marginTop:8}} name="firstName" defaultValue={employee.firstName} placeholder="First name" autoComplete="off" required maxLength={160} /></div>
      <div className="q-fl"><label className="q-fl__label" htmlFor="edit-last">Last name</label><input id="edit-last" className="q-in" style={{marginTop:8}} name="lastName" defaultValue={employee.lastName} placeholder="Last name" autoComplete="off" required maxLength={160} /></div>
      <div className="q-fl"><label className="q-fl__label" htmlFor="edit-phone">Phone</label><div style={{marginTop:8}}><PhoneInput id="edit-phone" className="q-in" name="phone" defaultValue={employee.phone} autoComplete="off" required /></div></div>
      <div className="q-fl"><label className="q-fl__label" htmlFor="edit-email">Email <span className="q-fl__opt">· Optional</span></label><input id="edit-email" className="q-in" style={{marginTop:8}} name="email" type="email" defaultValue={employee.email ?? ""} placeholder="name@example.com" autoComplete="off" maxLength={254} /></div>
      <div className="q-grp"><h2 id="edit-work-heading">Work</h2></div>
      <ul className="q-list" aria-labelledby="edit-work-heading">
        <li><div className="q-row q-row--one"><span className="q-rt"><b>Employee ID</b></span><span className="q-rv q-rv--l">{employee.id}</span></div></li>
        {self?<li><div className="q-row q-row--one"><span className="q-rt"><b>Role</b></span><span className="q-rv q-rv--l">{employeeRoleLabel(employee.role)}</span><input type="hidden" name="role" value={employee.role}/></div></li>
        :<li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Role</b></span>
          <select className="q-select-row__control" name="role" value={role} onChange={event=>setRole(event.target.value as UserRole)} aria-label="Role" required>
            {roleOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>}
        <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Location</b></span>
          <select className="q-select-row__control" name="primaryLocationId" defaultValue={employee.primaryLocationId} aria-label="Location" required>
            {locationOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select><CaretRightIcon className="q-chev" aria-hidden="true"/></label></li>
      </ul>
      {locations.find((location) => location.id === employee.primaryLocationId)?.active ? null : <p className="q-help">Choose an active location before reactivating {employee.firstName}.</p>}
      {needsScope&&(baseline.ownerScope?<div className="q-details__body q-u4-scope"><ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/></div>:<p role="alert" className="q-error">Current management access is unavailable. Reload this employee before promoting or reactivating a Manager.</p>)}
      {actorRole!=='OWNER'&&role==='MANAGER'&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active)&&<p className="q-help">An Owner must assign management access after this change. No company or location access is granted automatically.</p>}
      <button className="q-sr" type="submit" tabIndex={-1}>Save</button>
    </EmployeeAccessForm>
  );
}
