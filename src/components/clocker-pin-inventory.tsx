'use client';
import './clocker-pin-inventory.css';
import {useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import {CorpAvatar,CorpBody,CorpCard,CorpPill,CorpRow,CorpRows} from './corp/corp';

/* Employee PINs (Release 1, corporate kit): search, Active / Not set / Inactive, then one row per person with whether a
 * PIN is set. Existing PINs are never shown; each row opens that person's Clocker PIN page (inactive people open their
 * profile), which enforces current Owner authority. */
const FILTERS=['Active','Not set','Inactive'] as const;
export function ClockerPinInventory({statuses}:{statuses:OwnerPinStatus[]}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<typeof FILTERS[number]>('Active');
 const visible=statuses.filter(p=>(filter==='Inactive'?!p.active:p.active&&(filter!=='Not set'||!p.configured))&&`${p.firstName} ${p.lastName} ${p.employeeId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const count=(label:typeof FILTERS[number])=>statuses.filter(p=>label==='Inactive'?!p.active:p.active&&(label!=='Not set'||!p.configured)).length;
 return <div className="c-page c-pins">
  <label className="c-in c-pins__search"><span className="c-sr">Find an employee</span><MagnifyingGlass className="c-ic" aria-hidden="true"/>
   <input type="search" value={query} placeholder="Find an employee" onChange={e=>setQuery(e.target.value)}/></label>
  <div className="c-seg" role="group" aria-label="Filter employee PINs">{FILTERS.map(label=><button key={label} type="button" aria-pressed={filter===label} onClick={()=>setFilter(label)}>{`${label} · ${count(label)}`}</button>)}</div>
  <CorpCard as="div" ariaLabel="Employee PINs">
   {visible.length?<CorpRows label="Employee PINs">{visible.map(p=><li key={p.employeeId}>
    <CorpRow href={`/app/employees/${encodeURIComponent(p.employeeId)}${p.active?'/clocker-pin':''}`} bold title={`${p.firstName} ${p.lastName}`} detail={p.employeeId}
     avatar={<CorpAvatar initials={`${p.firstName[0]??''}${p.lastName[0]??''}`.toUpperCase()} grey={!p.active}/>}
     trail={<CorpPill tone={p.configured?'teal':'neutral'}>{p.active?'':'Inactive · '}{p.configured?'PIN set':'Not set'}</CorpPill>} chevron/>
   </li>)}</CorpRows>:<CorpBody><p className="c-pins__empty" role="status">No employees match this view. Try another name or filter.</p></CorpBody>}
  </CorpCard>
  <p className="c-pins__note">Each person uses their own PIN on a registered tablet. Existing PINs are never shown.</p>
 </div>;
}
