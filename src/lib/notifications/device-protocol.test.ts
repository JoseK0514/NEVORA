import {expect,it} from 'vitest';
const authority='a'.repeat(64);
const status={supported:true,enabled:true,configurationAvailable:true,testAllowed:false,ownershipGeneration:'own-generation',vapidPublicKey:'public-key',dismissalScope:'own-scope',authority,validForMs:1200};
async function protocol(){const m=await import('./device-protocol').catch(()=>({}));expect(m).toHaveProperty('parseDeviceStatus');return m as typeof import('./device-protocol');}
it('only accepts a finite current-session device projection with coherent ownership',async()=>{
 const {parseDeviceStatus}=await protocol();expect(parseDeviceStatus(status,authority)).toEqual(status);
 for(const bad of [{...status,authority:'other'},{...status,validForMs:45001},{...status,validForMs:0},{...status,validForMs:Infinity},{...status,enabled:'true'},{...status,ownershipGeneration:undefined},{...status,configurationAvailable:false},{...status,testAllowed:true,enabled:false},{...status,otherDevice:'foreign'}])expect(()=>parseDeviceStatus(bad,authority)).toThrow();
});
it('turn-off and test require their exact receipt and original generation',async()=>{
 const {parseDeviceReceipt}=await protocol();
 expect(()=>parseDeviceReceipt({status:'complete',generation:'own'},'unsubscribe','own',200)).not.toThrow();
 for(const [value,code]of [[{status:'complete',generation:'other'},200],[{status:'complete',generation:'own',extra:true},200],[{status:'pending',generation:'own'},503],[{status:'complete',generation:'own'},202]] as const)expect(()=>parseDeviceReceipt(value,'unsubscribe','own',code)).toThrow();
 expect(()=>parseDeviceReceipt({status:'queued'},'test','own',202)).not.toThrow();expect(()=>parseDeviceReceipt({status:'queued'},'test','own',200)).toThrow();
});
