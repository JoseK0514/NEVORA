'use client';

import {useState,type ReactNode} from 'react';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {QuietSheet} from '@/components/quiet/quiet-sheet';
import {EmployeeAccessForm} from './employee-access-form';
import {coreCommandFromForm} from './commands';
import {OperationalScopeSelectionFields} from './manager-operational-scope-fields';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import type {EmployeeManagementProfile} from '@/lib/data/employees';
import type {Location,UserRole} from '@/lib/domain';
import '../quiet/u4.css';

/* T-11 (final pass, Oct 25, 2026): Person and Edit employee rows that open one object's details as a Quiet sheet. */

/** A row that opens a sheet (Positions, Account, Management access). The sheet's content stays mounted, so a panel keeps
 * its own in-flight state while the sheet is closed. */
export function EmployeeSheetRow({title,value,placeholder=false,sheetTitle,children}:{title:string;value?:string;placeholder?:boolean;sheetTitle:string;children:ReactNode}){
  const [open,setOpen]=useState(false);
  return <li>
    <button type="button" className="q-row q-row--one q-row--btn" aria-haspopup="dialog" onClick={()=>setOpen(true)}>
      <span className="q-rt"><b>{title}</b></span>{value?<span className={`q-rv q-rv--${placeholder?'ph':'l'}`}>{value}</span>:null}<CaretRightIcon className="q-chev" aria-hidden="true"/>
    </button>
    <QuietSheet open={open} label={sheetTitle} onClose={()=>setOpen(false)}>
      <div className="q-nav"><span/><span className="q-nav__t">{sheetTitle}</span><button type="button" className="q-nav__r q-nav__r--b" onClick={()=>setOpen(false)}>Done</button></div>
      {children}
    </QuietSheet>
  </li>;
}

/** T-11 / UX-O-53: status lives on Person as one danger row, "Deactivate Alexandra", with a confirm sheet. Reactivation is
 * the same row in ink. Both send the existing core command with only `active` changed; a Manager reactivated by an
 * Owner gets the same explicit management access choice as before. */
export function EmployeeStatusAction({employee,ownerScope,actorRole,locations,action}:{employee:EmployeeManagementProfile;ownerScope:OwnerScopeContext|null;actorRole:UserRole;locations:Location[];action:(data:FormData)=>Promise<unknown>;}){
  const [open,setOpen]=useState(false),[scope,setScope]=useState<ScopeSelection|null>(null);
  const deactivate=employee.active;
  const needsScope=!deactivate&&actorRole==='OWNER'&&employee.role==='MANAGER';
  const verb=deactivate?'Deactivate':'Reactivate';
  return <>
    <ul className="q-list q-u4-foot"><li><button type="button" className={`q-row q-row--one q-row--btn${deactivate?' q-row--danger':''}`} aria-haspopup="dialog" onClick={()=>setOpen(true)}>
      <span className="q-rt"><b>{verb} {employee.firstName}</b></span></button></li></ul>
    <QuietSheet open={open} label={`${verb} ${employee.firstName}`} onClose={()=>setOpen(false)}>
      <div className="q-nav"><button type="button" className="q-nav__l q-nav__l--teal q-u4-navbtn" onClick={()=>setOpen(false)}>Cancel</button><span className="q-nav__t">{verb}</span><span/></div>
      <div className="q-hd q-tc-sheet__hd"><h2>{verb} {employee.firstName} {employee.lastName}?</h2></div>
      <p className="q-u4-confirm">{deactivate?'They’re signed out right away. Their history is kept.':'They can sign in again with a fresh sign-in. Their history is kept.'}</p>
      <EmployeeAccessForm action={action} employeeId={employee.id} className="q-form q-u4-form"
        build={(fields,id)=>coreCommandFromForm(fields,employee,ownerScope,actorRole,scope,id)}>
        <input type="hidden" name="employeeId" value={employee.id}/>
        <input type="hidden" name="firstName" value={employee.firstName}/>
        <input type="hidden" name="lastName" value={employee.lastName}/>
        <input type="hidden" name="phone" value={employee.phone}/>
        <input type="hidden" name="email" value={employee.email??''}/>
        <input type="hidden" name="role" value={employee.role}/>
        <input type="hidden" name="primaryLocationId" value={employee.primaryLocationId}/>
        <input type="hidden" name="active" value={deactivate?'false':'true'}/>
        {needsScope?ownerScope?<div className="q-details__body q-u4-scope"><OperationalScopeSelectionFields locations={locations.filter(l=>l.active).map(l=>({id:l.id,name:l.name}))} value={scope} onChange={setScope} error={null}/></div>
          :<p role="alert" className="q-error">Current management access is unavailable. Reload this employee before reactivating a Manager.</p>:null}
        {!deactivate&&actorRole!=='OWNER'&&employee.role==='MANAGER'?<p className="q-help">An Owner must assign management access after this change.</p>:null}
        <button type="submit" className={deactivate?'q-btn q-u4-danger':'q-btn'}>{verb}</button>
      </EmployeeAccessForm>
    </QuietSheet>
  </>;
}
