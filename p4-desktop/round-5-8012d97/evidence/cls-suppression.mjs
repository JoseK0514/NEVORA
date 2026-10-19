import {createRequire} from 'node:module';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire('/workspace/nevora-browser-runtime/package.json')('playwright');
const out='/workspace/paused-previews/desktop',evidence='/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence';
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1),{url}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const browser=await pw.chromium.launch(),records=[];
try{for(const atomic of [false,true]){
 const c=await browser.newContext({storageState:join(out,'state/QAOWNER.json'),viewport:{width:1440,height:900},serviceWorkers:'block'});
 await c.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin!==url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(r.request().method())&&u.pathname!='/api/manager/action-center')return r.fulfill({status:503,contentType:'application/json',body:'{}'});return r.continue();});
 await c.addInitScript(atomic=>{
  window.__cls=0;window.__shifts=[];window.__groupOpens=[];window.__atomicOpens=[];window.__atomicEnabled=false;
  new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.__cls+=e.value;window.__shifts.push({value:e.value,at:e.startTime,sources:e.sources?.map(s=>({html:s.node?.outerHTML?.slice(0,250),previousY:s.previousRect.y,currentY:s.currentRect.y}))});}}).observe({type:'layout-shift',buffered:true});
  const native=Element.prototype.setAttribute;
  Element.prototype.setAttribute=function(name,value){if(name==='open'&&this.matches('details')&&this.closest('.premium-inbox')){window.__groupOpens.push({at:performance.now(),text:this.querySelector('summary')?.textContent,height:this.getBoundingClientRect().height,stack:new Error().stack?.slice(0,1200)});if(atomic)return;}return native.call(this,name,value);};
  const observe=()=>new MutationObserver(()=>{if(true)return;const selected=document.querySelector('.premium-inbox .inbox-row[data-selected] [data-inbox-key]'),group=selected?.closest('details:not([open])');if(!group)return;window.__atomicOpens.push({at:performance.now(),text:group.querySelector('summary')?.textContent,before:group.getBoundingClientRect().height});native.call(group,'open','');}).observe(document.documentElement,{childList:true,subtree:true});
  if(document.documentElement)observe();else document.addEventListener('DOMContentLoaded',observe);
 },atomic);
 const p=await c.newPage();let release;const gate=new Promise(r=>{release=r;});await p.route('**/api/manager/action-center',async r=>{await gate;await r.continue().catch(()=>{});});
 await p.goto(url+'/app/inbox?filter=planning',{waitUntil:'load',timeout:90000});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(300);await p.evaluate(()=>{window.__cls=0;window.__shifts=[];window.__atomicEnabled=true;});release();await p.locator('[data-inbox-state=ready]').waitFor({timeout:60000});await p.waitForTimeout(600);
 const result=await p.evaluate(()=>({cls:window.__cls,shifts:window.__shifts,groupOpens:window.__groupOpens,atomicOpens:window.__atomicOpens,openDetails:[...document.querySelectorAll('.premium-inbox details[open]')].map(e=>({text:e.querySelector('summary')?.textContent,height:e.getBoundingClientRect().height})),rootFont:getComputedStyle(document.documentElement).fontSize}));records.push({atomic,...result});await writeFile(join(evidence,'cls-suppression-control.json'),JSON.stringify(records,null,1));await p.screenshot({path:join(evidence,'shots',`cls-suppression-control-${records.length}-${atomic?'suppressed':'source'}.png`)});console.log('CLS '+atomic+' '+result.cls+' sourceOpens='+result.groupOpens.length+' atomicOpens='+result.atomicOpens.length);await c.close();
}}finally{await browser.close();}
