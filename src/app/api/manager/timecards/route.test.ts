import {beforeEach,it,expect,rs} from '@rstest/core';
const state=rs.hoisted(()=>({session:{id:'M1',role:'MANAGER'} as {id:string;role:string}|null,mutate:rs.fn(),parse:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({getSession:async()=>state.session,requireSessionMutationProof:async()=>({employee:state.session,sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/timecards/service',()=>({mutateTimecard:state.mutate,parseTimecardCommand:state.parse}));
import {POST} from './route';
const req=(actor='M1')=>new Request('https://example.test/api/manager/timecards',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-timecards':'1','x-nevora-actor':actor},body:JSON.stringify({action:'APPROVE'})});
beforeEach(()=>{state.session={id:'M1',role:'MANAGER'};state.mutate.mockReset();state.parse.mockReset();state.parse.mockImplementation(v=>v);state.mutate.mockResolvedValue({status:'approved',operationId:'fictional',revision:1});});
it('D8 timecard mutation binds the current management proof to the caller actor',async()=>{expect((await POST(req())).status).toBe(200);expect(state.mutate).toHaveBeenCalledWith({employee:state.session,sessionTokenHash:'a'.repeat(64)},{action:'APPROVE'});});
it.each(['OTHER',''])('D8 account switching or missing actor cannot replay a timecard action (%s)',async actor=>{expect((await POST(req(actor))).status).toBe(403);expect(state.mutate).not.toHaveBeenCalled();});
it('D8 session and role loss refuse writes before parsing',async()=>{state.session=null;expect((await POST(req())).status).toBe(401);state.session={id:'M1',role:'LEAD'};expect((await POST(req())).status).toBe(403);expect(state.parse).not.toHaveBeenCalled();});
it('D8 conflicts and unknown outcomes preserve their explicit transport state',async()=>{state.mutate.mockResolvedValue({status:'conflict'});expect((await POST(req())).status).toBe(409);state.mutate.mockResolvedValue({status:'outcome-unknown',operationId:'fictional'});expect((await POST(req())).status).toBe(503);});
it('returns the missing shift outcome reason to individual and batch clients',async()=>{
 const blocked={status:'blocked',reason:'missing_shift_disposition'};
 state.mutate.mockResolvedValue(blocked);
 const response=await POST(req());
 expect(response.status).toBe(409);
 expect(await response.json()).toEqual(blocked);
});
