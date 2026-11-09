import {afterEach,expect,it,vi} from 'vitest';
import {parseStaffingSnapshot,readStaffing,weeksFor} from './client';

const item={id:'LEAVE_STAFFING:r1:s1',requestId:'r1',state:'approval_conflict',employeeId:'e1',employeeName:'Fictional Worker',ownerEmployeeId:null,reviewedAt:null,
 employeeInstruction:'awaiting_decision',publicationId:'p1',revisionNumber:2,shiftId:'s1',locationId:'loc-1',locationName:'West',date:'2030-10-08',startTime:'08:00',endTime:'12:00',overlapMinutes:240,overlapDates:['2030-10-08']};
const ready=(weekStart:string,items:unknown[]=[item],extra={})=>({state:'ready',authority:'view-1',weekStart,observedAt:'2030-10-06T12:00:00.000Z',validForMs:30000,items,...extra});
const authority={scope:'management' as const,actorId:'manager-1',view:'view-1'};
afterEach(()=>vi.unstubAllGlobals());

it('lists the Mondays a request touches and stops past six weeks',()=>{
 expect(weeksFor('2030-10-08','2030-10-08')).toEqual(['2030-10-07']);
 expect(weeksFor('2030-10-13','2030-10-14')).toEqual(['2030-10-07','2030-10-14']);
 expect(weeksFor('2030-10-07','2030-12-31')).toBeNull();
});
it('decodes strictly: a malformed item or another week is a failed read, never "no conflicts"',()=>{
 expect(parseStaffingSnapshot(ready('2030-10-07'),'2030-10-07').state).toBe('ready');
 expect(()=>parseStaffingSnapshot(ready('2030-10-14'),'2030-10-07')).toThrow();
 expect(()=>parseStaffingSnapshot(ready('2030-10-07',[{...item,state:'repair_required'}]),'2030-10-07')).toThrow();
 expect(()=>parseStaffingSnapshot(ready('2030-10-07',[{...item,id:'TIME_OFF:r1'}]),'2030-10-07')).toThrow();
 expect(()=>parseStaffingSnapshot(ready('2030-10-07',[],{validForMs:60000}),'2030-10-07')).toThrow();
 expect(parseStaffingSnapshot({state:'unavailable',reason:'read_failed'},'2030-10-07')).toEqual({state:'unavailable',reason:'read_failed'});
});
it('sends the contract headers and selectors only, merges weeks into the shortest lifetime, and fails whole on one failure',async()=>{
 const calls:{url:string;init:RequestInit}[]=[];
 vi.stubGlobal('fetch',async(url:string,init:RequestInit)=>{calls.push({url,init});const body=JSON.parse(String(init.body));
  return new Response(JSON.stringify(ready(body.weekStart,body.weekStart==='2030-10-07'?[item]:[],{validForMs:body.weekStart==='2030-10-07'?30000:9000})),{status:200});});
 const read=await readStaffing(authority,{weeks:['2030-10-07','2030-10-14'],requestId:'r1'},new AbortController().signal);
 expect(read).toMatchObject({state:'ready',validForMs:9000,items:[{id:item.id}]});
 expect(calls[0].url).toBe('/api/manager/time-off-staffing');
 expect(calls[0].init).toMatchObject({method:'POST',credentials:'same-origin'});
 expect(calls[0].init.headers).toEqual({'Content-Type':'application/json','x-nevora-leave-staffing':'1','x-nevora-actor':'manager-1','x-nevora-employee-view':'view-1'});
 expect(JSON.parse(String(calls[0].init.body))).toEqual({weekStart:'2030-10-07',requestId:'r1'});
 vi.stubGlobal('fetch',async(_url:string,init:RequestInit)=>JSON.parse(String(init.body)).weekStart==='2030-10-14'
  ?new Response('{"state":"unavailable"}',{status:503,headers:{'X-Nevora-Failure':'source_unavailable'}}):new Response(JSON.stringify(ready('2030-10-07')),{status:200}));
 expect(await readStaffing(authority,{weeks:['2030-10-07','2030-10-14']},new AbortController().signal)).toEqual({state:'unavailable',reason:'read_failed'});
 // A read bound to another view is not this page's: it ends access instead of showing someone else's state.
 vi.stubGlobal('fetch',async()=>new Response(JSON.stringify({...ready('2030-10-07'),authority:'view-2'}),{status:200}));
 expect(await readStaffing(authority,{weeks:['2030-10-07']},new AbortController().signal)).toEqual({state:'unavailable',reason:'access_denied'});
});
