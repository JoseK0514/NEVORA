import {expect,it,rs} from '@rstest/core';
import {PickupOperation} from './pickup-operation';
import type {ShiftChangeResult} from '../../lib/shift-changes/types';
it('a retired private lifetime fences a captured submit or recovery callback',async()=>{
 const send=rs.fn(),reconcile=rs.fn(),operation=new PickupOperation('request-1',3,()=> 'original');
 await operation.submit(send,()=>false);expect(send).not.toHaveBeenCalled();
 send.mockRejectedValueOnce(Error('lost'));
 await operation.submit(send,()=>true);expect(operation.state.uncertain).toBe(true);
 await operation.retry(reconcile,send,()=>false);expect(reconcile).not.toHaveBeenCalled();expect(send).toHaveBeenCalledTimes(1);
});
it('retains one immutable pickup across private-view release and reconciles before retrying',async()=>{
 const operation=new PickupOperation('request-1',3,()=> 'original-operation');
 const send=rs.fn().mockRejectedValueOnce(Error('response lost')).mockResolvedValue({status:'pending'});
 await operation.submit(send);
 expect(operation.state.uncertain).toBe(true);
 const reconcile=rs.fn().mockResolvedValue(null);
 await operation.retry(reconcile,send);
 expect(reconcile).toHaveBeenCalledWith('original-operation');
 expect([...send.mock.calls[0][0]]).toEqual([...send.mock.calls[1][0]]);
 expect(operation.state.result).toEqual({status:'pending'});
});
it('blocks double submit and notifies only subscribed mounted views without fabricating assignment',async()=>{
 let settle!:(r:ShiftChangeResult)=>void;
 const send=rs.fn(()=>new Promise<ShiftChangeResult>(resolve=>{settle=resolve;}));
 const operation=new PickupOperation('request-1',3,()=> 'one');
 const mounted=rs.fn(),unsubscribe=operation.subscribe(mounted);
 const pending=operation.submit(send);await operation.submit(send);
 expect(send).toHaveBeenCalledTimes(1);expect(operation.state.pending).toBe(true);
 unsubscribe();settle({status:'completed',operationId:'one',requestId:'request-1',revision:4});await pending;
 expect(mounted).toHaveBeenCalledTimes(1);
 expect(operation.state.result?.status).toBe('completed');
 await operation.submit(send);expect(send).toHaveBeenCalledTimes(1);
});
