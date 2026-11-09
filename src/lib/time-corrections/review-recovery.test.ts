import {expect,it} from 'vitest';
import {createManagerReviewRecovery,managerReviewRecoveryKey} from './review-recovery';
const command={operationId:'11111111-1111-4111-8111-111111111111',requestId:'22222222-2222-4222-8222-222222222222',expectedRevision:3,decision:'APPROVE' as const,note:'Fictional original note'};
it('retains the exact command across private pane lifetimes without storing queue fields',()=>{
 const memory=createManagerReviewRecovery(),source={...command,employeeName:'PRIVATE PERSON',reason:'PRIVATE REASON'};
 memory.remember(source);const restored=memory.read();expect(restored).toEqual(command);expect(JSON.stringify(restored)).not.toMatch(/PRIVATE/);
 source.expectedRevision=9;expect(memory.read()).toEqual(command);if(restored)restored.expectedRevision=10;expect(memory.read()).toEqual(command);
});
it('keeps a newer unresolved command when an older response completes',()=>{
 const memory=createManagerReviewRecovery();memory.remember(command);memory.remember({...command,operationId:'33333333-3333-4333-8333-333333333333'});
 memory.clear(command.operationId);expect(memory.read()?.operationId).toBe('33333333-3333-4333-8333-333333333333');memory.clear();expect(memory.read()).toBeNull();
});
it('separates actor, session, operational scope and page lifetimes',()=>{
 const base=['actor','session-a','scope-a','attendance'] as const,key=managerReviewRecoveryKey(...base);
 for(let i=0;i<base.length;i++){const values:string[]=[...base];values[i]+='-changed';expect(managerReviewRecoveryKey(values[0],values[1],values[2],values[3])).not.toBe(key);}
 expect(managerReviewRecoveryKey('a:b','c','d','attendance')).not.toBe(managerReviewRecoveryKey('a','b:c','d','attendance'));
 const prior=createManagerReviewRecovery();prior.remember(command);expect(createManagerReviewRecovery().read()).toBeNull();
});
