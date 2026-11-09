import {beforeEach,expect,it,vi} from 'vitest';
import {employeeViewAuthority} from '../employee-view-authority.server';
import type {SessionMutationProof} from '../shift-changes/types';
const state=vi.hoisted(()=>({session:{id:'owner',role:'OWNER'} as {id:string;role:string}|null,proof:null as SessionMutationProof|null,read:vi.fn()}));
vi.mock('../auth/session',()=>({getSession:async()=>state.session,requireSessionMutationProof:async()=>state.proof}));
import {createStaffingReadPost} from './route.server';
const proof:SessionMutationProof={employee:{id:'owner',role:'OWNER',firstName:'Fictional',lastName:'Owner',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const req=(body:unknown={weekStart:'2030-10-07'},headers:Record<string,string>={})=>new Request('https://example.test/api/manager/time-off-staffing',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-leave-staffing':'1','x-nevora-actor':'owner','x-nevora-employee-view':employeeViewAuthority(proof,'requests'),...headers},body:JSON.stringify(body)});
beforeEach(()=>{state.session={id:'owner',role:'OWNER'};state.proof=proof;state.read.mockReset();state.read.mockResolvedValue({state:'ready',items:[]});});
it('returns a protected read for the bound current actor and view',async()=>{
 const result=await createStaffingReadPost('management',state.read)(req());
 expect(result.status).toBe(200);expect(result.headers.get('cache-control')).toBe('no-store, private');
 expect(await result.json()).toEqual({state:'ready',items:[]});
});
it('distinguishes missing session from an invalid mounted view',async()=>{
 state.session=null;let result=await createStaffingReadPost('management',state.read)(req());expect(result.status).toBe(401);expect(result.headers.get('x-nevora-failure')).toBe('authentication_required');
 state.session={id:'owner',role:'OWNER'};result=await createStaffingReadPost('management',state.read)(req(undefined,{'x-nevora-employee-view':'old'}));expect(result.status).toBe(403);expect(result.headers.get('x-nevora-failure')).toBe('view_invalid');
});
it.each([{}, {weekStart:'2030-10-08'},{weekStart:'2030-10-07',workspaceId:'foreign'},{weekStart:'2030-10-07',employeeId:''}])('rejects malformed or authority-selecting input %j',async body=>{
 expect((await createStaffingReadPost('management',state.read)(req(body))).status).toBe(400);
});
it('does not admit management roles to employee self-service or Employees to management',async()=>{
 expect((await createStaffingReadPost('employee',state.read)(req())).status).toBe(403);
 state.session={id:'owner',role:'EMPLOYEE'};
 expect((await createStaffingReadPost('management',state.read)(req())).status).toBe(403);
});
it('rejects an account replacement between the session read and mutation proof',async()=>{
 state.proof={...proof,employee:{...proof.employee,id:'other'}};
 expect((await createStaffingReadPost('management',state.read)(req())).status).toBe(403);
});
