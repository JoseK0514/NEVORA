'use client';
import { usePortalLang } from '@/lib/i18n/portal-lang';
import { formatPortalCopy } from '@/lib/i18n/format-portal-copy';
import { copy } from './payroll-export-copy';
import {CompactActionLabel} from './compact-action-label';
import { copy as receiptCopy } from './payroll-export-receipts-copy';
import { isPayrollExportDisabled, payrollExportAvailability } from './payroll-export-availability';
import {PayrollPeriodClose} from './payroll-period-close';
import {useCallback,useEffect,useRef,useState} from 'react';
import {CalendarBlankIcon} from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import {CaretRightIcon} from '@phosphor-icons/react/dist/ssr/CaretRight';
import {CorpNav,CorpTitle} from './corp/corp';
import {BSegs,BState} from './owner-b/b-kit';
import './payroll/payroll-corp.css';
import {neutralProfile,parseExportProfile,type ExportProfile} from '@/lib/payroll-export/model';
import {type TimecardItem} from '@/lib/timecards/read-model';
import {summarizeTimecardReview} from '@/lib/timecards/review-summary';
import {parseCurrentTimecards} from '@/lib/timecards/client';
import {parsePeriod,type Period} from '@/lib/timecards/project';
import {runsCopy} from './payroll/copy/runs';
import {periodRange, payDay} from './payroll/payroll-format';
import {durationRow,durationSentence,minutesFromNanoseconds} from '@/lib/duration-format';
import {addDays} from '@/lib/date-utils';
import type {ExportCommand,PayrollExportPayload,SavedExportProfile} from '@/lib/payroll-export/service';
import {verifyExportReply} from '@/lib/payroll-export/client';
import {stableExportJson} from '@/lib/payroll-export/json';
import {selectVisibleFinalized,changeExportSelection} from '@/lib/payroll-export/selection';
import {PayrollExportMapping} from './payroll-export-mapping';
import {PayrollExportReceipts} from './payroll-export-receipts';
import {PayrollTabs,type PayrollTab} from './payroll/payroll-tabs';
import {payrollImportCopy} from './payroll-import/copy';
function download(text:string,type:string,name:string){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
// parseExportProfile reports local validation failures. Provider responses and file contents are passed through.
const mappingFailureKeys = new Map<string, keyof typeof copy.en>([
  [copy.en.verifyTheImportRequirementsFieldsAndTimeBasis, 'verifyTheImportRequirementsFieldsAndTimeBasis'],
  [copy.en.invalidImportColumn, 'invalidImportColumn'],
  [copy.en.invalidProviderEmployeeIdentifier, 'invalidProviderEmployeeIdentifier'],
  [copy.en.duplicateImportColumnOrEmployeeIdentifier, 'duplicateImportColumnOrEmployeeIdentifier'],
  [copy.en.runGenericV1ColumnsOrFormatsDoNotMatch, 'runGenericV1ColumnsOrFormatsDoNotMatch'],
  [copy.en.verifyRUNCompanyFrequencyEmployeeEarningsDepartmentAndRateCodes, 'verifyRUNCompanyFrequencyEmployeeEarningsDepartmentAndRateCodes'],
]);
function mappingFailure(error: unknown, lang: keyof typeof copy) {
  if (!(error instanceof Error)) return copy[lang].checkTheMappingProfile;
  const key = mappingFailureKeys.get(error.message);
  return key ? copy[lang][key] : error.message;
}

type ProfileCommand={operationId:string;id:string;expectedRevision:number;profile:ExportProfile};
function payrollSourceKey(cards:readonly TimecardItem[],profiles:readonly SavedExportProfile[]){
 // projectTimecard stamps each current card with this read's observation time.
 // Compare every source/projected/history fact except that one clock field.
 const comparableCards=cards.map(item=>({...item,card:Object.fromEntries(Object.entries(item.card).filter(([key])=>key!=='observedAt'))}));
 return stableExportJson({cards:comparableCards,profiles});
}
const englishDayText=(value:string)=>{try{return new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T12:00:00Z`));}catch{return '';}};
const utcDay=(value:string)=>new Date(`${value}T12:00:00Z`);
const isoDay=(date:Date)=>date.toISOString().slice(0,10);
/** OW-003: recorded time through the shared formatters. A sentence reads "24 h 7 min"; a figure in the people column
 * reads "24 h 07", as the Timecards table does. Zero is "0 h", as it was. */
const written=(nanoseconds:string,write:(minutes:number,zero:string)=>string)=>{const minutes=minutesFromNanoseconds(nanoseconds);return minutes===null?'—':write(minutes,'0 h');};
const hoursText=(nanoseconds:string)=>written(nanoseconds,durationSentence);
const hoursFigure=(nanoseconds:string)=>written(nanoseconds,durationRow);
/** "Oct 19–25", or "Sep 28–Oct 4" (Payroll's one period format, R2). */
type ExportLang = keyof typeof copy;
/** This week and the five before it, Monday to Sunday, counted from the page's default week. */
function weekChoices(lang: ExportLang){
 const today=new Date();const base=utcDay(isoDay(new Date(Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))));
 const monday=new Date(base.getTime()-((base.getUTCDay()+6)%7)*86_400_000);
 const names=lang==='es'?['esta semana','semana pasada']:['this week','last week'];
 const weeks=Array.from({length:6},(_,i)=>{const start=new Date(monday.getTime()-i*7*86_400_000),end=new Date(start.getTime()+6*86_400_000);const s=isoDay(start),e=isoDay(end);return {value:`${s}|${e}`,label:`${periodRange(s,e,lang)}${names[i]?` (${names[i]})`:''}`};});
 return weeks;
}
/** AR-4 (Nov 14 inspection): Payroll's "Choose who’s included" opens this page at #who-is-included (payroll-runs.tsx
 * builds the link); the section then opens and scrolls into view instead of waiting, collapsed, at the bottom, and a
 * phone shows the list at once. Its own component, so the page keeps its one effect (the timecards read). */
const INCLUDED_HASH='who-is-included';
function IncludedSection({payroll,period,actorId,exportsDisabled,onExportsDisabled}:{payroll:boolean;period:Period;actorId:string;exportsDisabled:boolean;onExportsDisabled:()=>void}){
  const lang = usePortalLang();
  const wording = copy[lang];
 const sectionTitle=exportsDisabled?payrollExportAvailability[lang].history:payroll?wording.whoSIncludedAndSentFiles:wording.exportHistory;
 const section=useRef<HTMLDetailsElement>(null),[fromBlocker,setFromBlocker]=useState(false);
 useEffect(()=>{
  const openIncluded=()=>{
   if(window.location.hash!==`#${INCLUDED_HASH}`)return;
   setFromBlocker(true);
   const details=section.current;if(!details)return;
   details.open=true;
   requestAnimationFrame(()=>{details.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});details.querySelector<HTMLElement>('summary')?.focus({preventScroll:true});});
  };
  openIncluded();window.addEventListener('hashchange',openIncluded);
  return()=>window.removeEventListener('hashchange',openIncluded);
 },[]);
 return <section className="c-card c-exp__included" id={INCLUDED_HASH} aria-label={sectionTitle}>
  <details ref={section} className="c-exp__item c-exp__close"><summary className="c-row"><span className="c-row__main"><span className="c-row__title">{sectionTitle}</span><span className="c-row__detail"><span>{exportsDisabled?payrollExportAvailability[lang].historyLine:payroll?wording.peopleInThisPayrollAndWhereFilesWent:wording.filesYouVeDownloaded}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
   <div className="c-exp__legacy"><PayrollPeriodClose exportsDisabled={exportsDisabled} onExportsDisabled={onExportsDisabled} period={period} actorId={actorId} startOpen={fromBlocker}/></div>
  </details>
 </section>;
}
/** Final polish (Nov 21, 2026): the verified export replaces the form it came from, so focus goes to the result's title
 * when it arrives (the title is then what is read). A stable callback ref: it runs once when the title mounts and never on
 * a later render, and the page keeps its one effect (the timecards read). */
