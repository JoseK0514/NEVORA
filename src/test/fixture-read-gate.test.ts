import {afterEach,expect,it,vi} from 'vitest';
import {fixtureReadGate} from './integration/fixture-read-gate';
afterEach(()=>vi.useRealTimers());
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(ready=>resolve=ready);return{promise,resolve};};
it('drains an active read before mutation and queues new reads until publication completes',async()=>{
 const first=deferred(),mutation=deferred(),events:string[]=[],gate=fixtureReadGate();
 const old=gate.read(async()=>{events.push('old-start');await first.promise;events.push('old-end');return 'unchanged-old';});
 const write=gate.mutate(async()=>{events.push('write-start');await mutation.promise;events.push('write-end');},15000);
 const queued=gate.read(async()=>{events.push('new-start');return 'unchanged-new';});
 await Promise.resolve();expect(events).toEqual(['old-start']);first.resolve();expect(await old).toBe('unchanged-old');await Promise.resolve();expect(events).toEqual(['old-start','old-end','write-start']);
 mutation.resolve();await write;expect(await queued).toBe('unchanged-new');expect(events).toEqual(['old-start','old-end','write-start','write-end','new-start']);
});
it('retains read errors and releases later reads after a failed fixture update',async()=>{
 const gate=fixtureReadGate(),failure=Error('server failure');await expect(gate.read(async()=>{throw failure;})).rejects.toBe(failure);
 await expect(gate.mutate(async()=>{throw failure;},15000)).rejects.toBe(failure);expect(await gate.read(async()=>123)).toBe(123);
});
it('refuses to mutate when existing reads miss the unchanged deadline',async()=>{
 vi.useFakeTimers();const hold=deferred(),gate=fixtureReadGate();const running=gate.read(()=>hold.promise);const update=vi.fn(async()=>{});
 const assertion=expect(gate.mutate(update,15000)).rejects.toThrow('did not drain');await vi.advanceTimersByTimeAsync(15000);await assertion;expect(update).not.toHaveBeenCalled();hold.resolve();await running;
});
