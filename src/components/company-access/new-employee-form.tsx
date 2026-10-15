"use client";

import Link from 'next/link';
import {useState,type ComponentProps} from 'react';
import {ArrowRight,Briefcase,ShieldCheck,UserCircle} from '@phosphor-icons/react/dist/ssr';
import type {Location,UserRole} from '@/lib/domain';
import type {ScopeSelection} from '@/lib/company-access/model';
import {PhoneInput} from '@/components/phone-input';
import {SelectField} from '@/components/select-field';
import {EmployeeSchedulingFields} from '@/components/employee-scheduling-fields';
import {EmployeeAccessForm} from './employee-access-form';
import {createCommandFromForm} from './commands';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';

export function NewEmployeeForm({actorRole,locations:activeLocations,positions,action}:{actorRole:UserRole;locations:Location[];positions:ComponentProps<typeof EmployeeSchedulingFields>['positions'];action:(data:FormData)=>Promise<unknown>}){
 const [role,setRole]=useState<UserRole>('EMPLOYEE'),[scope,setScope]=useState<ScopeSelection|null>(null);
 return (
          <EmployeeAccessForm action={action} build={(fields,id)=>createCommandFromForm(fields,actorRole,scope,id)} className="employee-form new-employee-form">
            <input type="hidden" name="active" value="true"/>
            <section className="new-employee-section" aria-labelledby="employee-contact-heading">
              <div className="new-employee-section-heading">
                <UserCircle size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-contact-heading">Personal details</h2><p>Add their contact information and a unique sign-in ID.</p></div>
              </div>
              <div className="form-columns">
                <label>First Name<input name="firstName" autoComplete="given-name" required maxLength={160} /></label>
                <label>Last Name<input name="lastName" autoComplete="family-name" required maxLength={160} /></label>
              </div>
              <div className="form-columns">
                <label>Employee ID<input name="id" placeholder="Enter an employee ID" autoCapitalize="characters" spellCheck={false} required maxLength={128} aria-describedby="employee-id-help" /><small id="employee-id-help">A unique ID for sign-in.</small></label>
                <label>Phone Number<PhoneInput name="phone" autoComplete="tel-national" required /><small>Contact number. Account activation uses an email invitation.</small></label>
              </div>
              <label className="new-employee-email"><span className="new-employee-label">Email <span>Optional</span></span><input name="email" type="email" autoComplete="email" maxLength={254} /></label>
            </section>

            <section className="new-employee-section" aria-labelledby="employee-access-heading">
              <div className="new-employee-section-heading">
                <ShieldCheck size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-access-heading">Access &amp; home location</h2><p>Choose their app permissions and primary workplace.</p></div>
              </div>
              <div className="form-columns">
                <SelectField name="role" label="Access role" value={role} onChange={event=>setRole(event.target.value as UserRole)}
                  hint="App permissions are separate from job qualifications."
                  options={[
                    ...(actorRole === "OWNER" ? [{ value: "OWNER", label: "Owner" }] : []),
                    { value: "MANAGER", label: "Manager" },
                    { value: "LEAD", label: "Lead" },
                    { value: "EMPLOYEE", label: "Employee" },
                  ]}
                />
                <SelectField name="primaryLocationId" label="Primary location" required defaultValue=""
                  hint="Their primary location is always eligible for scheduling."
                  options={[
                    { value: "", label: "Choose a primary location", disabled: true },
                    ...activeLocations.map((location) => ({ value: location.id, label: location.shortName })),
                  ]}
                />
              </div>
              {role==='MANAGER'&&(actorRole==='OWNER'?<OperationalScopeSelectionFields locations={activeLocations.map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/>:<p className="muted">An Owner must assign management access after creation. No company or location access is granted automatically.</p>)}
            </section>

            <section className="new-employee-section" aria-labelledby="employee-scheduling-heading">
              <div className="new-employee-section-heading">
                <Briefcase size={24} weight="duotone" aria-hidden="true" />
                <div><h2 id="employee-scheduling-heading">Scheduling eligibility</h2><p>Select qualified positions and any additional workplaces.</p></div>
              </div>
              <div className="new-employee-scheduling"><EmployeeSchedulingFields locations={activeLocations} positions={positions} /></div>
            </section>

            <div className="form-footer new-employee-footer">
              <Link className="button secondary" href="/app/employees">Cancel</Link>
              <button className="button primary" type="submit" disabled={!activeLocations.length}>Create Employee <ArrowRight size={16} aria-hidden="true" /></button>
            </div>
          </EmployeeAccessForm>
 );
}
