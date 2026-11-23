import type {EmployeeNotificationItem} from './employee-view';
import {dateRange} from './duration-format';
import {NOTIFICATION_TEXT_COPY,type NotificationLang} from './notification-text-copy';
import {notificationCountNote,notificationName,notificationOutcomeNote} from './notification-facts';

export type NotificationFilter='all'|'unread'|'required';
/** BR-6 (Nov 14, 2026): what a row says. The list payload carries the row's kind (as its label), when it arrived and,
 * on an employee's own rows, the dates it is about (`subject`). It carries no names, counts or outcome, so the title is
 * the most specific true sentence for the kind and the dates follow it when the row has them.
 * A manager summary ("Operations need review") gathers what waits in Things to do: open shifts ahead, time-off, shift
 * and can't-work requests, and availability not sent in; the row can't say which, so it names all three. */
/** Backend (Nov 15, 2026): labels now name the event ("Items need review", "Time off approved") and the item carries
 * its eventType. The row's kind (its icon, destination and fixed title) follows the event type; the old labels still work. */
const EVENT_LABELS:Readonly<Record<string,string>>={MANAGER_REVIEW:'Operations need review',COVERAGE_ATTENTION:'Operations need review',PAYROLL_PREPARATION:'Payroll preparation update',PAYROLL_STATEMENT:'Pay statement update',COMMUNICATION:'Team update'};
export function canonicalNotificationLabel(item:Pick<EmployeeNotificationItem,'label'|'eventType'>):string{
 const event=item.eventType??'';
 if(Object.hasOwn(EVENT_LABELS,event))return EVENT_LABELS[event];
 if(/^SCHEDULE_/.test(event))return 'Schedule update';
 if(/^TIME_OFF_/.test(event))return 'Time-off update';
 if(/^CALLOUT_/.test(event))return 'Can’t-work update';
 if(/^SWAP_/.test(event)||['COVERAGE_INVITATION','COVERAGE_APPROVED','COVERAGE_DENIED'].includes(event))return 'Shift request update';
 if(/^AVAILABILITY_/.test(event))return 'Availability update';
 return item.label;
}
export function notificationTitle(item:Pick<EmployeeNotificationItem,'label'|'subject'|'eventType'|'outcome'|'names'|'count'>,lang:NotificationLang='en'):{title:string;detail:string|null}{
 const t=NOTIFICATION_TEXT_COPY[lang],label=canonicalNotificationLabel(item),known=Object.hasOwn(t.rowTitles,label)?t.rowTitles[label]:null,subject=item.subject??null;
 const dates=subject?`${subject.kind==='scheduleWeek'?t.weekOf:''}${dateRange(subject.startDate,subject.endDate,{locale:t.dateLocale})}`:null;
 // The facts the list sends, and only those: the person it is about, a later status, a count ("5 waiting").
 const facts=[notificationName(item),notificationOutcomeNote(item,lang),notificationCountNote(item,lang)].filter((fact):fact is string=>!!fact);
 const detail=[dates,...facts].filter(Boolean).join(' · ')||known?.detail||null;
 return {title:known?.title??(Object.hasOwn(t.titles,item.label)?t.titles[item.label]:item.label),detail};
}

export function filterNotifications(items:EmployeeNotificationItem[],filter:NotificationFilter,search:string){
 const query=search.trim().toLocaleLowerCase('en-US');
 // Search reads the words on the row: the kind's label and the title written from it.
 const matches=(item:EmployeeNotificationItem)=>[item.label,notificationTitle(item).title].some(text=>text.toLocaleLowerCase('en-US').includes(query));
 return items.filter(item=>(filter==='all'||filter==='unread'&&item.reviewState==='unread'||filter==='required'&&item.actionState==='required')&&(!query||matches(item)));
}

/** A row and, when it folds repeats, every notification it holds (newest first). */
export type NotificationRow={item:EmployeeNotificationItem;count:number;unreadIds:string[];items:EmployeeNotificationItem[]};
/** OW-002 (Phase 3): rows that follow each other and say the same thing (the same kind and no dates of their own) read as
 * one row: the newest, with how many it stands for and which of them are unread. `items` is newest first. Each row's link
 * is its own (it opens that notification), so links are not compared; the folded row opens the newest. A row with dates
 * is never folded, since its dates are what tell it apart. */
export function collapseNotifications(items:EmployeeNotificationItem[]):NotificationRow[]{
 const rows:NotificationRow[]=[];
 for(const item of items){
  const last=rows.at(-1),unread=item.reviewState==='unread';
  // A row that names a person (backend facts, Nov 15) is told apart by that name, as a dated row is by its dates.
  if(last&&!item.subject&&!last.item.subject&&!item.names?.length&&!last.item.names?.length&&last.item.label===item.label){last.count+=1;last.items.push(item);if(unread)last.unreadIds.push(item.id);}
  else rows.push({item,count:1,unreadIds:unread?[item.id]:[],items:[item]});
 }
 return rows;
}

export function groupNotifications(items:EmployeeNotificationItem[],timeZone?:string,lang:NotificationLang='en'){
 const groups=new Map<string,{key:string;label:string;items:EmployeeNotificationItem[]}>();
 const format=new Intl.DateTimeFormat(NOTIFICATION_TEXT_COPY[lang].dateLocale,{weekday:'long',month:'long',day:'numeric',year:'numeric',...(timeZone?{timeZone}:{})});
 for(const item of [...items].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))){
  const date=new Date(item.at),key=format.format(date);
  if(!groups.has(key))groups.set(key,{key,label:key,items:[]});
  groups.get(key)!.items.push(item);
 }
 return [...groups.values()];
}

/** Each row names its destination's action (Codex mobile review M6), not a generic "Open record". */
export function notificationPresentation(label:string,eventType?:string,lang:NotificationLang='en'){
 const p=NOTIFICATION_TEXT_COPY[lang].presentation;
 switch(canonicalNotificationLabel({label,eventType})){
  case 'Schedule update':return {icon:'schedule' as const,...p.schedule};
  case 'Time-off update':
  case 'Time off update':return {icon:'timeOff' as const,...p.timeOff};
  case 'Shift request update':return {icon:'exchange' as const,...p.exchange};
  case 'Team update':return {icon:'update' as const,...p.update};
  case 'Availability update':return {icon:'availability' as const,...p.availability};
  case 'Can’t-work update':
  case 'Callout update':
  case 'Unable to work update':return {icon:'callout' as const,...p.callout};
  case 'Operations need review':return {icon:'operations' as const,...p.operations};
  case 'Payroll preparation update':return {icon:'payroll' as const,...p.payroll};
  case 'Pay statement update':return {icon:'statement' as const,...p.statement};
  case 'Device notification test':return {icon:'device' as const,...p.test};
  default:return {icon:'device' as const,...p.other};
 }
}
