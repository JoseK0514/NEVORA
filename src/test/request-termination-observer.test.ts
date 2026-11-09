import {EventEmitter} from 'node:events';
import {afterEach,expect,it,vi} from 'vitest';
import {observeRequestTermination} from './integration/request-termination-observer';
afterEach(()=>vi.useRealTimers());
for(const event of ['requestfinished','requestfailed'] as const)it('records '+event+' only for the first exact action object',async()=>{
 const source=new EventEmitter(),request={owned:true},sameUrl={owned:true},other={owned:false};
 const observer=observeRequestTermination(source,(request:{owned:boolean})=>request.owned,15000);let settled=false;void observer.result.then(()=>settled=true);
 source.emit('request',other);source.emit('requestfinished',other);source.emit('request',request);source.emit('request',sameUrl);source.emit(event,sameUrl);await Promise.resolve();expect(settled).toBe(false);
 source.emit(event,request);expect(await observer.result).toBe(event);expect(source.eventNames()).toEqual([]);
});
it('fails closed at the unchanged deadline when no terminal event arrives',async()=>{
 vi.useFakeTimers();const source=new EventEmitter(),observer=observeRequestTermination(source,()=>true,15000);source.emit('request',{});
 const assertion=expect(observer.result).rejects.toThrow('did not terminate');await vi.advanceTimersByTimeAsync(15000);await assertion;expect(source.eventNames()).toEqual([]);
});
it('does not infer termination when no matching request was observed',async()=>{
 vi.useFakeTimers();const source=new EventEmitter(),observer=observeRequestTermination(source,()=>false,15000),request={};source.emit('request',request);source.emit('requestfailed',request);
 const assertion=expect(observer.result).rejects.toThrow('did not terminate');await vi.advanceTimersByTimeAsync(15000);await assertion;
});
