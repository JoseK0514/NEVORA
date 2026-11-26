'use client';
import Link from 'next/link';
import {useEffect,useId,useRef,useState} from 'react';
import {PlanningFrame} from './planning-frame';
import {usePlanning} from './use-planning';
import {PlanningOperation,PlanningOperations} from './planning-operation';
import {PlanningFeedback,usePlanningOperation} from './planning-feedback';
import {TimeOffListRow,TimeOffRequestCard,timeOffDates,timeOffDay} from './timeoff-parts';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {ClockIcon} from '@phosphor-icons/react/dist/ssr/Clock';
import {BCallout,BState} from '../owner-b/b-kit';
import {TimeOffB,TimeOffStateB} from '../employee-b/timeoff-b';
import {parsePlanningCommand,type PlanningRequest,type PlanningCommand} from '@/lib/employee-planning';
import {saveEmployeePlanningAction,checkEmployeePlanningAction} from '@/app/app/employee-planning/actions';
import {formatTime,isValidIsoDate} from '@/lib/date-utils';
import {useMobileLang} from './mobile-lang';
import {timeText} from './mobile-format';
import {timeoffCopy} from './copy/timeoff';

/* Employee Time off on the phone, on the corporate kit (Release 1, boards E-TimeOffDetail and E-TimeOffSheet): the list
 * (Waiting / Decided), one request, and the request form. Same planning read, commands, validation and receipts. */

type Draft={startDate:string;endDate:string;partial:boolean;startTime:string;endTime:string;note:string};
const empty:Draft={startDate:'',endDate:'',partial:false,startTime:'09:00',endTime:'12:00',note:''};

/** A date or time field that looks like the board's field ("Thu, Nov 12"), with the real input laid over it. */
export function PickField({id,name,type,label,value,min,onChange,invalid,describedBy,help,error}:{id:string;name:string;type:'date'|'time';label:string;value:string;min?:string;onChange:(value:string)=>void;invalid?:boolean;describedBy?:string;help?:string;error?:string}){
 const lang=useMobileLang(),t=timeoffCopy[lang];
 const shown=!value?type==='date'?t.chooseDate:t.chooseTime:type==='date'?(isValidIsoDate(value)?timeOffDay(value,lang):value):timeText(formatTime(value==='24:00'?'00:00':value),lang);
 return <div className="c-field"><label className="c-field__label" htmlFor={id}>{label}</label>
  <span className="c-in tof-pick"><span className={value?undefined:'tof-pick__ph'} aria-hidden="true">{shown}</span>
   {/* Direction B (phones): the field's calendar or clock glyph; hidden elsewhere. */}
   {type==='date'?<CalendarBlankIcon className="tof-pick__ic" weight="bold" aria-hidden="true"/>:<ClockIcon className="tof-pick__ic" weight="bold" aria-hidden="true"/>}
   <input id={id} name={name} type={type} required min={min} value={value} aria-invalid={invalid||undefined} aria-describedby={describedBy}
    onClick={event=>{try{event.currentTarget.showPicker();}catch{/* Browsers without showPicker open their own picker. */}}}
    onChange={event=>onChange(event.target.value)}/></span>
  {help?<span className="c-field__help">{help}</span>:null}
  {/* The field's own error sits right under it (Round 4: never down the form). */}
  {error&&describedBy?<span id={describedBy} className="c-error tof-pick__err" role="alert">{error}</span>:null}
 </div>;
}

