import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {AttendanceDisplayReview} from '../attendance/read-model';
import type {ManagerTimeCorrections} from '../time-corrections/read-model';
import {parseTimecardsResponse,type TimecardsResult} from '../timecards/read-model';
import {ALL_MODULES_ON} from '../workspace-presentation/modules';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';

const readers=vi.hoisted(()=>({attendance:vi.fn(),corrections:vi.fn(),cards:vi.fn(),presentation:vi.fn()}));
// Canonical reader I/O is replaced only to control source lifetimes/failures.
// Real company/session/SQL behavior is exercised by the owned D7 integration suite.
vi.mock('../company-access/company-result.server',()=>({readCompanyResult:async(_proof:unknown,load:()=>Promise<unknown>)=>load()}));
vi.mock('../data/workspaces',()=>({getWorkspace:async()=>({id:'workspace-test',timeZone:'America/Puerto_Rico'}),workspaceReadGuard:()=>[]}));
vi.mock('../data/attendance-review.server',()=>({readAttendanceReview:readers.attendance}));
vi.mock('../data/time-corrections.server',()=>({readManagerTimeCorrections:readers.corrections}));
vi.mock('../timecards/service',()=>({readTimecards:readers.cards}));
vi.mock('../workspace-presentation/service',()=>({readActivePresentation:readers.presentation}));
vi.mock('../data/action-request-facts.server',()=>({withActionRequestFacts:async(_proof:unknown,_workspace:unknown,items:unknown)=>items}));
import {readActionCenter} from './service';

const observedAt='2026-09-28T12:00:00Z',week='2026-09-21';
const proof:SessionMutationProof={employee:{id:'owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const attendance:AttendanceDisplayReview={state:'ready',engineVersion:1,workspaceId:'workspace-test',timeZone:'America/Puerto_Rico',observedAt,
  scope:{kind:'TODAY_AND_OPEN',localDate:'2026-09-28',dayStartAt:'2026-09-28T04:00:00Z'},groups:[],recordCount:0,signalCount:0,affectedEmployeeCount:0,
  coverage:{state:'complete',limitations:[],deferredCapabilities:[]},validForMs:45000,pendingCorrectionCount:0,labels:{employees:[],locations:[]}};
const corrections:ManagerTimeCorrections={state:'ready',validForMs:45000,observedAt,timeZone:'America/Puerto_Rico',requests:[]};
const cards=(startDate:string,endDate:string,validForMs:number):TimecardsResult=>({...parseTimecardsResponse({observedAt,cards:[]},{startDate,endDate}),validForMs});
const current=()=>cards('2026-09-21','2026-09-27',45000);
const previous=()=>cards('2026-09-14','2026-09-20',1000);
const executor:SqlExecutor={query:async<T>()=>[{observedAt,remaining:45000}] as T[],transaction:async()=>[]};
const read=()=>readActionCenter(proof,week,executor,async()=>[]);

beforeEach(()=>{
  vi.resetAllMocks();
  vi.spyOn(performance,'now').mockReturnValue(0);
  readers.attendance.mockResolvedValue(attendance);readers.corrections.mockResolvedValue(corrections);
  readers.presentation.mockResolvedValue({modules:ALL_MODULES_ON});
  readers.cards.mockImplementation(async(_proof,period)=>period.startDate==='2026-09-14'?previous():current());
});
afterEach(()=>vi.restoreAllMocks());

it('bounds the actual action-center response by the shorter previous-week source',async()=>{
  const result=await read();
  expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('Expected ready aggregate');
  expect(result.validForMs).toBe(1000);
});
it.each(['access_denied','read_failed','schema_missing'] as const)('refuses an unavailable previous-week source: %s',async(reason)=>{
  readers.cards.mockImplementation(async(_proof,period)=>period.startDate==='2026-09-14'?{state:'unavailable',reason}:current());
  expect(await read()).toEqual({state:'unavailable',reason:reason==='access_denied'?'access_denied':'read_failed'});
});
it('does not return source rows after the shorter previous-week budget expires during loading',async()=>{
  vi.spyOn(performance,'now').mockReturnValueOnce(0).mockReturnValue(1500);
  expect(await read()).toEqual({state:'unavailable',reason:'read_failed'});
});
it('preserves a previous-week reader rejection as unavailable without private diagnostics',async()=>{
  readers.cards.mockImplementation(async(_proof,period)=>{if(period.startDate==='2026-09-14')throw Error('private source detail');return current();});
  expect(await read()).toEqual({state:'unavailable',reason:'read_failed'});
});
