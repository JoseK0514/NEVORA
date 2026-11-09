import {afterEach,expect,it,vi} from 'vitest';
import {readClockerJson} from './json-body';
const request=(body:ReadableStream<Uint8Array>)=>new Request('http://owned.invalid',{method:'POST',body,duplex:'half'} as RequestInit&{duplex:'half'});
afterEach(()=>vi.useRealTimers());
it('reads only bounded complete UTF-8 JSON',async()=>{expect(await readClockerJson(new Request('http://owned.invalid',{method:'POST',body:'{"ok":true}'}),32)).toEqual({ok:true});await expect(readClockerJson(request(new ReadableStream({start(c){c.enqueue(new Uint8Array([255]));c.close();}})),32)).rejects.toThrow();});
it('cancels oversized bodies before any authority work',async()=>{let cancelled=false;const input=request(new ReadableStream({start(c){c.enqueue(new Uint8Array(100));},cancel(){cancelled=true;}}));await expect(readClockerJson(input,32)).rejects.toThrow();expect(cancelled).toBe(true);});
it('cancels a stalled body at its absolute read deadline',async()=>{vi.useFakeTimers();let cancelled=false;const pending=readClockerJson(request(new ReadableStream({cancel(){cancelled=true;}})),32,100);const assertion=expect(pending).rejects.toThrow();await vi.advanceTimersByTimeAsync(101);await assertion;expect(cancelled).toBe(true);});
