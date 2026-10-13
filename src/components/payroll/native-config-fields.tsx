'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { minorToDollars } from './money';
export type FieldEntries = [string,string][] | null;
const DraftContext=createContext<FieldEntries>(null);
export function DraftFields({entries,children}:{entries:FieldEntries;children:ReactNode}){return <DraftContext value={entries}>{children}</DraftContext>;}
export function savedValue(entries:FieldEntries,name:string,fallback=''){return entries===null?fallback:entries.find(([k])=>k===name)?.[1]??'';}
export function Input({name,label,value='',type='text',required=true,help,min,max,step,maxLength=300}:{name:string;label:string;value?:string|number;type?:string;required?:boolean;help?:string;min?:number;max?:number;step?:string;maxLength?:number}){
 const entries=useContext(DraftContext);return <label>{label}<input name={name} type={type} defaultValue={savedValue(entries,name,String(value))} required={required} min={min} max={max} step={step} maxLength={maxLength}/>{help&&<small>{help}</small>}</label>;
}
export function Select({name,label,value='',options,required=true,help}:{name:string;label:string;value?:string;options:[string,string][];required?:boolean;help?:string}){const entries=useContext(DraftContext);return <label>{label}<select name={name} defaultValue={savedValue(entries,name,value)} required={required}><option value="">{required?'Choose…':'Not mapped'}</option>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>{help&&<small>{help}</small>}</label>;}
export function Check({name,label,value=false,required=false,onChange}:{name:string;label:string;value?:boolean;required?:boolean;onChange?:(value:boolean)=>void}){const entries=useContext(DraftContext);return <label className="pw-check"><input type="checkbox" name={name} required={required} defaultChecked={entries===null?value:entries.some(([k])=>k===name)} onChange={e=>onChange?.(e.target.checked)}/><span>{label}</span></label>;}
export function LocationFields({name,locations,selected=[]}:{name:string;locations:{id:string;name:string;active:boolean}[];selected?:string[]}){const entries=useContext(DraftContext);const values=entries===null?selected:entries.filter(([k])=>k===name).map(([,v])=>v);return <fieldset className="pw-location-options"><legend>Payroll locations</legend>{locations.map(l=><label className="pw-check" key={l.id}><input type="checkbox" name={name} value={l.id} defaultChecked={values.includes(l.id)}/><span>{l.name}{!l.active?' · Inactive':''}</span></label>)}{!locations.length&&<p className="pw-small">No payroll locations are available.</p>}</fieldset>;}
export function localInstant(value:string|undefined|null){if(!value)return '';try{return Temporal.Instant.from(value).toZonedDateTimeISO('America/Puerto_Rico').toPlainDateTime().toString();}catch{return '';}}
export const usd=(v:string|undefined|null)=>v==null?'':minorToDollars(v);
export function hourlyDollars(v:string|undefined){if(!v)return '';const [whole,sub='']=v.split('.'); const n=BigInt(whole);return `${n/BigInt(100)}.${(n%BigInt(100)).toString().padStart(2,'0')}${sub}`;}
export function captureForm(form:HTMLFormElement):[string,string][]{return [...new FormData(form)].map(([k,v])=>[k,String(v)]);}
