'use client';
import {PayrollPeriodClose} from './payroll-period-close';
import {useEffect,useRef,useState} from 'react';
import {DownloadSimpleIcon} from '@phosphor-icons/react/dist/ssr/DownloadSimple';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CorpNav,CorpTitle} from './corp/corp';
import './payroll/payroll-corp.css';
import {neutralProfile,parseExportProfile,type ExportProfile} from '@/lib/payroll-export/model';
import {type TimecardItem} from '@/lib/timecards/read-model';
import {summarizeTimecardReview} from '@/lib/timecards/review-summary';
import {parseCurrentTimecards} from '@/lib/timecards/client';
import {parsePeriod,type Period} from '@/lib/timecards/project';
import {hoursText,periodRange} from './payroll/payroll-format';
import type {ExportCommand,PayrollExportPayload,SavedExportProfile} from '@/lib/payroll-export/service';
import {verifyExportReply} from '@/lib/payroll-export/client';
import {stableExportJson} from '@/lib/payroll-export/json';
import {selectVisibleFinalized,changeExportSelection} from '@/lib/payroll-export/selection';
import {PayrollExportMapping} from './payroll-export-mapping';
import {PayrollTabs,type PayrollTab} from './payroll/payroll-tabs';
function download(text:string,type:string,name:string){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
type ProfileCommand={operationId:string;id:string;expectedRevision:number;profile:ExportProfile};
function payrollSourceKey(cards:readonly TimecardItem[],profiles:readonly SavedExportProfile[]){
 // projectTimecard stamps each current card with this read's observation time.
 // Compare every source/projected/history fact except that one clock field.
 const comparableCards=cards.map(item=>({...item,card:Object.fromEntries(Object.entries(item.card).filter(([key])=>key!=='observedAt'))}));
 return stableExportJson({cards:comparableCards,profiles});
}
const dayText=(value:string)=>{try{return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));}catch{return '';}};
const utcDay=(value:string)=>new Date(`${value}T12:00:00Z`);
const isoDay=(date:Date)=>date.toISOString().slice(0,10);
/** "Oct 19 – 25", or "Sep 28 – Oct 4" (Payroll's one period format, R2). */
const rangeText=periodRange;
/** This week and the five before it, Monday to Sunday, counted from the page's default week. */
function weekChoices(){
 const today=new Date();const base=utcDay(isoDay(new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))));
 const monday=new Date(base.getTime()-((base.getUTCDay()+6)%7)*86_400_000);
 const names=['this week','last week'];
 const weeks=Array.from({length:6},(_,i)=>{const start=new Date(monday.getTime()-i*7*86_400_000),end=new Date(start.getTime()+6*86_400_000);const s=isoDay(start),e=isoDay(end);return {value:`${s}|${e}`,label:`${rangeText(s,e)}${names[i]?` (${names[i]})`:''}`};});
 return weeks;
}
export function PayrollExport({initialPeriod,actorId,tabs=null}:{initialPeriod:Period;actorId:string;tabs?:PayrollTab[]|null}){
 const [period,setPeriod]=useState(initialPeriod),[draftPeriod,setDraftPeriod]=useState(initialPeriod),[cards,setCards]=useState<TimecardItem[]|null>(null),[profiles,setProfiles]=useState<SavedExportProfile[]>([]),[profileId,setProfileId]=useState('neutral'),[draft,setDraft]=useState<ExportProfile>(neutralProfile),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState<string[]>([]),[state,setState]=useState('Loading finalized time'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PayrollExportPayload|null>(null);
 const [retry,setRetry]=useState<ExportCommand|null>(null),[snapshotActor,setSnapshotActor]=useState<string|null>(null);
 const saveRetry=useRef<ProfileCommand|null>(null),generation=useRef({value:0}),abort=useRef<AbortController|null>(null),reload=useRef<()=>void>(()=>{});
 const mutating=useRef(false),cancelRefresh=useRef<()=>void>(()=>{}),acceptSavedProfile=useRef<(item:SavedExportProfile)=>void>(()=>{});
 const previousActor=useRef(actorId),validUntil=useRef(0),clearProtected=useRef<(message:string,denied?:boolean)=>void>(()=>{});
 const headers={'content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':actorId};
 useEffect(()=>{
  if(previousActor.current!==actorId){setRetry(null);saveRetry.current=null;}previousActor.current=actorId;
  let active=true,focused=true,reading=false,readSequence=0,sourceKey:string|null=null;
  let sourceSnapshot:{cards:TimecardItem[];profiles:SavedExportProfile[]}|null=null;let expiry:ReturnType<typeof setTimeout>|undefined,early:ReturnType<typeof setTimeout>|undefined;const lifecycle=generation.current,pendingSave=saveRetry;
  cancelRefresh.current=()=>{readSequence++;reading=false;abort.current?.abort();};
  const clear=(message:string,denied=false)=>{generation.current.value++;cancelRefresh.current();sourceKey=null;sourceSnapshot=null;mutating.current=false;if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);expiry=early=undefined;validUntil.current=0;setSnapshotActor(null);setCards(null);setProfiles([]);setProfileId('neutral');setSelected([]);setResult(null);setDraft(neutralProfile());setReviewed(false);setState(message);setNotice('');setBusy(false);if(denied){setRetry(null);saveRetry.current=null;}};
  clearProtected.current=clear;
  acceptSavedProfile.current=item=>{
   if(!active||!sourceSnapshot||performance.now()>=validUntil.current){clear('This export is out of date. Refresh to start again.');throw Error('Expired mapping receipt');}
   // The service returns this command's immutable saved revision, not an
   // arbitrary latest head. Advance only these verified profile facts, never
   // the cards, original server authority deadline or another profile.
   const profiles=[...sourceSnapshot.profiles.filter(p=>p.id!==item.id),item].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
   sourceSnapshot={...sourceSnapshot,profiles};sourceKey=payrollSourceKey(sourceSnapshot.cards,profiles);
  };
  const load=async(background=false)=>{
   if(background&&(reading||mutating.current))return;
   const preserve=background&&sourceKey!==null&&performance.now()<validUntil.current;
   if(!preserve)clear(navigator.onLine?'Loading finalized time':'Exports unavailable offline');if(!navigator.onLine||document.visibilityState==='hidden'||!focused)return;
   const current=generation.current.value,sequence=++readSequence,started=performance.now();reading=true;abort.current=new AbortController();
   try{
    // Either denied response retires retained data immediately, even if its
    // paired request has not returned headers or completed body parsing.
    const observe=(request:Promise<Response>)=>request.then(response=>{if(active&&current===generation.current.value&&sequence===readSequence&&(response.status===401||response.status===403))clear('Export access ended',true);return response;});
    const responses=await Promise.all([observe(fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(period)})),observe(fetch('/api/payroll-export/profiles',{cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'x-nevora-payroll-export':'1','x-nevora-actor':actorId}}))]);
    if(!active||current!==generation.current.value||sequence!==readSequence)return;
    if(responses.some(r=>r.status===401||r.status===403)){clear('Export access ended',true);return;}
    if(responses.some(r=>!r.ok))throw new Error();const [time,mappings]=await Promise.all(responses.map(r=>r.json()));
    const parsed=parseCurrentTimecards(time,period);if(mappings?.state!=='ready'||!Array.isArray(mappings.profiles)||mappings.profiles.length>100)throw new Error();
    const verified=mappings.profiles.map((p:SavedExportProfile)=>{if(typeof p.id!=='string'||!Number.isSafeInteger(p.revision)||p.revision<1)throw new Error();return {...p,profile:parseExportProfile(p.profile)};});
    // The paired read and JSON parsing cannot extend the original server lifetime.
    const deadline=started+parsed.validForMs;
    if(active&&current===generation.current.value&&sequence===readSequence){
     const nextSource=payrollSourceKey(parsed.cards,verified);
     const remaining=deadline-performance.now();if(remaining<1)throw Error('Expired export snapshot');
     // Only a successful paired server read of the same source preserves edits.
     // While it is pending the original expiry stays armed and invalidates it.
     if(preserve&&performance.now()>=validUntil.current){clear('This export is out of date. Refresh to start again.');return;}
     if(preserve&&nextSource!==sourceKey)clear('Loading finalized time');
     if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);sourceSnapshot={cards:parsed.cards,profiles:verified};sourceKey=nextSource;validUntil.current=deadline;
     expiry=setTimeout(()=>clear('This export is out of date. Refresh to start again.'),remaining);
     // A fresh paired projection may replace this lease. Merely starting it
     // never moves the original expiry or renews retained drafts/downloads.
     early=setTimeout(()=>void load(true),remaining*.65);
     setSnapshotActor(actorId);setCards(parsed.cards);setProfiles(verified);setState('ready');
    }
   }catch{if(active&&current===generation.current.value&&sequence===readSequence)clear('Exports unavailable');}
   finally{if(sequence===readSequence)reading=false;}
  };
  reload.current=()=>{void load();};void load();
  const refresh=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||focused))return;focused=true;if(document.visibilityState!=='hidden')void load();},offline=()=>{focused=false;clear('Exports unavailable offline');},hide=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;focused=false;clear('Exports paused');},visible=()=>document.visibilityState==='hidden'?hide():refresh();
  const account=()=>{setRetry(null);saveRetry.current=null;refresh();};
  window.addEventListener('focus',refresh);window.addEventListener('blur',hide);window.addEventListener('pageshow',refresh);window.addEventListener('storage',account);window.addEventListener('online',refresh);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visible);
  const poll=setInterval(()=>{if(focused&&document.visibilityState==='visible'&&navigator.onLine)void load(true);},30000);
  return()=>{active=false;lifecycle.value++;abort.current?.abort();if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);clearInterval(poll);validUntil.current=0;clearProtected.current=()=>{};cancelRefresh.current=()=>{};acceptSavedProfile.current=()=>{};sourceSnapshot=null;mutating.current=false;pendingSave.current=null;window.removeEventListener('focus',refresh);window.removeEventListener('blur',hide);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',account);window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visible);};
 },[period,actorId]);
 const currentActor=snapshotActor===actorId;
 const downloadCurrent=(text:string,type:string,name:string)=>{if(!currentActor||performance.now()>=validUntil.current){clearProtected.current('This export is out of date. Refresh to start again.');return;}download(text,type,name);};
 const saved=profiles.find(p=>p.id===profileId);
 const send=async(command:ExportCommand)=>{
  if(!currentActor){clearProtected.current('Export access ended',true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current('This export is out of date. Refresh to start again.');return;}cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');setResult(null);setRetry(command);const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current('Export access ended',true);return;}if(response.status===409){setRetry(null);setNotice('The timecards or the file format changed. Refresh and check again.');return;}if(!response.ok)throw new Error();const verified=await verifyExportReply(await response.json(),command);if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current('This export is out of date. Refresh to start again.');return;}setResult(verified);setRetry(null);setNotice('Files ready. Download the CSV and its time record.');}catch{if(current===generation.current.value)setNotice('We couldn’t confirm the export. Try again; it won’t create a second file.');}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const save=async()=>{
  if(!currentActor){clearProtected.current('Export access ended',true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current('This export is out of date. Refresh to start again.');return;}
  let command;try{const profile=parseExportProfile({...draft,reviewedTimeBasis:reviewed});command=saveRetry.current??{operationId:crypto.randomUUID(),id:saved?.id??crypto.randomUUID(),expectedRevision:saved?.revision??0,profile};}catch(error){setNotice(error instanceof Error?error.message:'Check the mapping profile');return;}
  saveRetry.current=command;cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export/profiles',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current('Export access ended',true);return;}if(response.status===409){saveRetry.current=null;setNotice('The file format changed. Refresh to see the latest.');return;}if(!response.ok)throw new Error();const body=await response.json();if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current('This export is out of date. Refresh to start again.');return;}if(body?.state!=='saved'||!body.profile)throw new Error();const item={id:body.profile.id,revision:body.profile.revision,profile:parseExportProfile(body.profile.profile)} as SavedExportProfile;if(item.id!==command.id||!Number.isSafeInteger(item.revision)||item.revision!==command.expectedRevision+1||stableExportJson(item.profile)!==stableExportJson(command.profile))throw Error('Unverified mapping receipt');acceptSavedProfile.current(item);setProfiles(p=>[...p.filter(p=>p.id!==item.id),item]);setProfileId(item.id);setDraft(item.profile);saveRetry.current=null;setNotice(`Mapping saved as revision ${item.revision}.`);}catch{if(current===generation.current.value)setNotice('We couldn’t confirm the file format was saved. Save again; it won’t save twice.');}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const visibleSelection=selectVisibleFinalized(cards??[]);
 const generate=(ids:string[]=selected)=>{try{if(!cards||ids.length===0||ids.length>100)throw new Error('Choose 1 to 100 finalized employees');const chosen=ids.map(id=>cards.find(c=>c.card.employeeId===id)!);if(chosen.some(c=>!c||c.state!=='FINALIZED'))throw new Error('Every selected card must be finalized');void send({...period,operationId:crypto.randomUUID(),profileId:saved?.id??null,profileRevision:saved?.revision??0,cards:chosen.map(c=>({employeeId:c.card.employeeId,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}))});}catch(error){setNotice(error instanceof Error?error.message:'Review the export');}};
 const periodChanged=draftPeriod.startDate!==period.startDate||draftPeriod.endDate!==period.endDate;
 const chosen=cards?.filter(c=>selected.includes(c.card.employeeId))??[];
 const finalized=cards?.filter(c=>c.state==='FINALIZED')??[];
 const recorded=chosen.reduce((sum,c)=>sum+BigInt(c.card.recordedNanoseconds),BigInt(0)).toString();
 const breaks=chosen.reduce((sum,c)=>sum+BigInt(c.card.breakNanoseconds),BigInt(0)).toString();
 const locked=busy||retry!==null||!currentActor;
 // Corporate (Release 1, board O-TimeExports): the pay period, where the hours go, how many people and hours are ready,
 // and one Create export. The people list, other dates and the provider file setup stay one tap away.
 const choosePeriod=(next:Period)=>{
  setDraftPeriod(next);
  let parsed:Period;try{parsed=parsePeriod(next.startDate,next.endDate);}catch{setNotice('Choose a period of 1 to 31 days.');return;}
  if(parsed.startDate===period.startDate&&parsed.endDate===period.endDate)return;
  if(mutating.current||retry!==null||saveRetry.current!==null){setNotice('Finish or retry the current export before changing the period.');return;}
  setNotice('');clearProtected.current('Loading finalized time');setPeriod(parsed);
 };
 const ready=state==='ready'&&currentActor;
 const exportAll=()=>{const ids=visibleSelection.selected;setSelected(ids);setResult(null);generate(ids);};
 const stateText=state==='Loading finalized time'?'Loading timecards…':state==='ready'?'Checking export access…':state;
 const reviewSummary=ready&&cards?summarizeTimecardReview({period,cards}):null;
 const approvedOnly=reviewSummary?.counts.awaitingFinalization??0;
 const unapproved=reviewSummary?.counts.awaitingApproval??0;
 const readyHours=finalized.reduce((sum,c)=>sum+BigInt(c.card.recordedNanoseconds),BigInt(0)).toString();
 // R7: what to do next, in grey with the way to Timecards. Export takes finalized timecards only, so finalizing is
 // still named when approved cards are waiting for it (Timecards' own action is "Finalize").
 const waiting=unapproved?`Approve ${unapproved} ${unapproved===1?'timecard':'timecards'}${approvedOnly?` and finalize ${approvedOnly}`:''} first`:approvedOnly?`Finalize ${approvedOnly} approved ${approvedOnly===1?'timecard':'timecards'} first`:'';
 const weeks=weekChoices();
 const periodKey=`${period.startDate}|${period.endDate}`;
 const listed=weeks.some(w=>w.value===periodKey);
 const create=()=>{if(selected.length){setResult(null);generate();}else exportAll();};
 const chooseProfile=(id:string)=>{setProfileId(id);const p=profiles.find(p=>p.id===id)?.profile??neutralProfile();setDraft(p);setReviewed(false);setResult(null);};
 const timecardsHref=`/app/timecards?start=${period.startDate}&end=${period.endDate}`;
 // Someone without payroll (a Manager) reaches Time exports from Timecards: the way back goes there, and the page isn't drawn
 // as a money page (its sidebar entry is Time).
 const payroll=!!tabs?.length;
 return <div className={`c-page c-payroll c-pay c-exp c-page--narrow${payroll?'':' c-exp--time'}`} data-nv-page="" data-corp="" aria-labelledby="time-exports-title">
  <CorpNav back={payroll?{href:'/app/payroll',label:'Payroll'}:{href:'/app/timecards',label:'Timecards'}} title="Time exports" phoneOnly/>
  <CorpTitle id="time-exports-title" title="Time exports" wide/>
  <PayrollTabs items={tabs} current="/app/payroll-export"/>
  <div className="c-field">
   <label className="c-field__label" htmlFor="time-export-period">Week</label>
   <select id="time-export-period" className="c-in" aria-label="Week" value={listed?periodKey:'current'} disabled={busy} onChange={e=>{const [startDate,endDate]=e.target.value.split('|');if(startDate&&endDate)choosePeriod({startDate,endDate});}}>
    {!listed?<option value="current">{rangeText(period.startDate,period.endDate)}</option>:null}
    {weeks.map(w=><option key={w.value} value={w.value}>{w.label}</option>)}
   </select>
  </div>
  {notice?<p className="c-callout c-callout--teal" role="status">{notice}</p>:null}
  {/* R5: section labels sit above their cards. */}
  <section className="c-pay__group" aria-labelledby="time-export-send">
   <div className="c-sec-label c-pay__sec"><h2 id="time-export-send">{profiles.length?'Send to':'File'}</h2></div>
   <div className="c-card">
   {ready?<>
    <ul className="c-rows" aria-label={profiles.length?'Send to':'File'}>
     {/* R7: with no saved layouts the CSV is a fact, not a one-option choice. */}
     {!profiles.length?<li><div className="c-row c-exp__file"><span className="c-row__main"><span className="c-row__title c-row__title--b">CSV file</span><span className="c-row__detail"><span>Opens in Excel or Numbers</span></span></span></div></li>:null}
     {profiles.map(p=><li key={p.id}><label className="c-row c-exp__choice"><span className="c-row__main"><span className="c-row__title c-row__title--b">{p.profile.name}</span><span className="c-row__detail"><span>{`${p.profile.product||'Saved file layout'} · revision ${p.revision}`}</span></span></span><input type="radio" name="time-export-profile" value={p.id} checked={profileId===p.id} disabled={locked} onChange={e=>chooseProfile(e.target.value)}/></label></li>)}
     {profiles.length?<li><label className="c-row c-exp__choice"><span className="c-row__main"><span className="c-row__title c-row__title--b">CSV file</span><span className="c-row__detail"><span>Opens in Excel or Numbers</span></span></span><input type="radio" name="time-export-profile" value="neutral" checked={profileId==='neutral'} disabled={locked} onChange={e=>chooseProfile(e.target.value)}/></label></li>:null}
    </ul>
    <div className="c-exp__ready">
     <b className="c-pay__strong">{finalized.length?<>{`${finalized.length} ${finalized.length===1?'person':'people'} · `}<span className="c-num">{hoursText(readyHours)}</span></>:'Nothing ready to export yet'}</b>
     {waiting?<span className="c-exp__waiting">{`${waiting} · `}<a className="c-exp__inline" href={timecardsHref}>Go to Timecards</a></span>:null}
     {retry?<button type="button" className="c-btn c-btn--full" disabled={busy} onClick={()=>retry&&void send(retry)}>Retry same export</button>
      :<button type="button" className="c-btn c-btn--full" disabled={locked||!finalized.length||periodChanged} onClick={create}>Create export</button>}
     <p className="c-note">{busy?'Preparing your files…':retry?'Retry to confirm the outcome of this export.':periodChanged?'Show the dates you chose before exporting.':!finalized.length?(waiting?'Only finalized timecards are exported.':<>No one has finalized time for these dates. <a className="c-exp__inline" href={timecardsHref}>Go to Timecards</a></>):selected.length?`Exports the ${selected.length} ${selected.length===1?'person':'people'} you chose.`:`Exports every finalized timecard${visibleSelection.overLimit?' (the first 100)':''}. Hours include breaks; your payroll system decides pay types.`}</p>
    </div>
   </>:<div className="c-card__body"><p className="c-payroll__state" role="status" data-export-loading={state==='Loading finalized time'||undefined}>{stateText}</p>{state!=='Loading finalized time'?<button type="button" className="c-btn c-btn--secondary c-btn--md c-pay__gap" disabled={busy} onClick={()=>reload.current()}>Try again</button>:null}</div>}
   </div>
  </section>
  {ready&&result?<section className="c-pay__group" aria-labelledby="time-export-files">
   <div className="c-sec-label c-pay__sec"><h2 id="time-export-files">Your files</h2><span className="c-pay__count">{`${result.model.rows.length} ${result.model.rows.length===1?'person':'people'}`}</span></div>
   <div className="c-card">
   <ul className="c-rows" aria-label="Your files">
    <li><button type="button" className="c-row" aria-label="Download mapped CSV" onClick={()=>downloadCurrent(result.csv,'text/csv;charset=utf-8',`nevora-mapped-${result.model.period.startDate}-${result.operationId}.csv`)}><span className="c-row__main"><span className="c-row__title c-row__title--b">Time file</span><span className="c-row__detail"><span>{`CSV · ${result.profile.name}${result.profileRevision>0?` · Rev. ${result.profileRevision}`:''}`}</span></span></span><DownloadSimpleIcon className="c-ic c-exp__dl" aria-hidden="true"/></button></li>
    <li><button type="button" className="c-row" aria-label="Download time record (JSON)" onClick={()=>downloadCurrent(stableExportJson(result.model),'application/json',`nevora-canonical-${result.model.period.startDate}-${result.operationId}.json`)}><span className="c-row__main"><span className="c-row__title c-row__title--b">Time record</span><span className="c-row__detail"><span>Exact hours for each timecard</span></span></span><DownloadSimpleIcon className="c-ic c-exp__dl" aria-hidden="true"/></button></li>
   </ul>
   <details className="c-exp__more"><summary>Receipt and checksum</summary><dl className="c-exp__receipt"><div><dt>Receipt</dt><dd>{result.operationId}</dd></div><div><dt>CSV SHA-256</dt><dd>{result.csvSha256}</dd></div></dl></details>
   </div>
  </section>:null}
  {ready?<section className="c-pay__group" aria-labelledby="time-export-options">
   <div className="c-sec-label c-pay__sec"><h2 id="time-export-options">Options</h2></div>
   <div className="c-card">
   <details className="c-exp__item" open={selected.length>0||undefined}>
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">People in this export</span><span className="c-row__detail"><span>{`${selected.length} selected · ${visibleSelection.excluded} not finalized.${visibleSelection.overLimit?' Select up to 100 people at a time.':''}`}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
    <div className="c-exp__body">
     <div className="c-exp__bar"><button type="button" className="c-link c-link--l" aria-label="Select visible finalized timecards" disabled={locked||finalized.length===0} onClick={()=>{setSelected(visibleSelection.selected);setResult(null);}}>Select all finalized</button><button type="button" className="c-link c-link--l" aria-label="Clear employee selection" disabled={locked||selected.length===0} onClick={()=>{setSelected([]);setResult(null);}}>Clear</button></div>
     {cards?.length===0?<p className="c-note">No one has time in this period.</p>:<ul className="c-exp__people">{cards?.map(c=><li key={c.card.employeeId}><label className="c-exp__person" data-off={c.state!=='FINALIZED'||undefined}>
      <input type="checkbox" aria-label={`Export ${c.card.employeeName}`} disabled={c.state!=='FINALIZED'||locked||(!selected.includes(c.card.employeeId)&&selected.length>=100)} checked={selected.includes(c.card.employeeId)} onChange={e=>{setSelected(ids=>changeExportSelection(cards??[],ids,c.card.employeeId,e.target.checked));setResult(null);}}/>
      <span className="c-row__main"><span className="c-row__title">{c.card.employeeName}</span><span className="c-row__detail"><span>{c.state==='FINALIZED'?'Finalized':c.state==='APPROVED'?'Approved · not finalized':c.state==='DRAFT'?'Draft':c.state.charAt(0)+c.state.slice(1).toLowerCase().replaceAll('_',' ')}</span></span></span>
      <span className="c-row__value c-row__value--soft c-num">{hoursText(c.card.recordedNanoseconds)}</span>
     </label></li>)}</ul>}
     {selected.length?<p className="c-note">{`Selected: ${hoursText(recorded)} recorded · ${hoursText(breaks)} of breaks, listed separately.`}</p>:null}
    </div>
   </details>
   <details className="c-exp__item">
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">Other dates</span><span className="c-row__detail"><span>Up to 31 days</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
    <form className="c-exp__body" onSubmit={e=>{e.preventDefault();try{const nextPeriod=parsePeriod(draftPeriod.startDate,draftPeriod.endDate);if(nextPeriod.startDate===period.startDate&&nextPeriod.endDate===period.endDate){if(mutating.current){setNotice('Finish the current operation before refreshing export data.');return;}reload.current();}else{if(mutating.current||retry!==null||saveRetry.current!==null){setNotice('Finish or retry the current export or mapping save before changing the period.');return;}clearProtected.current('Loading finalized time');setPeriod(nextPeriod);}setNotice('');}catch{setNotice('Choose a period of 1 to 31 days.');}}}>
     <div className="c-field__row">
      <div className="c-field"><label className="c-field__label" htmlFor="time-export-start">Start</label><span className="c-in c-pay__date"><span aria-hidden="true">{dayText(draftPeriod.startDate)||'Choose a date'}</span><CalendarBlankIcon className="c-ic c-ic--s" aria-hidden="true"/><input id="time-export-start" type="date" required value={draftPeriod.startDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,startDate:e.target.value})}/></span></div>
      <div className="c-field"><label className="c-field__label" htmlFor="time-export-end">End</label><span className="c-in c-pay__date"><span aria-hidden="true">{dayText(draftPeriod.endDate)||'Choose a date'}</span><CalendarBlankIcon className="c-ic c-ic--s" aria-hidden="true"/><input id="time-export-end" type="date" required value={draftPeriod.endDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,endDate:e.target.value})}/></span></div>
     </div>
     {periodChanged?<p className="c-note">Dates changed. Show them to review this period before exporting.</p>:null}
     <button type="submit" className="c-btn c-btn--secondary c-btn--md c-btn--full" disabled={busy}>Show these dates</button>
    </form>
   </details>
   <PayrollExportMapping draft={draft} setDraft={setDraft} cards={cards??[]} reviewed={reviewed} setReviewed={setReviewed} disabled={locked} save={()=>void save()} />
   </div>
  </section>:null}
  <section className="c-card" aria-label={payroll?'Who’s included and sent files':'Export history'}>
   <details className="c-exp__item c-exp__close"><summary className="c-row"><span className="c-row__main"><span className="c-row__title">{payroll?'Who’s included and sent files':'Export history'}</span><span className="c-row__detail"><span>{payroll?'People in this payroll and where files went':'Files you’ve downloaded'}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
    <div className="c-exp__legacy"><PayrollPeriodClose period={period} actorId={actorId}/></div>
   </details>
  </section>
 </div>;
}
