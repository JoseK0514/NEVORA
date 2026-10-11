import { describe,expect,it } from 'vitest';
import { destinationForSource, safeNotificationOpenPath, safeReturnTo } from './destinations';
import type { RecipientAccess,SourceSnapshot } from './types';
const recipient:RecipientAccess={employeeId:'a',role:'EMPLOYEE',active:true,allowedLocationIds:['2']};
const source:SourceSnapshot={kind:'TIME_OFF',source:{kind:'TIME_OFF',id:'request a',version:'v'},updatedAt:'2026-10-05T12:00:00Z',record:{id:'request a',employeeId:'a',employeeName:'Name',startDate:'2026-10-06',endDate:'2026-10-06',status:'APPROVED',createdAt:'2026-10-05T12:00:00Z'}};
describe('safe task destinations',()=>{
  it.each(['https://evil.test/app','//evil.test/app','/application','/app/../clocker/2','/app/%2e%2e/clocker/2','/app/schedule%2f..%2fsettings','/app\\evil','/app/schedule?week=2026-10-05&week=2026-10-12','/app/schedule?redirect=https://evil.test','/clocker/2','/app/api/push/test','/app/notifications/open?notificationId=a&notificationId=b','/app/requests?tab=other','/app/schedule?week=2026-02-31'])('rejects %s',candidate=>expect(safeReturnTo(candidate)).toBeNull());
  it.each(['/app','/app/schedule?week=2026-10-05','/app/requests?tab=my&requestId=request%20a','/app/schedule/coverage?week=2026-10-05&date=2026-10-06&locationId=2&start=07%3A00&end=16%3A00&lead=1','/app/notifications/open?notificationId=a%3Ab'])('allows validated encoded values %s',candidate=>expect(safeReturnTo(candidate)).toBe(candidate));
  it('builds only guarded same-origin notification opening links',()=>{
    expect(safeNotificationOpenPath('abc:123')).toBe('/app/notifications/open?notificationId=abc%3A123');
    expect(safeNotificationOpenPath('../clocker/2')).toBeNull();
    expect(safeNotificationOpenPath('')).toBeNull();
  });
  it('rechecks active ownership and current review role',()=>{
    expect(destinationForSource(source,recipient)).toBe('/app/requests?tab=my&requestId=request%20a');
    expect(destinationForSource(source,{...recipient,employeeId:'b'})).toBeNull();
    expect(destinationForSource(source,{...recipient,active:false})).toBeNull();
    expect(destinationForSource({...source,record:{...source.record,status:'PENDING'}},{...recipient,role:'MANAGER',allowedLocationIds:[]})).toBe('/app/requests?tab=pending&requestId=request%20a');
  });
});

describe('review regressions: existing role/status task destinations',()=>{
  const manager:RecipientAccess={...recipient,role:'MANAGER',allowedLocationIds:[]};
  const exchange:Extract<SourceSnapshot,{kind:'EXCHANGE'}>={kind:'EXCHANGE',source:{kind:'EXCHANGE',id:'coverage-1',version:'v'},updatedAt:'2026-10-05T12:00:00Z',record:{id:'coverage-1',kind:'COVERAGE',status:'OPEN',requestedByEmployeeId:'a',requestedByName:'Name',requestedByRole:'EMPLOYEE',createdAt:'2026-10-05T12:00:00Z',sourceShift:{id:'shift',scheduleId:'schedule',employeeId:'a',employeeName:'Name',locationId:'2',locationName:'Location',weekStart:'2026-10-05',date:'2026-10-05',startTime:'10:00',endTime:'18:00'}}};
  it.each([
    ['OPEN','coverage'],['MANAGER_PENDING','pending'],['APPROVED','activity'],['DENIED','activity'],['CANCELLED','activity'],['EXPIRED','activity'],
  ] as const)('routes manager exchange status %s to %s',(status,tab)=>{
    expect(destinationForSource({...exchange,record:{...exchange.record,status}},manager)).toBe(`/app/exchange?tab=${tab}&requestId=coverage-1`);
  });
  it('does not send managers to an employee-only response state',()=>expect(destinationForSource({...exchange,record:{...exchange.record,status:'EMPLOYEE_PENDING'}},manager)).toBeNull());
  it.each([['PENDING','pending'],['APPROVED','approved'],['DENIED','declined']] as const)('routes manager Time Off status %s to %s',(status,tab)=>{
    expect(destinationForSource({...source,record:{...source.record,status}},manager)).toBe(`/app/requests?tab=${tab}&requestId=request%20a`);
  });
  it.each(['/app/exchange?tab=pending&requestId=coverage-1','/app/exchange?tab=activity&requestId=coverage-1','/app/requests?tab=pending&requestId=request%20a','/app/requests?tab=approved&requestId=request%20a','/app/requests?tab=declined&requestId=request%20a'])('permits actual manager task tab %s',candidate=>expect(safeReturnTo(candidate)).toBe(candidate));
  it.each(['/app/exchange?tab=pending&tab=coverage','/app/exchange?tab=activity&redirect=https%3A%2F%2Fevil.test','/app/requests?tab=approval','/app/exchange?tab=approvals'])('keeps malformed manager links rejected %s',candidate=>expect(safeReturnTo(candidate)).toBeNull());
  it('refuses an inaccessible schedule change despite an unrelated permitted assignment',()=>{
    const permitted={employeeId:'a',sourceShiftId:'permitted',locationId:'2',date:'2026-10-07',startTime:'10:00',endTime:'18:00',isDesignatedLead:false,isCalloutApproved:false};
    const forbidden={...permitted,sourceShiftId:'forbidden',locationId:'110'};
    const scheduleSource:SourceSnapshot={kind:'SCHEDULE',source:{kind:'SCHEDULE',id:'2026-10-05',version:'r2'},updatedAt:'2026-10-05T12:00:00Z',revision:{id:'r2',weekStart:'2026-10-05',revisionNumber:2,sourceType:'PUBLISH',createdBy:'m',createdAt:'2026-10-05T12:00:00Z'},previousShifts:[permitted,forbidden],currentShifts:[permitted,{...forbidden,startTime:'11:00'}]};
    expect(destinationForSource(scheduleSource,recipient)).toBeNull();
    expect(destinationForSource(scheduleSource,manager)).toBe('/app/schedule?week=2026-10-05');
  });
  it('terminal request participants retain history after operational eligibility removal',()=>{
    expect(destinationForSource({...exchange,record:{...exchange.record,status:'APPROVED'}},{...recipient,allowedLocationIds:[]})).toBe('/app/exchange?tab=history&requestId=coverage-1');
  });
  it('preserves employee exchange outcome and response tabs',()=>{
    expect(destinationForSource(exchange,recipient)).toBe('/app/exchange?tab=requests&requestId=coverage-1');
    expect(destinationForSource({...exchange,record:{...exchange.record,status:'APPROVED'}},recipient)).toBe('/app/exchange?tab=history&requestId=coverage-1');
  });
});

