vi.mock('./sql-session-contract',()=>import('../../test/fixtures/business-sql-session'));
import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const mocks=vi.hoisted(()=>({today:vi.fn(),actions:vi.fn(),query:vi.fn()}));
vi.mock('./today.server',()=>({readToday:mocks.today}));
vi.mock('../action-center/service',()=>({readActionCenter:mocks.actions}));
vi.mock('../db',()=>({getDb:()=>({query:mocks.query}),queryRows:(rows:unknown)=>rows}));
import {readInboxCount} from './inbox-count.server';
import {describeCopyRow} from './schedule-copy';
import {listTeamTimeOffRequests} from './requests';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
const proof:SessionMutationProof={employee:{id:'self',firstName:'QA',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const executor={transaction:vi.fn(async()=>[]),query:vi.fn()} as unknown as SqlExecutor;
it('uses exactly needsYou semantics including no-clock-in shifts and excluding planning/past',async()=>{
  mocks.today.mockResolvedValue({state:'ready',today:'2026-10-19',observedAt:'2026-10-19T14:00:00Z',validForMs:45000,missed:[{id:'no-punch'}]});
  const item={title:'QA',detail:'QA',href:'/app/inbox'};
  mocks.actions.mockResolvedValue({state:'ready',observedAt:'2026-10-19T14:00:01Z',items:[{...item,id:'request',type:'TIME_OFF',category:'requests',priority:'REVIEW'},{...item,id:'plan',type:'HOURS_REVIEW',category:'scheduling',priority:'MISSING_INPUT'},{...item,id:'past',type:'COVERAGE_GAP',category:'scheduling',priority:'URGENT',dateTime:'2026-10-18T12:00'}]});
  expect(await readInboxCount(proof,executor)).toEqual({state:'ready',count:2,observedAt:'2026-10-19T14:00:01Z'});
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
