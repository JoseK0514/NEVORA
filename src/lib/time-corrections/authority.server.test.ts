import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const current=vi.hoisted(()=>vi.fn());
vi.mock('../auth/session',()=>({requireSessionMutationProof:current}));
import {correctionAuthority,matchesCorrectionAuthority} from './authority.server';
const proof={employee:{id:'A',role:'EMPLOYEE' as const,firstName:'A',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'d'.repeat(64)};
beforeEach(()=>{current.mockReset();current.mockResolvedValue(proof);});
it('binds correction intent to both employee and session without exposing the mutation proof',async()=>{
 const a=correctionAuthority(proof);
 expect(a).toMatch(/^[a-f0-9]{64}$/);expect(a).not.toBe(proof.sessionTokenHash);
 expect(await matchesCorrectionAuthority(a)).toBe(true);
 current.mockResolvedValue({...proof,employee:{...proof.employee,id:'B'}});expect(await matchesCorrectionAuthority(a)).toBe(false);
 current.mockResolvedValue({...proof,sessionTokenHash:'e'.repeat(64)});expect(await matchesCorrectionAuthority(a)).toBe(false);
});
it.each([null,'','a','x'.repeat(64)])('refuses absent or malformed origin binding %s',async binding=>{expect(await matchesCorrectionAuthority(binding)).toBe(false);expect(current).not.toHaveBeenCalled();});
it('fails closed for an expired or revoked originating session',async()=>{const binding=correctionAuthority(proof);current.mockRejectedValue(Error('Session expired'));expect(await matchesCorrectionAuthority(binding)).toBe(false);});
