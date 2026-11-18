import * as rstestOriginal0 from "../../test/fixtures/business-sql-session" with { rstest: 'importActual' };
import * as rstestOriginal1 from "../db" with { rstest: 'importActual' };
rs.mock('./sql-session-contract',()=>rstestOriginal0);
import {beforeEach,expect,it,rs} from '@rstest/core';
import {requireSession,requireSessionMutationProof} from '@/lib/auth/session';
import {getDb} from '@/lib/db';
import {getAttendanceReview} from './attendance-review';
import {readAttendanceReview} from './attendance-review.server';

rs.mock('server-only',()=>({}));
rs.mock('@/lib/auth/session',()=>({
  requireSession:rs.fn(),
  requireSessionMutationProof:rs.fn(),
}));

rs.mock('next/navigation',()=>({
  redirect:(path:string)=>{throw Error(`redirect:${path}`);},
}));
rs.mock('@/lib/db',()=>({
  ...rstestOriginal1,
  getDb:rs.fn(),
}));
rs.mock('./attendance-review.server',()=>({readAttendanceReview:rs.fn()}));

const employee={
  id:'owner',
  firstName:'Owner',
  lastName:'QA',
  role:'OWNER' as const,
  primaryLocationId:'loc-1',
};
const proof={employee,sessionTokenHash:'a'.repeat(64)};

beforeEach(()=>{
  rs.clearAllMocks();
  rs.mocked(requireSession).mockResolvedValue(employee);
  rs.mocked(requireSessionMutationProof).mockResolvedValue(proof);
  rs.mocked(getDb).mockReturnValue({} as ReturnType<typeof getDb>);
  rs.mocked(readAttendanceReview).mockResolvedValue({
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
  rs.mocked(requireSession).mockResolvedValue({...employee,role});
  await expect(getAttendanceReview()).rejects.toThrow('redirect:/app/restricted');
  expect(getDb).not.toHaveBeenCalled();
  expect(requireSessionMutationProof).not.toHaveBeenCalled();
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('reports missing database configuration without deriving a business-data proof',async()=>{
  rs.mocked(getDb).mockImplementation(()=>{throw Error('DATABASE_URL is not configured.');});
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'not_configured'});
  expect(requireSessionMutationProof).not.toHaveBeenCalled();
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('a session lost between role check and fresh proof is an authority denial',async()=>{
  rs.mocked(requireSessionMutationProof).mockRejectedValue(Error('redirect:/login'));
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'access_denied'});
  expect(readAttendanceReview).not.toHaveBeenCalled();
});

it('never reflects a reader transport diagnostic at the server boundary',async()=>{
  rs.mocked(readAttendanceReview).mockRejectedValue(Error('postgres://secret token_hash=private'));
  expect(await getAttendanceReview()).toEqual({state:'unavailable',reason:'read_failed'});
});
