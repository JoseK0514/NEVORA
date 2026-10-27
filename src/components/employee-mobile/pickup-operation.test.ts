import {expect,it,vi} from 'vitest';
import {PickupOperation} from './pickup-operation';
import type {ShiftChangeResult} from '../../lib/shift-changes/types';
it('retains one immutable pickup across private-view release and reconciles before retrying',async()=>{
 const operation=new PickupOperation('request-1',3,()=> 'original-operation');
 const send=vi.fn().mockRejectedValueOnce(Error('response lost')).mockResolvedValue({status:'pending'});
 await operation.submit(send);
 expect(operation.state.uncertain).toBe(true);
 const reconcile=vi.fn().mockResolvedValue(null);
 await operation.retry(reconcile,send);
 expect(reconcile).toHaveBeenCalledWith('original-operation');
 expect([...send.mock.calls[0][0]]).toEqual([...send.mock.calls[1][0]]);
 expect(operation.state.result).toEqual({status:'pending'});
});
it('blocks double submit and notifies only subscribed mounted views without fabricating assignment',async()=>{
 let settle!:(r:ShiftChangeResult)=>void;
 const send=vi.fn(()=>new Promise<ShiftChangeResult>(resolve=>{settle=resolve;}));
 const operation=new PickupOperation('request-1',3,()=> 'one');
 const mounted=vi.fn(),unsubscribe=operation.subscribe(mounted);
 const pending=operation.submit(send);await operation.submit(send);
 expect(send).toHaveBeenCalledTimes(1);expect(operation.state.pending).toBe(true);
 unsubscribe();settle({status:'completed',operationId:'one',requestId:'request-1',revision:4});await pending;
 expect(mounted).toHaveBeenCalledTimes(1);
 expect(operation.state.result?.status).toBe('completed');
 await operation.submit(send);expect(send).toHaveBeenCalledTimes(1);
});
