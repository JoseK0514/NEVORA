import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createPrivateSnapshotController,type PrivatePanelState,type PrivateSnapshot} from './private-snapshot-client';

const controllers:ReturnType<typeof createPrivateSnapshotController<PrivateSnapshot>>[]=[];
const ready=(validForMs=15000):PrivateSnapshot=>({state:'ready',observedAt:new Date().toISOString(),validForMs});
const flush=()=>vi.advanceTimersByTimeAsync(0);
function deferred(){let resolve!:(value:PrivateSnapshot)=>void;const promise=new Promise<PrivateSnapshot>(done=>{resolve=done;});return {promise,resolve};}
async function mount(request:(signal:AbortSignal)=>Promise<unknown>,expiryFailure?:(budget:number)=>'read_failed'|'access_denied'){
 const states:PrivatePanelState<PrivateSnapshot>[]=[];
 const controller=createPrivateSnapshotController<PrivateSnapshot>(state=>states.push(state),request,value=>value as PrivateSnapshot,reason=>({state:'unavailable',reason}),expiryFailure);
 controllers.push(controller);controller.start();await flush();return {controller,states};
}
beforeEach(()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date','performance']});});
afterEach(()=>{for(const controller of controllers.splice(0))controller.stop();vi.useRealTimers();});

describe('protected snapshot refresh budgets',()=>{
 it('keeps healthy short-lived controller snapshots ready across multiple authority lifetimes',async()=>{
  const request=vi.fn(async()=>ready());const {states}=await mount(request);
  await vi.advanceTimersByTimeAsync(46000);
  expect(request.mock.calls.length).toBeGreaterThan(3);
  expect(states.filter(state=>state.snapshot?.state==='unavailable')).toEqual([]);
  expect(states.at(-1)?.snapshot?.state).toBe('ready');
 });

 it('starts renewal before the remaining budget expires after a slow round trip',async()=>{
  const first=deferred();let calls=0;const request=vi.fn(async()=>++calls===1?first.promise:ready());
  const {states}=await mount(request);await vi.advanceTimersByTimeAsync(9000);first.resolve(ready());await flush();
  await vi.advanceTimersByTimeAsync(5999);
  expect(request.mock.calls.length).toBeGreaterThan(1);
  expect(states.filter(state=>state.snapshot?.state==='unavailable')).toEqual([]);
 });

 it('expires the original snapshot and aborts a hung renewal without admitting its late response',async()=>{
  const late=deferred();const signals:AbortSignal[]=[];
  const request=vi.fn(async(signal:AbortSignal)=>{signals.push(signal);return signals.length===1?ready():late.promise;});
  const {states}=await mount(request);await vi.advanceTimersByTimeAsync(14999);
  expect(request).toHaveBeenCalledTimes(2);expect(signals[1].aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  expect(signals[1].aborted).toBe(true);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  const publications=states.length;late.resolve(ready());await flush();
  expect(states).toHaveLength(publications);
 });

 it.each(['pause','stop'] as const)('%s cancels renewal and fences its late publication',async method=>{
  const late=deferred();const signals:AbortSignal[]=[];
  const request=vi.fn(async(signal:AbortSignal)=>{signals.push(signal);return signals.length===1?ready():late.promise;});
  const {controller,states}=await mount(request);await vi.advanceTimersByTimeAsync(14000);
  expect(request).toHaveBeenCalledTimes(2);controller[method]();expect(signals[1].aborted).toBe(true);
  const publications=states.length;late.resolve(ready());await vi.advanceTimersByTimeAsync(60000);
  expect(states).toHaveLength(publications);expect(request).toHaveBeenCalledTimes(2);
 });

 it('keeps the existing thirty-second backoff for a failed protected read',async()=>{
  const request=vi.fn(async()=>{throw Error('Fictional transport failure');});const {states}=await mount(request);
  expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'read_failed'});
  await vi.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(2);
 });

 it('preserves corrections expiry classification and its thirty-second retry without extending data',async()=>{
  const late=deferred();let calls=0;const request=vi.fn(async()=>++calls===1?ready():late.promise);
  const {states}=await mount(request,()=> 'read_failed');await vi.advanceTimersByTimeAsync(15000);
  expect(request).toHaveBeenCalledTimes(2);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'read_failed'});
  await vi.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(3);
 });

 it('stops automatic renewal when the protected reader denies access',async()=>{
  let calls=0;const request=vi.fn(async()=>++calls===1?ready():{state:'unavailable',reason:'access_denied'});
  const {states}=await mount(request);await vi.advanceTimersByTimeAsync(14000);
  expect(request).toHaveBeenCalledTimes(2);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  await vi.advanceTimersByTimeAsync(120000);expect(request).toHaveBeenCalledTimes(2);
 });

 it.each([45000,60000])('keeps the existing thirty-second interval for a %i ms budget',async budget=>{
  const request=vi.fn(async()=>ready(budget));await mount(request);
  await vi.advanceTimersByTimeAsync(29999);expect(request).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);expect(request).toHaveBeenCalledTimes(2);
 });

 it.each([500,1000])('never extends a %i ms lifetime to meet the minimum renewal interval',async budget=>{
  const request=vi.fn(async()=>ready(budget));const {states}=await mount(request);
  await vi.advanceTimersByTimeAsync(budget-1);expect(states.at(-1)?.snapshot?.state).toBe('ready');
  await vi.advanceTimersByTimeAsync(1);expect(states.at(-1)?.snapshot).toEqual({state:'unavailable',reason:'access_denied'});
  await vi.advanceTimersByTimeAsync(60000);expect(request).toHaveBeenCalledTimes(1);
 });
});
