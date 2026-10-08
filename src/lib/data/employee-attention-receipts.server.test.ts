vi.mock('server-only',()=>({}));
import {expect,it,vi} from 'vitest';
import {attentionIntent,attentionSourceVersion,recordEmployeeAttentionReceipt} from './employee-attention-receipts.server';
const proof={employee:{id:'employee-1',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE' as const,primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const ref={kind:'TIME_OFF' as const,id:'request',version:'v1'},op='11111111-1111-4111-8111-111111111111';
it('required_action_cannot_mark_read_to_complete with absent session proof',async()=>{
 expect(await recordEmployeeAttentionReceipt(undefined as never,{kind:'MARK_READ',operationId:op,authority:'',ref:{kind:'SCHEDULE',id:'2030-10-07',version:'unseen'}})).toMatchObject({status:'blocked'});
});
it('replaced_cookie_cannot_ack_old_tab intent binding includes session, actor, workspace, operation, kind and version',()=>{
 const original=attentionIntent(proof,'workspace','MARK_READ',ref,op);
 expect(original.authority).not.toContain(proof.sessionTokenHash);
 for(const changed of [attentionIntent({...proof,sessionTokenHash:'c'.repeat(64)},'workspace','MARK_READ',ref,op),attentionIntent({...proof,employee:{...proof.employee,id:'other'}},'workspace','MARK_READ',ref,op),attentionIntent(proof,'other','MARK_READ',ref,op),attentionIntent(proof,'workspace','CONFIRM_WEEK',ref,op),attentionIntent(proof,'workspace','MARK_READ',{...ref,version:'v2'},op),attentionIntent(proof,'workspace','MARK_READ',ref)])expect(changed.authority).not.toBe(original.authority);
 expect(attentionIntent(proof,'workspace','MARK_READ',ref,op)).toEqual(original);
});
it('time-off source version includes optional time terms and stable nulls without exposing reason',()=>{
 const detail={id:'request',status:'APPROVED',startDate:'2030-10-07',endDate:'2030-10-07',startTime:null,endTime:null,reason:'private'};
 const v=attentionSourceVersion(ref,detail);expect(v).toMatch(/^[a-f0-9]{64}$/);expect(v).not.toContain('private');
 for(const change of [{startTime:'08:00:00',endTime:'10:00:00'},{reason:'changed'},{status:'DENIED'},{endDate:'2030-10-08'}])expect(attentionSourceVersion(ref,{...detail,...change})).not.toBe(v);
});
