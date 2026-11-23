'use client';

import {useId} from 'react';
import type {OwnerScopeContext,ScopeSelection} from '@/lib/company-access/model';
import styles from './company-access.module.css';
import {accessCopy,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

type ScopeFieldsProps={locations:{id:string;name:string}[];value:ScopeSelection|null;onChange:(value:ScopeSelection|null)=>void;disabled?:boolean;error:string|null;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang};
/** Shared controlled draft for new employees and atomic role transitions. */
export function OperationalScopeSelectionFields({locations,value,onChange,disabled=false,error,lang:langProp}:ScopeFieldsProps){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const t=accessCopy(lang).scope;
 const id=useId(),helpId=id+'-help',errorId=id+'-error';
 return <fieldset className={styles.fields} disabled={disabled} aria-describedby={[helpId,error?errorId:null].filter(Boolean).join(' ')}>
  <legend>{t.legend}</legend>
  <p id={helpId} className="muted">{t.help}</p>
  <label className={styles.choice}><input type="radio" name={id} checked={value?.mode==='COMPANY'} onChange={()=>onChange({mode:'COMPANY',locationIds:[]})}/><span><strong>{t.company}</strong><small>{t.companyHelp}</small></span></label>
  <label className={styles.choice}><input type="radio" name={id} checked={value?.mode==='LOCATIONS'} onChange={()=>onChange({mode:'LOCATIONS',locationIds:[]})}/><span><strong>{t.selected}</strong><small>{t.selectedHelp}</small></span></label>
  {value?.mode==='LOCATIONS'&&<div className={styles.locations} role="group" aria-label={t.group}>
   {locations.length?locations.map(location=><label key={location.id} className={styles.choice}><input type="checkbox" checked={value.locationIds.includes(location.id)} onChange={event=>onChange({mode:'LOCATIONS',locationIds:event.target.checked?[...value.locationIds,location.id]:value.locationIds.filter(id=>id!==location.id)})}/><span>{location.name}</span></label>):<p role="status">{t.noLocations}</p>}
  </div>}
  {error&&<p id={errorId} className="form-error" role="alert">{error}</p>}
 </fieldset>;
}
export function ManagerOperationalScopeFields({current,...props}:ScopeFieldsProps&{current:OwnerScopeContext}){
 const portalLang=usePortalLang(),t=accessCopy(props.lang??portalLang).scope;
 const saved=current.scope?.mode==='COMPANY'?t.company:current.scope?.mode==='LOCATIONS'?current.scope.locationIds.map(id=>props.locations.find(l=>l.id===id)?.name??t.locationUnavailable).join(', '):current.scopeState==='REVOKED'?t.revoked:t.noneAssigned;
 return <div className={styles.stack}><p className={styles.current}><strong>{t.reviewed}</strong><span>{saved}</span></p><OperationalScopeSelectionFields {...props}/></div>;
}
