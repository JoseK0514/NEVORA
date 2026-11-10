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

/** Each row names its destination's action (Codex mobile review M6), not a generic "Open record". */
export function notificationPresentation(label:string){
 switch(label){
  case 'Schedule update':return {icon:'schedule' as const,destination:'Review your current schedule',action:'Review schedule'};
  case 'Time off update':return {icon:'timeOff' as const,destination:'Review your time-off request',action:'View request'};
  case 'Shift request update':return {icon:'exchange' as const,destination:'Review your shift request',action:'View request'};
  case 'Team update':return {icon:'update' as const,destination:'Read the current team update',action:'Read update'};
  case 'Availability update':return {icon:'availability' as const,destination:'Review your availability',action:'View availability'};
  case 'Callout update':
  case 'Unable to work update':return {icon:'callout' as const,destination:'Review your can’t-work request',action:'View request'};
  case 'Operations need review':return {icon:'operations' as const,destination:'Review current operational actions',action:'Review actions'};
  case 'Payroll preparation update':return {icon:'payroll' as const,destination:'Review the current payroll period',action:'Review payroll'};
  case 'Pay statement update':return {icon:'statement' as const,destination:'Open your current pay statement',action:'View statement'};
  case 'Device notification test':return {icon:'device' as const,destination:'Review this device notification test',action:'View test'};
  default:return {icon:'device' as const,destination:'Open the current record',action:'Open'};
 }
}
