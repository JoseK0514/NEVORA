import * as rstestOriginal0 from "../company-access/operational-scope.server" with { rstest: 'importActual' };
import {afterEach,expect,it,rs} from '@rstest/core';
import {managementProof} from '../../test/fixtures/management';
import type {SqlExecutor} from '../notifications/types';
import {withServerErrorDiagnostics} from '../server-error';
const workspace={id:'test-workspace',active:true,timeZone:'America/Puerto_Rico'};
rs.mock('../data/workspaces',()=>({getWorkspace:async()=>workspace,workspaceReadGuard:()=>[]}));
rs.mock('../company-access/operational-scope.server', ()=>({...rstestOriginal0,assertOperationalAccess:async()=>({workspace,authority:'a'.repeat(64)}),operationalScopeStatements:()=>[]}));
import {readTimecards,mutateTimecard} from './service';
afterEach(()=>{ rs.restoreAllMocks(); });
const command={startDate:'2030-10-07',endDate:'2030-10-13',operationId:'11111111-1111-4111-8111-111111111111',employeeId:'E',expectedRevision:0,expectedSourceHash:'a'.repeat(32),action:'APPROVE'};
it.each(['read','command'])('handled unexpected timecard %s failure shares its private response reference',async kind=>{
 const sink=rs.spyOn(console,'error').mockImplementation(()=>{});
 const executor:SqlExecutor={query:rs.fn(),transaction:async()=>{throw Object.assign(new Error('private workforce SQL'),{code:'ECONNRESET'});}};
 const response=await withServerErrorDiagnostics('/api/timecards-test',async()=>{
  const body=kind==='read'?await readTimecards(managementProof('M'),command,executor):await mutateTimecard(managementProof('M'),command,executor);
  return Response.json(body,{status:503});
 });
 const id=response.headers.get('X-Nevora-Request-Id');expect(id).toMatch(/^[a-f0-9-]{36}$/);
 expect(await response.json()).toEqual(kind==='read'?{state:'unavailable',reason:'read_failed'}:{status:'outcome-unknown',operationId:command.operationId});
 expect(JSON.parse(sink.mock.calls[0][0])).toMatchObject({requestId:id,route:'/api/timecards-test'});
 expect(JSON.stringify(sink.mock.calls)).not.toContain('workforce');
});
it('expected timecard conflict preserves its contract without unexpected diagnostics',async()=>{
 const sink=rs.spyOn(console,'error').mockImplementation(()=>{});
 const executor:SqlExecutor={query:rs.fn(),transaction:async()=>{throw Object.assign(new Error('nevora_timecard_CONFLICT'),{code:'22P02'});}};
 const response=await withServerErrorDiagnostics('/api/timecards-test',async()=>Response.json(await mutateTimecard(managementProof('M'),command,executor),{status:409}));
 expect(await response.json()).toEqual({status:'conflict'});expect(response.headers.get('X-Nevora-Request-Id')).toBeNull();expect(sink).not.toHaveBeenCalled();
});
