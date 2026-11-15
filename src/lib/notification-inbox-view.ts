import type {EmployeeNotificationItem} from './employee-view';
import {dateRangeText} from './duration-format';

export type NotificationFilter='all'|'unread'|'required';
/** BR-6 (Nov 14, 2026): what a row says. The list payload carries the row's kind (as its label), when it arrived and,
 * on an employee's own rows, the dates it is about (`subject`). It carries no names, counts or outcome, so the title is
 * the most specific true sentence for the kind and the dates follow it when the row has them.
 * A manager summary ("Operations need review") gathers what waits in Things to do: open shifts ahead, time-off, shift
 * and can't-work requests, and availability not sent in; the row can't say which, so it names all three. */
const ROW_TITLES:Readonly<Record<string,{title:string;detail:string}>>={
 'Operations need review':{title:'Things to do are waiting for you',detail:'Open shifts, requests or missing availability'},
};
export function notificationTitle(item:Pick<EmployeeNotificationItem,'label'|'subject'>):{title:string;detail:string|null}{
 const known=Object.hasOwn(ROW_TITLES,item.label)?ROW_TITLES[item.label]:null,subject=item.subject??null;
 const dates=subject?`${subject.kind==='scheduleWeek'?'Week of ':''}${dateRangeText(subject.startDate,subject.endDate)}`:null;
 return {title:known?.title??item.label,detail:dates??known?.detail??null};
}

export function filterNotifications(items:EmployeeNotificationItem[],filter:NotificationFilter,search:string){
 const query=search.trim().toLocaleLowerCase('en-US');
 // Search reads the words on the row: the kind's label and the title written from it.
 const matches=(item:EmployeeNotificationItem)=>[item.label,notificationTitle(item).title].some(text=>text.toLocaleLowerCase('en-US').includes(query));
 return items.filter(item=>(filter==='all'||filter==='unread'&&item.reviewState==='unread'||filter==='required'&&item.actionState==='required')&&(!query||matches(item)));
}

export function groupNotifications(items:EmployeeNotificationItem[]){
 const groups=new Map<string,{key:string;label:string;items:EmployeeNotificationItem[]}>();
 const format=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 for(const item of [...items].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at))){
  const date=new Date(item.at),key=format.format(date);
  if(!groups.has(key))groups.set(key,{key,label:key,items:[]});
  groups.get(key)!.items.push(item);
 }
 return [...groups.values()];
}

/** Each row names its destination's action (Codex mobile review M6), not a generic "Open record". */
export function notificationPresentation(label:string){
 switch(label){
  case 'Schedule update':return {icon:'schedule' as const,destination:'Review your current schedule',action:'Review schedule'};
  case 'Time-off update':
  case 'Time off update':return {icon:'timeOff' as const,destination:'Review your time-off request',action:'View request'};
  case 'Shift request update':return {icon:'exchange' as const,destination:'Review your shift request',action:'View request'};
  case 'Team update':return {icon:'update' as const,destination:'Read the current team update',action:'Read update'};
  case 'Availability update':return {icon:'availability' as const,destination:'Review your availability',action:'View availability'};
  case 'Can’t-work update':
  case 'Callout update':
  case 'Unable to work update':return {icon:'callout' as const,destination:'Review your can’t-work request',action:'View can’t-work request'};
  case 'Operations need review':return {icon:'operations' as const,destination:'Review current operational actions',action:'Review actions'};
  case 'Payroll preparation update':return {icon:'payroll' as const,destination:'Review the current payroll period',action:'Review payroll'};
  case 'Pay statement update':return {icon:'statement' as const,destination:'Open your current pay statement',action:'View statement'};
  case 'Device notification test':return {icon:'device' as const,destination:'Review this device notification test',action:'View test'};
  default:return {icon:'device' as const,destination:'Open the current record',action:'Open'};
 }
}