const focusOnArrive=(node:HTMLElement|null)=>{node?.focus({preventScroll:true});};
export function PayrollExport({initialPeriod,actorId,tabs=null,today,exportsDisabled=false,timeZone}:{initialPeriod:Period;exportsDisabled?:boolean;timeZone?:string;actorId:string;tabs?:PayrollTab[]|null;
 /** MG-010: the workspace's date, so a week that has not ended says when its timecards can be approved. */
 today?:string}){
  const lang = usePortalLang();
  const wording = copy[lang];
  const dayText = (date: string) => lang === 'es' ? payDay(date, lang) : englishDayText(date);
  const rangeText = (start: string, end: string) => periodRange(start, end, lang);
const FILES_READY=wording.filesReadyDownloadTheCSVAndItsTimeRecord;

 const [period,setPeriod]=useState(initialPeriod),[draftPeriod,setDraftPeriod]=useState(initialPeriod),[cards,setCards]=useState<TimecardItem[]|null>(null),[profiles,setProfiles]=useState<SavedExportProfile[]>([]),[profileId,setProfileId]=useState('neutral'),[draft,setDraft]=useState<ExportProfile>(neutralProfile),[reviewed,setReviewed]=useState(false),[selected,setSelected]=useState<string[]>([]),[state,setState]=useState<string>(wording.loadingFinalizedTime),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[result,setResult]=useState<PayrollExportPayload|null>(null);
 const [retry,setRetry]=useState<ExportCommand|null>(null),[snapshotActor,setSnapshotActor]=useState<string|null>(null);
 const saveRetry=useRef<ProfileCommand|null>(null),generation=useRef({value:0}),abort=useRef<AbortController|null>(null),reload=useRef<()=>void>(()=>{});
 const mutating=useRef(false),cancelRefresh=useRef<()=>void>(()=>{}),acceptSavedProfile=useRef<(item:SavedExportProfile)=>void>(()=>{});
 const [receiptsKey,setReceiptsKey]=useState(0);
 const previousActor=useRef(actorId),validUntil=useRef(0),clearProtected=useRef<(message:string,denied?:boolean)=>void>(()=>{});
 const [launchRefused,setLaunchRefused]=useState(false);
 const disabled=exportsDisabled||launchRefused;
 const onExportsDisabled=useCallback(()=>{clearProtected.current('',true);setLaunchRefused(true);},[]);
 const headers={'content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':actorId};
 useEffect(()=>{
  if(disabled)return;
  if(previousActor.current!==actorId){setRetry(null);saveRetry.current=null;}previousActor.current=actorId;
  let active=true,focused=true,reading=false,readSequence=0,sourceKey:string|null=null;
  let sourceSnapshot:{cards:TimecardItem[];profiles:SavedExportProfile[]}|null=null;let expiry:ReturnType<typeof setTimeout>|undefined,early:ReturnType<typeof setTimeout>|undefined;const lifecycle=generation.current,pendingSave=saveRetry;
  cancelRefresh.current=()=>{readSequence++;reading=false;abort.current?.abort();};
  const clear=(message:string,denied=false)=>{generation.current.value++;cancelRefresh.current();sourceKey=null;sourceSnapshot=null;mutating.current=false;if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);expiry=early=undefined;validUntil.current=0;setSnapshotActor(null);setCards(null);setProfiles([]);setProfileId('neutral');setSelected([]);setResult(null);setDraft(neutralProfile());setReviewed(false);setState(message);setNotice('');setBusy(false);if(denied){setRetry(null);saveRetry.current=null;}};
  clearProtected.current=clear;
  acceptSavedProfile.current=item=>{
   if(!active||!sourceSnapshot||performance.now()>=validUntil.current){clear(wording.thisExportIsOutOfDateRefreshToStartAgain);throw Error('Expired mapping receipt');}
   // The service returns this command's immutable saved revision, not an
   // arbitrary latest head. Advance only these verified profile facts, never
   // the cards, original server authority deadline or another profile.
   const profiles=[...sourceSnapshot.profiles.filter(p=>p.id!==item.id),item].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
   sourceSnapshot={...sourceSnapshot,profiles};sourceKey=payrollSourceKey(sourceSnapshot.cards,profiles);
  };
  const load=async(background=false)=>{
   if(background&&(reading||mutating.current))return;
   const preserve=background&&sourceKey!==null&&performance.now()<validUntil.current;
   if(!preserve)clear((navigator.onLine ? wording.loadingFinalizedTime : wording.exportsUnavailableOffline));if(!navigator.onLine||document.visibilityState==='hidden'||!focused)return;
   const current=generation.current.value,sequence=++readSequence,started=performance.now();reading=true;abort.current=new AbortController();
   try{
    // Either denied response retires retained data immediately, even if its
    // paired request has not returned headers or completed body parsing.
    const observe=(request:Promise<Response>,profile=false)=>request.then(async response=>{
     if(active&&current===generation.current.value&&sequence===readSequence&&(response.status===401||response.status===403)){
      // Retire the display immediately. A profile refusal's body distinguishes launch policy from lost access.
      const refusal=profile&&response.status===403?abort.current:null;
      if(refusal)abort.current=null;
      clear(wording.exportAccessEnded,true);
      if(refusal){
       const retired=generation.current.value,timeout=setTimeout(()=>refusal.abort(),15000);
       try{if(isPayrollExportDisabled(response.status,await response.json().catch(()=>null))&&active&&retired===generation.current.value)onExportsDisabled();}
       finally{clearTimeout(timeout);refusal.abort();}
      }
     }
     return response;
    });
    const responses=await Promise.all([observe(fetch('/api/timecards',{method:'POST',cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actorId},body:JSON.stringify(period)})),observe(fetch('/api/payroll-export/profiles',{cache:'no-store',credentials:'same-origin',signal:abort.current.signal,headers:{'x-nevora-payroll-export':'1','x-nevora-actor':actorId}}),true)]);
    if(!active||current!==generation.current.value||sequence!==readSequence)return;
    if(responses.some(r=>r.status===401||r.status===403)){clear(wording.exportAccessEnded,true);return;}
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
     if(preserve&&performance.now()>=validUntil.current){clear(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}
     if(preserve&&nextSource!==sourceKey)clear(wording.loadingFinalizedTime);
     if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);sourceSnapshot={cards:parsed.cards,profiles:verified};sourceKey=nextSource;validUntil.current=deadline;
     expiry=setTimeout(()=>clear(wording.thisExportIsOutOfDateRefreshToStartAgain),remaining);
     // A fresh paired projection may replace this lease. Merely starting it
     // never moves the original expiry or renews retained drafts/downloads.
     early=setTimeout(()=>void load(true),remaining*.65);
     setSnapshotActor(actorId);setCards(parsed.cards);setProfiles(verified);setState('ready');
    }
   }catch{if(active&&current===generation.current.value&&sequence===readSequence)clear(wording.exportsUnavailable);}
   finally{if(sequence===readSequence)reading=false;}
  };
  reload.current=()=>{void load();};void load();
  const refresh=(event?:Event)=>{if(event?.type==='focus'&&(event.target!==window||focused))return;focused=true;if(document.visibilityState!=='hidden')void load();},offline=()=>{focused=false;clear(wording.exportsUnavailableOffline);},hide=(event?:Event)=>{if(event?.type==='blur'&&event.target!==window)return;focused=false;clear(wording.exportsPaused);},visible=()=>document.visibilityState==='hidden'?hide():refresh();
  const account=()=>{setRetry(null);saveRetry.current=null;refresh();};
  window.addEventListener('focus',refresh);window.addEventListener('blur',hide);window.addEventListener('pageshow',refresh);window.addEventListener('storage',account);window.addEventListener('online',refresh);window.addEventListener('offline',offline);window.addEventListener('pagehide',hide);document.addEventListener('visibilitychange',visible);
  const poll=setInterval(()=>{if(focused&&document.visibilityState==='visible'&&navigator.onLine)void load(true);},30000);
  return()=>{active=false;lifecycle.value++;abort.current?.abort();if(expiry)clearTimeout(expiry);if(early)clearTimeout(early);clearInterval(poll);validUntil.current=0;clearProtected.current=()=>{};cancelRefresh.current=()=>{};acceptSavedProfile.current=()=>{};sourceSnapshot=null;mutating.current=false;pendingSave.current=null;window.removeEventListener('focus',refresh);window.removeEventListener('blur',hide);window.removeEventListener('pageshow',refresh);window.removeEventListener('storage',account);window.removeEventListener('online',refresh);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',hide);document.removeEventListener('visibilitychange',visible);};
 },[period,actorId,wording,disabled,onExportsDisabled]);
 const currentActor=snapshotActor===actorId;
 const downloadCurrent=async(file:'csv'|'record')=>{
  if(!currentActor||performance.now()>=validUntil.current){clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}
  if(!result||disabled||mutating.current)return;
  const current=generation.current.value,stillCurrent=()=>current===generation.current.value&&performance.now()<validUntil.current;
  mutating.current=true;setBusy(true);
  try{
   const response=await fetch('/api/payroll-export/receipts',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify({operationId:result.operationId})});
   const body=await response.json().catch(()=>null);
   if(!stillCurrent())return;
   if(isPayrollExportDisabled(response.status,body)){onExportsDisabled();return;}
   if(response.status===401||response.status===403){clearProtected.current(wording.exportAccessEnded,true);return;}
   if(!response.ok||body?.state!=='ready'||body.export?.operationId!==result.operationId||body.export.csvSha256!==result.csvSha256||body.export.canonicalSha256!==result.canonicalSha256)throw Error();
   // The local bytes were independently verified when this result arrived. A fresh receipt authorizes saving those exact bytes.
   if(file==='csv')download(result.csv,'text/csv;charset=utf-8',`nevora-mapped-${result.model.period.startDate}-${result.operationId}.csv`);
   else download(stableExportJson(result.model),'application/json',`nevora-canonical-${result.model.period.startDate}-${result.operationId}.json`);
  }catch{if(stillCurrent())setNotice(receiptCopy[lang].theFileDidnTDownloadTryAgain);}
  finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const saved=profiles.find(p=>p.id===profileId);
 const send=async(command:ExportCommand)=>{
  if(!currentActor){clearProtected.current(wording.exportAccessEnded,true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');setResult(null);setRetry(command);const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current(wording.exportAccessEnded,true);
    const retired=generation.current.value;
    if(response.status===403&&isPayrollExportDisabled(response.status,await response.json().catch(()=>null))&&retired===generation.current.value)onExportsDisabled();
    return;}
   if(response.status===400){
    const body=await response.json().catch(()=>null);
    if(current!==generation.current.value)return;
    if(body?.state==='invalid'&&body.reason==='PERIOD_BOUNDARY_MISMATCH'){
     setRetry(null);setNotice(payrollExportAvailability[lang].boundary(rangeText(period.startDate,period.endDate),timeZone??cards[0]?.card.timeZone??'UTC'));return;
    }
   }
   if(response.status===409){
    setRetry(null);
    const body=await response.json().catch(()=>null);
    if(current!==generation.current.value)return;
    if(performance.now()>=validUntil.current){clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}
    setNotice((body?.state==='already_generated' ? wording.thisTimeRecordAndCSVHaveAlreadyBeenExportedUse : wording.theTimecardsOrTheFileFormatChangedRefreshAndCheck));return;
   }
   if(!response.ok)throw new Error();const verified=await verifyExportReply(await response.json(),command);if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}setResult(verified);setReceiptsKey(key=>key+1);setRetry(null);setNotice(FILES_READY);}catch{if(current===generation.current.value)setNotice(wording.weCouldnTConfirmTheExportTryAgainItWon);}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const save=async()=>{
  if(!currentActor){clearProtected.current(wording.exportAccessEnded,true);return;}
  if(mutating.current||busy||!cards||performance.now()>=validUntil.current){if(performance.now()>=validUntil.current)clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}
  let command;try{const profile=parseExportProfile({...draft,reviewedTimeBasis:reviewed});command=saveRetry.current??{operationId:crypto.randomUUID(),id:saved?.id??crypto.randomUUID(),expectedRevision:saved?.revision??0,profile};}catch(error){setNotice(mappingFailure(error,lang));return;}
  saveRetry.current=command;cancelRefresh.current();mutating.current=true;setBusy(true);setNotice('');const current=generation.current.value;
  try{const response=await fetch('/api/payroll-export/profiles',{method:'POST',cache:'no-store',credentials:'same-origin',headers,body:JSON.stringify(command)});if(current!==generation.current.value)return;if(response.status===401||response.status===403){clearProtected.current(wording.exportAccessEnded,true);
    const retired=generation.current.value;
    if(response.status===403&&isPayrollExportDisabled(response.status,await response.json().catch(()=>null))&&retired===generation.current.value)onExportsDisabled();
    return;}if(response.status===409){saveRetry.current=null;setNotice(wording.theFileFormatChangedRefreshToSeeTheLatest);return;}if(!response.ok)throw new Error();const body=await response.json();if(current!==generation.current.value)return;if(performance.now()>=validUntil.current){clearProtected.current(wording.thisExportIsOutOfDateRefreshToStartAgain);return;}if(body?.state!=='saved'||!body.profile)throw new Error();const item={id:body.profile.id,revision:body.profile.revision,profile:parseExportProfile(body.profile.profile)} as SavedExportProfile;if(item.id!==command.id||!Number.isSafeInteger(item.revision)||item.revision!==command.expectedRevision+1||stableExportJson(item.profile)!==stableExportJson(command.profile))throw Error('Unverified mapping receipt');acceptSavedProfile.current(item);setProfiles(p=>[...p.filter(p=>p.id!==item.id),item]);setProfileId(item.id);setDraft(item.profile);saveRetry.current=null;setNotice(formatPortalCopy(wording.mappingSavedAsRevisionRevision, { revision: item.revision }));}catch{if(current===generation.current.value)setNotice(wording.weCouldnTConfirmTheFileFormatWasSavedSave);}finally{if(current===generation.current.value){mutating.current=false;setBusy(false);}}
 };
 const visibleSelection=selectVisibleFinalized(cards??[]);
 const generate=(ids:string[]=selected)=>{try{if(!cards||ids.length===0||ids.length>100)throw new Error(wording.choose1To100FinalizedEmployees);const chosen=ids.map(id=>cards.find(c=>c.card.employeeId===id)!);if(chosen.some(c=>!c||c.state!=='FINALIZED'))throw new Error(wording.everySelectedCardMustBeFinalized);void send({...period,operationId:crypto.randomUUID(),profileId:saved?.id??null,profileRevision:saved?.revision??0,cards:chosen.map(c=>({employeeId:c.card.employeeId,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}))});}catch(error){setNotice(error instanceof Error?error.message:wording.reviewTheExport);}};
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
  let parsed:Period;try{parsed=parsePeriod(next.startDate,next.endDate);}catch{setNotice(wording.chooseAPeriodOf1To31Days);return;}
  if(parsed.startDate===period.startDate&&parsed.endDate===period.endDate)return;
  if(mutating.current||retry!==null||saveRetry.current!==null){setNotice(wording.finishOrRetryTheCurrentExportBeforeChangingThePeriod);return;}
  setNotice('');clearProtected.current(wording.loadingFinalizedTime);setPeriod(parsed);
 };
 const ready=state==='ready'&&currentActor;
 const exportAll=()=>{const ids=visibleSelection.selected;setSelected(ids);setResult(null);generate(ids);};
 const stateText=state===wording.loadingFinalizedTime?wording.loadingTimecards:state==='ready'?wording.checkingExportAccess:state;
 const reviewSummary=ready&&cards?summarizeTimecardReview({period,cards}):null;
 const approvedOnly=reviewSummary?.counts.awaitingFinalization??0;
 const unapproved=reviewSummary?.counts.awaitingApproval??0;
 const readyHours=finalized.reduce((sum,c)=>sum+BigInt(c.card.recordedNanoseconds),BigInt(0)).toString();
 // R7: what to do next, in grey with the way to Timecards. BR-2 (Nov 14 inspection): export takes finalized timecards
 // only, and a timecard is approved (step 1) and then finalized (step 2), so the step export is missing, finalizing, is
 // always named: "Approve, then finalize 10 timecards first" (it read "Approve 10 timecards first").
 const notFinal=unapproved+approvedOnly;
 const waiting=unapproved?((approvedOnly ? (unapproved===1 ? formatPortalCopy(wording.approveUnapprovedTimecardThenFinalizeNotFinalFirstOne, { unapproved, notFinal }) : formatPortalCopy(wording.approveUnapprovedTimecardThenFinalizeNotFinalFirstOther, { unapproved, notFinal })) : (unapproved===1 ? formatPortalCopy(wording.approveThenFinalizeUnapprovedTimecardFirstOne, { unapproved }) : formatPortalCopy(wording.approveThenFinalizeUnapprovedTimecardFirstOther, { unapproved })))):approvedOnly?(approvedOnly===1 ? formatPortalCopy(wording.finalizeApprovedOnlyApprovedTimecardFirstOne, { approvedOnly }) : formatPortalCopy(wording.finalizeApprovedOnlyApprovedTimecardFirstOther, { approvedOnly })):'';
 // MG-010: one line says the one thing in the way. While the week is still open nobody can approve yet, so the line says
 // when they can (Timecards' own date); once it has ended the line names the steps left, as before.
 const notYet=!!today&&period.endDate>=today&&unapproved>0;
 // Batch 1 item 5: the Week field names the period, so the line doesn't repeat it; without Payroll the back link is Timecards.
 const waitingLine=notYet?formatPortalCopy(wording.timecardsCanBeApprovedFromEndDate, { endDate: dayText(addDays(period.endDate,1)) }):waiting;
 const weeks=weekChoices(lang);
 const periodKey=`${period.startDate}|${period.endDate}`;
 const listed=weeks.some(w=>w.value===periodKey);
 const create=()=>{if(selected.length){setResult(null);generate();}else exportAll();};
 const chooseProfile=(id:string)=>{setProfileId(id);const p=profiles.find(p=>p.id===id)?.profile??neutralProfile();setDraft(p);setReviewed(false);setResult(null);};
 const timecardsHref=`/app/timecards?start=${period.startDate}&end=${period.endDate}`;
 // Someone without payroll (a Manager) reaches Time exports from Timecards: the way back goes there, and the page isn't drawn
 // as a money page (its sidebar entry is Time).
 const payroll=!!tabs?.length;
 // The verified export, for as long as this snapshot holds it (the files were listed under the same condition).
 const shown=ready&&result?result:null;
 // Back to the same form: the result leaves the screen; nothing is requested. Focus goes to the form's heading.
 const anotherExport=()=>{setResult(null);setNotice('');setTimeout(()=>document.getElementById('time-export-send')?.focus(),0);};
 const otherDates=<details className="c-exp__item">
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">{wording.otherDates}</span><span className="c-row__detail"><span>{wording.upTo31Days}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
    <form className="c-exp__body" onSubmit={e=>{e.preventDefault();try{const nextPeriod=parsePeriod(draftPeriod.startDate,draftPeriod.endDate);if(nextPeriod.startDate===period.startDate&&nextPeriod.endDate===period.endDate){if(mutating.current){setNotice(wording.finishTheCurrentOperationBeforeRefreshingExportData);return;}reload.current();}else{if(mutating.current||retry!==null||saveRetry.current!==null){setNotice(wording.finishOrRetryTheCurrentExportOrMappingSaveBefore);return;}clearProtected.current(wording.loadingFinalizedTime);setPeriod(nextPeriod);}setNotice('');}catch{setNotice(wording.chooseAPeriodOf1To31Days);}}}>
     <div className="c-field__row">
      <div className="c-field"><label className="c-field__label" htmlFor="time-export-start">{wording.start}</label><span className="c-in c-pay__date"><span aria-hidden="true">{dayText(draftPeriod.startDate)||wording.chooseADate}</span><CalendarBlankIcon weight="bold" className="c-ic c-ic--s" aria-hidden="true"/><input id="time-export-start" type="date" required value={draftPeriod.startDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,startDate:e.target.value})}/></span></div>
      <div className="c-field"><label className="c-field__label" htmlFor="time-export-end">{wording.end}</label><span className="c-in c-pay__date"><span aria-hidden="true">{dayText(draftPeriod.endDate)||wording.chooseADate}</span><CalendarBlankIcon weight="bold" className="c-ic c-ic--s" aria-hidden="true"/><input id="time-export-end" type="date" required value={draftPeriod.endDate} disabled={busy} onChange={e=>setDraftPeriod({...draftPeriod,endDate:e.target.value})}/></span></div>
     </div>
     {periodChanged&&!disabled?<p className="c-note">{wording.datesChangedShowThemToReviewThisPeriodBeforeExporting}</p>:null}
     <button type="submit" className="c-btn c-btn--secondary c-btn--md c-btn--full" disabled={busy}>{wording.showTheseDates}</button>
    </form>
   </details>;
 return <div className={`c-page c-payroll c-pay c-exp c-page--narrow${payroll?'':' c-exp--time'}`} data-nv-page="" data-corp="" aria-labelledby="time-exports-title">
  <CorpNav back={payroll?{href:'/app/payroll',label:wording.payroll}:{href:'/app/timecards',label:wording.timecards}} title={wording.timeExports} phoneOnly/>
  {/* Phase 2 (G8): with Payroll's tabs (from 768) the band names the section and the selected tab names this page, so
    * "Time exports" isn't said twice; a Manager without the tabs keeps "Time exports". The phone band is unchanged. */}
  <CorpTitle id="time-exports-title" title={(payroll ? wording.payroll : wording.timeExports)} wide/>
  <PayrollTabs items={tabs} current="/app/payroll-export"/>
  <div className="c-field">
   <label className="c-field__label" htmlFor="time-export-period">{wording.week}</label>
   <select id="time-export-period" className="c-in" aria-label={wording.week} value={listed?periodKey:'current'} disabled={busy} onChange={e=>{const [startDate,endDate]=e.target.value.split('|');if(startDate&&endDate)choosePeriod({startDate,endDate});}}>
    {!listed?<option value="current">{rangeText(period.startDate,period.endDate)}</option>:null}
    {weeks.map(w=><option key={w.value} value={w.value}>{w.label}</option>)}
   </select>
  </div>
  {disabled?<div className="c-card">{otherDates}</div>:null}
  {/* Phase 7 (moments): the verified export is the shared done state (below, where the form was); every other notice (not
    * confirmed, already exported, out of date) keeps the plain callout and never the success mark. */}
  {notice&&notice!==FILES_READY?<p className="c-callout c-callout--teal" role="status">{notice}</p>:null}
  {/* R5: section labels sit above their cards. */}
  {disabled?<div className="c-card c-card__body"><BState kind="paused" heading alert={launchRefused} titleRef={launchRefused?focusOnArrive:undefined} title={payrollExportAvailability[lang].title} line={payrollExportAvailability[lang].line}
   action={{label:payrollExportAvailability[lang].period,href:timecardsHref}}/></div>:shown?<section className="c-pay__group c-exp__result" aria-label={wording.exportReady}>
   {/* Final polish (Nov 21, 2026): the result stands where the form stood. Facts are the receipt's own rows; the receipt
     * id, the checksum and the file layout fold under Details; "Make another export" returns to the same form (no request). */}
   <div className="b-done-host b-done-host--card">
    <BState kind="done" heading titleRef={focusOnArrive} title={wording.exportReady} line={<BSegs parts={[runsCopy[lang].people(shown.model.rows.length),<span key="h" className="c-num">{hoursText(shown.model.rows.reduce((sum,row)=>sum+BigInt(row.recordedNanoseconds),BigInt(0)).toString())}</span>,rangeText(shown.model.period.startDate,shown.model.period.endDate)]}/>}
     quiet={<button type="button" className="b-done__quiet" onClick={anotherExport}>{wording.makeAnotherExport}</button>}>
     <div className="c-exp__dls">
      <button type="button" className="b-btn b-btn--teal" disabled={busy} onClick={()=>void downloadCurrent('csv')}>{wording.downloadCSV}</button>
      <button type="button" className="b-btn b-btn--quiet" aria-label={wording.downloadTimeRecordJSON} disabled={busy} onClick={()=>void downloadCurrent('record')}>{wording.downloadTimeRecord}</button>
     </div>
     <details className="c-exp__more c-exp__details"><summary>{wording.details}</summary><dl className="c-exp__receipt"><div><dt>{wording.fileLayout}</dt><dd className="c-exp__plain">{`${shown.profile.name}${shown.profileRevision>0?` · Rev. ${shown.profileRevision}`:''}`}</dd></div><div><dt>{wording.receipt}</dt><dd>{shown.operationId}</dd></div><div><dt>{wording.csvChecksumSHA256}</dt><dd>{shown.csvSha256}</dd></div></dl></details>
    </BState>
   </div>
  </section>
  :<section className="c-pay__group" aria-labelledby="time-export-send">
   <div className="c-sec-label c-pay__sec"><h2 id="time-export-send" tabIndex={-1}>{(profiles.length ? wording.sendTo : wording.file)}</h2></div>
   <div className="c-card">
   {ready?<>
    <ul className="c-rows" aria-label={(profiles.length ? wording.sendTo : wording.file)}>
     {/* R7: with no saved layouts the CSV is a fact, not a one-option choice. */}
     {!profiles.length?<li><div className="c-row c-exp__file"><span className="c-row__main"><span className="c-row__title c-row__title--b">{wording.csvFile}</span><span className="c-row__detail"><span>{wording.opensInExcelOrNumbers}</span></span></span></div></li>:null}
     {profiles.map(p=><li key={p.id}><label className="c-row c-exp__choice"><span className="c-row__main"><span className="c-row__title c-row__title--b">{p.profile.name}</span><span className="c-row__detail"><span>{formatPortalCopy(wording.productRevisionRevision, { product: p.profile.product||wording.savedFileLayout, revision: p.revision })}</span></span></span><input type="radio" name="time-export-profile" value={p.id} checked={profileId===p.id} disabled={locked} onChange={e=>chooseProfile(e.target.value)}/></label></li>)}
     {profiles.length?<li><label className="c-row c-exp__choice"><span className="c-row__main"><span className="c-row__title c-row__title--b">{wording.csvFile}</span><span className="c-row__detail"><span>{wording.opensInExcelOrNumbers}</span></span></span><input type="radio" name="time-export-profile" value="neutral" checked={profileId==='neutral'} disabled={locked} onChange={e=>chooseProfile(e.target.value)}/></label></li>:null}
    </ul>
    <div className="c-exp__ready">
     <b className="c-pay__strong">{finalized.length?<>{(finalized.length===1 ? formatPortalCopy(wording.finalizedcountPersonOne, { finalizedCount: finalized.length }) : formatPortalCopy(wording.finalizedcountPersonOther, { finalizedCount: finalized.length }))}<span className="c-num">{hoursText(readyHours)}</span></>:wording.nothingReadyToExportYet}</b>
     {waitingLine?<span className="c-exp__waiting">{payroll?<>{notYet?`${waitingLine} `:`${waitingLine} · `}<a className="c-exp__inline" href={timecardsHref}>{wording.goToTimecards}</a></>:waitingLine}</span>:null}
     {retry?<button type="button" className="c-btn c-btn--full" disabled={busy} onClick={()=>retry&&void send(retry)}>{wording.retrySameExport}</button>
      :<button type="button" className="c-btn c-btn--full" disabled={locked||!finalized.length||periodChanged} onClick={create}>{wording.createExport}</button>}
     {!busy&&!retry&&!periodChanged&&!finalized.length&&waitingLine?null:<p className="c-note">{busy?wording.preparingYourFiles:retry?wording.retryToConfirmTheOutcomeOfThisExport:periodChanged?wording.showTheDatesYouChoseBeforeExporting:!finalized.length?(waitingLine?null:<>{wording.noFinalizedTimeForDates}{' '}<a className="c-exp__inline" href={timecardsHref}>{wording.goToTimecards}</a></>):(selected.length ? (selected.length===1 ? formatPortalCopy(wording.exportsTheSelectedCountPersonYouChoseOne, { selectedCount: selected.length }) : formatPortalCopy(wording.exportsTheSelectedCountPersonYouChoseOther, { selectedCount: selected.length })) : (visibleSelection.overLimit ? wording.exportsEveryFinalizedTimecardTheFirst100HoursIncludeBreaks : wording.exportsEveryFinalizedTimecardHoursIncludeBreaksYourPayrollSystem))}</p>}
    </div>
   </>:<div className="c-card__body"><p className="c-payroll__state" role="status" data-export-loading={state===wording.loadingFinalizedTime||undefined}>{stateText}</p>{state!==wording.loadingFinalizedTime?<button type="button" className="c-btn c-btn--secondary c-btn--md c-pay__gap" disabled={busy} onClick={()=>reload.current()}>{wording.tryAgain}</button>:null}</div>}
   </div>
  </section>}
  {!disabled&&ready?<section className="c-pay__group" aria-labelledby="time-export-options">
   <div className="c-sec-label c-pay__sec"><h2 id="time-export-options">{wording.options}</h2></div>
   <div className="c-card">
   {/* U01: the way into the paid time export (every recorded break decided, sent in batches), for the dates shown. */}
   <a className="c-row c-exp__item c-exp__paid" href={`/app/payroll-export/paid-time?start=${period.startDate}&end=${period.endDate}`}><span className="c-row__main"><span className="c-row__title">{payrollImportCopy[lang].exp.entry.title}</span><span className="c-row__detail"><span>{payrollImportCopy[lang].exp.entry.line}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></a>
   <details className="c-exp__item" open={selected.length>0||undefined}>
    <summary className="c-row"><span className="c-row__main"><span className="c-row__title">{wording.peopleInThisExport}</span><span className="c-row__detail"><span>{(visibleSelection.overLimit ? formatPortalCopy(wording.selectedcountSelectedExcludedNotFinalizedSelectUpTo100People, { selectedCount: selected.length, excluded: visibleSelection.excluded }) : formatPortalCopy(wording.selectedcountSelectedExcludedNotFinalized, { selectedCount: selected.length, excluded: visibleSelection.excluded }))}</span></span></span><CaretRightIcon className="c-chev" weight="bold" aria-hidden="true"/></summary>
    <div className="c-exp__body">
     {lang==='es'&&<span id="time-export-select-all-description" className="sr-only">{wording.selectAllFinalizedTimecards}</span>}<div className="c-exp__bar"><button type="button" className="c-link c-link--l" aria-describedby={lang==='es'?"time-export-select-all-description":undefined} disabled={locked||finalized.length===0} onClick={()=>{setSelected(visibleSelection.selected);setResult(null);}}><CompactActionLabel full={wording.selectAllFinalized} short={wording.selectAllCompact} fullName={lang==='en'?wording.selectAllFinalizedTimecards:wording.selectAllFinalized}/></button><button type="button" className="c-link c-link--l" aria-label={wording.clearEmployeeSelection} disabled={locked||selected.length===0} onClick={()=>{setSelected([]);setResult(null);}}>{wording.clear}</button></div>
     {cards?.length===0?<p className="c-note">{wording.noOneHasTimeInThisPeriod}</p>:<ul className="c-exp__people">{cards?.map(c=><li key={c.card.employeeId}><label className="c-exp__person" data-off={c.state!=='FINALIZED'||undefined}>
      <input type="checkbox" aria-label={formatPortalCopy(wording.exportEmployeeName, { employeeName: c.card.employeeName })} disabled={c.state!=='FINALIZED'||locked||(!selected.includes(c.card.employeeId)&&selected.length>=100)} checked={selected.includes(c.card.employeeId)} onChange={e=>{setSelected(ids=>changeExportSelection(cards??[],ids,c.card.employeeId,e.target.checked));setResult(null);}}/>
      <span className="c-row__main"><span className="c-row__title">{c.card.employeeName}</span><span className="c-row__detail"><span>{c.state==='FINALIZED'?wording.finalized:c.state==='APPROVED'?wording.approvedNotFinalized:c.state==='DRAFT'?wording.draft:c.state.charAt(0)+c.state.slice(1).toLowerCase().replaceAll('_',' ')}</span></span></span>
      <span className="c-row__value c-row__value--soft c-num">{hoursFigure(c.card.recordedNanoseconds)}</span>
     </label></li>)}</ul>}
     {selected.length?<p className="c-note">{formatPortalCopy(wording.selectedRecordedRecordedBreaksOfBreaksListedSeparately, { recorded: hoursText(recorded), breaks: hoursText(breaks) })}</p>:null}
    </div>
   </details>
   {otherDates}
   <PayrollExportMapping draft={draft} setDraft={setDraft} cards={cards??[]} reviewed={reviewed} setReviewed={setReviewed} disabled={locked} save={()=>void save()} />
   </div>
  </section>:null}
  {/* QA A3-03 (Nov 21, 2026): past exports stay downloadable after this page clears a result. */}
  {!disabled&&<PayrollExportReceipts actorId={actorId} refreshKey={receiptsKey} onExportsDisabled={onExportsDisabled}/>}
  <IncludedSection exportsDisabled={disabled} onExportsDisabled={onExportsDisabled} payroll={payroll} period={period} actorId={actorId}/>
 </div>;
}
