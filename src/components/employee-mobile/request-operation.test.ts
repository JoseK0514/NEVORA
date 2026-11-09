import {expect,it,vi} from 'vitest';
import {EmployeeRequestOperation} from './request-operation';
import type {ShiftChangeResult} from '@/lib/shift-changes/types';
it('one request cannot send conflicting response intents while pending or uncertain',async()=>{
 let resolve!:(result:ShiftChangeResult)=>void;
 const send=vi.fn(()=>new Promise<ShiftChangeResult>(done=>{resolve=done;})),op=new EmployeeRequestOperation('request-1',4,()=> 'one-operation');
 const first=op.respond('ACCEPT',send,()=>true);
 await op.respond('DECLINE',send,()=>true);
 expect(send).toHaveBeenCalledTimes(1);expect(op.kind).toBe('ACCEPT');
 resolve({status:'outcome-unknown',operationId:'one-operation'});await first;
 await op.respond('CANCEL',send,()=>true);expect(send).toHaveBeenCalledTimes(1);
});
it('recovery retains exact declined/cancelled intent and stale callbacks cannot submit',async()=>{
 const send=vi.fn().mockRejectedValueOnce(Error('lost')).mockResolvedValue({status:'closed',operationId:'one-operation',requestId:'request-1',revision:5});
 const op=new EmployeeRequestOperation('request-1',4,()=> 'one-operation');
 await op.respond('DECLINE',send,()=>false);expect(send).not.toHaveBeenCalled();
 await op.respond('DECLINE',send,()=>true);
 const reconcile=vi.fn().mockResolvedValue(null);
 await op.retry(reconcile,send,()=>true);
 expect(reconcile).toHaveBeenCalledWith('one-operation');expect([...send.mock.calls[0][0]]).toEqual([...send.mock.calls[1][0]]);
 expect(send.mock.calls[1][0].get('kind')).toBe('DECLINE');
 await op.respond('ACCEPT',send,()=>true);expect(send).toHaveBeenCalledTimes(2);
});
