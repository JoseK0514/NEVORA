import {chromium,webkit} from '/workspace/nevora-browser-runtime/node_modules/playwright/index.mjs';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const out='/workspace/paused-previews/wave-c',evidence=import.meta.dirname;
const runs=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort();
const {url,checkpoint}=JSON.parse(await readFile(join(out,runs.at(-1),'access.json'),'utf8'));
await mkdir(join(evidence,'shots'),{recursive:true});
const records=[];
const routes=['settings','settings/workspace','settings/locations','settings/locations/loc-1','settings/locations/new','settings/branding','settings/features','settings/company-policies','settings/breaks','settings/positions','settings/clocker','account-recovery','clocker-recovery'];
const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
function metrics(){
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect?e.getBoundingClientRect():e;return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.bottom===undefined?undefined:r.right};};
 const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden=true],[hidden],.nv-sr,.sr-only');};
 const el=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)].filter(vis);
 const firstLine=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(let t=w.nextNode();t;t=w.nextNode()){if(!t.textContent.trim())continue;const m=t.textContent.search(/\S/),r=document.createRange();r.setStart(t,m);r.setEnd(t,m+1);return box(r);}return null;};
 const split=[],smallText=[];const walk=document.createTreeWalker(el('.wc-page')??document.body,NodeFilter.SHOW_TEXT);
 for(let t=walk.nextNode();t;t=walk.nextNode()){const p=t.parentElement;if(!p||!t.textContent.trim()||!vis(p)||p.closest('input,textarea,[aria-hidden=true]'))continue;const font=parseFloat(getComputedStyle(p).fontSize);const floor=innerWidth<600||innerHeight<431?15:14;const badge=/count|badge/i.test(p.className)&&/^\d+$/.test(t.textContent.trim());if(font<(badge?12:floor)-0.01)smallText.push({text:t.textContent.trim(),font,parent:p.className});for(const m of t.textContent.matchAll(/[A-Za-z]{8,}/g)){const r=document.createRange();r.setStart(t,m.index);r.setEnd(t,m.index+m[0].length);const rs=[...r.getClientRects()].filter(r=>r.width>0&&r.height>0);if(new Set(rs.map(x=>Math.round(x.y))).size>1)split.push({word:m[0],parent:p.className,rects:rs.map(box)});}}
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,band:box(el('.nv-masthead')),content:box(el('.wc-content')),cards:all('.wc-page .nv-card').slice(0,15).map(e=>({box:box(e),title:e.querySelector('h2,h3')?.textContent})),text:el('.wc-page')?.innerText,
 actions:all('.wc-actions').map(e=>({box:box(e),position:getComputedStyle(e).position,buttons:[...e.querySelectorAll('button')].map(e=>({text:e.innerText,box:box(e),disabled:e.disabled}))})),
 disclosures:all('.wc-disclosure > summary').map(e=>({text:e.innerText,box:box(e),firstLine:firstLine(e),caret:box(e.querySelector('svg')),font:getComputedStyle(e).font,lineHeight:getComputedStyle(e).lineHeight})),
 links:all('.wc-page a.nv-link').map(e=>({text:e.innerText,firstLine:firstLine(e),icon:box(e.querySelector('svg:last-child'))})),
 back:box(el('.nv-masthead__back')),bandControl:box(el('.nv-band-control')),footnote:box(el('.wc-hub + *')),wordSplits:split,smallText,
 controls:all('.wc-page input,.wc-page select,.wc-page textarea,.wc-page .nv-btn').map(e=>({tag:e.tagName,id:e.id,text:e.textContent?.trim(),box:box(e),font:getComputedStyle(e).fontSize,border:getComputedStyle(e).borderColor})),
 swatch:el('.wc-colour')?{value:el('.wc-colour').value,box:box(el('.wc-colour')),opacity:getComputedStyle(el('.wc-colour')).opacity}:null,
 tabbar:box(el('.mobile-nav')),toaster:box(el('.nevora-toaster')),active:document.activeElement?.textContent?.trim()?.slice(0,90)};
}
async function snap(p,key,extra={}){const data=await p.evaluate(metrics);await p.screenshot({path:join(evidence,'shots',key+'.png'),fullPage:false,style:'nextjs-portal{display:none!important}'});records.push({key,...extra,...data});await writeFile(join(evidence,'judgment.json'),JSON.stringify({checkpoint,records},null,2));return data;}
async function load(p,path){const r=await p.goto(url+'/app/'+path,{waitUntil:'networkidle',timeout:60000});if((r?.status()??0)>=500){await p.waitForTimeout(500);await p.reload({waitUntil:'networkidle',timeout:60000});}await p.waitForTimeout(2500);await p.waitForFunction(()=>!document.querySelector('.wc-page [data-guard]'));await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(250);}
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
const b=await launcher.launch();
for(const width of engine==='chromium'?[320,390,844,1440]:[320,390]){
const c=await b.newContext({storageState:join(out,'state','QAOWNER.json'),viewport:{width,height:width===844?390:width<600?844:900},isMobile:width<600||width===844,hasTouch:width<600||width===844,serviceWorkers:'block'});
await c.route('**/*',r=>r.request().method()==='GET'?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(8000);
for(const route of routes){try{await load(p,route);for(const text of [100,200]){if(text!==100)await p.evaluate(text=>document.documentElement.style.fontSize=text+'%',text);await p.waitForTimeout(100);await snap(p,engine+'-'+route.replaceAll('/','_')+'-'+width+'-t'+text,{engine,route,text});
if(['settings/features','settings/company-policies'].includes(route)&&width<600){await p.evaluate(()=>window.dispatchEvent(new CustomEvent('nevora:toast',{detail:{message:'Features saved',tone:'success'}})));await p.waitForTimeout(400);await snap(p,engine+'-toast-'+route.replaceAll('/','_')+'-'+width+'-t'+text,{engine,route,text});await p.locator('.nevora-toast button').evaluateAll(es=>es.forEach(e=>e.click()));await p.waitForTimeout(250);}}
console.log('JUDGED',engine,width,route);}catch(e){records.push({key:engine+'-'+width+'-'+route,error:e.message});await writeFile(join(evidence,'judgment.json'),JSON.stringify({checkpoint,records},null,2));}}
await c.close();}await b.close();}
console.log('DONE',records.length);
