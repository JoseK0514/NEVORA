import {beforeEach,afterEach,expect,it,rs} from '@rstest/core';
import {createRestrictionPost} from './restrictions-route.server';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {managementProof} from '../../test/fixtures/management';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {RestrictionError,emptyRestrictionDocument} from './restrictions';
rs.mock('../auth/session',()=>({getSession:rs.fn(),requireSessionMutationProof:rs.fn()}));
const proof=managementProof('owner','OWNER');
beforeEach(()=>{rs.stubEnv('FUEL_PORTAL_ORIGIN','https://dev.example.test');rs.mocked(getSession).mockResolvedValue(proof.employee);rs.mocked(requireSessionMutationProof).mockResolvedValue(proof);});
afterEach(()=>{rs.unstubAllEnvs();rs.clearAllMocks();});
const services=()=>({read:rs.fn(async()=>({document:emptyRestrictionDocument(),legacyUnconfirmed:true,earliestWeek:'2030-10-07'})),mutate:rs.fn()});
function request(body:unknown={employeeId:'worker',action:'read'},headers:Record<string,string>={},url='https://dev.example.test/api/manager/scheduling-restrictions'){
 return new Request(url,{method:'POST',headers:{origin:'https://dev.example.test','content-type':'application/json','x-nevora-scheduling-restrictions':'1','x-nevora-actor':'owner','x-nevora-employee-view':employeeViewAuthority(proof,'planning'),...headers},body:typeof body==='string'?body:JSON.stringify(body)});
}
const boundaryHeaders:Record<string,string>[]=[
 {origin:'https://attacker.example'}, {'sec-fetch-site':'cross-site'}, {'x-nevora-scheduling-restrictions':'0'}, {'content-type':'text/plain'}, {'x-nevora-actor':'other'}, {'x-nevora-employee-view':'stale'},
];
it.each(boundaryHeaders)('rejects forged request boundaries before reading private restrictions %j',async headers=>{
 const s=services(),response=await createRestrictionPost('management',s)(request(undefined,headers));
 expect(response.status).toBe(403);expect(s.read).not.toHaveBeenCalled();expect(s.mutate).not.toHaveBeenCalled();
});
it('returns private no-store responses and a canonical read',async()=>{
 const response=await createRestrictionPost('management',services())(request());expect(response.status).toBe(200);
 expect(response.headers.get('cache-control')).toBe('no-store, private');expect(response.headers.get('vary')).toBe('Cookie');
 expect(await response.json()).toMatchObject({state:'ready',legacyUnconfirmed:true,data:{revision:0,versions:[]}});
});
it('does not accept the Employee route as management admission',async()=>{
 expect((await createRestrictionPost('employee',services())(request())).status).toBe(403);
});
it('denies an employee selecting another employee even with a valid own lifetime',async()=>{
 const worker=managementProof('worker','EMPLOYEE');rs.mocked(getSession).mockResolvedValue(worker.employee);rs.mocked(requireSessionMutationProof).mockResolvedValue(worker);
 const response=await createRestrictionPost('employee',services())(request({employeeId:'other',action:'read'},{'x-nevora-actor':'worker','x-nevora-employee-view':employeeViewAuthority(worker,'planning')}));
 expect(response.status).toBe(403);
});
it('rejects session/proof role mismatch',async()=>{
 rs.mocked(getSession).mockResolvedValue({...proof.employee,role:'MANAGER'});
 expect((await createRestrictionPost('management',services())(request())).status).toBe(403);
});
it('rejects oversized bodies, extra authority fields and malformed commands',async()=>{
 const post=createRestrictionPost('management',services());
 expect((await post(request('x'.repeat(17000)))).status).toBe(400);
 expect((await post(request({employeeId:'worker',action:'read',approvedBy:'forged'}))).status).toBe(400);
 expect((await post(request({employeeId:'worker',action:'command',command:{kind:'SET'}}))).status).toBe(400);
});
it('reports a typed lock without exposing SQL errors',async()=>{
 const s=services();s.mutate.mockRejectedValue(new RestrictionError('locked','2030-11-11'));
 const response=await createRestrictionPost('management',s)(request({employeeId:'worker',action:'command',command:{kind:'SET',operationId:'11111111-1111-4111-8111-111111111111',expectedRevision:0,effectiveWeek:'2030-10-07',unavailable:[],reason:'Agreed'}}));
 expect(response.status).toBe(409);expect(await response.json()).toEqual({state:'locked',earliestWeek:'2030-11-11'});
});
it('preserves the operation ID after an unknown write outcome for same-key recovery',async()=>{
 const s=services();s.mutate.mockRejectedValue(Error('private connection diagnostic'));
 const response=await createRestrictionPost('management',s)(request({employeeId:'worker',action:'command',command:{kind:'SET',operationId:'11111111-1111-4111-8111-111111111111',expectedRevision:0,effectiveWeek:'2030-10-07',unavailable:[],reason:'Agreed'}}));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'outcome_unknown',operationId:'11111111-1111-4111-8111-111111111111'});
});
