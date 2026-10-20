// External safety instrumentation; the supplied checker bytes remain unchanged.
import assert from 'node:assert/strict';
import {allowedOwnedRead as allowedRead} from './read-contract-v2.mjs';
import {createRequire} from 'node:module';
import {readFile,readdir,appendFile} from 'node:fs/promises';
import {join} from 'node:path';
const out=process.env.PREVIEW_OUT,report=process.env.VERIFY_REPORT_ROOT;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const access=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
assert.equal(access.checkpoint,process.env.VERIFY_SHA);
const origin=new URL(access.url).origin,req=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json')),pw=req('playwright');

const log=entry=>appendFile(join(report,'checker-guard.jsonl'),JSON.stringify({...entry,purpose:process.env.VERIFY_GUARD_PURPOSE??'checker',at:new Date().toISOString()})+'\n');
for(const engine of ['chromium','webkit','firefox']){
 const launch=pw[engine].launch.bind(pw[engine]);
 pw[engine].launch=async(...args)=>{
  const browser=await launch(...args),newContext=browser.newContext.bind(browser);
  browser.newContext=async(...args)=>{
   const context=await newContext(...args);
   await context.route('**/*',async route=>{
    const request=route.request(),u=new URL(request.url());
    if(!['http:','https:'].includes(u.protocol))return route.continue();
    let kind=u.origin!==origin?'external':/sign-?out|logout/i.test(u.pathname)?'signout':null;
    if(!kind&&(['GET','HEAD','OPTIONS'].includes(request.method())||allowedRead(request)))return route.continue();
    kind??=u.pathname==='/__nextjs_original-stack-frames'?'framework-diagnostic':'unmatched-write';
    await log({engine,kind,path:u.pathname,method:request.method()});
    return route.fulfill({status:503,contentType:'application/json',body:'{}'});
   });
   if(context.routeWebSocket)await context.routeWebSocket('**/*',socket=>{const u=new URL(socket.url());if(u.origin.replace(/^ws/,'http')===origin)socket.connectToServer();else socket.close({code:1008,reason:'Owned preview only'});});
   await log({engine,kind:'context-guard-installed'});
   return context;
  };
  return browser;
 };
}
