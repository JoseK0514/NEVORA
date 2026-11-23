import * as rstestOriginal0 from "../../test/fixtures/business-sql-session" with { rstest: 'importActual' };
rs.mock('./sql-session-contract',()=>rstestOriginal0);
import {beforeEach,expect,it,rs} from '@rstest/core';
rs.mock('server-only',()=>({}));
const mocks=rs.hoisted(()=>({today:rs.fn(),actions:rs.fn(),query:rs.fn(),access:rs.fn(),original:rs.fn()}));
// Inbox counts are scoped to the actor's operational access (6eee084e); fixtures stand in for that read.
rs.mock('../company-access/operational-scope.server',()=>({assertOperationalAccess:mocks.access,assertOriginalOperationalAccess:mocks.original}));
rs.mock('./today.server',()=>({readToday:mocks.today}));
rs.mock('../action-center/service',()=>({readActionCenterForCurrentScope:mocks.actions}));
rs.mock('../db',()=>({getDb:()=>({query:mocks.query}),queryRows:(rows:unknown)=>rows}));
import {readInboxCount} from './inbox-count.server';
import {describeCopyRow} from './schedule-copy';
import {listTeamTimeOffRequests} from './requests';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
const proof:SessionMutationProof={employee:{id:'self',firstName:'QA',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const executor={transaction:rs.fn(async()=>[]),query:rs.fn()} as unknown as SqlExecutor;
const access={authority:'a'.repeat(64),scope:{mode:'LOCATIONS',locationIds:['loc-1']},workspace:{id:'fictional-workspace'}};
beforeEach(()=>{mocks.access.mockReset().mockResolvedValue(access);mocks.original.mockReset().mockResolvedValue(undefined);});
it('uses exactly needsYou semantics including no-clock-in shifts and excluding planning/past',async()=>{
  mocks.today.mockResolvedValue({state:'ready',today:'2026-10-19',observedAt:'2026-10-19T14:00:00Z',validForMs:45000,missed:[{id:'no-punch'}]});
  const item={title:'QA',detail:'QA',href:'/app/inbox'};
  mocks.actions.mockResolvedValue({state:'ready',observedAt:'2026-10-19T14:00:01Z',items:[{...item,id:'request',type:'TIME_OFF',category:'requests',priority:'REVIEW'},{...item,id:'plan',type:'HOURS_REVIEW',category:'scheduling',priority:'MISSING_INPUT'},{...item,id:'past',type:'COVERAGE_GAP',category:'scheduling',priority:'URGENT',dateTime:'2026-10-18T12:00'}]});
  expect(await readInboxCount(proof,executor)).toEqual({state:'ready',count:2,observedAt:'2026-10-19T14:00:01Z'});
  expect(mocks.access).toHaveBeenCalledWith(proof,undefined,executor);
  expect(mocks.today).toHaveBeenCalledWith(proof,executor,access);
  expect(mocks.original).toHaveBeenCalledWith(proof,access,executor);
});
it('never counts when operational access is denied or changes during the read',async()=>{
  mocks.today.mockResolvedValue({state:'ready',today:'2026-10-19',observedAt:'2026-10-19T14:00:00Z',validForMs:45000,missed:[]});
  mocks.actions.mockResolvedValue({state:'ready',observedAt:'2026-10-19T14:00:01Z',items:[]});
  mocks.access.mockRejectedValueOnce(new Error('access_denied'));
  expect(await readInboxCount(proof,executor)).toEqual({state:'unavailable'});
  mocks.original.mockRejectedValueOnce(new Error('access_changed'));
  expect(await readInboxCount(proof,executor)).toEqual({state:'unavailable'});
});
it('never represents a failed source or wrong role as zero',async()=>{
  mocks.today.mockResolvedValue({state:'unavailable',reason:'read_failed'});expect(await readInboxCount(proof,executor)).toEqual({state:'unavailable'});
  expect(await readInboxCount({...proof,employee:{...proof.employee,role:'EMPLOYEE'}},executor)).toEqual({state:'unavailable'});
});
it('describes copy receipt rows without changing source identities or time units',()=>{
  expect(describeCopyRow({employeeId:'e',locationId:'l',dayOffset:1,startTime:'08:00',endTime:'16:00'},'2026-10-19',{employees:[{id:'e',first_name:'Fictional',last_name:'Person'}],locations:[{id:'l',short_name:'QA Office'}]})).toEqual({employeeName:'Fictional Person',locationName:'QA Office',date:'2026-10-20',startTime:'08:00',endTime:'16:00'});
});
it('preserves a decided request and its reviewer timestamp in the team projection',async()=>{
  mocks.query.mockResolvedValue([{id:'r',employee_id:'e',employee_name:'Fictional Employee',start_date:'2026-10-20',end_date:'2026-10-21',status:'APPROVED',created_at:'2026-10-19T12:00:00Z',reviewed_at:new Date('2026-10-19T13:00:00Z'),reviewer_name:'Fictional Manager'}]);
  expect((await listTeamTimeOffRequests('APPROVED'))[0]).toMatchObject({id:'r',reviewedAt:'2026-10-19T13:00:00.000Z',reviewerName:'Fictional Manager'});
});
