'use client';
import './clocker-pin-inventory.css';
import {useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import {CorpAvatar,CorpBody,CorpCard,CorpRow,CorpRows} from './corp/corp';

/* Clocker PINs (Release 1, corporate kit; Owner premium R13): search, then two tabs that never overlap (No PIN, PIN set; an
 * Inactive tab only when someone is inactive), then one row per person with their position and location. Existing PINs are
 * never shown; each row opens that person's Clocker PIN page (inactive people open their profile), which enforces current
 * Owner authority. */
type Filter='No PIN'|'PIN set'|'Inactive';
const inFilter=(p:OwnerPinStatus,filter:Filter)=>filter==='Inactive'?!p.active:p.active&&(filter==='No PIN'?!p.configured:p.configured);
export function ClockerPinInventory({statuses,details={}}:{statuses:OwnerPinStatus[];
 /** "Barista · Condado" by employee ID; a person without one shows no detail line. */ details?:Record<string,string>}){
 const count=(filter:Filter)=>statuses.filter(p=>inFilter(p,filter)).length;
 const filters:Filter[]=count('Inactive')?['No PIN','PIN set','Inactive']:['No PIN','PIN set'];
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<Filter>(()=>count('No PIN')||!count('PIN set')?'No PIN':'PIN set');
 const visible=statuses.filter(p=>inFilter(p,filter)&&`${p.firstName} ${p.lastName} ${p.employeeId} ${details[p.employeeId]??''}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <div className="c-page c-embed c-pins c-page--narrow">
  <label className="c-in c-pins__search"><span className="c-sr">Search by name</span><MagnifyingGlass className="c-ic" aria-hidden="true"/>
   <input type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" value={query} placeholder="Search by name" onChange={e=>setQuery(e.target.value)}/></label>
  <div className="c-seg c-pins__seg" role="group" aria-label="Filter Clocker PINs">{filters.map(label=><button key={label} type="button" aria-pressed={filter===label} aria-label={`${label}, ${count(label)}`} onClick={()=>setFilter(label)}>
   <span>{label}</span><span className="c-pins__count" aria-hidden="true">{count(label)}</span></button>)}</div>
  <CorpCard as="div" label={filter==='Inactive'?'Inactive people':'People'} >
   {visible.length?<CorpRows label="Clocker PINs">{visible.map(p=><li key={p.employeeId}>
    <CorpRow href={`/app/employees/${encodeURIComponent(p.employeeId)}${p.active?'/clocker-pin':''}`} bold title={`${p.firstName} ${p.lastName}`} detail={details[p.employeeId]}
     avatar={<CorpAvatar initials={`${p.firstName[0]??''}${p.lastName[0]??''}`.toUpperCase()} grey={!p.active}/>}
     label={`${p.firstName} ${p.lastName}${details[p.employeeId]?`, ${details[p.employeeId]}`:''}, ${p.active?'':'inactive, '}${p.configured?'PIN set':'no PIN yet'}`} chevron/>
   </li>)}</CorpRows>:<CorpBody><p className="c-pins__empty" role="status">{query.trim()?'No one matches that name.':filter==='No PIN'?'Everyone has a PIN.':filter==='PIN set'?'No one has a PIN yet.':'No inactive people.'}</p></CorpBody>}
  </CorpCard>
  <p className="c-pins__note">Each person clocks in with their own PIN. You can’t see a PIN once it’s set.</p>
 </div>;
}
