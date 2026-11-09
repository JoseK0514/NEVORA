'use client';

import {useId} from 'react';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import styles from './company-access.module.css';

type ScopeFieldsProps={locations:{id:string;name:string}[];value:ScopeSelection|null;onChange:(value:ScopeSelection|null)=>void;disabled?:boolean;error:string|null};
/** Shared controlled draft for new employees and atomic role transitions. */
export function OperationalScopeSelectionFields({locations,value,onChange,disabled=false,error}:ScopeFieldsProps){
 const id=useId(),helpId=id+'-help',errorId=id+'-error';
 return <fieldset className={styles.fields} disabled={disabled} aria-describedby={[helpId,error?errorId:null].filter(Boolean).join(' ')}>
  <legend>Management access</legend>
  <p id={helpId} className="muted">Choose the operations this Manager can oversee. Scheduling eligibility and payroll permissions are separate.</p>
  <label className={styles.choice}><input type="radio" name={id} checked={value?.mode==='COMPANY'} onChange={()=>onChange({mode:'COMPANY',locationIds:[]})}/><span><strong>Company-wide</strong><small>Manage operations across all company locations.</small></span></label>
  <label className={styles.choice}><input type="radio" name={id} checked={value?.mode==='LOCATIONS'} onChange={()=>onChange({mode:'LOCATIONS',locationIds:[]})}/><span><strong>Selected locations</strong><small>Manage only the locations selected below.</small></span></label>
  {value?.mode==='LOCATIONS'&&<div className={styles.locations} role="group" aria-label="Management locations">
   {locations.length?locations.map(location=><label key={location.id} className={styles.choice}><input type="checkbox" checked={value.locationIds.includes(location.id)} onChange={event=>onChange({mode:'LOCATIONS',locationIds:event.target.checked?[...value.locationIds,location.id]:value.locationIds.filter(id=>id!==location.id)})}/><span>{location.name}</span></label>):<p role="status">No management locations are available. Reload current company information before assigning access.</p>}
  </div>}
  {error&&<p id={errorId} className="form-error" role="alert">{error}</p>}
 </fieldset>;
}
export function ManagerOperationalScopeFields({current,...props}:ScopeFieldsProps&{current:OwnerScopeContext}){
 const saved=current.scope?.mode==='COMPANY'?'Company-wide':current.scope?.mode==='LOCATIONS'?current.scope.locationIds.map(id=>props.locations.find(l=>l.id===id)?.name??'Location unavailable').join(', '):current.scopeState==='REVOKED'?'Access revoked':'No management access assigned';
 return <div className={styles.stack}><p className={styles.current}><strong>Reviewed management access</strong><span>{saved}</span></p><OperationalScopeSelectionFields {...props}/></div>;
}
