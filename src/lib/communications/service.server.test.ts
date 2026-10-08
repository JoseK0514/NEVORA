import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import * as service from './service.server';
import type {SessionMutationProof} from '../shift-changes/types';
const proof:SessionMutationProof={employee:{id:'self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
it('invalid commands reject arbitrary recipients before any database access',async()=>{
 const execute=service.executeCommunicationCommand;
 expect(execute).toBeTypeOf('function');
 const executor={query:async()=>{throw Error('Unexpected access');},transaction:async()=>{throw Error('Unexpected access');}};
 expect(await execute(proof,{kind:'PUBLISH',operationId:'invalid',authority:'a'.repeat(64),recipientIds:['other']} as never,executor)).toEqual({status:'blocked',reason:'invalid_command'});
});
it('proof lifetime binding changes across accounts and replacement sessions without exposing hashes',()=>{
 expect(service.communicationAuthority).toBeTypeOf('function');
 const authority=service.communicationAuthority(proof);
 expect(authority).toMatch(/^[a-f0-9]{64}$/);
 expect(authority).not.toBe(proof.sessionTokenHash);
 expect(service.communicationAuthority({...proof,sessionTokenHash:'b'.repeat(64)})).not.toBe(authority);
 expect(service.communicationAuthority({...proof,employee:{...proof.employee,id:'other'}})).not.toBe(authority);
});
