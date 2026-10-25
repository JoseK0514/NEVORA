'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {QuietSheet} from '@/components/quiet/quiet-sheet';
import {toast} from '@/components/toaster';
import type {CreateEmployeeWithAccessCommand,EmployeeCoreAccessCommand,EmployeeCoreAccessResult} from '@/lib/company-access/model';
import {readEmployeeResult} from './commands';
import styles from './company-access.module.css';

/** One atomic command; uncertain writes reconcile their original operation ID. */
export function EmployeeAccessForm({action,build,employeeId,children,className,id,confirm,savedLabel}:{action:(data:FormData)=>Promise<unknown>;build:(data:FormData,operationId:string)=>CreateEmployeeWithAccessCommand|EmployeeCoreAccessCommand;employeeId?:string;children:ReactNode;className:string;/** Quiet (v4): lets the page's top-right Save submit it. */id?:string;
 /** UX-O-53: a high-impact change (role, deactivation) asks first. Returns the question and its button, or null. */
 confirm?:(data:FormData)=>{title:string;body:string;action:string;danger?:boolean}|null;
 /** UX-O-50: a new employee opens their page; this names the toast ("Alexandra added"). */
 savedLabel?:(data:FormData)=>string}){
 const formRef=useRef<HTMLFormElement>(null),confirmed=useRef(false);
 const [createdLabel,setCreatedLabel]=useState('');
 const [asking,setAsking]=useState<{title:string;body:string;action:string;danger?:boolean}|null>(null);
 const [pending,setPending]=useState(false),[unknown,setUnknown]=useState(false),[message,setMessage]=useState(''),[blocked,setBlocked]=useState(false),[saved,setSaved]=useState<Extract<EmployeeCoreAccessResult,{state:'saved'}>['receipt']|null>(null);
 const operation=useRef<{id:string;serialized:string}|null>(null),busy=useRef(false),mounted=useRef(false),abort=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
 function apply(value:EmployeeCoreAccessResult,reconcile:boolean){
  if(value.state==='saved'){setSaved(value.receipt);setUnknown(false);setBlocked(true);operation.current=null;setMessage(employeeId?'Employee details saved. Reload the employee to review current access before making another change.':'Employee created. Open their profile to review details and manage their account invitation.');
  }
  else if(value.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage('The save outcome is not confirmed. Check this save before making another change.');}
  else {operation.current=null;setUnknown(false);setBlocked(value.state==='conflict'||value.state==='unavailable');setMessage(value.state==='conflict'?'Employee or access information changed. Reload and review current details before saving a replacement.':value.state==='invalid'?value.fieldErrors.map(e=>e.message).join(' ')||'Review the employee details before saving.':'Saving is unavailable. Reload current information before trying again.');}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||unknown||blocked||!event.currentTarget.reportValidity())return;
  if(confirm&&!confirmed.current){const question=confirm(new FormData(event.currentTarget));if(question){setAsking(question);return;}}
  confirmed.current=false;
  if(savedLabel)setCreatedLabel(savedLabel(new FormData(event.currentTarget)));
  let serialized:string;const id=crypto.randomUUID();
  try{serialized=JSON.stringify(build(new FormData(event.currentTarget),id));}catch(error){setMessage(error instanceof Error?error.message:'Review employee details before saving.');return;}
  operation.current={id,serialized};busy.current=true;setPending(true);setMessage('');
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{const data=new FormData();data.set('command',serialized);const outcome=await Promise.race([action(data),new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Save not confirmed.')),20000);})]);const result=readEmployeeResult(outcome,id,employeeId);if(mounted.current)apply(result,false);}
  catch{if(mounted.current){setUnknown(true);setMessage('The save outcome is not confirmed. Check this save before making another change.');}}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);}}
 }
 async function reconcile(){
  const original=operation.current;if(busy.current||!original)return;busy.current=true;setPending(true);const controller=new AbortController();abort.current=controller;const timeout=setTimeout(()=>controller.abort(),15000);
  try{const response=await fetch('/api/company-access/employee-operations/'+encodeURIComponent(original.id),{cache:'no-store',credentials:'same-origin',redirect:'error',headers:{'x-nevora-company-access':'1'},signal:controller.signal});if(!mounted.current)return;if(response.status===401||response.status===403){setUnknown(false);setBlocked(true);setSaved(null);operation.current=null;setMessage('Your current access does not allow this employee review. Sign in again or contact your Owner.');return;}const result=readEmployeeResult(await response.json(),original.id,employeeId);if(!response.ok&&result.state==='saved')throw new Error('Receipt unavailable.');if(mounted.current)apply(result,true);}
  catch{if(mounted.current)setMessage('The original save is still not confirmed. Check again before making another change.');}
  finally{clearTimeout(timeout);if(mounted.current){busy.current=false;setPending(false);abort.current=null;}}
 }
 const quiet=className.includes('q-form');
 const secondary=quiet?'q-btn q-btn--sec':'button secondary';
 return <form ref={formRef} id={id} onSubmit={submit} className={className} aria-busy={pending}>
  <fieldset disabled={pending||unknown||blocked} className="configuration-fields">{children}</fieldset>
  {pending&&<p role="status" className={quiet?'q-help':undefined}>{unknown?'Checking save…':'Saving…'}</p>}
  {message&&<p role={saved?'status':'alert'} className={quiet?(saved?'q-help q-u4-saved':'q-error'):saved?'form-success':'form-error'}>{message}</p>}
  <div className={quiet?'q-u4-actions':styles.actions}>
   {unknown&&<button type="button" className={secondary} disabled={pending} onClick={()=>void reconcile()}>Check save outcome</button>}
   {saved&&!employeeId&&<Link className={secondary} href={'/app/employees/'+encodeURIComponent(saved.employeeId)}>Open current employee profile</Link>}
   {blocked&&employeeId&&<button type="button" className={secondary} disabled={pending} onClick={()=>window.location.reload()}>Reload current employee</button>}
  </div>
  {saved&&!employeeId?<OpenCreated employeeId={saved.employeeId} label={createdLabel}/>:null}
  {asking?<QuietSheet open label={asking.title} onClose={()=>setAsking(null)}>
   <div className="q-nav"><button type="button" className="q-nav__l q-nav__l--teal q-u4-navbtn" onClick={()=>setAsking(null)}>Cancel</button><span className="q-nav__t">{asking.title}</span><span/></div>
   <p className="q-u4-confirm">{asking.body}</p>
   <button type="button" className={asking.danger?'q-btn q-u4-danger':'q-btn'} onClick={()=>{confirmed.current=true;setAsking(null);formRef.current?.requestSubmit();}}>{asking.action}</button>
  </QuietSheet>:null}
 </form>;
}

/** UX-O-50: after Add employee, open their page (where Invite to NEVORA is) and say so once. Mounted only after a
 * confirmed create receipt, so the router is read only then. */
function OpenCreated({employeeId,label}:{employeeId:string;label:string}){
 const router=useRouter(),done=useRef(false);
 useEffect(()=>{if(done.current)return;done.current=true;toast(label?`${label} added`:'Employee added');router.push('/app/employees/'+encodeURIComponent(employeeId));},[employeeId,label,router]);
 return null;
}