it('adds only the matching encoded request fragment to validated contextual routes',async()=>{
 const { withRequestFragment }=await import('./destinations');
 expect(withRequestFragment('/app/requests?tab=my&requestId=request%20a')).toBe('/app/requests?tab=my&requestId=request%20a#request-request%20a');
 expect(withRequestFragment('/app/exchange?tab=requests&requestId=abc')).toBe('/app/exchange?tab=requests&requestId=abc#request-abc');
 expect(withRequestFragment('/app/schedule?week=2026-10-05')).toBe('/app/schedule?week=2026-10-05');
 expect(withRequestFragment('https://foreign.invalid/app/requests?requestId=abc')).toBeNull();
});

// The real producer's bounded locator must survive notification navigation.
import {coverageRepairUrl,type CoverageRepairLocator} from '../scheduling/coverage-repair';
const repair:CoverageRepairLocator={version:1,weekStart:'2026-10-05',gapKey:'loc-B|2026-10-05|08:00|12:00',locationId:'loc-B',date:'2026-10-05',startTime:'08:00',endTime:'12:00',target:'STAFFING',reported:{missingStaff:1,requiresLead:false,positions:[]}};
it.each(['STAFFING','LEAD','POSITION','CHOOSE'] as const)('admits canonical %s repair navigation',target=>{const locator={...repair,target,...(target==='POSITION'?{positionId:'cashier'}:{}),reported:{...repair.reported,requiresLead:target==='LEAD',positions:target==='POSITION'?[{positionId:'cashier',missing:1}]:[]}};const href=coverageRepairUrl(locator,true);expect(safeReturnTo(href)).toBe(href);});
it.each([['locationId','other'],['date','2026-10-06'],['week','2026-10-12'],['start','09:00'],['end','13:00'],['positionId','cashier'],['lead','1'],['refresh','https://evil.test']])('rejects repair route mismatch %s',(key,value)=>{const url=new URL(coverageRepairUrl(repair),'https://fuel.invalid');url.searchParams.set(key,value);expect(safeReturnTo(url.pathname+url.search)).toBeNull();});
it.each(['unknown','double-encoded','malformed','gap-mismatch','nested-unknown','duplicate','overlong'])('rejects %s repair payload',kind=>{const url=new URL(coverageRepairUrl(repair),'https://fuel.invalid');const raw=kind==='unknown'?JSON.stringify({...repair,authority:true}):kind==='nested-unknown'?JSON.stringify({...repair,reported:{...repair.reported,authority:true}}):kind==='double-encoded'?encodeURIComponent(JSON.stringify(repair)):kind==='malformed'?'{':kind==='gap-mismatch'?JSON.stringify({...repair,gapKey:'other'}):kind==='overlong'?'x'.repeat(8193):JSON.stringify(repair);url.searchParams.set('repair',raw);if(kind==='duplicate')url.searchParams.append('repair',raw);expect(safeReturnTo(url.pathname+url.search)).toBeNull();});
it('rejects repair-only extras without a bounded locator',()=>{expect(safeReturnTo('/app/schedule/coverage?refresh=1')).toBeNull();expect(safeReturnTo('/app/schedule/coverage?positionId=cashier')).toBeNull();});

it('admits a canonical coverage end at midnight with its exact locator',()=>{const locator={...repair,endTime:'24:00',gapKey:'loc-B|2026-10-05|08:00|24:00'};const href=coverageRepairUrl(locator);expect(safeReturnTo(href)).toBe(href);});
it.each(['start','end'])('rejects noncanonical midnight %s',key=>{const url=new URL(coverageRepairUrl(repair),'https://fuel.invalid');url.searchParams.set(key,'24:00');expect(safeReturnTo(url.pathname+url.search)).toBeNull();});
it('rejects midnight without a locator and malformed 24-hour minute values',()=>{expect(safeReturnTo('/app/schedule/coverage?end=24%3A00')).toBeNull();const locator={...repair,endTime:'24:01',gapKey:'loc-B|2026-10-05|08:00|24:01'};expect(safeReturnTo(coverageRepairUrl(locator))).toBeNull();});
