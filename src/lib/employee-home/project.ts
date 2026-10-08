import type {AttentionItem,EmployeeHomeRead,HomeSnapshot,HomeSource,PublishedAssignment,SourceObservation} from './types';
import {isValidIsoDate,isValidWeekStart} from '../date-utils';
export const HOME_SOURCES:HomeSource[]=['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'];
const reasons=new Set(['read_failed','source_cap','source_changed','unpublished','integration_pending','expired','unknown_source','review_unavailable']);
const instant=(value:unknown):value is string=>typeof value==='string'&&Number.isFinite(Date.parse(value));
const text=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=300;
/** Exact canonical destinations only; these links never grant mutation authority. */
export function homeDestination(ref:AttentionItem['ref'],tab?:string):string|null{
 if(!text(ref.id)||!text(ref.version))return null;
 if(ref.kind==='COMMUNICATION')return /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(ref.id)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(ref.version)?`/app/updates/${ref.id}`:null;
 if(ref.kind==='SCHEDULE')return isValidWeekStart(ref.id)?`/app/schedule?week=${encodeURIComponent(ref.id)}`:null;
 if(ref.kind==='TIME_OFF')return `/app/requests?tab=my&requestId=${encodeURIComponent(ref.id)}`;
 if(ref.kind==='TIME_CORRECTION')return '/app/my-time';
 if(ref.kind==='EXCHANGE'&&['available','requests','history'].includes(tab??''))return `/app/exchange?tab=${tab}&requestId=${encodeURIComponent(ref.id)}`;
 return null;
}
function safeItem(row:AttentionItem):AttentionItem{
 const tab=typeof row?.href==='string'?new URL(row.href,'https://home.invalid').searchParams.get('tab')??undefined:undefined;
 if(!row?.ref||homeDestination(row.ref,tab)!==row.href||!text(row.label)||typeof row.required!=='boolean'||typeof row.actionable!=='boolean'||!instant(row.changedAt)||
  row.deadlineAt!==null&&!instant(row.deadlineAt))throw Error('Invalid source item');
 return {ref:{kind:row.ref.kind,id:row.ref.id,version:row.ref.version},label:row.label,href:row.href,required:row.required,actionable:row.actionable,deadlineAt:row.deadlineAt,changedAt:row.changedAt};
}
function safeAssignment(row:PublishedAssignment|null):PublishedAssignment|null{
 if(row===null)return null;
 if(!row||!text(row.shiftId)||!text(row.assignmentEpisodeId)||!Number.isSafeInteger(row.termsRevision)||row.termsRevision<1||!isValidWeekStart(row.weekStart)||!isValidIsoDate(row.date)||!instant(row.startAt)||!instant(row.endAt)||Date.parse(row.endAt)<=Date.parse(row.startAt)||!text(row.locationId)||!text(row.locationLabel)||!text(row.publicationRevisionId)||typeof row.designatedLead!=='boolean'||row.positionLabel!==null&&!text(row.positionLabel))throw Error('Invalid assignment');
 return {shiftId:row.shiftId,assignmentEpisodeId:row.assignmentEpisodeId,termsRevision:row.termsRevision,weekStart:row.weekStart,date:row.date,startAt:row.startAt,endAt:row.endAt,locationId:row.locationId,locationLabel:row.locationLabel,positionLabel:row.positionLabel,designatedLead:row.designatedLead,publicationRevisionId:row.publicationRevisionId};
}
const itemSource:Record<AttentionItem['ref']['kind'],HomeSource>={SCHEDULE:'acknowledgements',EXCHANGE:'exchanges',TIME_OFF:'timeOff',TIME_CORRECTION:'ownTime',COMMUNICATION:'communications'};
const rank=(item:AttentionItem)=>item.actionable&&item.deadlineAt?0:item.required?1:item.actionable?2:3;
const compare=(a:AttentionItem,b:AttentionItem)=>rank(a)-rank(b)||(rank(a)===0?Date.parse(a.deadlineAt!)-Date.parse(b.deadlineAt!):rank(a)===3?Date.parse(b.changedAt)-Date.parse(a.changedAt):0)||a.ref.id.localeCompare(b.ref.id)||a.ref.kind.localeCompare(b.ref.kind);
/** Pure projection. Freshness is relative to the protected aggregate observation;
 * the browser separately subtracts transit time and enforces this short lifetime. */
