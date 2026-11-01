'use client';
import './clocker-pin-inventory.css';
import {useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react/dist/ssr';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import {CorpAvatar,CorpBody,CorpCard,CorpRow,CorpRows} from './corp/corp';

/* Employee PINs (Release 1, corporate kit): search, Active / Not set / Inactive, then one row per person with whether a
 * PIN is set. Existing PINs are never shown; each row opens that person's Clocker PIN page (inactive people open their
 * profile), which enforces current Owner authority. */
const FILTERS=['Active','Not set','Inactive'] as const;
export function ClockerPinInventory({statuses}:{statuses:OwnerPinStatus[]}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<typeof FILTERS[number]>('Active');
 const visible=statuses.filter(p=>(filter==='Inactive'?!p.active:p.active&&(filter!=='Not set'||!p.configured))&&`${p.firstName} ${p.lastName} ${p.employeeId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const count=(label:typeof FILTERS[number])=>statuses.filter(p=>label==='Inactive'?!p.active:p.active&&(label!=='Not set'||!p.configured)).length;
 // Owner premium (visual-craft I): the PIN state is said once, in the card header ("All 9 not set", "3 of 9 not set"); a row
 // names its state only when the list is mixed, and only for the exception (no PIN yet). No pill on every row.
 const notSet=visible.filter(p=>!p.configured).length,mixed=notSet>0&&notSet<visible.length;
 const summary=!visible.length?undefined:notSet===visible.length?(visible.length===1?'Not set':`All ${visible.length} not set`):notSet===0?(visible.length===1?'PIN set':`All ${visible.length} set`):`${notSet} of ${visible.length} not set`;
 return <div className="c-page c-embed c-pins c-page--narrow">
  <label className="c-in c-pins__search"><span className="c-sr">Find an employee</span><MagnifyingGlass className="c-ic" aria-hidden="true"/>
   <input type="search" enterKeyHint="search" autoComplete="off" autoCorrect="off" value={query} placeholder="Find an employee" onChange={e=>setQuery(e.target.value)}/></label>
  <div className="c-seg" role="group" aria-label="Filter employee PINs">{FILTERS.map(label=><button key={label} type="button" aria-pressed={filter===label} onClick={()=>setFilter(label)}>{`${label} · ${count(label)}`}</button>)}</div>
  <CorpCard as="div" label={filter==='Inactive'?'Inactive people':'People'} aside={summary}>
   {visible.length?<CorpRows label="Employee PINs">{visible.map(p=><li key={p.employeeId}>
    <CorpRow href={`/app/employees/${encodeURIComponent(p.employeeId)}${p.active?'/clocker-pin':''}`} bold title={`${p.firstName} ${p.lastName}`} detail={p.employeeId}
     avatar={<CorpAvatar initials={`${p.firstName[0]??''}${p.lastName[0]??''}`.toUpperCase()} grey={!p.active}/>}
     value={mixed&&!p.configured?'Not set':undefined} valueTone="soft"
     label={`${p.firstName} ${p.lastName}, ${p.employeeId}, ${p.active?'':'inactive, '}${p.configured?'PIN set':'PIN not set'}`} chevron/>
   </li>)}</CorpRows>:<CorpBody><p className="c-pins__empty" role="status">No employees match this view. Try another name or filter.</p></CorpBody>}
  </CorpCard>
  <p className="c-pins__note">Each person uses their own PIN on a registered tablet. Existing PINs are never shown.</p>
 </div>;
}
