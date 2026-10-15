'use client';

import {useState} from 'react';
import {EmployeeAccessForm} from './company-access/employee-access-form';
import {coreCommandFromForm} from './company-access/commands';
import {ManagerOperationalScopeFields} from './company-access/manager-operational-scope-fields';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import styles from './company-access/company-access.module.css';
import { PhoneInput } from "@/components/phone-input";
import { SelectField } from "@/components/select-field";
import type { EmployeeManagementProfile } from "@/lib/data/employees";
import type { Location, UserRole } from "@/lib/domain";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";

type EmployeeCoreProfileProps={
 employee:EmployeeManagementProfile;locations:Location[];actorId:string;actorRole:UserRole;
 ownerScope?:OwnerScopeContext|null;action:(data:FormData)=>Promise<unknown>;
};
export function EmployeeCoreProfileForm(props:EmployeeCoreProfileProps){
 return <EmployeeCoreProfileEditor key={JSON.stringify([props.actorId,props.actorRole,props.employee.id])} {...props}/>;
}
function EmployeeCoreProfileEditor({employee,locations,actorRole,ownerScope=null,action}:EmployeeCoreProfileProps){
  // Editable drafts retain the versions they were opened against. An RSC refresh
  // must not silently attach dirty fields to a newer employee/access revision.
  const [baseline]=useState(()=>({employee,ownerScope}));
  const [role,setRole]=useState(employee.role),[active,setActive]=useState(String(employee.active)),[scope,setScope]=useState<ScopeSelection|null>(null);
  const needsScope=actorRole==='OWNER'&&role==='MANAGER'&&active==='true'&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active);
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

  return (
    <EmployeeAccessForm action={action} employeeId={employee.id} build={(fields,id)=>coreCommandFromForm(fields,baseline.employee,baseline.ownerScope,actorRole,scope,id)} className={'employee-form employee-core-profile-form '+styles.coreForm}>
      <input type="hidden" name="employeeId" value={employee.id} />

      <div className="employee-core-id">
        <span>Employee ID</span>
        <strong>{employee.id}</strong>
        <small>Employee IDs remain stable after creation.</small>
      </div>

      <div className="form-columns">
        <label>
          First name
          <input name="firstName" defaultValue={employee.firstName} required maxLength={160} />
        </label>
        <label>
          Last name
          <input name="lastName" defaultValue={employee.lastName} required maxLength={160} />
        </label>
      </div>

      <div className="form-columns">
        <label>
          Phone number
          <PhoneInput
            name="phone"
            defaultValue={employee.phone}
            autoComplete="tel"
            required
          />
        </label>
        <label>
          <span className="employee-email-label">Email <small>Optional</small></span>
          <input
            name="email"
            type="email"
            defaultValue={employee.email ?? ""}
            autoComplete="email"
            maxLength={254}
          />
        </label>
      </div>

      <div className="form-columns">
        <SelectField
          name="role"
          label="Access role"
          value={role}
          onChange={event=>setRole(event.target.value as UserRole)}
          options={roleOptions}
          required
        />
        <SelectField
          name="primaryLocationId"
          label="Primary location"
          defaultValue={employee.primaryLocationId}
          options={locationOptions}
          hint={
            locations.find((location) => location.id === employee.primaryLocationId)
              ?.active
              ? undefined
              : "Choose an active primary location before reactivating this employee."
          }
          required
        />
      </div>

      <SelectField
        name="active"
        label="Employee status"
        value={active}
        onChange={event=>setActive(event.target.value)}
        options={[
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ]}
        hint="Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved."
        required
      />

      {needsScope&&(baseline.ownerScope?<ManagerOperationalScopeFields current={baseline.ownerScope} locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p role="alert" className="form-error">Current management access is unavailable. Reload this employee before promoting or reactivating a Manager.</p>)}
      {actorRole!=='OWNER'&&role==='MANAGER'&&(baseline.employee.role!=='MANAGER'||!baseline.employee.active)&&<p className="muted">An Owner must assign management access after this change. No company or location access is granted automatically.</p>}

      <div className="form-footer">
        <button className="button primary" type="submit">
          <CheckIcon size={18} aria-hidden="true" focusable="false" /> Save Employee Details
        </button>
      </div>
    </EmployeeAccessForm>
  );
}
