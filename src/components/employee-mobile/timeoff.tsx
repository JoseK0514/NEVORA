'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {PlanningFrame} from './planning-frame';
import {usePlanning} from './use-planning';
import {PlanningOperation,PlanningOperations} from './planning-operation';
import {PlanningFeedback,usePlanningOperation} from './planning-feedback';
import {TimeOffListRow,TimeOffRequestCard,timeOffDates,timeOffDay} from './timeoff-parts';
import {parsePlanningCommand,type PlanningRequest,type PlanningCommand} from '@/lib/employee-planning';
import {saveEmployeePlanningAction,checkEmployeePlanningAction} from '@/app/app/employee-planning/actions';
import {formatTime,isValidIsoDate} from '@/lib/date-utils';

/* Employee Time off on the phone, on the corporate kit (Release 1, boards E-TimeOffDetail and E-TimeOffSheet): the list
 * (Waiting / Decided), one request, and the request form. Same planning read, commands, validation and receipts. */

type Draft={startDate:string;endDate:string;partial:boolean;startTime:string;endTime:string;note:string};
const empty:Draft={startDate:'',endDate:'',partial:false,startTime:'09:00',endTime:'12:00',note:''};

/** A date or time field that looks like the board's field ("Thu, Nov 12"), with the real input laid over it. */
export function PickField({id,name,type,label,value,min,onChange,invalid,describedBy,help}:{id:string;name:string;type:'date'|'time';label:string;value:string;min?:string;onChange:(value:string)=>void;invalid?:boolean;describedBy?:string;help?:string}){
 const shown=!value?type==='date'?'Choose date':'Choose time':type==='date'?(isValidIsoDate(value)?timeOffDay(value):value):formatTime(value==='24:00'?'00:00':value);
 return <div className="c-field"><label className="c-field__label" htmlFor={id}>{label}</label>
  <span className="c-in tof-pick"><span className={value?undefined:'tof-pick__ph'} aria-hidden="true">{shown}</span>
   <input id={id} name={name} type={type} required min={min} value={value} aria-invalid={invalid||undefined} aria-describedby={describedBy}
    onClick={event=>{try{event.currentTarget.showPicker();}catch{/* Browsers without showPicker open their own picker. */}}}
    onChange={event=>onChange(event.target.value)}/></span>
  {help?<span className="c-field__help">{help}</span>:null}
 </div>;
}

