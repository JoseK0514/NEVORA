'use client';
import {useRef,useState,type FormEvent,type ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import type {PolicyWriteResult} from '../lib/shift-changes/types';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {SMALL_PARTS_COPY} from './small-parts-copy';
/** Successful CAS updates only the displayed scope revision; failures retain entries. */
export function PolicySaveForm({revision,action,children}:{revision:number;action:(data:FormData)=>Promise<PolicyWriteResult>;children:ReactNode}){
 const t=SMALL_PARTS_COPY[usePortalLang()].policy;
 const [currentRevision,setRevision]=useState(revision),[pending,setPending]=useState(false),[result,setResult]=useState<PolicyWriteResult|null>(null),[error,setError]=useState('');const busy=useRef(false),router=useRouter();
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy.current)return;const data=new FormData(event.currentTarget);data.set('expectedRevision',String(currentRevision));busy.current=true;setPending(true);setResult(null);setError('');
  try{const next=await action(data);setResult(next);if(next.status==='saved'){setRevision(next.revision);router.refresh();}}catch{setError(t.unconfirmed);}finally{busy.current=false;setPending(false);}
 }
 return <form onSubmit={submit} className="employee-form policy-save-form" aria-busy={pending}><input type="hidden" name="expectedRevision" value={currentRevision}/><fieldset className="configuration-fields" disabled={pending}>{children}</fieldset>{pending?<p role="status">{t.saving}</p>:null}{result?.status==='saved'?<p role="status" className="form-success">{t.saved}</p>:null}{result?.status==='invalid'?<p role="alert" className="form-error">{result.fieldErrors.map(e=>e.message).join(' ')}</p>:null}{result?.status==='conflict'||error?<><p role="alert" className="form-error">{error||t.changed}</p><button type="button" className="button secondary" onClick={()=>window.location.reload()}>{t.reload}</button></>:null}</form>;
}
