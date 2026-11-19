import { beforeEach, expect, it, rs } from '@rstest/core';
const m=rs.hoisted(()=>({proof:rs.fn(),headers:rs.fn(),save:rs.fn()}));
rs.mock('server-only',()=>({}));
rs.mock('next/headers',()=>({headers:m.headers}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:m.proof}));
rs.mock('@/lib/clocker/break-types.server',()=>({saveBreakType:m.save,BreakTypeError:class extends Error{constructor(public code:string){super('Safe catalog error');}}}));
import { saveBreakTypeAction } from './actions';
const form=(extra:Record<string,string|undefined>={})=>{const data=new FormData();for(const [key,value] of Object.entries({id:'',expectedVersion:'0',name:'Rest',category:'REST',targetMinutes:'15',active:'true',...extra}))if(value!==undefined)data.set(key,value);return data;};
beforeEach(()=>{rs.clearAllMocks();m.proof.mockResolvedValue({employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)});m.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'http://localhost:3000'}));m.save.mockResolvedValue({id:'new',name:'Rest',category:'REST',targetMinutes:15,active:true,version:1});});
it('derives Owner proof on the server and parses an optional reference duration',async()=>{
 expect(await saveBreakTypeAction(form({targetMinutes:''}))).toMatchObject({ok:true});
 expect(m.save).toHaveBeenCalledWith({employeeId:'owner',sessionTokenHash:'a'.repeat(64)}, {name:'Rest',category:'REST',targetMinutes:null,active:true,expectedVersion:0});
});
it.each(['MANAGER','LEAD','EMPLOYEE'])('denies %s',async role=>{
 m.proof.mockResolvedValue({employee:{id:'other',role},sessionTokenHash:'a'.repeat(64)});
 expect(await saveBreakTypeAction(form())).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it.each([{actorId:'forged'},{autoEnd:'true'},{targetMinutes:'1e1'},{targetMinutes:'0'},{active:'yes'},{expectedVersion:'-1'},{expectedVersion:'1.5'}])('rejects forged or malformed input',async extra=>{
 expect(await saveBreakTypeAction(form(extra))).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it('rejects duplicate fields and cross-origin requests',async()=>{
 const data=form();data.append('name','Bad');expect(await saveBreakTypeAction(data)).toMatchObject({ok:false});
 m.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'https://evil.invalid'}));
 expect(await saveBreakTypeAction(form())).toMatchObject({ok:false});expect(m.save).not.toHaveBeenCalled();
});
it('preserves exact observed version for archive',async()=>{
 expect(await saveBreakTypeAction(form({id:'existing',expectedVersion:'2',active:'false'}))).toMatchObject({ok:true});
 expect(m.save).toHaveBeenCalledWith(expect.objectContaining({employeeId:'owner'}),expect.objectContaining({id:'existing',expectedVersion:2,active:false}));
});
it('ambiguous persistence errors block resubmission and do not expose SQL',async()=>{
 m.save.mockRejectedValue(Error('SQL credential secret'));const result=await saveBreakTypeAction(form());
 expect(result).toMatchObject({ok:false,refresh:true});expect(JSON.stringify(result)).not.toMatch(/SQL|credential|secret/);
});
