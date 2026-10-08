import {safeNotificationOpenPath} from './notifications/destinations';
export type EmployeeViewKind = 'profile'|'notifications';
export type EmployeeViewUnavailable = {state:'unavailable';reason:'access_denied'|'read_failed'};
type Lifetime = {state:'ready';observedAt:string;validForMs:number};
export type EmployeeProfile = Lifetime & {kind:'profile';profile:{name:string;role:'Employee'|'Lead';workspace:string;timeZone:string;locations:string[]}};
export type EmployeeNotificationItem = {id:string;label:string;at:string;href:string};
export type EmployeeNotifications = Lifetime & {kind:'notifications';coverage:'complete'|'partial';items:EmployeeNotificationItem[]};
export type EmployeeViewSnapshot = EmployeeViewUnavailable|EmployeeProfile|EmployeeNotifications;
const record=(value:unknown):Record<string,unknown>=>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Unavailable view');return value as Record<string,unknown>;};
const text=(value:unknown,max=300)=>{if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Unavailable view');return value;};
const instant=(value:unknown)=>{const s=text(value);if(!Number.isFinite(Date.parse(s)))throw Error('Unavailable view');return s;};
/** Explicit projection: extra fields (including server proof/raw rows) never
 * enter the rendered state, and a response cannot cross the view binding. */
export function parseEmployeeView(value:unknown,kind:EmployeeViewKind):EmployeeViewSnapshot {
 const v=record(value);
 if(v.state==='unavailable')return {state:'unavailable',reason:v.reason==='access_denied'?'access_denied':'read_failed'};
 if(v.state!=='ready'||v.kind!==kind||typeof v.validForMs!=='number'||!Number.isFinite(v.validForMs)||v.validForMs<=0||v.validForMs>45000)throw Error('Unavailable view');
 const lifetime={state:'ready' as const,observedAt:instant(v.observedAt),validForMs:v.validForMs};
 if(kind==='profile'){
  const p=record(v.profile);if(!['Employee','Lead'].includes(String(p.role))||!Array.isArray(p.locations)||!p.locations.length||p.locations.length>100)throw Error('Unavailable view');
  return {...lifetime,kind,profile:{name:text(p.name),role:p.role as 'Employee'|'Lead',workspace:text(p.workspace),timeZone:text(p.timeZone),locations:p.locations.map(l=>text(l))}};
 }
 if(!['complete','partial'].includes(String(v.coverage))||!Array.isArray(v.items)||v.items.length>25)throw Error('Unavailable view');
 return {...lifetime,kind,coverage:v.coverage as 'complete'|'partial',items:v.items.map(value=>{
  const row=record(value),id=text(row.id,128),href=safeNotificationOpenPath(id);if(!href||row.href!==href)throw Error('Unavailable view');
  return {id,label:text(row.label),at:instant(row.at),href};
 })};
}
