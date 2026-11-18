import * as rstestOriginal0 from "./config.server" with { rstest: 'importActual' };
import {afterEach,expect,it,rs} from '@rstest/core';
const fixture=rs.hoisted(()=>({mode:'isolated',record:{id:'11111111-1111-4111-8111-111111111111',environment:'test'}}));
rs.mock('./config.server', ()=>({...rstestOriginal0,workspaceMode:()=>fixture.mode,readWorkspaceRoutingConfig:()=>({}),readWorkerRoutingConfig:()=>({secretScope:'WORKER_ONLY'})}));
rs.mock('../onboarding/control-store.server',()=>({runtimeControlStore:()=>({})}));
rs.mock('./resolver.server',()=>({resolveWorkspaceBinding:async()=>({}),workspaceBindingFacts:()=>({record:fixture.record})}));
rs.mock('./context.server',()=>({withWorkspaceBinding:async(_binding:unknown,work:()=>unknown)=>work(),currentWorkspaceBinding:async()=>({})}));
import {withWorkerWorkspace} from './worker.server';
afterEach(()=>{rs.unstubAllEnvs();fixture.mode='isolated';});
const select=()=>{rs.stubEnv('NEVORA_WORKER_EXPECTED_WORKSPACE_ID',fixture.record.id);rs.stubEnv('NEVORA_WORKER_EXPECTED_ENVIRONMENT','test');};
it('preserves original invocation behavior and admits an explicitly matching isolated worker scope',async()=>{
 const work=rs.fn(async()=>true);expect(await withWorkerWorkspace('https://company.example.test',work)).toBe(true);select();expect(await withWorkerWorkspace('https://company.example.test',work)).toBe(true);expect(work).toHaveBeenCalledTimes(2);
});
it('refuses a different company or environment before any business work',async()=>{
 for(const mismatch of ['id','environment']){select();rs.stubEnv(mismatch==='id'?'NEVORA_WORKER_EXPECTED_WORKSPACE_ID':'NEVORA_WORKER_EXPECTED_ENVIRONMENT',mismatch==='id'?'22222222-2222-4222-8222-222222222222':'production');const work=rs.fn();await expect(withWorkerWorkspace('https://company.example.test',work)).rejects.toThrow();expect(work).not.toHaveBeenCalled();}
});
it('refuses partial scope assertions and any legacy fallback for an operations-scoped invocation',async()=>{
 const work=rs.fn();rs.stubEnv('NEVORA_WORKER_EXPECTED_WORKSPACE_ID',fixture.record.id);await expect(withWorkerWorkspace('https://company.example.test',work)).rejects.toThrow();select();fixture.mode='single_company';await expect(withWorkerWorkspace(undefined,work)).rejects.toThrow();expect(work).not.toHaveBeenCalled();
});
