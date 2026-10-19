// Read-only discovery after the complete initial fixture and login, before matrix.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile,rename} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const sha='cd764f614be8ca5b5215be19d46e07cf968638d7';
assert.equal(process.env.WA_BROWSER_RELEASED,'yes');assert.equal(process.env.WA_BROWSER_RELEASE_SHA,sha);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:'/workspace/exit-wave-a-cd764f6',encoding:'utf8'}).trim(),sha);
const out=resolve(process.env.PREVIEW_OUT),runs=(await readdir(out)).filter(f=>f.startsWith('evidence-')).sort(),evidence=join(out,runs.at(-1));
const access=JSON.parse(await readFile(join(evidence,'access.json'),'utf8'));assert.equal(access.checkpoint,sha);
const origin=new URL(access.url);assert.equal(origin.protocol,'http:');assert.equal(origin.hostname,'127.0.0.1');
const file=join(out,'private-state-jobs/wave-a-bindings.json'),bindings=JSON.parse(await readFile(file,'utf8'));
assert.equal(bindings.fixtureProfile,'wave-a-complete-v3-combinedcd764f6-initial-before-listen');
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright'),browser=await pw.chromium.launch(),observations=[];
try{
 for(const actor of ['QAOWNER','AUDIT-M']){
  const context=await browser.newContext({storageState:join(out,'state',actor+'.json'),viewport:{width:1440,height:900},serviceWorkers:'block'});
  await context.route('**/*',r=>{const req=r.request(),u=new URL(req.url());return u.origin===origin.origin&&['GET','HEAD','OPTIONS'].includes(req.method())?r.continue():r.abort();});
  if(context.routeWebSocket)await context.routeWebSocket('**/*',s=>{const u=new URL(s.url());if(u.origin.replace(/^ws/,'http')===origin.origin)s.connectToServer();else s.close();});
  try{
   const page=await context.newPage();await page.goto(origin.origin+'/app/inbox',{waitUntil:'load',timeout:60000});
   const link=page.locator('a[href*="/app/schedule/coverage?"]').first();await link.waitFor({state:'attached',timeout:60000});
   const raw=await link.getAttribute('href'),target=new URL(raw,origin);assert.equal(target.origin,origin.origin);assert.equal(target.pathname,'/app/schedule/coverage');
   bindings.coverage[actor]=target.pathname+target.search+target.hash;
   observations.push({actor,path:target.pathname,week:target.searchParams.get('week'),date:target.searchParams.get('date'),locationId:target.searchParams.get('locationId'),hasRepair:target.searchParams.has('repair'),source:'first matching href in actual Inbox DOM',mutationRequestsContinued:0});
  }finally{await context.close();}
 }
 bindings.needsInboxDiscovery=false;const temporary=file+'.tmp';await writeFile(temporary,JSON.stringify(bindings,null,2),{mode:0o600});await rename(temporary,file);
 await writeFile(join(evidence,'wave-a-inbox-discovery.json'),JSON.stringify({sourceSha:sha,fixtureFingerprint:bindings.fixtureFingerprint,observations,readOnly:true},null,2));
 console.log(JSON.stringify({sourceSha:sha,discovered:observations.length,capabilityUrlsPrinted:false}));
}finally{await browser.close();}
