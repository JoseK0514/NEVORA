'use client';

import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import type {CreateEmployeeWithAccessCommand,EmployeeCoreAccessCommand,EmployeeCoreAccessResult} from '@/lib/company-access/model';
import {readEmployeeResult} from './commands';
import styles from './company-access.module.css';

/** One atomic command; uncertain writes reconcile their original operation ID. */
export function EmployeeAccessForm({action,build,employeeId,children,className}:{action:(data:FormData)=>Promise<unknown>;build:(data:FormData,operationId:string)=>CreateEmployeeWithAccessCommand|EmployeeCoreAccessCommand;employeeId?:string;children:ReactNode;className:string}){
 const [pending,setPending]=useState(false),[unknown,setUnknown]=useState(false),[message,setMessage]=useState(''),[blocked,setBlocked]=useState(false),[saved,setSaved]=useState<Extract<EmployeeCoreAccessResult,{state:'saved'}>['receipt']|null>(null);
 const operation=useRef<{id:string;serialized:string}|null>(null),busy=useRef(false),mounted=useRef(false),abort=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
 function apply(value:EmployeeCoreAccessResult,reconcile:boolean){
  if(value.state==='saved'){setSaved(value.receipt);setUnknown(false);setBlocked(true);operation.current=null;setMessage(employeeId?'Employee details saved. Reload the employee to review current access before making another change.':'Employee created. Open their profile to review details and manage their account invitation.');}
  else if(value.state==='outcome_unknown'||reconcile){setUnknown(true);setMessage('The save outcome is not confirmed. Check this save before making another change.');}
  else {operation.current=null;setUnknown(false);setBlocked(value.state==='conflict'||value.state==='unavailable');setMessage(value.state==='conflict'?'Employee or access information changed. Reload and review current details before saving a replacement.':value.state==='invalid'?value.fieldErrors.map(e=>e.message).join(' ')||'Review the employee details before saving.':'Saving is unavailable. Reload current information before trying again.');}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy.current||unknown||blocked||!event.currentTarget.reportValidity())return;
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
 return <form onSubmit={submit} className={className} aria-busy={pending}>
  <fieldset disabled={pending||unknown||blocked} className="configuration-fields">{children}</fieldset>
  {pending&&<p role="status">{unknown?'Checking save…':'Saving…'}</p>}
  {message&&<p role={saved?'status':'alert'} className={saved?'form-success':'form-error'}>{message}</p>}
  <div className={styles.actions}>
   {unknown&&<button type="button" className="button secondary" disabled={pending} onClick={()=>void reconcile()}>Check save outcome</button>}
   {saved&&!employeeId&&<Link className="button secondary" href={'/app/employees/'+encodeURIComponent(saved.employeeId)}>Open current employee profile</Link>}
   {blocked&&employeeId&&<button type="button" className="button secondary" disabled={pending} onClick={()=>window.location.reload()}>Reload current employee</button>}
  </div>
 </form>;
}
