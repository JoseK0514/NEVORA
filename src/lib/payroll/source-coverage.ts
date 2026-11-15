import type {Source} from './service';
import type {PayrollPeriod} from './contracts';
import {parseTimecardsResponse} from '../timecards/read-model';
import {PayrollError} from './model';
/** Finance objects cover every person/entry/history actually retained in their
 * source. No table-presence or missing coverage fallback grants Manager access. */
export function providerRunCoverage(source:Source,observedAt:string,period:PayrollPeriod){
 const safe=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&!/[\u0000-\u001f\u007f]/.test(v);
 if(source.roster.length>300||!source.roster.every(r=>safe(r.employeeId)&&safe(r.locationId)))throw new PayrollError('SOURCE_COVERAGE_UNAVAILABLE',409);
 const people=new Set(source.roster.map(r=>r.employeeId)),locations=new Set(source.roster.map(r=>r.locationId));
 if(people.size!==source.roster.length)throw new PayrollError('SOURCE_COVERAGE_UNAVAILABLE',409);
 const cards=parseTimecardsResponse({...source.timecards,observedAt},period).cards;
 for(const card of cards){
  if(!people.has(card.source.employeeId))throw new PayrollError('SOURCE_COVERAGE_UNAVAILABLE',409);
  for(const snapshot of [card.source,...card.history.map(h=>h.snapshot)])for(const entry of snapshot.entries){if(!safe(entry.locationId))throw new PayrollError('SOURCE_COVERAGE_UNAVAILABLE',409);locations.add(entry.locationId);}
 }
 return {complete:people.size>0&&locations.size>0,locationIds:[...locations].sort()};
}
