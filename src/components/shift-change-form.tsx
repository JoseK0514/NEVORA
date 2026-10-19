'use client';
import {useRef,useState,type ReactNode,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {shiftChangeAction,reconcileShiftChangeAction} from '@/app/app/exchange/actions';
import {ShiftChangeFormState,shiftChangeFeedback} from './shift-change-form-state';
import type {ShiftChangeResult} from '../lib/shift-changes/types';
type View={pending:boolean;result:ShiftChangeResult|null;uncertain:boolean;offline:boolean};
export function ShiftChangeForm({fields,children,className='shift-change-form',resolvedHref}:{fields:Readonly<Record<string,string|number>>;children:ReactNode;className?:string;resolvedHref?:string}){
 const controller=useRef<ShiftChangeFormState|null>(null),router=useRouter();
 const [view,setView]=useState<View>({pending:false,result:null,uncertain:false,offline:false});
 function update(state:ShiftChangeFormState){setView({pending:state.pending,result:state.result,uncertain:state.uncertain,offline:!navigator.onLine});}
 function refresh(state:ShiftChangeFormState){if(state.result&&['completed','pending','closed'].includes(state.result.status))router.refresh();}
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const current=controller.current??=new ShiftChangeFormState(()=>crypto.randomUUID());// Double tap (Wave A ST): a tap that lands after the answer but before the fieldset disables doesn't send again.
  if(current.pending||current.uncertain||(current.result&&['completed','pending','closed'].includes(current.result.status)))return;
  if(!navigator.onLine){current.result={status:'unavailable'};update(current);return;}
  const data=new FormData(event.currentTarget);for(const [key,value] of Object.entries(fields))data.set(key,String(value));
  const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;if(submitter?.name)data.set(submitter.name,submitter.value);
  const promise=current.submit(data,shiftChangeAction);update(current);await promise;update(current);refresh(current);
 }
 async function retry(){const current=controller.current;if(!current)return;const promise=current.retry(reconcileShiftChangeAction,shiftChangeAction);update(current);await promise;update(current);refresh(current);}
 const resolved=view.result&&['completed','pending','closed'].includes(view.result.status);
 return <form onSubmit={submit} className={className} aria-busy={view.pending}>
  <fieldset className="shift-change-fields" disabled={view.pending||view.uncertain||!!resolved}>{Object.entries(fields).map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}{children}</fieldset>
  {view.pending?<p role="status">Processing…</p>:null}
  {view.result?<p className={resolved?'form-success':'form-error'} role={resolved?'status':'alert'}>{view.result.status==='pending'&&resolvedHref?'Request recorded. Open Shift requests to review its current status.':shiftChangeFeedback(view.result)}{view.offline?' Offline. Reconnect before continuing.':''}</p>:null}
  {resolved&&resolvedHref?<Link className="swap-button secondary" href={resolvedHref}>View request status</Link>:null}
  {view.uncertain?<button className="button secondary" type="button" disabled={view.pending} onClick={retry}>Check &amp; retry same request</button>:null}
  {view.result?.status==='blocked'&&view.result.issues.some(i=>i.code==='STALE_TERMS')?<button className="button secondary" type="button" onClick={()=>router.refresh()}>Refresh and review assignment</button>:null}
  {view.result?.status==='conflict'?<button className="button secondary" type="button" onClick={()=>router.refresh()}>Reload current request</button>:null}
 </form>;
}
