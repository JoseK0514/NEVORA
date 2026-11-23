'use client';

import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import type {CreateEmployeeWithAccessCommand,EmployeeCoreAccessCommand,EmployeeCoreAccessResult} from '@/lib/company-access/model';
import {EMPLOYMENT_DATE_FIELDS} from '@/lib/employment-dates';
import {BButtonLink,BState} from '../owner-b/b-kit';
import {readEmployeeResult} from './commands';
import styles from './company-access.module.css';
import {accessCopy,commandMessage,type AccessLang} from './access-copy';
import {usePortalLang} from '@/lib/i18n/portal-lang';

type Saved=Extract<EmployeeCoreAccessResult,{state:'saved'}>['receipt'];
/** Review 30 (D04): what the done state says once the server confirmed the save. `title` and `line` are given the saved
 * receipt and the names the form held at submit; `next` is the one tinted step. */
export type EmployeeSavedReceipt=Saved;
export type EmployeeSavedState={title:(names:{first:string;last:string})=>string;line:ReactNode;next:(receipt:Saved)=>{href:string;label:string};
 /** A quiet second way on. Its link is a full page load, so a link back to the same form starts it empty ("Add another"). */
 quiet?:{label:string;href:string};
 /** The result ends the flow: the kit's page finish (56px mark, centred, the next step as the one filled button). */
 finish?:boolean;
 /** The result stands on the canvas, not in a form sheet: its own card class. */
 className?:string};
type FieldRefusal={field:string;message:string};
/** The date fields the server can refuse by name (the inputs share the command's field names). */
const REFUSABLE=new Set<string>(EMPLOYMENT_DATE_FIELDS);
/** A field error has no closing period (DESIGN.MD Forms); the server's sentences end with one. */
const fieldWords=(message:string)=>message.trim().replace(/\.$/,'');

/** Confirmations B (#1, #28): the confirmed save, drawn where the form stood: the done mark, a title that names what is
 * now true, one line, one step and at most one quiet second way on (DESIGN.MD Phase 7, Success). The screen changed
 * under the person, so the title takes focus and is read once. A caller whose form is remounted by the page's own
 * refresh (the account status form) draws this block itself, so the result outlives that refresh. */
export function EmployeeSavedBlock({id,done,names,receipt}:{id?:string;done:EmployeeSavedState;names:{first:string;last:string};receipt:Saved}){
 const title=useRef<HTMLElement>(null);
 useEffect(()=>{title.current?.focus();},[]);
 const next=done.next(receipt),quiet=done.quiet;
 // eslint-disable-next-line next-preserved/no-html-link-for-pages -- a full load on purpose: the same route must start empty
 const second=quiet?<a className="b-done__quiet" href={quiet.href}>{quiet.label}</a>:null;
 return <section className={`c-card c-teamform-done${done.finish?` ${styles.finish}`:''}${done.className?` ${done.className}`:''}`} aria-labelledby={id?`${id}-done`:undefined}>
  <BState kind="done" size={done.finish?'finish':undefined} heading titleRef={title} title={<span id={id?`${id}-done`:undefined}>{done.title(names)}</span>} line={done.line}
   action={done.finish?{href:next.href,label:next.label}:undefined} quiet={done.finish?second:undefined}>
   {done.finish?null:<div className={`b-state-actions ${styles.doneActs}`}><BButtonLink href={next.href} kind="ghost">{next.label}</BButtonLink>{second}</div>}
  </BState>
 </section>;
}

