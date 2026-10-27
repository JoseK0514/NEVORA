import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeExchange} from './employee-exchange.server';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
const proof={employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('rejects management, forged proof and invalid selection before any private query',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 for(const [candidate,selection] of [[{...proof,employee:{...proof.employee,role:'OWNER'}},null],[{...proof,sessionTokenHash:'fake'},null],[proof,'../foreign']] as const)
  expect(await readEmployeeExchange(candidate as SessionMutationProof,db,selection)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.query).not.toHaveBeenCalled();expect(db.transaction).not.toHaveBeenCalled();
});
