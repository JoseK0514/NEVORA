import {expect,it} from 'vitest';
import {rememberClose,pendingClose,forgetClose} from './recovery';
const a={authority:'a'.repeat(64),command:{operationId:'11111111-1111-4111-8111-111111111111',timeEntryId:'entry',expectedSourceHash:'b'.repeat(32),closedAt:'2026-11-10T12:00:00Z',reason:'Fictional verified end.'}};
it('retains the exact operation across component lifecycles without exposing it to another actor',()=>{
 rememberClose('company-A:origin','recovery-owner',a);expect(pendingClose('company-A:origin','recovery-owner')).toEqual(a);expect(pendingClose('company-A:origin','other-actor')).toBeNull();expect(pendingClose('company-B:origin','recovery-owner')).toBeNull();
 expect(()=>rememberClose('company-A:origin','recovery-owner',{...a,command:{...a.command,operationId:'22222222-2222-4222-8222-222222222222'}})).toThrow();
 expect(()=>rememberClose('company-A:origin','recovery-owner',{...a,command:{...a.command,reason:'Changed same operation'}})).toThrow();
 const copy=pendingClose('company-A:origin','recovery-owner')!;copy.command.reason='Changed copy';expect(pendingClose('company-A:origin','recovery-owner')).toEqual(a);
 forgetClose('company-A:origin','recovery-owner','other');expect(pendingClose('company-A:origin','recovery-owner')).toEqual(a);forgetClose('company-A:origin','recovery-owner',a.command.operationId);expect(pendingClose('company-A:origin','recovery-owner')).toBeNull();
});
