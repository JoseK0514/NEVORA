import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {registerScopedCases as original} from '../executed-al-tc3/scoped-tc-wa-3.mjs';
export async function registerScopedCases(h){
 assert.equal(h.hash(await readFile(new URL('../executed-al-tc3/scoped-tc-wa-3.mjs',import.meta.url),'utf8')),"15599bd540bd8451b95b66b9b93ad3fc0f6ca4a4f0eb8b338a56e2ba69847b53");
 await original({...h,register(name,ids,fn,options){h.register(name,ids,async ctx=>{
 const {page,row}=ctx,events=[];row.passiveTransportReplay=events;
 const safe=request=>{const u=new URL(request.url());return{at:new Date().toISOString(),path:u.pathname,method:request.method(),resourceType:request.resourceType(),sameOwnedOrigin:u.origin===h.baseUrl,originHeader:request.headers()['origin']?request.headers()['origin']===h.baseUrl:null};};
 page.on('requestfailed',request=>{const data=safe(request);events.push({...data,event:'requestfailed',failure:request.failure()?.errorText});});
 page.on('response',response=>{const request=response.request(),u=new URL(response.url());if(!u.pathname.startsWith('/api/')&&!u.pathname.startsWith('/__nextjs'))return;const headers=response.headers();events.push({...safe(request),event:'response',status:response.status(),corsAllowOrigin:headers['access-control-allow-origin']??null,resourcePolicy:headers['cross-origin-resource-policy']??null,cacheControl:headers['cache-control']??null});});
 page.on('framenavigated',frame=>{if(frame===page.mainFrame())events.push({event:'main-navigation',at:new Date().toISOString(),path:new URL(frame.url()).pathname});});
 await fn(ctx);
 },options);}});
}