/** One atomic command; uncertain writes reconcile their original operation ID. */
export function EmployeeAccessForm({action,build,employeeId,children,className,id,done,onSaved,onRefused,lang:langProp}:{action:(data:FormData)=>Promise<unknown>;build:(data:FormData,operationId:string)=>CreateEmployeeWithAccessCommand|EmployeeCoreAccessCommand;employeeId?:string;children:ReactNode;className:string;/** Quiet (v4): lets the page's top-right Save submit it. */id?:string;
 /** Review 30 (D04): replace the form with the kit's done state once the server confirms (Add and Edit employee). Without
  * it the confirmed save keeps the sentence under the form (the account status form). */
 done?:EmployeeSavedState;
 /** The done state is on screen: the page's own header actions for this form go away. */
 onSaved?:(receipt:Saved)=>void;
 /** Review 30 (D03): the server refused these fields; a step flow shows the step that holds them before they are marked. */
 onRefused?:(fields:string[])=>void;
 /** The person's language (Signed-in Spanish, Nov 23, 2026). */ lang?:AccessLang}){
 // Signed-in Spanish (Nov 23, 2026): the person's language, unless the caller names one.
 const portalLang=usePortalLang(),lang=langProp??portalLang;
 const t=accessCopy(lang).form;
 const [pending,setPending]=useState(false),[unknown,setUnknown]=useState(false),[message,setMessage]=useState(''),[blocked,setBlocked]=useState(false),[saved,setSaved]=useState<Saved|null>(null);
 const [refused,setRefused]=useState<FieldRefusal[]>([]),[names,setNames]=useState({first:'',last:''});
 const operation=useRef<{id:string;serialized:string}|null>(null),busy=useRef(false),mounted=useRef(false),abort=useRef<AbortController|null>(null);
 const form=useRef<HTMLFormElement>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
 // D03: once the form is usable again, each refused date carries the server's words as its own error. The shared form
 // validation draws it under the field (the warning glyph, aria-invalid, aria-describedby) and moves focus to the first.
 useEffect(()=>{
  if(pending||!refused.length||!form.current)return;
  for(const refusal of refused){const field=form.current.elements.namedItem(refusal.field);if(field instanceof HTMLInputElement)field.setCustomValidity(fieldWords(refusal.message));}
  setRefused([]);form.current.reportValidity();
 },[pending,refused]);
 // D04: the screen changed under the person, so the result's title takes focus (and is read once, with no live region).
 function apply(value:EmployeeCoreAccessResult,reconcile:boolean){
  if(value.state==='saved'){setSaved(value.receipt);setUnknown(false);setBlocked(true);operation.current=null;setMessage(done?'':employeeId?t.detailsSaved:t.created);if(done)onSaved?.(value.receipt);}
  else if(value.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage(t.unknown);}
  else if(value.state==='invalid'){
   operation.current=null;setUnknown(false);setBlocked(false);
   // D03: a refused date is said at its field; anything else the server refused stays in the line under the form.
   const atField=value.fieldErrors.filter(error=>REFUSABLE.has(error.field)&&form.current?.elements.namedItem(error.field) instanceof HTMLInputElement);
   const rest=value.fieldErrors.filter(error=>!atField.includes(error));
   setMessage(rest.length||!atField.length?rest.map(e=>e.message).join(' ')||t.reviewDetails:'');
   if(atField.length){setRefused(atField);onRefused?.(atField.map(error=>error.field));}
  }
  else {operation.current=null;setUnknown(false);setBlocked(value.state==='conflict'||value.state==='unavailable');setMessage(value.state==='conflict'?t.conflict:t.unavailable);}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||unknown||blocked||!event.currentTarget.reportValidity())return;
  let serialized:string;const id=crypto.randomUUID();const data=new FormData(event.currentTarget);
  try{serialized=JSON.stringify(build(data,id));}catch(error){setMessage(error instanceof Error?commandMessage(error.message,lang):t.reviewDetailsShort);return;}
  setNames({first:String(data.get('firstName')??'').trim(),last:String(data.get('lastName')??'').trim()});
  operation.current={id,serialized};busy.current=true;setPending(true);setMessage('');
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{const data=new FormData();data.set('command',serialized);const outcome=await Promise.race([action(data),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Save not confirmed.')),20000);})]);const result=readEmployeeResult(outcome,id,employeeId);if(mounted.current)apply(result,false);}
  catch{if(mounted.current){setUnknown(true);setMessage(t.unknown);}}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);}}
 }
 async function reconcile(){
  const original=operation.current;if(busy.current||!original)return;busy.current=true;setPending(true);const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch('/api/company-access/employee-operations/'+encodeURIComponent(original.id),{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-company-access':'1'},signal:controller.signal});if(!mounted.current)return;if(response.status===401||response.status===403){setUnknown(false);setBlocked(true);setSaved(null);operation.current=null;setMessage(t.denied);return;}const result=readEmployeeResult(await response.json(),original.id,employeeId);if(!response.ok&&result.state==='saved')throw new Error('Receipt unavailable.');if(mounted.current)apply(result,true);}
  catch{if(mounted.current)setMessage(t.stillUnknown);}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);abort.current=null;}}
 }
 // D04: the confirmed save replaces the form: the done mark, a title that names what is now true, one line and one
 // tinted next step (DESIGN.MD Phase 7, Success). The mark shows only after the server confirmed.
 if(saved&&done)return <EmployeeSavedBlock id={id} done={done} names={names} receipt={saved}/>;
 return <form ref={form} id={id} onSubmit={submit} className={className} aria-busy={pending}>
  <fieldset disabled={pending||unknown||blocked} className="configuration-fields">{children}</fieldset>
  {pending&&<p role="status">{unknown?t.checking:t.saving}</p>}
  {message&&<p role={saved?'status':'alert'} className={saved?'form-success':'form-error'}>{message}</p>}
  <div className={styles.actions}>
   {unknown&&<button type="button" className="button secondary" disabled={pending} onClick={()=>void reconcile()}>{t.checkOutcome}</button>}
   {saved&&!employeeId&&<Link className="button secondary" href={'/app/employees/'+encodeURIComponent(saved.employeeId)}>{t.openProfile}</Link>}
   {blocked&&employeeId&&<button type="button" className="button secondary" disabled={pending} onClick={()=>window.location.reload()}>{t.reloadEmployee}</button>}
  </div>
 </form>;
}