export function EmployeeTimeOff({authority,selection,filter}:{authority:string;selection:string;filter:string}){
 const lang=useMobileLang(),t=timeoffCopy[lang],e=t.errors;
 const panel=usePlanning(authority,'timeoff',selection),read=panel.read?.view==='timeoff'?panel.read:null;
 const [draft,setDraft]=useState<Draft>(empty),[operation,setOperation]=useState(()=>new PlanningOperation()),id=useRef<string|null>(null),[withdrawals]=useState(()=>new PlanningOperations());
 const [errors,setErrors]=useState<{message:string;field:string}[]>([]),errorId=useId(),form=useRef<HTMLFormElement>(null),receipt=useRef<HTMLHeadingElement>(null);
 const {pending,uncertain,complete}=usePlanningOperation(operation),locked=pending||uncertain||complete;
 // Review F2 (NV-112): each problem sits under its own field (From and To each get theirs), all marked at once.
 const setError=(value:{message:string;field:string}|null)=>setErrors(value?[value]:[]);
 const errorFor=(name:string)=>errors.find(item=>item.field===name);
 const fieldError=(name:string)=>{const found=errorFor(name);return {invalid:!!found,describedBy:found?errorId+'-'+name:undefined,error:found?.message};};
 const listHref='/app/requests'+(filter==='decided'?'?filter=decided':''),isNew=selection==='new',isList=selection==='list';
 const row=read?.data.requests[0];
 useEffect(()=>{if(complete&&isNew&&read?.enabled)receipt.current?.focus();},[complete,isNew,read?.enabled]);
 const send=async(command:PlanningCommand)=>{const result=await saveEmployeePlanningAction(command);panel.accept(result);return result;};
 const check=async(command:PlanningCommand)=>{const result=await checkEmployeePlanningAction(command);panel.accept(result);return result;};
 const retry=()=>{void operation.retry(check,send,panel.allowed);};
 const title=isNew?t.newTitle:t.title;
 const shown=read?read.data.requests.filter(r=>filter==='decided'?r.status!=='PENDING':r.status==='PENDING'):[];
 const denied=panel.state.snapshot?.state==='unavailable'&&panel.state.snapshot.reason==='access_denied';
 // Direction B (phones only): the same page as the B screen. The form, its receipt and the withdraw step stay in this page
 // once (b-keep) and are drawn as that screen's cards.
 const b=<TimeOffB page={isNew?'new':isList?'list':'detail'} filter={filter} enabled={read?read.enabled:null} earlier={!isNew&&(pending||uncertain)} requests={shown} request={row??null} zone={read?.timeZone??'UTC'} waiting={read?read.data.requests.filter(r=>r.status==='PENDING').length:null}
  state={read?null:<TimeOffStateB paused={panel.state.paused} denied={denied} refreshing={panel.state.refreshing} onRetry={panel.refresh} failed={panel.state.snapshot?.state==='unavailable'}/>}/>;
 return <PlanningFrame b={b} bTitleId="b-timeoff-title" title={title} sub="" sheet={isNew} back={isList?'/app/requests/hub':isNew?listHref:'/app/requests/hub'} backLabel={t.requests} selection={selection} state={panel.state} ready={!!read} refresh={panel.refresh}>
  {read&&!read.enabled?<p className="c-note" role="status">{t.turnedOff}</p>:read?<>
   {!isNew&&(pending||uncertain)?<section className="c-card"><div className="c-card__body tof-feedback"><p>{t.earlier}</p><Link href="/app/requests?tab=new">{t.returnToSubmission}</Link></div></section>:null}
   {isNew?complete?<section className="c-card tof-done b-keep b-done-host--flush" aria-label={t.result}>
     <BState kind="done" heading titleRef={receipt} title={t.requestSent} line={t.timeOffLine} action={{label:t.viewRequest,href:'/app/requests?requestId='+operation.result?.requestId}}
      quiet={<button className="b-done__quiet" type="button" onClick={()=>{setOperation(new PlanningOperation());id.current=null;setDraft(empty);}}>{t.anotherRequest}</button>}/></section>
    :<form ref={form} className="tof-form b-keep" noValidate aria-busy={pending} onSubmit={event=>{
     event.preventDefault();if(locked||!panel.allowed())return;
     id.current??=crypto.randomUUID();const command=parsePlanningCommand({kind:'request',requestId:id.current,startDate:draft.startDate,endDate:draft.partial?draft.startDate:draft.endDate,startTime:draft.partial?draft.startTime:null,endTime:draft.partial?draft.endTime:null,note:draft.note.trim()});
     if(!command){const found:{field:string;message:string}[]=[];
      if(!isValidIsoDate(draft.startDate))found.push({field:'startDate',message:draft.startDate?e.validDate:draft.partial?e.chooseDate:e.chooseStart});
      if(!draft.partial&&!isValidIsoDate(draft.endDate))found.push({field:'endDate',message:draft.endDate?e.validDate:e.chooseEnd});
      else if(!draft.partial&&isValidIsoDate(draft.startDate)&&draft.endDate<draft.startDate)found.push({field:'endDate',message:e.endAfterStart});
      if(draft.partial&&!draft.startTime)found.push({field:'startTime',message:e.startTime});
      else if(draft.partial&&!found.length)found.push({field:'endTime',message:e.endTime});
      if(!found.length)found.push({field:'note',message:e.note});
      setErrors(found);form.current?.querySelector<HTMLElement>('[name="'+found[0].field+'"]')?.focus();return;}
     setError(null);void operation.submit(command,send,panel.allowed);
    }}><fieldset disabled={locked} className="tof-fields"><legend className="nv-sr">{t.timeAway}</legend>
     <div className="c-seg tof-seg" role="group" aria-label={t.howLong}><button type="button" aria-pressed={!draft.partial} onClick={()=>{setDraft(d=>({...d,partial:false}));setError(null);}}>{t.allDay}</button><button type="button" aria-pressed={draft.partial} onClick={()=>{setDraft(d=>({...d,partial:true}));setError(null);}}>{t.partOfDay}</button></div>
     {draft.partial?<>
      <PickField id="tof-date" name="startDate" type="date" label={t.date} value={draft.startDate} {...fieldError('startDate')} onChange={v=>{setDraft(d=>({...d,startDate:v,endDate:!d.endDate||d.endDate<v?v:d.endDate}));setError(null);}}/>
      <div className="tof-row">
       <PickField id="tof-start" name="startTime" type="time" label={t.start} value={draft.startTime} {...fieldError('startTime')} onChange={v=>{setDraft(d=>({...d,startTime:v}));setError(null);}}/>
       <PickField id="tof-end" name="endTime" type="time" label={t.end} value={draft.endTime==='24:00'?'00:00':draft.endTime} {...fieldError('endTime')} onChange={v=>{setDraft(d=>({...d,endTime:v==='00:00'?'24:00':v}));setError(null);}}/>
      </div>
      {/* Upscale S13: the midnight hint only when End is 12:00 AM. */}
      {draft.endTime==='24:00'?<p className="c-field__help tof-midnight">{t.midnight}</p>:null}
     </>:<div className="tof-row">
      <PickField id="tof-from" name="startDate" type="date" label={t.from} value={draft.startDate} {...fieldError('startDate')} onChange={v=>{setDraft(d=>({...d,startDate:v,endDate:!d.endDate||d.endDate<v?v:d.endDate}));setError(null);}}/>
      <PickField id="tof-to" name="endDate" type="date" label={t.to} value={draft.endDate} min={draft.startDate||undefined} {...fieldError('endDate')} onChange={v=>{setDraft(d=>({...d,endDate:v}));setError(null);}}/>
     </div>}
     <div className="c-field"><label className="c-field__label" htmlFor="tof-note">{t.reason}</label><textarea id="tof-note" className="c-in tof-note" name="note" rows={3} maxLength={250} autoComplete="off" aria-invalid={!!errorFor('note')||undefined} aria-describedby={errorFor('note')?errorId+'-note':undefined} value={draft.note} onChange={e=>setDraft(d=>({...d,note:e.target.value}))}/></div>
    </fieldset>
    {errorFor('note')?<p id={errorId+'-note'} className="c-error" role="alert">{errorFor('note')?.message}</p>:null}
    <p className="c-note tof-approve">{t.approve}</p>
    {/* Direction B (phones): the same words as the kit's callout (Phase 9, spec 2.2: the HourglassMedium wait glyph, no
      * circle in a tint), teal because it is information about what happens next, not a warning; hidden elsewhere. */}
    <div className="eb-tof-approve"><BCallout tone="teal" icon="wait" title={t.approvesIt}>{t.keepShifts}</BCallout></div>
    <PlanningFeedback operation={operation} onRetry={retry}/>
    {/* Upscale M2: Send is pinned in the sheet's footer (hairline above, safe area below). */}
    <div className="tof-foot"><button className="c-btn c-btn--full" type="submit" disabled={locked||!read.enabled}>{pending?t.sending:t.send}</button></div></form>
   :isList?<>
    <nav className="c-seg" aria-label={t.listLabel}><Link href="/app/requests" aria-current={filter!=='decided'?'page':undefined}>{t.waiting}</Link><Link href="/app/requests?filter=decided" aria-current={filter==='decided'?'page':undefined}>{t.decided}</Link></nav>
    <section className="c-card" aria-label={filter==='decided'?t.decidedRequests:t.waitingRequests}>{shown.length?<ul className="c-rows">{shown.map(r=><TimeOffListRow key={r.id} id={'timeoff-'+r.id} lang={lang} request={r} href={'/app/requests?requestId='+encodeURIComponent(r.id)+(filter==='decided'?'&filter=decided':'')}/>)}</ul>
     :<p className="c-empty"><b>{filter==='decided'?t.noDecisions:t.nothingWaiting}</b>{filter==='decided'?t.decidedEmpty:t.waitingEmpty}</p>}</section>
    <Link className="c-btn c-btn--full tof-new" href="/app/requests?tab=new">{t.newTitle}</Link>
   </>:row?<>
    <TimeOffRequestCard request={row} zone={read.timeZone} lang={lang} headingId={'timeoff-'+row.id+'-dates'}/>
    {row.status==='PENDING'?<Withdrawal key={row.id} request={row} getOperation={()=>withdrawals.for(row.id)} allowed={panel.allowed} send={send} check={check}/>:withdrawals.peek(row.id)?<WithdrawalReceipt key={row.id} operation={withdrawals.peek(row.id)!}/>:null}
   </>:<p className="c-note" role="status">{t.notAvailable}</p>}
  </>:null}
 </PlanningFrame>;
}
/** After the refresh shows the request as withdrawn, this page's own confirmed withdrawal keeps its confirmation and focus. */
function WithdrawalReceipt({operation}:{operation:PlanningOperation}){
 const t=timeoffCopy[useMobileLang()];
 const {complete}=usePlanningOperation(operation),receipt=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{if(complete)receipt.current?.focus();},[complete]);
 return complete?<p ref={receipt} tabIndex={-1} className="c-note b-keep tof-withdrawn" role="status">{t.withdrawnReceipt}</p>:null;
}
/** Withdraw (board): a red-outline button, then one confirm step that sends the same withdraw command. An older request
 * without a withdraw identity says only how to change it. */
