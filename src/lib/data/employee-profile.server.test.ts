import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeProfile} from './employee-profile.server';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
const employee={id:'self',firstName:'Avery',lastName:'QA',role:'EMPLOYEE',primaryLocationId:'loc-1'} as const;
const proof:SessionMutationProof={employee,sessionTokenHash:'a'.repeat(64)};
it('rejects forged proof and management before any private read',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 for(const bad of [{...proof,sessionTokenHash:'fake'},{...proof,employee:{...employee,role:'MANAGER' as const}}])expect(await readEmployeeProfile(bad,db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.query).not.toHaveBeenCalled();expect(db.transaction).not.toHaveBeenCalled();
});
it('fails closed on storage failure without private detail or verified empty',async()=>{
 const db={query:async()=>{throw Error('private SQL details');},transaction:vi.fn()} as unknown as SqlExecutor;
 expect(await readEmployeeProfile(proof,db)).toEqual({state:'unavailable',reason:'read_failed'});
});
