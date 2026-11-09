import {expect,it} from 'vitest';
import {readEmployeeCreation} from './employee-creation.server';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
it('rejects management, forged proof, invalid mode and arbitrary source selectors before any SQL',async()=>{
 let touched=false;const executor:SqlExecutor={async query(){touched=true;return[];},async transaction(){touched=true;return[];}};
 for(const [proof,mode,source]of [[{employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)},'swap','own'],[{employee:{id:'own',role:'EMPLOYEE'},sessionTokenHash:''},'swap','own'],[{employee:{id:'own',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)},'MANAGER_APPROVE','own'],[{employee:{id:'own',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)},'callout','bad/selector']] as const)expect(await readEmployeeCreation(proof as SessionMutationProof,executor,mode,source)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(touched).toBe(false);
});
