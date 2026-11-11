import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {projectActionRequestFact,withActionRequestFacts} from './action-request-facts.server';
import type {ActionItem} from '../action-center/project';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {parseActionCenter} from '../action-center/project';
it('projects whole/partial request dates, duration, note and a fixed encoded review destination',()=>{
  const row={kind:'TIME_OFF' as const,id:'a/b',start_date:'2026-10-19',end_date:'2026-10-20',start_time:null,end_time:null,location_name:'Fictional Office',note:'Fictional reason'};
  expect(projectActionRequestFact(row)).toMatchObject({lengthText:'2 days',note:'Fictional reason',reviewHref:'/app/requests?tab=pending&requestId=a%2Fb&from=inbox'});
  expect(projectActionRequestFact({...row,end_date:row.start_date,start_time:'08:00:00',end_time:'12:30:00'})).toMatchObject({partialDay:{start:'08:00',end:'12:30'},lengthText:'4 h 30 min'});
});
it('validates request detail before a client can consume it',()=>{
  const request=projectActionRequestFact({kind:'TIME_OFF',id:'r',start_date:'2026-10-19',end_date:'2026-10-20',start_time:null,end_time:null,location_name:'Fictional Office',note:null});
  const snapshot={state:'ready',weekStart:'2026-10-19',observedAt:'2026-10-19T14:00:00Z',validForMs:45000,limitedAttendance:false,counts:{total:1,requests:1,scheduling:0,timekeeping:0},items:[{id:'TIME_OFF:r',type:'TIME_OFF',category:'requests',priority:'REVIEW',title:'QA',detail:'QA',href:'/app/requests',request}]};
  expect(parseActionCenter(snapshot,'2026-10-19')).toMatchObject({state:'ready'});
  expect(()=>parseActionCenter({...snapshot,items:[{...snapshot.items[0],request:{...request,reviewHref:'https://other.invalid'}}]},'2026-10-19')).toThrow('Invalid request facts');
});
it('keeps the full-review fallback when optional facts cannot be read',async()=>{
  const proof={employee:{id:'self',role:'MANAGER'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
  const items=[{id:'TIME_OFF:r',type:'TIME_OFF'}] as ActionItem[];
  const executor={query:async()=>{throw Error('storage unavailable');}} as unknown as SqlExecutor;
  expect(await withActionRequestFacts(proof,{id:'w'} as Parameters<typeof withActionRequestFacts>[1],items,executor)).toEqual(items);
});

it('projects only a supplied non-private counterpart and rejects unsafe contract names',()=>{
 const request=projectActionRequestFact({kind:'EXCHANGE',id:'swap',start_date:'2026-11-10',end_date:'2026-11-10',start_time:'08:00',end_time:'12:00',location_name:'Office',note:null,counterpart_name:'Ana Example'});
 expect(request).toMatchObject({counterpartName:'Ana Example'});
 const item={id:'EXCHANGE:swap',type:'EXCHANGE',category:'requests',priority:'REVIEW',title:'Swap',detail:'Shift',href:'/app/exchange',request};
 const snapshot={state:'ready',weekStart:'2026-11-09',observedAt:'2026-11-10T14:00:00Z',validForMs:45000,limitedAttendance:false,counts:{total:1,requests:1,scheduling:0,timekeeping:0},items:[item]};
 expect(parseActionCenter(snapshot,'2026-11-09')).toMatchObject({state:'ready'});
 for(const counterpartName of ['', ' ', 'Ana\nPrivate', 'A'.repeat(201)]){
  expect(()=>parseActionCenter({...snapshot,items:[{...item,request:{...request,counterpartName}}]},'2026-11-09')).toThrow('Invalid request facts');
 }
});