export function EmployeeTimeOff({authority,selection,filter}:{authority:string;selection:string;filter:string}){
 const panel=usePlanning(authority,'timeoff',selection),read=panel.read?.view==='timeoff'?panel.read:null;
 const [draft,setDraft]=useState<Draft>(empty),[operation,setOperation]=useState(()=>new PlanningOperation()),id=useRef<string|null>(null),[withdrawals]=useState(()=>new PlanningOperations());
 const [error,setError]=useState<{message:string;field:string}|null>(null),errorId=useId(),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null);
 const {pending,uncertain,complete}=usePlanningOperation(operation),locked=pending||uncertain||complete;
 const fieldError=(name:string)=>({invalid:error?.field===name,describedBy:error?.field===name?errorId:undefined});
 const listHref='/app/requests'+(filter==='decided'?'?filter=decided':''),isNew=selection==='new',isList=selection==='list';
 const row=read?.data.requests[0];
 useEffect(()=>{if(complete&&isNew&&read?.enabled)receipt.current?.focus();},[complete,isNew,read?.enabled]);
 const send=async(command:PlanningCommand)=>{const result=await saveEmployeePlanningAction(command);panel.accept(result);return result;};
 const check=async(command:PlanningCommand)=>{const result=await checkEmployeePlanningAction(command);panel.accept(result);return result;};
 const retry=()=>{void operation.retry(check,send,panel.allowed);};
 const title=isNew?'Request time off':'Time off';
 const shown=read?read.data.requests.filter(r=>filter==='decided'?r.status!=='PENDING':r.status==='PENDING'):[];
 return <PlanningFrame title={title} sub="" sheet={isNew} back={isList?'/app/requests/hub':isNew?listHref:'/app/requests/hub'} backLabel="Requests" selection={selection} state={panel.state} ready={!!read} refresh={panel.refresh}>
  {read&&!read.enabled?<p className="c-note" role="status">Time off is turned off for your company.</p>:read?<>
   {!isNew&&(pending||uncertain)?<section className="c-card"><div className="c-card__body tof-feedback"><p>An earlier time-off submission still needs to be checked.</p><Link href="/app/requests?tab=new">Return to my submission</Link></div></section>:null}
   {isNew?complete?<section className="c-card tof-done" aria-label="Submission result"><h2 ref={receipt} tabIndex={-1}>Request recorded</h2><p>Your time-off request was recorded. Open it to see its current approval status.</p>
     <Link className="c-btn c-btn--full" href={'/app/requests?requestId='+operation.result?.requestId}>View my request</Link>
     <button className="c-btn c-btn--secondary c-btn--full" type="button" onClick={()=>{setOperation(new PlanningOperation());id.current=null;setDraft(empty);}}>Make another request</button></section>
    :<form ref={form} className="tof-form" noValidate aria-busy={pending} onSubmit={event=>{
     event.preventDefault();if(locked||!panel.allowed())return;
     id.current??=crypto.randomUUID();const command=parsePlanningCommand({kind:'request',requestId:id.current,startDate:draft.startDate,endDate:draft.partial?draft.startDate:draft.endDate,startTime:draft.partial?draft.startTime:null,endTime:draft.partial?draft.endTime:null,note:draft.note.trim()});
     if(!command){const field=!isValidIsoDate(draft.startDate)?'startDate':!draft.partial&&(!isValidIsoDate(draft.endDate)||draft.endDate<draft.startDate)?'endDate':draft.partial&&!draft.startTime?'startTime':draft.partial?'endTime':'note';const message=field==='startDate'?'Choose a valid start date.':field==='endDate'?'Choose an end date on or after the start date.':field==='startTime'?'Choose a start time.':field==='endTime'?'Choose an end time after the start time.':'Keep your note within 250 characters.';setError({message,field});form.current?.querySelector<HTMLElement>('[name="'+field+'"]')?.focus();return;}
     setError(null);void operation.submit(command,send,panel.allowed);
    }}><fieldset disabled={locked} className="tof-fields"><legend className="nv-sr">Time away</legend>
     <div className="c-seg tof-seg" role="group" aria-label="How long"><button type="button" aria-pressed={!draft.partial} onClick={()=>setDraft(d=>({...d,partial:false}))}>All day</button><button type="button" aria-pressed={draft.partial} onClick={()=>setDraft(d=>({...d,partial:true}))}>Part of day</button></div>
     {draft.partial?<>
      <PickField id="tof-date" name="startDate" type="date" label="Date" value={draft.startDate} {...fieldError('startDate')} onChange={v=>{setDraft(d=>({...d,startDate:v,endDate:!d.endDate||d.endDate<v?v:d.endDate}));setError(null);}}/>
      <div className="tof-row">
       <PickField id="tof-start" name="startTime" type="time" label="Start" value={draft.startTime} {...fieldError('startTime')} onChange={v=>{setDraft(d=>({...d,startTime:v}));setError(null);}}/>
       <PickField id="tof-end" name="endTime" type="time" label="End" value={draft.endTime==='24:00'?'00:00':draft.endTime} {...fieldError('endTime')} onChange={v=>{setDraft(d=>({...d,endTime:v==='00:00'?'24:00':v}));setError(null);}}/>
      </div>
      {/* Upscale S13: the midnight hint only when End is 12:00 AM. */}
      {draft.endTime==='24:00'?<p className="c-field__help tof-midnight">An end time of 12:00 AM means midnight at the end of this day.</p>:null}
     </>:<div className="tof-row">
      <PickField id="tof-from" name="startDate" type="date" label="From" value={draft.startDate} {...fieldError('startDate')} onChange={v=>{setDraft(d=>({...d,startDate:v,endDate:!d.endDate||d.endDate<v?v:d.endDate}));setError(null);}}/>
      <PickField id="tof-to" name="endDate" type="date" label="To" value={draft.endDate} min={draft.startDate||undefined} {...fieldError('endDate')} onChange={v=>{setDraft(d=>({...d,endDate:v}));setError(null);}}/>
     </div>}
     <div className="c-field"><label className="c-field__label" htmlFor="tof-note">Reason (optional)</label><input id="tof-note" className="c-in" name="note" type="text" maxLength={250} autoComplete="off" aria-invalid={error?.field==='note'||undefined} aria-describedby={error?.field==='note'?errorId:undefined} value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))}/></div>
    </fieldset>
    {error?<p id={errorId} className="c-error" role="alert">{error.message}</p>:null}
    <p className="c-note">Your manager needs to approve this request. Keep your scheduled shifts until it is approved.</p>
    <PlanningFeedback operation={operation} onRetry={retry}/>
    {/* Upscale M2: Send is pinned in the sheet's footer (hairline above, safe area below). */}
    <div className="tof-foot"><button className="c-btn c-btn--full" type="submit" disabled={locked||!read.enabled}>{pending?'Sending…':'Send request'}</button></div></form>
   :isList?<>
    <nav className="c-seg" aria-label="Time-off requests"><Link href="/app/requests" aria-current={filter!=='decided'?'page':undefined}>Waiting</Link><Link href="/app/requests?filter=decided" aria-current={filter==='decided'?'page':undefined}>Decided</Link></nav>
    <section className="c-card" aria-label={filter==='decided'?'Decided requests':'Waiting requests'}>{shown.length?<ul className="c-rows">{shown.map(r=><TimeOffListRow key={r.id} id={'timeoff-'+r.id} request={r} href={'/app/requests?requestId='+encodeURIComponent(r.id)+(filter==='decided'?'&filter=decided':'')}/>)}</ul>
     :<p className="c-empty"><b>{filter==='decided'?'No decisions yet':'Nothing waiting'}</b>{filter==='decided'?'Approved, declined and withdrawn requests will appear here.':'When you send a request, you can follow its status here.'}</p>}</section>
    <Link className="c-btn c-btn--full" href="/app/requests?tab=new">Request time off</Link>
   </>:row?<>
    <TimeOffRequestCard request={row} zone={read.timeZone} headingId={'timeoff-'+row.id+'-dates'}/>
    {row.status==='PENDING'?<Withdrawal key={row.id} request={row} getOperation={()=>withdrawals.for(row.id)} allowed={panel.allowed} send={send} check={check}/>:withdrawals.peek(row.id)?<WithdrawalReceipt key={row.id} operation={withdrawals.peek(row.id)!}/>:null}
   </>:<p className="c-note" role="status">This request isn’t available to your current account. Return to Time off to review your requests.</p>}
  </>:null}
 </PlanningFrame>;
}
/** After the refresh shows the request as withdrawn, this page's own confirmed withdrawal keeps its confirmation and focus. */
function WithdrawalReceipt({operation}:{operation:PlanningOperation}){
 const {complete}=usePlanningOperation(operation),receipt=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(complete)receipt.current?.focus();},[complete]);
 return complete?<p ref={receipt} tabIndex={-1} className="c-note" role="status">Request withdrawn. Your scheduled shifts stay the same.</p>:null;
}
/** Withdraw (board): a red-outline button, then one confirm step that sends the same withdraw command. An older request
 * without a withdraw identity says only how to change it. */