function Withdrawal({request,getOperation,allowed,send,check}:{request:PlanningRequest;getOperation:()=>PlanningOperation;allowed:()=>boolean;send:(command:PlanningCommand)=>Promise<import('@/lib/employee-planning').PlanningResult>;check:(command:PlanningCommand)=>Promise<import('@/lib/employee-planning').PlanningResult>}){
 const lang=useMobileLang(),t=timeoffCopy[lang];
 const [operation]=useState(getOperation),{pending,uncertain,complete}=usePlanningOperation(operation),[asking,setAsking]=useState(()=>pending||uncertain);
 // Historical non-UUID records remain readable; withdrawal follows the existing command owner's UUID contract.
 const command=parsePlanningCommand({kind:'withdraw',requestId:request.id,confirmed:true});
 if(!command)return <p className="c-note b-keep tof-withdrawn">{t.contactManager}</p>;
 return <section className="c-card tof-withdraw b-keep" aria-label={t.withdrawRequest}>
  {complete?<p className="tof-feedback" role="status">{t.withdrawn}</p>:asking||pending||uncertain?<>
   <p className="tof-ask">{t.withdrawAsk(timeOffDates(request,lang))}</p>
   <p className="c-note">{t.shiftsStay}</p>
   <PlanningFeedback operation={operation} onRetry={()=>{void operation.retry(check,send,allowed);}}/>
   {!uncertain?<div className="c-btns"><button className="c-btn c-btn--secondary" type="button" disabled={pending} onClick={()=>setAsking(false)}>{t.keepRequest}</button><button className="c-btn c-btn--danger" type="button" disabled={pending} onClick={()=>{void operation.submit(command,send,allowed);}}>{pending?t.withdrawing:t.withdraw}</button></div>:null}
  </>:<>
   <button className="c-btn c-btn--danger c-btn--full" type="button" onClick={()=>setAsking(true)}>{t.withdrawRequest}</button>
   <p className="c-note">{t.confirmFirst}</p>
  </>}
 </section>;
}