export function projectEmployeeHome(input:HomeSnapshot):EmployeeHomeRead{
 try{
  if(!input||!instant(input.observedAt)||!/^[a-f0-9]{64}$/.test(input.authority)||!Number.isFinite(input.validForMs)||input.validForMs<=0||input.validForMs>45000||!Array.isArray(input.attention)||!['complete','partial','unavailable'].includes(input.publicationState))throw Error('Invalid observation');
  new Intl.DateTimeFormat('en-US',{timeZone:input.timeZone}).format();
  const at=Date.parse(input.observedAt),sources={} as Record<HomeSource,SourceObservation>;
  for(const key of HOME_SOURCES){
   const source=input.sources?.[key],age=source&&instant(source.observedAt)?at-Date.parse(source.observedAt):Infinity;
   if(!source||!['complete','partial','unavailable','not_applicable'].includes(source.state)||age<0||age>45000||source.state==='not_applicable'){
    sources[key]={state:'unavailable',observedAt:input.observedAt,version:null,reason:age>45000?'expired':'unknown_source'};continue;
   }
   sources[key]={state:source.state,observedAt:source.observedAt,version:text(source.version)?source.version:null,reason:reasons.has(source.reason??'')?source.reason:null,...(source.validUntil?{validUntil:source.validUntil}:{})};
   if(source.state==='complete'&&!sources[key].version)sources[key]={...sources[key],state:'unavailable',reason:'unknown_source'};
   if(source.validUntil&&(!instant(source.validUntil)||Date.parse(source.validUntil)<=at))sources[key]={state:'unavailable',observedAt:input.observedAt,version:null,reason:'expired'};
  }
  const rows=input.attention.map(safeItem);
  // Source revisions do not establish time validity. A deadline crossed during
  // the protected read requires revalidation, including equality at observation.
  for(const row of rows){
   const source=itemSource[row.ref.kind];
   if(row.actionable&&row.deadlineAt!==null&&Date.parse(row.deadlineAt)<=at&&sources[source].state!=='unavailable'){
    sources[source]={state:'unavailable',observedAt:input.observedAt,version:null,reason:'expired'};
   }
  }
  const merged=new Map<string,AttentionItem>();
  for(const row of rows){
   if(sources[itemSource[row.ref.kind]].state==='unavailable')continue;
   const key=row.ref.kind+':'+row.ref.id,old=merged.get(key);
   if(old){if(old.ref.version!==row.ref.version)throw Error('Mixed source revisions');
    merged.set(key,{...old,required:old.required||row.required,actionable:old.actionable||row.actionable,label:row.ref.kind==='SCHEDULE'&&(old.required||row.required)?'Schedule updated — review required':[old.label,row.label].sort()[0],changedAt:old.changedAt>row.changedAt?old.changedAt:row.changedAt});
   }else merged.set(key,row);
  }
  const available=sources.schedule.state!=='unavailable'&&input.publicationState!=='unavailable';
  const nextShift=available?safeAssignment(input.nextShift):null,currentShift=available?safeAssignment(input.currentShift):null;
  if(nextShift&&Date.parse(nextShift.startAt)<=at||currentShift&&(Date.parse(currentShift.startAt)>at||Date.parse(currentShift.endAt)<=at))throw Error('Expired assignment');
  const boundaries=[nextShift?.startAt,currentShift?.endAt,...Object.values(sources).map(s=>s.validUntil),...[...merged.values()].filter(i=>i.actionable).map(i=>i.deadlineAt)].filter((v):v is string=>!!v).map(v=>Date.parse(v)-at).filter(v=>v>0);
  const snapshot:HomeSnapshot={observedAt:input.observedAt,authority:input.authority,timeZone:input.timeZone,validForMs:Math.min(input.validForMs,...boundaries),sources,publicationState:available?input.publicationState:'unavailable',nextShift,currentShift,attention:[...merged.values()].sort(compare)};
  const complete=HOME_SOURCES.every(key=>sources[key].state==='complete')&&snapshot.publicationState==='complete';
  return {state:complete?'ready':'partial',snapshot,allSet:complete&&snapshot.attention.length===0};
 }catch{return {state:'unavailable',reason:'read_failed'};}
}
