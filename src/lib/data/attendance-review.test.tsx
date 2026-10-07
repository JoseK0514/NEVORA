import {beforeEach,expect,it,vi} from 'vitest';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {getDb} from '@/lib/db';
import {getAttendanceReview} from './attendance-review';
import {readAttendanceReview} from './attendance-review.server';

vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({
  requireSession:vi.fn(),
  requireSessionMutationProof:vi.fn(),
}));
vi.mock('@/lib/auth/permissions',()=>import('../auth/permissions'));
vi.mock('next/navigation',()=>({
  redirect:(path:string)=>{throw Error(`redirect:${path}`);},
}));
vi.mock('@/lib/db',async()=>({
  ...await vi.importActual<typeof import('../db')>('../db'),
  getDb:vi.fn(),
}));
vi.mock('./attendance-review.server',()=>({readAttendanceReview:vi.fn()}));

const employee={
  id:'owner',
  firstName:'Owner',
  lastName:'QA',
  role:'OWNER' as const,
  primaryLocationId:'loc-1',
};
const proof={employee,sessionTokenHash:'a'.repeat(64)};

beforeEach(()=>{
  vi.clearAllMocks();
  vi.mocked(requireSession).mockResolvedValue(employee);
  vi.mocked(requireSessionMutationProof).mockResolvedValue(proof);
  vi.mocked(getDb).mockReturnValue({} as ReturnType<typeof getDb>);
  vi.mocked(readAttendanceReview).mockResolvedValue({
    state:'ready',
    engineVersion:1,
    workspaceId:'workspace-fuel',
    timeZone:'America/Puerto_Rico',
    observedAt:'2030-10-07T12:00:00Z',
    validForMs:45000,
    scope:{
      kind:'TODAY_AND_OPEN',
      localDate:'2030-10-07',
      dayStartAt:'2030-10-07T04:00:00Z',
    },
    groups:[],
    recordCount:0,
    signalCount:0,
    affectedEmployeeCount:0,
      pendingCorrectionCount: 0,
    labels:{employees:[],locations:[]},
    coverage:{
      state:'complete',
      limitations:[],
      deferredCapabilities:[],
    },
  });
});

it('derives both manager role and fresh reader proof from the portal cookie boundary',async()=>{
  expect(await getAttendanceReview()).toMatchObject({state:'ready'});
  expect(requireSession).toHaveBeenCalledOnce();
  expect(requireSessionMutationProof).toHaveBeenCalledOnce();
  expect(readAttendanceReview).toHaveBeenCalledWith(proof);
});

it.each(['EMPLOYEE','LEAD'] as const)('rejects %s before database setup or proof derivation',async role=>{
  vi.mocked(requireSession).mockResolvedValue({...employee,role});
  await expect(getAttendanceReview()).rejects.toThrow('redirect:/app');
  expect(getDb).not.toHaveBeenCalled();
  expect(requireSessionMutationProof).not.toHaveBeenCalled();
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('reports missing database configuration without deriving a business-data proof',async()=>{
  vi.mocked(getDb).mockImplementation(()=>{throw Error('DATABASE_URL is not configured.');});
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'not_configured'});
  expect(requireSessionMutationProof).not.toHaveBeenCalled();
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('a session lost between role check and fresh proof is an authority denial',async()=>{
  vi.mocked(requireSessionMutationProof).mockRejectedValue(Error('redirect:/login'));
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'access_denied'});
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('never reflects a reader transport diagnostic at the server boundary',async()=>{
  vi.mocked(readAttendanceReview).mockRejectedValue(Error('postgres://secret token_hash=private'));
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'read_failed'});
});
