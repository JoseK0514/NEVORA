import {beforeEach,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({role:'MANAGER' as 'OWNER'|'MANAGER'|'EMPLOYEE',read:vi.fn()}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>({id:'actor',role:state.role}),requireSessionMutationProof:async()=>({employee:{id:'actor',role:state.role},sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/auth/invitations/service.server',()=>({readInvitationStatus:state.read,issueOrRevokeInvitation:vi.fn(),readInvitationOperation:vi.fn()}));
import {invitationHttp} from './invitation-http.server';
beforeEach(()=>{state.role='MANAGER';state.read.mockReset().mockResolvedValue({state:'ready',employeeId:'target',allowedCommands:[]});});
const request=(method='GET')=>new Request('https://owned.invalid/api/company-access/invitations/target',{method,headers:{origin:'https://owned.invalid','sec-fetch-site':'same-origin','x-nevora-company-access':'1','x-nevora-actor':'actor','content-type':'application/json'},...(method==='POST'?{body:'{}'}:{})});
it('admits Manager readiness reads and leaves target scope enforcement to the protected service',async()=>{expect((await invitationHttp(request(),'status','target')).status).toBe(200);expect(state.read).toHaveBeenCalledOnce();state.read.mockResolvedValue({state:'unavailable',reason:'access_denied'});expect((await invitationHttp(request(),'status','target')).status).toBe(403);});
it('does not admit Manager commands or receipts, or Employee readiness reads',async()=>{expect((await invitationHttp(request('POST'),'command','target')).status).toBe(403);expect((await invitationHttp(request(),'operation','target')).status).toBe(403);state.role='EMPLOYEE';expect((await invitationHttp(request(),'status','target')).status).toBe(403);expect(state.read).not.toHaveBeenCalled();});
