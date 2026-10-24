"use client";

import {useState,type ComponentProps} from 'react';
import {CaretRight} from '@phosphor-icons/react/dist/ssr';
import type {Location,UserRole} from '@/lib/domain';
import type {ScopeSelection} from '@/lib/company-access/model';
import {PhoneInput} from '@/components/phone-input';
import {EmployeeSchedulingFields} from '@/components/employee-scheduling-fields';
import {EmployeeAccessForm} from './employee-access-form';
import {createCommandFromForm} from './commands';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';

export function NewEmployeeForm({actorRole,locations:activeLocations,positions,action}:{actorRole:UserRole;locations:Location[];positions:ComponentProps<typeof EmployeeSchedulingFields>['positions'];action:(data:FormData)=>Promise<unknown>}){
 const [role,setRole]=useState<UserRole>('EMPLOYEE'),[scope,setScope]=useState<ScopeSelection|null>(null);
 // Quiet (v4, approved Oct 23): name and phone as fields; then Work as rows (ID, role, location, positions, email).
 // The page's Save (top right) submits; nothing about access or scheduling changes.
 return (
          <EmployeeAccessForm id="new-employee-form" action={action} build={(fields,id)=>createCommandFromForm(fields,actorRole,scope,id)} className="q-form">
            <input type="hidden" name="active" value="true"/>
            <div className="q-fl q-first"><label className="q-fl__label" htmlFor="new-first">First name</label><input id="new-first" className="q-in" style={{marginTop:8}} name="firstName" autoComplete="given-name" required maxLength={160} /></div>
            <div className="q-fl"><label className="q-fl__label" htmlFor="new-last">Last name</label><input id="new-last" className="q-in" style={{marginTop:8}} name="lastName" autoComplete="family-name" required maxLength={160} /></div>
            <div className="q-fl"><label className="q-fl__label" htmlFor="new-phone">Phone</label><div style={{marginTop:8}}><PhoneInput id="new-phone" className="q-in" name="phone" autoComplete="tel-national" required /></div></div>
            <div className="q-grp"><h2 id="employee-access-heading">Work</h2></div>
            <ul className="q-list">
              <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>Employee ID</b></span>
                <input name="id" placeholder="e.g. 10482" autoCapitalize="characters" spellCheck={false} required maxLength={128} aria-label="Employee ID"/></label></li>
              <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Role</b></span>
                <select className="q-select-row__control" name="role" value={role} onChange={event=>setRole(event.target.value as UserRole)} aria-label="Role">
                  {actorRole === "OWNER" ? <option value="OWNER">Owner</option> : null}
                  <option value="MANAGER">Manager</option><option value="LEAD">Lead</option><option value="EMPLOYEE">Employee</option>
                </select><CaretRight className="q-chev" aria-hidden="true"/></label></li>
              <li><label className="q-row q-row--one q-select-row"><span className="q-rt"><b>Location</b></span>
                <select className="q-select-row__control" name="primaryLocationId" required defaultValue="" aria-label="Location">
                  <option value="" disabled>Choose</option>
                  {activeLocations.map(location => <option key={location.id} value={location.id}>{location.shortName}</option>)}
                </select><CaretRight className="q-chev" aria-hidden="true"/></label></li>
              <li><details className="q-details"><summary className="q-row q-row--one"><span className="q-rt"><b>Positions</b></span><span className="q-rv q-rv--ph">Optional</span><CaretRight className="q-chev" aria-hidden="true"/></summary>
                <div className="q-details__body"><EmployeeSchedulingFields locations={activeLocations} positions={positions} /></div></details></li>
              <li><label className="q-row q-row--one q-input-row"><span className="q-rt"><b>Email</b></span>
                <input name="email" type="email" autoComplete="email" maxLength={254} placeholder="Optional" aria-label="Email, optional"/></label></li>
            </ul>
            {role==='MANAGER'&&(actorRole==='OWNER'?<div className="q-details__body"><OperationalScopeSelectionFields locations={activeLocations.map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/></div>:<p className="q-help">An Owner assigns management access after this.</p>)}
            <button className="q-sr" type="submit" tabIndex={-1} disabled={!activeLocations.length}>Save</button>
          </EmployeeAccessForm>
 );
}