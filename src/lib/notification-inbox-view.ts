import type {EmployeeNotificationItem} from './employee-view';

export type NotificationFilter='all'|'unread'|'required';
export function filterNotifications(items:EmployeeNotificationItem[],filter:NotificationFilter,search:string){
 const query=search.trim().toLocaleLowerCase('en-US');
 return items.filter(item=>(filter==='all'||filter==='unread'&&item.reviewState==='unread'||filter==='required'&&item.actionState==='required')&&(!query||item.label.toLocaleLowerCase('en-US').includes(query)));
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

/** UX-E-40: a schedule notice names its week ("Schedule for Oct 26 – Nov 1"); without a valid week it stays generic. */
export function scheduleNoticeLabel(weekStart:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(weekStart))return 'Schedule update';
 const start=new Date(`${weekStart}T12:00:00Z`);if(Number.isNaN(start.getTime()))return 'Schedule update';
 const end=new Date(start.getTime()+6*86400000),md=(d:Date)=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',month:'short',day:'numeric'}).format(d);
 return `Schedule for ${md(start)} – ${start.getUTCMonth()===end.getUTCMonth()?end.getUTCDate():md(end)}`;
}

/** Each row names its destination's action (Codex mobile review M6), not a generic "Open record". */
export function notificationPresentation(label:string){
 if(label.startsWith('Schedule for '))return {icon:'schedule' as const,destination:'Review your current schedule',action:'Review schedule'};
 switch(label){
  case 'Schedule update':return {icon:'schedule' as const,destination:'Review your current schedule',action:'Review schedule'};
  case 'Time off update':return {icon:'timeOff' as const,destination:'Review your time off request',action:'View request'};
  case 'Shift request update':return {icon:'exchange' as const,destination:'Review your shift request',action:'View request'};
  case 'Team update':return {icon:'update' as const,destination:'Read the current team update',action:'Read update'};
  case 'Availability update':return {icon:'availability' as const,destination:'Review your availability',action:'View availability'};
  case 'Callout update':
  case 'Unable to work update':return {icon:'callout' as const,destination:'Review your Unable to work request',action:'View Unable to work'};
  case 'Operations need review':return {icon:'operations' as const,destination:'Review current operational actions',action:'Review actions'};
  case 'Payroll preparation update':return {icon:'payroll' as const,destination:'Review the current payroll period',action:'Review payroll'};
  case 'Pay statement update':return {icon:'statement' as const,destination:'Open your current pay statement',action:'View statement'};
  case 'Device notification test':return {icon:'device' as const,destination:'Review this device notification test',action:'View test'};
  default:return {icon:'device' as const,destination:'Open the current record',action:'Open'};
 }
}
