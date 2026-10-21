import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({rows:[] as unknown[][],fail:null as Error|null}));
vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({id:'workspace-fictional',updatedAt:'2030-01-01',timeZone:'America/Puerto_Rico'}),workspaceReadGuard:()=>[]}));
vi.mock('@/lib/data/management-session',()=>({assertManagementProof:()=>{},managementSessionStatements:()=>[],isManagementAuthorizationError:()=>false}));
vi.mock('@/lib/data/sql-executor',()=>({neonNotificationExecutor:()=>executor}));
const executor={query:async()=>[],transaction:async()=>{if(state.fail)throw state.fail;return state.rows;}};
import {assertOperationalAccess,OperationalAuthorizationError,OperationalUnavailableError,isOperationalAuthorizationError} from './operational-scope.server';
const proof={employee:{id:'owner-fictional',role:'OWNER' as const,firstName:'QA',lastName:'Owner',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};

it('D2 a database that lacks Company Access reports a setup problem, not an access denial',async()=>{
 state.fail=Object.assign(new Error('relation "company_access_adoption" does not exist'),{code:'42P01'});
 const error=await assertOperationalAccess(proof,{kind:'COMPANY'},executor).catch(e=>e);
 expect(error).toBeInstanceOf(OperationalUnavailableError);expect(error.message).toBe('operational_unavailable:read_failed');
 expect(isOperationalAuthorizationError(error)).toBe(false);
});
it('D2 a session that reads fine but has no current authority is still an access denial',async()=>{
 state.fail=null;state.rows=[[]];
 const error=await assertOperationalAccess(proof,{kind:'COMPANY'},executor).catch(e=>e);
 expect(error).toBeInstanceOf(OperationalAuthorizationError);
});
