import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const out='/workspace/nevora-validation/preview-wave-a2',report='/workspace/nevora-validation/recheck',source='/workspace/NEVORA';
const run=(await readdir(out)).filter(x=>x.startsWith('evidence-')).sort().at(-1),access=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const bindings=JSON.parse(await readFile(join(out,'private-state-jobs/wave-a-bindings.json'),'utf8'));
const pw=createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json')('playwright');
const rows=[];await mkdir(join(report,'crops'),{recursive:true});
for(const actor of ['QAOWNER','AUDIT-M']){
 const route=bindings.reviewReplacement[actor];assert(route?.startsWith('/app/schedule/new?review='));
 const child=spawn(process.execPath,['--require',source+'/scripts/ui-checks/cloud-network-guard.cjs',source+'/scripts/ui-checks/checks.mjs','--routes',route,'--accounts',actor,'--widths','320,390,1440','--text','100,200','--browsers','chromium,webkit','--axe'],{cwd:source,env:{...process.env,PREVIEW_OUT:out,NEVORA_CHECK_ORIGIN:access.url,NEVORA_CHECK_VERIFY_ROUTE:'1'},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',x=>log+=x);child.stderr.on('data',x=>log+=x);const code=await new Promise(r=>child.once('close',r));await writeFile(join(report,'replacement-checker-'+actor+'.private.log'),log,{mode:0o600});console.log('replacement checker',actor,'exit',code);
}
for(const engine of ['chromium','webkit']){const b=await pw[engine].launch();try{
for(const actor of ['QAOWNER','AUDIT-M'])for(const width of [320,390,1440])for(const text of [100,200]){
 const r={engine,actor,width,text,sha:access.checkpoint,assertions:[]};rows.push(r);const c=await b.newContext({storageState:join(out,'state',actor+'.json'),viewport:{width,height:width<600?844:900},isMobile:width<600,hasTouch:width<600,serviceWorkers:'block'});
 await c.route('**/*',route=>{const req=route.request(),u=new URL(req.url());return u.origin===access.url&&['GET','HEAD','OPTIONS'].includes(req.method())?route.continue():route.abort()});
 try{const p=await c.newPage();await p.goto(access.url+bindings.reviewReplacement[actor],{waitUntil:'load',timeout:60000});await p.locator('#replacement-shift').waitFor();await p.evaluate(()=>document.fonts.ready);await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(350);
 r.geometry=await p.locator('#replacement-shift').evaluate(e=>({card:e.getBoundingClientRect().toJSON(),content:e.closest('.nv-content').getBoundingClientRect().toJSON(),band:document.querySelector('[data-nv-band]').getBoundingClientRect().toJSON(),facts:[...e.querySelectorAll('dd')].map(x=>({text:x.innerText,box:x.getBoundingClientRect().toJSON()}))}));
 const q=r.geometry.card;if(width<600){r.assertions.push({id:'AL-WA-10',ok:Math.abs(q.x-16)<=1&&Math.abs(q.width-(width-32))<=1,message:'Replacement card has 16px outer phone gutters',geometry:q})}else r.assertions.push({id:'AL-WA-10',ok:Math.abs(q.x-r.geometry.band.x)<=1,message:'Replacement card aligns with desktop band',geometry:r.geometry});
 r.atoms=await p.locator('#replacement-shift').evaluate(root=>{const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),result=[];for(let n=w.nextNode();n;n=w.nextNode())if(n.textContent.includes('·')){const q=document.createRange();q.selectNodeContents(n);let prev=n.parentElement.previousSibling;if(prev?.nodeType===3){const a=document.createRange();a.setStart(prev,Math.max(0,prev.textContent.length-1));a.setEnd(prev,prev.textContent.length);result.push({separator:n.textContent,separatorRects:[...q.getClientRects()].map(x=>x.toJSON()),previousRects:[...a.getClientRects()].map(x=>x.toJSON())})}}return result});
 for(const x of r.atoms)r.assertions.push({id:'TC-WA-3',ok:x.separator.startsWith('\u00a0·')&&Math.abs(x.separatorRects[0].y-x.previousRects.at(-1).y)<=1,message:'Replacement time separator remains on the preceding time line',data:x});
 const file=`${engine}-replacement-${actor}-${width}-${text}.png`;await p.screenshot({path:join(report,'crops',file),style:'nextjs-portal{display:none!important}'});r.crop='crops/'+file;r.completed=true;r.ok=r.assertions.every(x=>x.ok);
 }catch(e){r.error=e.message;r.ok=false}finally{await c.close();await writeFile(join(report,'replacement-rechecks.json'),JSON.stringify({scope:'Genuine eligible replacement; before-listen fictional fixture; no mutations after readiness',rows},null,2));console.log(JSON.stringify({engine,actor,width,text,ok:r.ok,error:r.error,failed:r.assertions.filter(x=>!x.ok)}));}
}
}finally{await b.close()}}
