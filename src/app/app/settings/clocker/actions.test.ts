import { beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({proof:vi.fn(),headers:vi.fn(),register:vi.fn(),rename:vi.fn(),rotate:vi.fn(),revoke:vi.fn()}));
vi.mock('server-only',()=>({}));
vi.mock('next/headers',()=>({headers:mocks.headers}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:mocks.proof}));
vi.mock('@/lib/clocker/devices.server',()=>({
 registerClockerDevice:mocks.register,renameClockerDevice:mocks.rename,rotateClockerDevice:mocks.rotate,revokeClockerDevice:mocks.revoke,
 ClockerDeviceError:class extends Error{constructor(public code:string,message:string){super(message);}},
}));
import {manageClockerDeviceAction} from './actions';
const record={id:'tablet',name:'Front tablet',locationId:'loc-1',workspaceId:'workspace-fuel',active:true,version:2,credentialVersion:1,lastSeenAt:null,enrollmentExpiresAt:'2030-10-07 12:10:00-04',enrolledAt:null,revokedAt:null,state:'PENDING'};
const data=(values:Record<string,string>)=>{const form=new FormData();for(const [key,value]of Object.entries(values))form.set(key,value);return form;};
beforeEach(()=>{
 vi.clearAllMocks();
 mocks.proof.mockResolvedValue({employee:{id:'real-owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)});
 mocks.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'http://localhost:3000'}));
 mocks.register.mockResolvedValue({device:{...record,credentialHash:'must-not-leak'},enrollmentToken:'nev_enr_'+'e'.repeat(64)});
 mocks.rotate.mockResolvedValue({device:record,enrollmentToken:'nev_enr_'+'f'.repeat(64)});
 mocks.rename.mockResolvedValue({...record,name:'New name',version:3});mocks.revoke.mockResolvedValue({...record,state:'REVOKED',version:3});
});
it('derives registration authority from the live server session and returns a secret-free device DTO',async()=>{
 const result=await manageClockerDeviceAction(data({operation:'REGISTER',name:'Front tablet',locationId:'loc-1'}));
 expect(result).toMatchObject({ok:true,device:{id:'tablet',version:2},setup:{code:'nev_enr_'+'e'.repeat(64),expiresAt:'2030-10-07T16:10:00.000Z'}});
 expect(mocks.register).toHaveBeenCalledWith({employeeId:'real-owner',sessionTokenHash:'a'.repeat(64)},{name:'Front tablet',locationId:'loc-1'});
 expect(JSON.stringify(result)).not.toMatch(/credentialHash|credentialVersion|workspaceId|sessionTokenHash/);
});
it.each(['MANAGER','LEAD','EMPLOYEE'])('blocks %s from Owner device actions',async role=>{
 mocks.proof.mockResolvedValue({employee:{id:'actor',role},sessionTokenHash:'a'.repeat(64)});
 expect(await manageClockerDeviceAction(data({operation:'REGISTER',name:'No',locationId:'loc-1'}))).toMatchObject({ok:false});
 expect(mocks.register).not.toHaveBeenCalled();
});
it('rejects extra actor and credential fields instead of trusting forged form data',async()=>{
 expect(await manageClockerDeviceAction(data({operation:'REGISTER',name:'No',locationId:'loc-1',employeeId:'forged'}))).toMatchObject({ok:false});
 expect(mocks.register).not.toHaveBeenCalled();
});
it.each(['RENAME','ROTATE','REVOKE'])('passes the exact optimistic version to %s',async operation=>{
 const form=data({operation,deviceId:'tablet',expectedVersion:'2',...(operation==='RENAME'?{name:'New name'}:{})});
 expect(await manageClockerDeviceAction(form)).toMatchObject({ok:true,device:{id:'tablet'}});
 const method=operation==='RENAME'?mocks.rename:operation==='ROTATE'?mocks.rotate:mocks.revoke;
 expect(method).toHaveBeenCalledWith({employeeId:'real-owner',sessionTokenHash:'a'.repeat(64)},expect.objectContaining({deviceId:'tablet',expectedVersion:2}));
});
it('rejects duplicate fields and missing/invalid optimistic versions',async()=>{
 const form=data({operation:'REGISTER',name:'Front tablet',locationId:'loc-1'});form.append('name','Other');
 expect(await manageClockerDeviceAction(form)).toMatchObject({ok:false});
 for(const expectedVersion of ['', 'NaN', '-1', '1.5', '2e0'])expect(await manageClockerDeviceAction(data({operation:'REVOKE',deviceId:'tablet',expectedVersion}))).toMatchObject({ok:false});
 expect(mocks.register).not.toHaveBeenCalled();expect(mocks.revoke).not.toHaveBeenCalled();
});
it('rejects a mismatched origin before any mutation',async()=>{
 mocks.headers.mockResolvedValue(new Headers({host:'localhost:3000',origin:'https://evil.invalid'}));
 expect(await manageClockerDeviceAction(data({operation:'REGISTER',name:'No',locationId:'loc-1'}))).toMatchObject({ok:false});
 expect(mocks.register).not.toHaveBeenCalled();
});
it('does not expose internal SQL or credential parameters after a failure',async()=>{
 mocks.register.mockRejectedValue(Error('SQL credential_hash=secret-value'));
 const result=await manageClockerDeviceAction(data({operation:'REGISTER',name:'Front',locationId:'loc-1'}));
 expect(result).toMatchObject({ok:false,refresh:true});expect(JSON.stringify(result)).not.toMatch(/SQL|secret-value|credential_hash/);
});
