import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({proof:vi.fn(),headers:vi.fn(),save:vi.fn(),key:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({headers:m.headers}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:m.proof}));
vi.mock('@/lib/clocker/pin-crypto.server',()=>({readPinKey:m.key}));
vi.mock('@/lib/clocker/pins.server',()=>({setEmployeeClockerPin:m.save,ClockerPinError:class extends Error{constructor(public code:string){super('Safe PIN error');}}}));
import { saveClockerPinAction } from './actions';
const form=(overrides:Record<string,string|undefined>={})=>{const data=new FormData();for(const [k,v] of Object.entries({employeeId:'worker',pin:'0123',confirmPin:'0123',expectedVersion:'0',operationId:'11111111-1111-4111-8111-111111111111',...overrides})){if(v!==undefined)data.set(k,v);}return data;};
beforeEach(()=>{
 vi.clearAllMocks();m.proof.mockResolvedValue({employee:{id:'actor',role:'OWNER'},sessionTokenHash:'a'.repeat(64)});
 m.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'http://localhost:3000'}));
 m.key.mockReturnValue(Buffer.alloc(32,1));m.save.mockResolvedValue({employeeId:'worker',configured:true,version:1});
});
it('uses the authenticated actor, preserves a leading-zero PIN, and returns metadata only',async()=>{
 const result=await saveClockerPinAction(form());expect(result).toEqual({ok:true,version:1});
 expect(m.save).toHaveBeenCalledWith({employeeId:'actor',sessionTokenHash:'a'.repeat(64)},{employeeId:'worker',pin:'0123',expectedVersion:0,operationId:'11111111-1111-4111-8111-111111111111'},Buffer.alloc(32,1));
 expect(JSON.stringify(result)).not.toContain('0123');
});
it.each(['MANAGER','EMPLOYEE','LEAD'])('rejects %s management',async role=>{
 m.proof.mockResolvedValue({employee:{id:'actor',role},sessionTokenHash:'a'.repeat(64)});
 expect(await saveClockerPinAction(form())).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it.each([{pin:'123'}, {pin:'0123\n'}, {confirmPin:'9999'}, {expectedVersion:'-1'}, {expectedVersion:'1e0'}, {actorId:'forged'}, {operationId:'not-a-reference'}, {operationId:undefined}])('rejects malformed or forged data',async extra=>{
 expect(await saveClockerPinAction(form(extra))).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it('rejects duplicate fields and cross-origin submission',async()=>{
 const data=form();data.append('pin','0123');expect(await saveClockerPinAction(data)).toMatchObject({ok:false});
 m.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'https://evil.invalid'}));
 expect(await saveClockerPinAction(form())).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it('does not echo unknown SQL/secret errors after an ambiguous save',async()=>{
 m.save.mockRejectedValue(new Error('SQL pin=0123 pepper=SECRET'));
 const result=await saveClockerPinAction(form());expect(result).toMatchObject({ok:false,refresh:true});
 expect(JSON.stringify(result)).not.toMatch(/0123|SECRET|SQL/);
});
