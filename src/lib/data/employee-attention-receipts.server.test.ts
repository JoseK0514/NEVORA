import {expect,it} from 'vitest';
it('required_action_cannot_mark_read_to_complete',async()=>{
 const api=await import('./employee-attention-receipts.server');
 expect(await api.recordEmployeeAttentionReceipt(undefined as never,{kind:'MARK_READ',operationId:'untrusted',authority:'',ref:{kind:'SCHEDULE',id:'2030-10-07',version:'unseen'}})).toMatchObject({status:'blocked'});
});
