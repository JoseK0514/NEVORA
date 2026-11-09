import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {employeeViewAuthority} from './employee-view-authority.server';
import type {SessionMutationProof} from './shift-changes/types';
const proof={employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('binds employee views to actual session and domain, without disclosing proof',()=>{
 const value=employeeViewAuthority(proof,'profile');
 expect(value).toMatch(/^[a-f0-9]{64}$/);expect(value).not.toBe(proof.sessionTokenHash);
 expect(value).not.toBe(employeeViewAuthority(proof,'notifications'));
 expect(value).not.toBe(employeeViewAuthority({...proof,sessionTokenHash:'b'.repeat(64)},'profile'));
 expect(value).not.toBe(employeeViewAuthority({...proof,employee:{...proof.employee,id:'other'}},'profile'));
});
