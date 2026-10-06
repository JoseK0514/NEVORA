'use client';
import { useRef, useState, type FormEvent } from 'react';
import type { PinActionResult } from '@/app/app/employees/[employeeId]/clocker-pin/actions';
import styles from './clocker-pin.module.css';
export function ClockerPinForm({employeeId,initialVersion,action}:{employeeId:string;initialVersion:number;action:(data:FormData)=>Promise<PinActionResult>}){
 const [version,setVersion]=useState(initialVersion);
 const [pending,setPending]=useState(false);
 const [result,setResult]=useState<PinActionResult|null>(null);
 const lock=useRef(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;
  const form=event.currentTarget;const data=new FormData(form);
  // Keep user input out of component state and remove it from the DOM promptly.
  form.reset();lock.current=true;setPending(true);setResult(null);
  try{const next=await action(data);setResult(next);if(next.ok)setVersion(next.version);}
  catch{setResult({ok:false,error:'PIN changes could not be confirmed. Reload before trying again.',refresh:true});}
  finally{data.delete('pin');data.delete('confirmPin');lock.current=false;setPending(false);}
 }
 const blocked=result&&!result.ok&&result.refresh;
 return <section className={`panel ${styles.management}`}>
  <div><span className={styles.badge}>{version>0?'PIN set':'Not set'}</span>
   <h2>{version>0?'Reset Clocker PIN':'Set Clocker PIN'}</h2>
   <p>Use four digits for the shared tablet. This is separate from the employee’s portal password.</p></div>
  <form onSubmit={submit} aria-busy={pending}>
   <input type="hidden" name="employeeId" value={employeeId}/><input type="hidden" name="expectedVersion" value={version}/>
   <fieldset disabled={pending||Boolean(blocked)}>
    <label>New Clocker PIN<input name="pin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required aria-describedby="pin-help"/></label>
    <label>Confirm Clocker PIN<input name="confirmPin" type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4}" minLength={4} maxLength={4} required/></label>
    <p id="pin-help">Each employee needs a different PIN. Existing PINs cannot be viewed.</p>
    <button type="submit" className="button primary">{pending?'Saving…':version>0?'Reset PIN':'Save PIN'}</button>
   </fieldset>
  </form>
  {result?.ok?<p role="status" className={styles.success}>PIN saved. Share it privately with the employee.</p>:result?<div><p role="alert" className={styles.error}>{result.error}</p>{result.refresh?<a className="button secondary" href={`/app/employees/${encodeURIComponent(employeeId)}/clocker-pin`}>Reload PIN Settings</a>:null}</div>:null}
  <p className={styles.note}>Resetting a PIN ends its current tablet verification. Portal access and recorded time remain unchanged.</p>
 </section>;
}
