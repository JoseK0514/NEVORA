import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {readPayrollCapabilities} from './service';

/** Inspection B1: the navigation's payroll capabilities are one lock-free statement that checks the session in the
 * same snapshot. Payroll APIs keep guarded() (locks plus a second authority check); these booleans grant nothing. */
const proof=(role:'OWNER'|'MANAGER'|'EMPLOYEE'):SessionMutationProof=>({employee:{id:'fictional-'+role.toLowerCase(),firstName:'Fictional',lastName:'Person',role,primaryLocationId:'loc-1'},sessionTokenHash:'f'.repeat(64)});
const previous=process.env.NEVORA_PAYROLL_ENABLED;
beforeEach(()=>{process.env.NEVORA_PAYROLL_ENABLED='true';});
afterEach(()=>{if(previous===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=previous;});
function executor(row:Record<string,unknown>|undefined){
 const statements:SqlStatement[]=[];
 const ex:SqlExecutor={query:async<T,>(statement:SqlStatement)=>{statements.push(statement);return (row?[row]:[]) as T[];},transaction:async()=>{throw Error('capabilities must not open a locking transaction');}};
 return {ex,statements};
}

it('reads the Owner capabilities in a single statement with no row or table lock',async()=>{
 const {ex,statements}=executor({owner:true,review:false,approve:false,native:true});
 await expect(readPayrollCapabilities(proof('OWNER'),ex)).resolves.toEqual(expect.objectContaining({enabled:true,canConfigure:true,canReview:true,canApprove:true,internalCalculatorAvailable:true}));
 expect(statements).toHaveLength(1);
 const [statement]=statements;
 expect(statement.text).not.toMatch(/\bFOR (UPDATE|NO KEY UPDATE|SHARE|KEY SHARE)\b|LOCK TABLE/i);
 // The session, its expiry, the active employee and the active singleton company are part of the same statement.
 expect(statement.text).toContain('s.token_hash=$2');expect(statement.text).toContain('s.expires_at>clock_timestamp()');
 expect(statement.text).toContain('e.active');expect(statement.text).toContain('w.singleton AND w.active');
 expect(statement.values).toEqual(['fictional-owner','f'.repeat(64)]);
});

it('evaluates Manager review and approve grants with the payroll scope predicate; others get none',async()=>{
 const manager=executor({owner:false,review:true,approve:false,native:false});
 await expect(readPayrollCapabilities(proof('MANAGER'),manager.ex)).resolves.toEqual(expect.objectContaining({canConfigure:false,canReview:true,canApprove:false,internalCalculatorAvailable:false}));
 expect(manager.statements[0].text).toContain('native_payroll_manager_scopes_current');
 const employee=executor({owner:false,review:false,approve:false,native:true});
 await expect(readPayrollCapabilities(proof('EMPLOYEE'),employee.ex)).resolves.toEqual(expect.objectContaining({canConfigure:false,canReview:false,canApprove:false}));
 expect(employee.statements[0].text).not.toContain('native_payroll_manager_scopes_current');
});

it('refuses an invalid or expired session instead of answering',async()=>{
 await expect(readPayrollCapabilities(proof('OWNER'),executor(undefined).ex)).rejects.toThrow('PAYROLL_AUTHORIZATION');
});

it('never queries when payroll is off',async()=>{
 delete process.env.NEVORA_PAYROLL_ENABLED;
 const {ex,statements}=executor({owner:true});
 await expect(readPayrollCapabilities(proof('OWNER'),ex)).resolves.toEqual(expect.objectContaining({enabled:false}));
 expect(statements).toHaveLength(0);
});
