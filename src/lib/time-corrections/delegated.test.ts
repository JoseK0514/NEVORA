import {afterEach,expect,it,vi} from 'vitest';
import {parseDelegatedTimeCorrections} from './delegated';
import {delegatedJournalKey,pendingDelegated,rememberDelegated,forgetDelegated} from './delegated-recovery';
import {submitDelegatedTimeCorrection} from './client';
import type {CorrectionRequestCommand} from './validation';
const scope='b'.repeat(64),ready={state:'ready',employeeId:'E1',employeeName:'Fictional Worker',observedAt:'2026-11-10T12:00:00Z',timeZone:'America/Puerto_Rico',validForMs:15000,recoveryScope:scope,authority:'a'.repeat(64),totalRequests:0,requests:[],targets:[],locations:[]};
const command:CorrectionRequestCommand={operationId:'11111111-1111-4111-8111-111111111111',kind:'MISSING_ENTRY',locationId:'L1',proposedStartAt:'2026-11-01T10:00:00Z',proposedEndAt:'2026-11-01T12:00:00Z',reason:'Confirmed work for separate review.'};
afterEach(()=>vi.unstubAllGlobals());
it('rejects a wrong target/company, absent originating authority and invalid observation budgets',()=>{
 expect(parseDelegatedTimeCorrections(ready,'E1',scope)).toMatchObject({state:'ready',employeeId:'E1'});
 for(const patch of [{employeeId:'E2'},{recoveryScope:'c'.repeat(64)},{authority:undefined},{validForMs:0},{validForMs:15001}])expect(()=>parseDelegatedTimeCorrections({...ready,...patch},'E1',scope)).toThrow();
 expect(parseDelegatedTimeCorrections({state:'unavailable',reason:'access_denied'},'E1',scope)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('retains an immutable pending command only under the exact origin/company/actor/target and reconciles only its operation',()=>{
 const key=delegatedJournalKey('https://qa.invalid',scope,'OWNER','E1');rememberDelegated(key,command);const copy=pendingDelegated(key)!;copy.reason='Changed caller copy';expect(pendingDelegated(key)).toEqual(command);
 for(const [origin,company,actor,target] of [['https://foreign.invalid',scope,'OWNER','E1'],['https://qa.invalid','c'.repeat(64),'OWNER','E1'],['https://qa.invalid',scope,'MANAGER','E1'],['https://qa.invalid',scope,'OWNER','E2']])expect(pendingDelegated(delegatedJournalKey(origin,company,actor,target))).toBeNull();
 expect(()=>rememberDelegated(key,{...command,reason:'Changed retry'})).toThrow();forgetDelegated(key,'other');expect(pendingDelegated(key)).toEqual(command);forgetDelegated(key,command.operationId);expect(pendingDelegated(key)).toBeNull();
});
it.each([{state:'pending',operationId:command.operationId,requestId:'22222222-2222-4222-8222-222222222222',revision:1},{state:'pending',operationId:command.operationId,requestId:command.operationId,revision:2},{state:'approved',operationId:command.operationId,requestId:command.operationId,revision:2,adjustmentId:command.operationId}])('does not accept an unrelated or impossible creation receipt',async body=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json(body)));expect(await submitDelegatedTimeCorrection('E1',command,'OWNER',ready.authority,new AbortController().signal)).toEqual({state:'outcome_unknown',operationId:command.operationId});
});
