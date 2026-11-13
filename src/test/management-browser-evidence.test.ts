import {expect,it,vi} from 'vitest';
import {withManagementBrowserEvidence} from './integration/management-browser-evidence';

it('a stalled optional capture cannot hold barriers, owned closure or the failure receipt',async()=>{
 vi.useFakeTimers();
 const primary=Error('owned primary'),calls:string[]=[];
 let releaseCapture:()=>void=()=>{},active:()=>boolean=()=>false,captureState='';
 const stalled=new Promise<void>(resolve=>{releaseCapture=resolve;});
 const run=withManagementBrowserEvidence(async()=>{throw primary;},{
  captureFailure:async isActive=>{active=isActive;calls.push('capture');await stalled;},recordCapture:state=>{captureState=state;},
  releaseBarriers:()=>{calls.push('barriers');},closeBrowser:async()=>{calls.push('browser');},
  closeApp:async()=>{calls.push('app');},writeReport:async()=>{calls.push('report');},
 });
 // Observe rejection immediately; a missing capture bound must fail without hanging the suite.
 const observed=run.then(()=>({state:'resolved'}),error=>({state:'rejected',error}));
 try{
  await vi.advanceTimersByTimeAsync(2001);
  const result=await Promise.race([observed,Promise.resolve({state:'stalled'})]);
  expect(result.state).toBe('rejected');if('error'in result)expect(result.error).toBe(primary);
  expect(calls).toEqual(['barriers','capture','browser','app','report']);expect(captureState).toBe('timed_out');expect(active()).toBe(false);
 }finally{releaseCapture();await observed;vi.useRealTimers();}
});
it('throwing capture and browser/app closure cannot replace the primary or skip the report',async()=>{
 const primary=Error('owned primary'),browser=Error('owned browser close'),app=Error('owned app close'),calls:string[]=[];
 let result:unknown;
 try{await withManagementBrowserEvidence(async()=>{throw primary;},{
  captureFailure:async()=>{calls.push('capture');throw Error('optional private diagnostic');},
  releaseBarriers:()=>{calls.push('barriers');},closeBrowser:async()=>{calls.push('browser');throw browser;},
  closeApp:async()=>{calls.push('app');throw app;},writeReport:async()=>{calls.push('report');},
 });}catch(error){result=error;}
 expect(result).toBeInstanceOf(AggregateError);expect((result as AggregateError).errors).toEqual([primary,browser,app]);
 expect(calls).toEqual(['barriers','capture','browser','app','report']);
});
it('a successful browser workflow skips failure capture and requires every owned close',async()=>{
 const calls:string[]=[];
 await withManagementBrowserEvidence(async()=>{calls.push('work');},{
  captureFailure:async()=>{calls.push('capture');},releaseBarriers:()=>{calls.push('barriers');},
  closeBrowser:async()=>{calls.push('browser');},closeApp:async()=>{calls.push('app');},writeReport:async()=>{calls.push('report');},
 });
 expect(calls).toEqual(['work','barriers','browser','app','report']);
});
