import {withOwnedTestResources} from './owned-test-resources';

export type ManagementCaptureState='captured'|'unavailable'|'timed_out';
type Resources={
 captureFailure(isActive:()=>boolean):Promise<unknown>;
 recordCapture?(state:ManagementCaptureState):void;
 releaseBarriers():void;
 closeBrowser():Promise<unknown>;
 closeApp():Promise<unknown>;
 writeReport():Promise<unknown>;
};

/** Optional diagnostics must not consume the browser test's remaining lifetime.
 * The race observes late rejection too; no raw diagnostic error is persisted. */
async function capture(resources:Resources):Promise<ManagementCaptureState>{
 let timer:ReturnType<typeof setTimeout>|undefined,active=true;
 try{return await Promise.race([
  Promise.resolve().then(()=>resources.captureFailure(()=>active)).then(()=>'captured' as const,()=>'unavailable' as const),
  new Promise<'timed_out'>(resolve=>{timer=setTimeout(()=>resolve('timed_out'),2000);}),
 ]);}finally{active=false;if(timer)clearTimeout(timer);}
}

/** Release held responses before bounded optional capture. Each owned cleanup
 * and report is attempted independently, retaining primary and teardown errors. */
export async function withManagementBrowserEvidence(work:()=>Promise<void>,resources:Resources){
 let failed=false;
 await withOwnedTestResources(async defer=>{
  defer(resources.writeReport);
  defer(resources.closeApp);
  defer(resources.closeBrowser);
  defer(async()=>{if(failed){const state=await capture(resources);resources.recordCapture?.(state);}});
  defer(resources.releaseBarriers);
  try{await work();}catch(error){failed=true;throw error;}
 });
}