function Withdrawal({request,getOperation,allowed,send,check}:{request:PlanningRequest;getOperation:()=>PlanningOperation;allowed:()=>boolean;send:(command:PlanningCommand)=>Promise<import('@/lib/employee-planning').PlanningResult>;check:(command:PlanningCommand)=>Promise<import('@/lib/employee-planning').PlanningResult>}){
 const [operation]=useState(getOperation),{pending,uncertain,complete}=usePlanningOperation(operation),[asking,setAsking]=useState(()=>pending||uncertain);
 // Historical non-UUID records remain readable; withdrawal follows the existing command owner's UUID contract.
 const command=parsePlanningCommand({kind:'withdraw',requestId:request.id,confirmed:true});
 if(!command)return <p className="c-note">To change this request, contact your manager.</p>;
 return <section className="c-card tof-withdraw" aria-label="Withdraw request">
  {complete?<p className="tof-feedback" role="status">Request withdrawn.</p>:asking||pending||uncertain?<>
   <p className="tof-ask">{'Withdraw your request for '+timeOffDates(request)+'?'}</p>
   <p className="c-note">Your scheduled shifts stay the same.</p>
   <PlanningFeedback operation={operation} onRetry={()=>{void operation.retry(check,send,allowed);}}/>
   {!uncertain?<div className="c-btns"><button className="c-btn c-btn--secondary" type="button" disabled={pending} onClick={()=>setAsking(false)}>Keep request</button><button className="c-btn c-btn--danger" type="button" disabled={pending} onClick={()=>{void operation.submit(command,send,allowed);}}>{pending?'Withdrawing…':'Withdraw'}</button></div>:null}
  </>:<>
   <button className="c-btn c-btn--danger c-btn--full" type="button" onClick={()=>setAsking(true)}>Withdraw request</button>
   <p className="c-note">We’ll ask you to confirm first. Your manager will see that you withdrew it.</p>
  </>}
 </section>;
}
