'use client';
import {PayrollPeriodClose} from './payroll-period-close';
import {useEffect,useRef,useState} from 'react';
import {ArrowClockwiseIcon, DownloadSimpleIcon, ArrowRightIcon, CalendarDotsIcon, CheckCircleIcon, ClockIcon, FileCsvIcon, FileCodeIcon, InfoIcon, UsersThreeIcon} from '@phosphor-icons/react/ssr';
import {neutralProfile,parseExportProfile,type ExportProfile} from '@/lib/payroll-export/model';
import {type TimecardItem} from '@/lib/timecards/read-model';
import {parseCurrentTimecards} from '@/lib/timecards/client';
import {formatRecordedHours,parsePeriod,type Period} from '@/lib/timecards/project';
import type {ExportCommand,PayrollExportPayload,SavedExportProfile} from '@/lib/payroll-export/service';
import {verifyExportReply} from '@/lib/payroll-export/client';
import {stableExportJson} from '@/lib/payroll-export/json';
import {selectVisibleFinalized,changeExportSelection} from '@/lib/payroll-export/selection';
import {PayrollExportMapping} from './payroll-export-mapping';
import styles from './payroll-export.module.css';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
function download(text:string,type:string,name:string){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
type ProfileCommand={operationId:string;id:string;expectedRevision:number;profile:ExportProfile};
function payrollSourceKey(cards:readonly TimecardItem[],profiles:readonly SavedExportProfile[]){
 // projectTimecard stamps each current card with this read's observation time.
 // Compare every source/projected/history fact except that one clock field.
 const comparableCards=cards.map(item=>({...item,card:Object.fromEntries(Object.entries(item.card).filter(([key])=>key!=='observedAt'))}));
 return stableExportJson({cards:comparableCards,profiles});
}
export function PayrollExport({initialPeriod,actorId}:{initialPeriod:Period;actorId:string}){
 const [period,setPeriod]=useState(initialPeriod),[draftPeriod,setDraftPeriod]=useState(initialPeriod),[cards,setCards]=useState<TimecardItem[]|null>(null),[profiles,setProfiles]=useState<SavedExportProfile[]>([]),[profileId,setProfileId]=useState('neutral'),[draft,setDraft]=useState<ExportProfile>(neutralProfile),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState<string[]>([]),[state,setState]=useState('Loading finalized time'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PayrollExportPayload|null>(null);
 const [retry,setRetry]=useState<ExportCommand|null>(null),[snapshotActor,setSnapshotActor]=useState<string|null>(null);
 const saveRetry=useRef<ProfileCommand|null>(null),generation=useRef({value:0}),abort=useRef<AbortController|null>(null),reload=useRef<()=>void>(()=>{});
 const mutating=useRef(false),cancelRefresh=useRef<()=>void>(()=>{}),acceptSavedProfile=useRef<(item:SavedExportProfile)=>void>(()=>{});
 const previousActor=useRef(actorId),validUntil=useRef(0),clearProtected=useRef<(message:string,denied?:boolean)=>void>(()=>{});
 const headers={'content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':actorId};
 useEffect(()=>{
  if(previousActor.current!==actorId){setRetry(null);saveRetry.current=null;}previousActor.current=actorId;
  let active=true,focused=true,reading=false,readSequence=0,sourceKey:string|null=null;
  let sourceSnapshot:{cards:TimecardItem[];profiles:SavedExportProfile[]}|null=null;let expiry:ReturnType<typeof setTimeout>|undefined;const lifecycle=generation.current,pendingSave=saveRetry;
  cancelRefresh.current=()=>{readSequence++;reading=false;abort.current?.abort();};
  const clear=(message:string,denied=false)=>{generation.current.value++;cancelRefresh.current();sourceKey=null;sourceSnapshot=null;mutating.current=false;if(expiry)clearTimeout(expiry);expiry=undefined;validUntil.current=0;setSnapshotActor(null);setCards(null);setProfiles([]);setProfileId('neutral');setSelected([]);setResult(null);setDraft(neutralProfile());setReviewed(false);setState(message);setNotice('');setBusy(false);if(denied){setRetry(null);saveRetry.current=null;}};
  clearProtected.current=clear;
  acceptSavedProfile.current=item=>{
   if(!active||!sourceSnapshot||performance.now()>=validUntil.current){clear('Export data expired. Refresh a current protected snapshot.');throw Error('Expired mapping receipt');}
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
     if(preserve&&performance.now()>=validUntil.current){clear('Export data expired. Refresh a current protected snapshot.');return;}
     if(preserve&&nextSource!==sourceKey)clear('Loading finalized time');
     if(expiry)clearTimeout(expiry);sourceSnapshot={cards:parsed.cards,profiles:verified};sourceKey=nextSource;validUntil.current=deadline;
     expiry=setTimeout(()=>clear('Export data expired. Refresh a current protected snapshot.'),remaining);
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
  return()=>{active=false;lifecycle.value++;abort.current?.abort();if(expiry)clearTimeout(expiry);clearInterval(poll);validUntil.current=0;clearProtected.current=()=>{};cancelRefresh.current=()=>{};acceptSavedProfile.current=()=>{};sourceSnapshot=null;mutating.current=false;pendingSave.current=null;window.removeEventListener('focus',refresh);window.removeEventListener('blur',hide);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',account);window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visible);};
 },[period,actorId]);
 const currentActor=snapshotActor===actorId;
 const downloadCurrent=(text:string,type:string,name:string)=>{if(!currentActor||performance.now()>=validUntil.current){clearProtected.current('Export data expired. Refresh a current protected snapshot.');return;}download(text,type,name);};
 const saved=profiles.find(p=>p.id===profileId);
 const send=async(command:ExportCommand)=>{
  if(!currentActor){clearProtected.current('Export access ended',true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current('Export data expired. Refresh a current protected snapshot.');return;}cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');setResult(null);setRetry(command);const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current('Export access ended',true);return;}if(response.status===409){setRetry(null);setNotice('The finalized revision or mapping changed. Refresh and review again.');return;}if(!response.ok)throw new Error();const verified=await verifyExportReply(await response.json(),command);if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current('Export data expired. Refresh a current protected snapshot.');return;}setResult(verified);setRetry(null);setNotice('Files verified. Download the mapped CSV and its canonical time record.');}catch{if(current===generation.current.value)setNotice('The export outcome is unconfirmed. Retry this same generation to retrieve its receipt.');}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const save=async()=>{
  if(!currentActor){clearProtected.current('Export access ended',true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current('Export data expired. Refresh a current protected snapshot.');return;}
  let command;try{const profile=parseExportProfile({...draft,reviewedTimeBasis:reviewed});command=saveRetry.current??{operationId:crypto.randomUUID(),id:saved?.id??crypto.randomUUID(),expectedRevision:saved?.revision??0,profile};}catch(error){setNotice(error instanceof Error?error.message:'Check the mapping profile');return;}
  saveRetry.current=command;cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export/profiles',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current('Export access ended',true);return;}if(response.status===409){saveRetry.current=null;setNotice('The mapping changed. Refresh and review its latest revision.');return;}if(!response.ok)throw new Error();const body=await response.json();if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current('Export data expired. Refresh a current protected snapshot.');return;}if(body?.state!=='saved'||!body.profile)throw new Error();const item={id:body.profile.id,revision:body.profile.revision,profile:parseExportProfile(body.profile.profile)} as SavedExportProfile;if(item.id!==command.id||!Number.isSafeInteger(item.revision)||item.revision!==command.expectedRevision+1||stableExportJson(item.profile)!==stableExportJson(command.profile))throw Error('Unverified mapping receipt');acceptSavedProfile.current(item);setProfiles(p=>[...p.filter(p=>p.id!==item.id),item]);setProfileId(item.id);setDraft(item.profile);saveRetry.current=null;setNotice(`Mapping saved as revision ${item.revision}.`);}catch{if(current===generation.current.value)setNotice('Mapping save is unconfirmed. Save again to retry the same command.');}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const visibleSelection=selectVisibleFinalized(cards??[]);
 const generate=()=>{try{if(!cards||selected.length===0||selected.length>100)throw new Error('Choose 1 to 100 finalized employees');const chosen=selected.map(id=>cards.find(c=>c.card.employeeId===id)!);if(chosen.some(c=>!c||c.state!=='FINALIZED'))throw new Error('Every selected card must be finalized');void send({...period,operationId:crypto.randomUUID(),profileId:saved?.id??null,profileRevision:saved?.revision??0,cards:chosen.map(c=>({employeeId:c.card.employeeId,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}))});}catch(error){setNotice(error instanceof Error?error.message:'Review the export');}};
 const periodChanged=draftPeriod.startDate!==period.startDate||draftPeriod.endDate!==period.endDate;
 const chosen=cards?.filter(c=>selected.includes(c.card.employeeId))??[];
 const finalized=cards?.filter(c=>c.state==='FINALIZED')??[];
 const recorded=chosen.reduce((sum,c)=>sum+BigInt(c.card.recordedNanoseconds),BigInt(0)).toString();
 const breaks=chosen.reduce((sum,c)=>sum+BigInt(c.card.breakNanoseconds),BigInt(0)).toString();
 const locked=busy||retry!==null||!currentActor;
 return <div className={styles.root}>
  <section className={`${styles.card} ${styles.periodCard}`} aria-labelledby="payroll-period-title">
   <div className={styles.sectionHeading}><span className={styles.sectionIcon}><CalendarDotsIcon size={21} aria-hidden="true" /></span><div><h2 id="payroll-period-title">Pay period</h2><p>Choose up to 31 days of finalized time.</p></div></div>
   <form className={styles.toolbar} onSubmit={e=>{e.preventDefault();try{const nextPeriod=parsePeriod(draftPeriod.startDate,draftPeriod.endDate);if(nextPeriod.startDate===period.startDate&&nextPeriod.endDate===period.endDate){if(mutating.current){setNotice('Finish the current operation before refreshing export data.');return;}reload.current();}else{if(mutating.current||retry!==null||saveRetry.current!==null){setNotice('Finish or retry the current export or mapping save before changing the period.');return;}clearProtected.current('Loading finalized time');setPeriod(nextPeriod);}setNotice('');}catch{setNotice('Choose a period of 1 to 31 days.');}}}>
    <label><span>Period start</span><input type="date" required value={draftPeriod.startDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,startDate:e.target.value})} /></label>
    <label><span>Period end</span><input type="date" required value={draftPeriod.endDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,endDate:e.target.value})} /></label>
    <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={busy}>View finalized time<ArrowRightIcon size={18} aria-hidden="true" /></button>
    <button type="button" className={styles.button} disabled={busy} onClick={()=>reload.current()}><ArrowClockwiseIcon size={18} aria-hidden="true" />Refresh export data</button>
   </form>
   {periodChanged&&<p className={styles.periodHint}>Dates changed. View finalized time to review this period before generating an export.</p>}
  </section>
  {notice&&<div className={styles.notice} role="status"><InfoIcon size={20} aria-hidden="true" /><p>{notice}</p></div>}
  {state!=='ready'||!currentActor?<section className={`${styles.card} ${styles.stateCard}`} role="status"><span className={styles.stateIcon}><ClockIcon size={30} weight="duotone" aria-hidden="true" /></span><h2>{state==='ready'?'Checking export access':state}</h2><p>{state==='Loading finalized time'?'Loading the current timecards and saved mapping profiles.':'Refresh export data when access and your connection are available.'}</p></section>:<>
   <div className={styles.workspace}>
    <section className={`${styles.card} ${styles.employeeCard}`} aria-labelledby="payroll-employees-title">
     <div className={styles.sectionHeading}><span className={styles.sectionIcon}><UsersThreeIcon size={22} aria-hidden="true" /></span><div><h2 id="payroll-employees-title">Choose finalized employees</h2><p>{dateLabel(period.startDate).replace(/ /g, "\u00a0")}{"\u00a0– "}{dateLabel(period.endDate).replace(/ /g, "\u00a0")}</p></div><span className={styles.count}>{finalized.length} ready</span></div>
     <div className={styles.selectionBar}><span>{selected.length} selected · {visibleSelection.excluded} not finalized.{visibleSelection.overLimit ? " Select up to 100 people at a time." : null}</span><div><button type="button" className={styles.textButton} aria-label="Select visible finalized timecards" disabled={locked||finalized.length===0} onClick={()=>{setSelected(visibleSelection.selected);setResult(null);}}>Select finalized</button><button type="button" className={styles.textButton} aria-label="Clear employee selection" disabled={locked||selected.length===0} onClick={()=>{setSelected([]);setResult(null);}}>Clear</button></div></div>
     {cards?.length===0?<div className={styles.empty}><UsersThreeIcon size={32} weight="duotone" aria-hidden="true" /><h3>No employees in this period</h3><p>Choose another period and view finalized time, or review this period in Timecards.</p></div>:<div className={styles.employeeList}>
      <div className={styles.tableHeading} aria-hidden="true"><span>Employee</span><span>Recorded</span><span>Breaks</span></div>
      {cards?.map(c=><label className={`${styles.employee} ${c.state!=='FINALIZED'?styles.unavailable:''}`} key={c.card.employeeId}>
       <input type="checkbox" aria-label={`Export ${c.card.employeeName}`} disabled={c.state!=='FINALIZED'||locked||(!selected.includes(c.card.employeeId)&&selected.length>=100)} checked={selected.includes(c.card.employeeId)} onChange={e=>{setSelected(ids=>changeExportSelection(cards??[],ids,c.card.employeeId,e.target.checked));setResult(null);}} />
       <span className={styles.employeeIdentity}><strong>{c.card.employeeName}</strong><small><span className={c.state==='FINALIZED'?styles.finalized:styles.status}>{c.state==='FINALIZED'&&<CheckCircleIcon size={12} weight="fill" aria-hidden="true" />}{c.state==='FINALIZED'?'Finalized':c.state==='DRAFT'?'Draft':c.state.charAt(0)+c.state.slice(1).toLowerCase().replaceAll('_',' ')}</span></small></span>
       <span className={styles.hours}><small>Recorded</small>{formatRecordedHours(c.card.recordedNanoseconds)}</span><span className={styles.hours}><small>Breaks</small>{formatRecordedHours(c.card.breakNanoseconds)}</span>
      </label>)}
     </div>}
     {cards&&cards.length>0&&finalized.length<cards.length&&<p className={styles.employeeFootnote}>{finalized.length===0?'No finalized timecards are ready to export. Review and finalize the period in':'Only finalized timecards can be selected. Review other timecards in'} <a href="/app/timecards">Timecards</a>.</p>}
    </section>
    <section className={`${styles.card} ${styles.exportCard}`} aria-labelledby="payroll-export-title">
     <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.exportIcon}`}><FileCsvIcon size={23} weight="duotone" aria-hidden="true" /></span><div><h2 id="payroll-export-title">Export summary</h2><p>Review your selection and file mapping.</p></div></div>
     <dl className={styles.totals}><div><dt>Selected employees</dt><dd>{selected.length}<span> / {finalized.length} ready</span></dd></div><div><dt>Recorded time</dt><dd>{formatRecordedHours(recorded)}</dd></div><div><dt>Separate break total</dt><dd>{formatRecordedHours(breaks)}</dd></div></dl>
     <p className={styles.timeBasis}><InfoIcon size={17} aria-hidden="true" /><span>Hours include breaks. Your payroll system decides pay types and runs payroll.</span></p>
     <label><span>Mapping profile</span><span className={styles.selectFrame}><select aria-label="Mapping profile" value={profileId} disabled={locked} onChange={e=>{setProfileId(e.target.value);const p=profiles.find(p=>p.id===e.target.value)?.profile??neutralProfile();setDraft(p);setReviewed(false);setResult(null);}}><option value="neutral">NEVORA normalized time CSV</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.profile.name} · revision {p.revision}</option>)}</select></span></label>
     {saved?<details className={styles.mappingInfo}><summary>Mapping details</summary><p className={styles.note}>{saved.profile.product} · {saved.profile.precision==='HALF_UP'?'Explicit half-up rounding':'Reject precision loss'} · {saved.profile.verifiedRequirements}</p></details>:<p className={styles.note}>Exact hours, each linked to its finalized timecard. Check the format with your payroll provider before importing.</p>}
     <button type="button" className={`${styles.button} ${styles.primary} ${styles.generate}`} disabled={locked||selected.length===0||periodChanged} onClick={generate}>Generate reviewed export<ArrowRightIcon size={18} aria-hidden="true" /></button>
     <p className={styles.actionHint}>{busy?'Preparing your request…':retry?'Retry to confirm the outcome of this export.':periodChanged?'View finalized time for your updated dates.':selected.length===0?'Select finalized employees to prepare your files.':'Creates a mapped CSV and canonical time record.'}</p>
     {retry&&<button type="button" className={`${styles.button} ${styles.generate}`} disabled={busy} onClick={()=>retry&&void send(retry)}><ArrowClockwiseIcon size={18} aria-hidden="true" />Retry same export</button>}
    </section>
   </div>
   {result&&<section className={`${styles.card} ${styles.files}`} aria-labelledby="payroll-files-title">
    <div className={styles.sectionHeading}><span className={styles.verifiedIcon}><CheckCircleIcon size={24} weight="duotone" aria-hidden="true" /></span><div><h2 id="payroll-files-title">Your files are ready</h2><p>Verified export for {result.model.rows.length} employees. Download both files for your records.</p></div></div>
    <div className={styles.fileGrid}><button type="button" className={styles.download} aria-label="Download mapped CSV" onClick={()=>downloadCurrent(result.csv,'text/csv;charset=utf-8',`nevora-mapped-${result.model.period.startDate}-${result.operationId}.csv`)}><FileCsvIcon size={28} weight="duotone" aria-hidden="true" /><span><strong>Download mapped CSV</strong><small>{result.profile.name}{result.profileRevision>0?` · Rev. ${result.profileRevision}`:''}</small></span><DownloadSimpleIcon size={20} aria-hidden="true" /></button><button type="button" className={styles.download} aria-label="Download canonical time record" onClick={()=>downloadCurrent(stableExportJson(result.model),'application/json',`nevora-canonical-${result.model.period.startDate}-${result.operationId}.json`)}><FileCodeIcon size={28} weight="duotone" aria-hidden="true" /><span><strong>Download canonical time record</strong><small>Exact durations and source references · JSON</small></span><DownloadSimpleIcon size={20} aria-hidden="true" /></button></div>
    <details className={styles.receipt}><summary>Export receipt &amp; verification</summary><dl><div><dt>Receipt</dt><dd>{result.operationId}</dd></div><div><dt>CSV SHA-256</dt><dd>{result.csvSha256}</dd></div></dl></details>
   </section>}
   <PayrollExportMapping draft={draft} setDraft={setDraft} cards={cards??[]} reviewed={reviewed} setReviewed={setReviewed} disabled={locked} save={()=>void save()} />
  </>}
  <PayrollPeriodClose period={period} actorId={actorId}/>
 </div>;
}
