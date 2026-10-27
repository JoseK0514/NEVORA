'use client';
import Link from 'next/link';
import {useState} from 'react';
import type {OwnerPinStatus} from '../lib/clocker/pin-operations.server';
import styles from './clocker-owner.module.css';
export function ClockerPinInventory({statuses}:{statuses:OwnerPinStatus[]}){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState<'Active'|'Not set'|'Inactive'>('Active');
 const visible=statuses.filter(p=>(filter==='Inactive'?!p.active:p.active&&(filter!=='Not set'||!p.configured))&&`${p.firstName} ${p.lastName} ${p.employeeId}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 return <div className={styles.inventory}><label className={styles.search}>Find an employee<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><div className={styles.filters} role="group" aria-label="Filter employee PINs">{(['Active','Not set','Inactive'] as const).map(label=><button key={label} type="button" aria-pressed={filter===label} onClick={()=>setFilter(label)}>{label}</button>)}</div><p className="q-help">Each person uses their own PIN on a registered tablet. Existing PINs are never shown.</p>{visible.length?<ul>{visible.map(p=><li key={p.employeeId}><Link className={styles.person} href={`/app/employees/${encodeURIComponent(p.employeeId)}${p.active?'/clocker-pin':''}`}><span><strong>{p.firstName} {p.lastName}</strong><small>{p.employeeId}</small></span><span className={styles.status}>{p.active?'':'Inactive · '}{p.configured?'PIN set':'Not set'}</span></Link></li>)}</ul>:<p role="status">No employees match this view. Try another name or filter.</p>}</div>;
}
