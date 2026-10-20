// OPTIONAL source-bound64 text-fact measurements; registry16 contexts, four real routes each.
import assert from 'node:assert/strict';
import {loadPrivateContract} from './scoped-al-wa-10.mjs';
const safe=path=>{const u=new URL(path,'http://127.0.0.1');for(const key of [...u.searchParams.keys()])if(/review|repair|proof|token|secret|signature/i.test(key))u.searchParams.set(key,'REDACTED');return u.pathname+u.search+u.hash;};
async function textProof(locator){return locator.evaluate(element=>{
 const glyphs=[],walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);for(let node=walker.nextNode();node;node=walker.nextNode()){const p=node.parentElement,s=getComputedStyle(p);if(s.display==='none'||s.visibility==='hidden'||p.closest('[aria-hidden=true],.nv-sr,.sr-only'))continue;for(let i=0;i<node.textContent.length;i++){const char=node.textContent[i];if(/\s/.test(char))continue;const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const r=range.getBoundingClientRect();if(r.width&&r.height)glyphs.push({char,box:r.toJSON()});}}
 const dot=glyphs.findIndex(g=>g.char==='·'),previous=glyphs[dot-1],separator=glyphs[dot];
 const shareLine=(a,b)=>!!a&&!!b&&Math.abs((a.box.top+a.box.bottom)/2-(b.box.top+b.box.bottom)/2)<=Math.min(a.box.height,b.box.height)*.5;
 const duration=element.querySelector('.wa-muted.nv-keep,.wa-shift__length.nv-keep'),durationRects=[];if(duration){const w=document.createTreeWalker(duration,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){const r=document.createRange();r.selectNodeContents(n);for(const box of r.getClientRects())if(box.width&&box.height)durationRects.push(box.toJSON());}}
 const lineCenters=durationRects.map(r=>(r.top+r.bottom)/2),r=element.getBoundingClientRect();return{text:element.textContent.trim(),box:r.toJSON(),separatorSharesPrecedingTimeLine:shareLine(previous,separator),precedingGlyph:previous,separator,durationText:duration?.textContent.trim(),durationWhole:durationRects.length>0&&Math.max(...lineCenters)-Math.min(...lineCenters)<=Math.min(...durationRects.map(r=>r.height))*.5,durationRects,glyphs,documentWidth:document.documentElement.scrollWidth};
 });}
export async function registerScopedCases(h){
 const c=await loadPrivateContract(),{register,go,hold,action,check,evidence,until}=h;
 register('scoped-wa-tc3-time-duration',['TC-WA-3'],async({page,row})=>{
  row.states=new Proxy(row.states??{},{set(target,key,value){if(value?.path)value={...value,path:safe(value.path)};target[key]=value;return true;}});
  const gate=await hold(page,action),routes=[],measurements=[];row.timeFacts=measurements;
  const inspect=async(label,locator)=>{
   await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();const p=await textProof(locator);measurements.push({label,...p});check(row,p.separatorSharesPrecedingTimeLine,label+': dot stays on preceding time line',p);check(row,p.durationWhole,label+': complete duration stays on one line',p.durationRects);check(row,p.documentWidth<=row.width+1,label+': text does not overflow document');await evidence(page,row,label);
  };
  const timeFact=card=>page.locator(card+' .wa-fact').filter({has:page.getByText('Time',{exact:true})}).locator('dd');
  try{
   const review=c.bindings.reviewReplacement[row.account];routes.push(review);await go(page,row,review);await until(()=>page.locator('#replacement-shift').isVisible(),'Real Review replacement missing');await inspect('replacement-time',timeFact('#replacement-shift'));
   const coverage=await page.getByRole('link',{name:'Back to coverage',exact:true}).getAttribute('href');assert(coverage,'Actual canonical Coverage back href missing');routes.push(coverage);await go(page,row,coverage);await until(()=>page.locator('#coverage-shift').isVisible(),'Actual positive Coverage shift missing');await inspect('coverage-time',timeFact('#coverage-shift'));
   const read=c.fixture.repairReads.find(r=>r.actor===row.account),date=new Date(read.date+'T12:00:00Z');date.setUTCDate(date.getUTCDate()-date.getUTCDay()+1);if(date.toISOString().slice(0,10)>read.date)date.setUTCDate(date.getUTCDate()-7);const week=date.toISOString().slice(0,10);
   const add='/app/schedule/new?'+new URLSearchParams({week,date:week,employeeId:'AUDIT-LONG',locationId:'loc-1',start:'22:00',end:'06:30'});routes.push(add);await go(page,row,add);await inspect('overnight-add-time',timeFact('#shift-summary'));check(row,measurements.at(-1).durationText?.replace(/\s/g,'')==='8h30m','Overnight Add proves multi-unit8h30m duration');
   const fixture=c.bindings.tc3ShiftBlock;assert(fixture?.readEligible&&fixture.requestId&&fixture.selector,'Missing source-backed initial pending callout; fourth site is setup incomplete, not empty-state credit');
   const exchange='/app/exchange?tab=pending&requestId='+encodeURIComponent(fixture.requestId);routes.push(exchange);await go(page,row,exchange);await inspect('manager-shift-block',page.locator(fixture.selector+' .wa-shift__when').first());
   check(row,gate.count===0,'Four text-site inspections send no business actions');row.operations=gate.summary();
  }catch(error){let message=String(error?.message??error);for(const route of routes){const u=new URL(route,c.origin);for(const [key,value]of u.searchParams)if(/review|repair|proof|token|secret|signature/i.test(key))for(const text of [value,encodeURIComponent(value)])message=message.replaceAll(text,'REDACTED');message=message.replaceAll(route,safe(route));}throw new Error(message);}
 },{accounts:['QAOWNER','AUDIT-M'],sizes:[[320,844,150],[390,844,200],[768,900,200],[1440,900,200]]});
}
