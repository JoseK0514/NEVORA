import {expect,it} from 'vitest';
import {executeManagerReminder,findManagerReminderOperation} from './service.server';
import {communicationAuthority} from '../communications/service.server';
import type {SessionMutationProof} from '../shift-changes/types';
const proof:SessionMutationProof={employee:{id:'owner',role:'OWNER',primaryLocationId:'loc-1',firstName:'Fictional',lastName:'Owner'},sessionTokenHash:'a'.repeat(64)};
const executor={query:async()=>{throw Error('Unexpected database read');},transaction:async()=>{throw Error('Unexpected database read');}};
const command={kind:'AVAILABILITY' as const,operationId:'11111111-1111-4111-8111-111111111111',authority:communicationAuthority(proof),employeeId:'employee',weekStart:'2026-11-16',expectedDeadline:'2026-11-15T17:00:00.000Z'};
it('rejects malformed, employee, and replacement-session commands before database work',async()=>{
 expect(await executeManagerReminder(proof,{...command,recipientIds:['other']} as never,executor)).toEqual({status:'blocked',reason:'invalid_command'});
 expect(await executeManagerReminder({...proof,employee:{...proof.employee,role:'EMPLOYEE'}},command,executor)).toEqual({status:'blocked',reason:'access_denied'});
 expect(await executeManagerReminder({...proof,sessionTokenHash:'b'.repeat(64)},command,executor)).toEqual({status:'blocked',reason:'access_denied'});
});
it('status lookup requires valid ID and same session authority before database work',async()=>{
 expect(await findManagerReminderOperation(proof,'invalid',command.authority,executor)).toEqual({status:'blocked',reason:'access_denied'});
 expect(await findManagerReminderOperation({...proof,sessionTokenHash:'b'.repeat(64)},command.operationId,command.authority,executor)).toEqual({status:'blocked',reason:'access_denied'});
});
