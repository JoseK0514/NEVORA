'use client';
import {PayrollPeriodClose} from './payroll-period-close';
import {useEffect,useRef,useState} from 'react';
import {ArrowClockwiseIcon, DownloadSimpleIcon, ArrowRightIcon, CalendarDotsIcon, CheckCircleIcon, ClockIcon, FileCsvIcon, FileCodeIcon, InfoIcon, UsersThreeIcon} from '@phosphor-icons/react/ssr';
import {neutralProfile,parseExportProfile,type ExportProfile} from '@/lib/payroll-export/model';
import {parseTimecardsResponse,type TimecardItem} from '@/lib/timecards/read-model';
import {formatRecordedHours,parsePeriod,type Period} from '@/lib/timecards/project';
import type {ExportCommand,PayrollExportPayload,SavedExportProfile} from '@/lib/payroll-export/service';
import {verifyExportReply} from '@/lib/payroll-export/client';
import {stableExportJson} from '@/lib/payroll-export/json';
import {PayrollExportMapping} from './payroll-export-mapping';
import styles from './payroll-export.module.css';
const dateLabel=(value:string)=>new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
function download(text:string,type:string,name:string){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function PayrollExport({initialPeriod,actorId}:{initialPeriod:Period;actorId:string}){
 const [period,setPeriod]=useState(initialPeriod),[draftPeriod,setDraftPeriod]=useState(initialPeriod),[cards,setCards]=useState<TimecardItem[]|null>(null),[profiles,setProfiles]=useState<SavedExportProfile[]>([]),[profileId,setProfileId]=useState('neutral'),[draft,setDraft]=useState<ExportProfile>(neutralProfile),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState<string[]>([]),[state,setState]=useState('Loading finalized time'),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PayrollExportPayload|null>(null);
 const [retry,setRetry]=useState<ExportCommand|null>(null);
 const saveRetry=useRef<unknown>(null),generation=useRef({value:0}),abort=useRef<AbortController|null>(null),reload=useRef<()=>void>(()=>{});
 const headers={'content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':actorId};
 useEffect(()=>{
  let active=true;const lifecycle=generation.current,pendingSave=saveRetry;
  const clear=(message:string)=>{generation.current.value++;abort.current?.abort();setCards(null);setProfiles([]);setSelected([]);setResult(null);setDraft(neutralProfile());setReviewed(false);setState(message);setNotice('');setBusy(false);};
  const load=async()=>{
   clear(navigator.onLine?'Loading finalized time':'Exports unavailable offline');if(!navigator.onLine||document.visibilityState==='hidden')return;
   const current=generation.current.value;abort.current=new AbortController();
   try{
    const responses=await Promise.all([fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(period)}),fetch('/api/payroll-export/profiles',{cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'x-nevora-payroll-export':'1','x-nevora-actor':actorId}})]);
    if(!active||current!==generation.current.value)return;
    if(responses.some(r=>r.status===401||r.status===403)){setRetry(null);saveRetry.current=null;clear('Export access ended');return;}
    if(responses.some(r=>!r.ok))throw new Error();const [time,mappings]=await Promise.all(responses.map(r=>r.json()));
    const parsed=parseTimecardsResponse(time,period);if(mappings?.state!=='ready'||!Array.isArray(mappings.profiles)||mappings.profiles.length>100)throw new Error();
    const verified=mappings.profiles.map((p:SavedExportProfile)=>{if(typeof p.id!=='string'||!Number.isSafeInteger(p.revision)||p.revision<1)throw new Error();return {...p,profile:parseExportProfile(p.profile)};});
    if(active&&current===generation.current.value){setCards(parsed.cards);setProfiles(verified);setProfileId('neutral');setState('ready');}
   }catch{if(active&&current===generation.current.value)clear('Exports unavailable');}
  };
  reload.current=()=>{void load();};void load();
  const refresh=()=>{if(document.visibilityState!=='hidden')void load();},offline=()=>clear('Exports unavailable offline'),hide=()=>clear('Exports paused'),visible=()=>document.visibilityState==='hidden'?hide():refresh();
  window.addEventListener('focus',refresh);window.addEventListener('pageshow',refresh);window.addEventListener('storage',refresh);window.addEventListener('online',refresh);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visible);
  return()=>{active=false;lifecycle.value++;abort.current?.abort();pendingSave.current=null;window.removeEventListener('focus',refresh);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',refresh);window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visible);};
 },[period,actorId]);
 const saved=profiles.find(p=>p.id===profileId);
 const send=async(command:ExportCommand)=>{
  if(busy)return;setBusy(true);setNotice('');setResult(null);setRetry(command);const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){setRetry(null);setCards(null);setProfiles([]);setDraft(neutralProfile());setState('Export access ended');return;}if(response.status===409){setRetry(null);setNotice('The finalized revision or mapping changed. Refresh and review again.');return;}if(!response.ok)throw new Error();const verified=await verifyExportReply(await response.json(),command);if(current!==generation.current.value)return;setResult(verified);setRetry(null);setNotice('Files verified. Download the mapped CSV and its canonical time record.');}catch{if(current===generation.current.value)setNotice('The export outcome is unconfirmed. Retry this same generation to retrieve its receipt.');}finally{if(current===generation.current.value)setBusy(false);}
 };
 const save=async()=>{
  if(busy||!cards)return;
  let command;try{const profile=parseExportProfile({...draft,reviewedTimeBasis:reviewed});command=saveRetry.current??{operationId:crypto.randomUUID(),id:saved?.id??crypto.randomUUID(),expectedRevision:saved?.revision??0,profile};}catch(error){setNotice(error instanceof Error?error.message:'Check the mapping profile');return;}
  saveRetry.current=command;setBusy(true);setNotice('');setResult(null);const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export/profiles',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){saveRetry.current=null;setCards(null);setProfiles([]);setDraft(neutralProfile());setState('Export access ended');return;}if(response.status===409){saveRetry.current=null;setNotice('The mapping changed. Refresh and review its latest revision.');return;}if(!response.ok)throw new Error();const body=await response.json();if(body?.state!=='saved'||!body.profile)throw new Error();const item={...body.profile,profile:parseExportProfile(body.profile.profile)} as SavedExportProfile;setProfiles(p=>[...p.filter(p=>p.id!==item.id),item]);setProfileId(item.id);setDraft(item.profile);saveRetry.current=null;setNotice(`Mapping saved as revision ${item.revision}.`);}catch{if(current===generation.current.value)setNotice('Mapping save is unconfirmed. Save again to retry the same command.');}finally{if(current===generation.current.value)setBusy(false);}
 };
 const generate=()=>{try{if(!cards||selected.length===0)throw new Error('Choose finalized employees');const chosen=selected.map(id=>cards.find(c=>c.card.employeeId===id)!);if(chosen.some(c=>c.state!=='FINALIZED'))throw new Error('Every selected card must be finalized');void send({...period,operationId:crypto.randomUUID(),profileId:saved?.id??null,profileRevision:saved?.revision??0,cards:chosen.map(c=>({employeeId:c.card.employeeId,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}))});}catch(error){setNotice(error instanceof Error?error.message:'Review the export');}};
 const periodChanged=draftPeriod.startDate!==period.startDate||draftPeriod.endDate!==period.endDate;
 const chosen=cards?.filter(c=>selected.includes(c.card.employeeId))??[];
 const finalized=cards?.filter(c=>c.state==='FINALIZED')??[];
 const recorded=chosen.reduce((sum,c)=>sum+BigInt(c.card.recordedNanoseconds),BigInt(0)).toString();
 const breaks=chosen.reduce((sum,c)=>sum+BigInt(c.card.breakNanoseconds),BigInt(0)).toString();
 const locked=busy||retry!==null;
 return <div className={styles.root}>
  <section className={`${styles.card} ${styles.periodCard}`} aria-labelledby="payroll-period-title">
   <div className={styles.sectionHeading}><span className={styles.sectionIcon}><CalendarDotsIcon size={21} aria-hidden="true" /></span><div><h2 id="payroll-period-title">Pay period</h2><p>Choose up to 31 days of finalized time.</p></div></div>
   <form className={styles.toolbar} onSubmit={e=>{e.preventDefault();try{setPeriod(parsePeriod(draftPeriod.startDate,draftPeriod.endDate));setNotice('');}catch{setNotice('Choose a period of 1 to 31 days.');}}}>
    <label><span>Period start</span><input type="date" required value={draftPeriod.startDate} disabled={locked} onChange={e=>setDraftPeriod({...draftPeriod,startDate:e.target.value})} /></label>
    <label><span>Period end</span><input type="date" required value={draftPeriod.endDate} disabled={locked} onChange={e=>setDraftPeriod({...draftPeriod,endDate:e.target.value})} /></label>
    <button type="submit" className={`${styles.button} ${styles.primary}`} disabled={locked}>View finalized time<ArrowRightIcon size={18} aria-hidden="true" /></button>
    <button type="button" className={styles.button} disabled={locked} onClick={()=>reload.current()}><ArrowClockwiseIcon size={18} aria-hidden="true" />Refresh export data</button>
   </form>
   {periodChanged&&<p className={styles.periodHint}>Dates changed. View finalized time to review this period before generating an export.</p>}
  </section>
  {notice&&<div className={styles.notice} role="status"><InfoIcon size={20} aria-hidden="true" /><p>{notice}</p></div>}
  {state!=='ready'?<section className={`${styles.card} ${styles.stateCard}`} role="status"><span className={styles.stateIcon}><ClockIcon size={30} weight="duotone" aria-hidden="true" /></span><h2>{state}</h2><p>{state==='Loading finalized time'?'Loading the current timecards and saved mapping profiles.':'Refresh export data when access and your connection are available.'}</p></section>:<>
   <div className={styles.workspace}>
    <section className={`${styles.card} ${styles.employeeCard}`} aria-labelledby="payroll-employees-title">
     <div className={styles.sectionHeading}><span className={styles.sectionIcon}><UsersThreeIcon size={22} aria-hidden="true" /></span><div><h2 id="payroll-employees-title">Choose finalized employees</h2><p>{dateLabel(period.startDate)} – {dateLabel(period.endDate)}</p></div><span className={styles.count}>{finalized.length} ready</span></div>
     <div className={styles.selectionBar}><span>{selected.length} selected{finalized.length>100?' · up to 100 per export':''}</span><div><button type="button" className={styles.textButton} disabled={locked||finalized.length===0} onClick={()=>{setSelected(finalized.slice(0,100).map(c=>c.card.employeeId));setResult(null);}}>Select finalized</button><button type="button" className={styles.textButton} disabled={locked||selected.length===0} onClick={()=>{setSelected([]);setResult(null);}}>Clear</button></div></div>
     {cards?.length===0?<div className={styles.empty}><UsersThreeIcon size={32} weight="duotone" aria-hidden="true" /><h3>No employees in this period</h3><p>Choose another period and view finalized time.</p></div>:<div className={styles.employeeList}>
      <div className={styles.tableHeading} aria-hidden="true"><span>Employee</span><span>Recorded</span><span>Breaks</span></div>
      {cards?.map(c=><label className={`${styles.employee} ${c.state!=='FINALIZED'?styles.unavailable:''}`} key={c.card.employeeId}>
       <input type="checkbox" aria-label={`Select ${c.card.employeeName}`} disabled={c.state!=='FINALIZED'||locked||(!selected.includes(c.card.employeeId)&&selected.length>=100)} checked={selected.includes(c.card.employeeId)} onChange={e=>{setSelected(ids=>e.target.checked?[...ids,c.card.employeeId]:ids.filter(id=>id!==c.card.employeeId));setResult(null);}} />
       <span className={styles.employeeIdentity}><strong>{c.card.employeeName}</strong><small><span className={c.state==='FINALIZED'?styles.finalized:styles.status}>{c.state==='FINALIZED'&&<CheckCircleIcon size={12} weight="fill" aria-hidden="true" />}{c.state.toLowerCase().replaceAll('_',' ')}</span><span className={styles.revision}>Rev. {c.revision}</span></small></span>
       <span className={styles.hours}><small>Recorded</small>{formatRecordedHours(c.card.recordedNanoseconds)}</span><span className={styles.hours}><small>Breaks</small>{formatRecordedHours(c.card.breakNanoseconds)}</span>
      </label>)}
     </div>}
     {cards&&cards.length>0&&finalized.length<cards.length&&<p className={styles.employeeFootnote}>Only finalized timecards can be selected. Review other timecards in <a href="/app/timecards">Timecards</a>.</p>}
    </section>
    <section className={`${styles.card} ${styles.exportCard}`} aria-labelledby="payroll-export-title">
     <div className={styles.sectionHeading}><span className={`${styles.sectionIcon} ${styles.exportIcon}`}><FileCsvIcon size={23} weight="duotone" aria-hidden="true" /></span><div><h2 id="payroll-export-title">Export summary</h2><p>Review your selection and file mapping.</p></div></div>
     <dl className={styles.totals}><div><dt>Selected employees</dt><dd>{selected.length}<span> / {finalized.length} ready</span></dd></div><div><dt>Recorded time</dt><dd>{formatRecordedHours(recorded)}</dd></div><div><dt>Separate break total</dt><dd>{formatRecordedHours(breaks)}</dd></div></dl>
     <p className={styles.timeBasis}><InfoIcon size={17} aria-hidden="true" /><span>Recorded elapsed time includes breaks. Pay classification and processing take place in your payroll system.</span></p>
     <label><span>Mapping profile</span><span className={styles.selectFrame}><select aria-label="Mapping profile" value={profileId} disabled={locked} onChange={e=>{setProfileId(e.target.value);const p=profiles.find(p=>p.id===e.target.value)?.profile??neutralProfile();setDraft(p);setReviewed(false);setResult(null);}}><option value="neutral">NEVORA normalized time CSV</option>{profiles.map(p=><option key={p.id} value={p.id}>{p.profile.name} · revision {p.revision}</option>)}</select></span></label>
     {saved?<details className={styles.mappingInfo}><summary>Mapping details</summary><p className={styles.note}>{saved.profile.product} · {saved.profile.precision==='HALF_UP'?'Explicit half-up rounding':'Reject precision loss'} · {saved.profile.verifiedRequirements}</p></details>:<p className={styles.note}>Exact durations and finalized-source references. This file has no provider compatibility claim.</p>}
     <button type="button" className={`${styles.button} ${styles.primary} ${styles.generate}`} disabled={locked||selected.length===0||periodChanged} onClick={generate}>Generate reviewed export<ArrowRightIcon size={18} aria-hidden="true" /></button>
     <p className={styles.actionHint}>{busy?'Preparing your request…':retry?'Retry to confirm the outcome of this export.':periodChanged?'View finalized time for your updated dates.':selected.length===0?'Select finalized employees to prepare your files.':'Creates a mapped CSV and canonical time record.'}</p>
     {retry&&<button type="button" className={`${styles.button} ${styles.generate}`} disabled={busy} onClick={()=>retry&&void send(retry)}><ArrowClockwiseIcon size={18} aria-hidden="true" />Retry same export</button>}
    </section>
   </div>
   {result&&<section className={`${styles.card} ${styles.files}`} aria-labelledby="payroll-files-title">
    <div className={styles.sectionHeading}><span className={styles.verifiedIcon}><CheckCircleIcon size={24} weight="duotone" aria-hidden="true" /></span><div><h2 id="payroll-files-title">Your files are ready</h2><p>Verified export for {result.model.rows.length} employees. Download both files for your records.</p></div></div>
    <div className={styles.fileGrid}><button type="button" className={styles.download} onClick={()=>download(result.csv,'text/csv;charset=utf-8',`nevora-mapped-${result.model.period.startDate}-${result.operationId}.csv`)}><FileCsvIcon size={28} weight="duotone" aria-hidden="true" /><span><strong>Download mapped CSV</strong><small>{result.profile.name}{result.profileRevision>0?` · Rev. ${result.profileRevision}`:''}</small></span><DownloadSimpleIcon size={20} aria-hidden="true" /></button><button type="button" className={styles.download} onClick={()=>download(stableExportJson(result.model),'application/json',`nevora-canonical-${result.model.period.startDate}-${result.operationId}.json`)}><FileCodeIcon size={28} weight="duotone" aria-hidden="true" /><span><strong>Download canonical time record</strong><small>Exact durations and source references · JSON</small></span><DownloadSimpleIcon size={20} aria-hidden="true" /></button></div>
    <details className={styles.receipt}><summary>Export receipt &amp; verification</summary><dl><div><dt>Receipt</dt><dd>{result.operationId}</dd></div><div><dt>CSV SHA-256</dt><dd>{result.csvSha256}</dd></div></dl></details>
   </section>}
   <PayrollExportMapping draft={draft} setDraft={setDraft} cards={cards??[]} reviewed={reviewed} setReviewed={setReviewed} disabled={locked} save={()=>void save()} />
  </>}
 <PayrollPeriodClose period={period} actorId={actorId}/>
 </div>;
}
