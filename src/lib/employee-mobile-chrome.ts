import type {UserRole} from './domain';
import {hoursRecordId,hoursRequestId} from './employee-hours-identifiers';

/** Presentation only. Destinations and their server readers still enforce access.
 * Schedule sheets and Pay disclosures keep their tab underneath. Hours' three
 * views share a root only when Hours is the actual tab; exact entry/correction
 * tasks use their existing contextual Back instead. */
export function employeeMobileChrome(role:UserRole,path:string|null,tabs:readonly {href:string}[],query:{get(name:string):string|null}|null):'root'|'detail'|undefined{
 if(role!=='EMPLOYEE'&&role!=='LEAD')return undefined;
 // A Lead has the Employee's header set (Direction B, Nov 8, 2026).
 if(path==='/app/more')return 'root';
 if(path==='/app/timecards')return tabs.some(tab=>tab.href==='/app/my-time')?'root':'detail';
 if(!tabs.some(tab=>tab.href===path))return 'detail';
 if(path==='/app/my-time'){
  const edit=query?.get('edit');
  if(hoursRecordId(query?.get('entry'))||hoursRequestId(query?.get('requestId'))||edit&&edit.length<=500)return 'detail';
 }
 return 'root';
}
