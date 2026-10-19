import {writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const out=import.meta.dirname;
const records=[];
function metrics(){
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect?e.getBoundingClientRect():e;return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.bottom===undefined?undefined:r.right};};
 const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden=true],[hidden]');};
 const el=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)].filter(vis);
 const firstLine=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(let t=w.nextNode();t;t=w.nextNode()){if(!t.textContent.trim())continue;const m=t.textContent.search(/\S/),r=document.createRange();r.setStart(t,m);r.setEnd(t,m+1);return box(r);}return null;};
 const split=[];const walk=document.createTreeWalker(el('.wc-page')??document.body,NodeFilter.SHOW_TEXT);
 for(let t=walk.nextNode();t;t=walk.nextNode()){const p=t.parentElement;if(!p||!vis(p)||p.closest('input,textarea,[aria-hidden=true]'))continue;for(const m of t.textContent.matchAll(/[A-Za-z]{8,}/g)){const r=document.createRange();r.setStart(t,m.index);r.setEnd(t,m.index+m[0].length);const rs=[...r.getClientRects()].filter(r=>r.width>0&&r.height>0);if(new Set(rs.map(x=>Math.round(x.y))).size>1)split.push({word:m[0],parent:p.className,rects:rs.map(box)});}}
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,band:box(el('.nv-masthead')),content:box(el('.wc-content')),cards:all('.wc-page .nv-card').slice(0,15).map(e=>({box:box(e),title:e.querySelector('h2,h3')?.textContent})),text:el('.wc-page')?.innerText,
 actions:all('.wc-actions').map(e=>({box:box(e),position:getComputedStyle(e).position,buttons:[...e.querySelectorAll('button')].map(e=>({text:e.innerText,box:box(e),disabled:e.disabled}))})),
 disclosures:all('.wc-disclosure > summary').map(e=>({text:e.innerText,box:box(e),firstLine:firstLine(e),caret:box(e.querySelector('svg')),font:getComputedStyle(e).font,lineHeight:getComputedStyle(e).lineHeight})),
 links:all('.wc-page a.nv-link').map(e=>({text:e.innerText,firstLine:firstLine(e),icon:box(e.querySelector('svg:last-child'))})),
 back:box(el('.nv-masthead__back')),bandControl:box(el('.nv-band-control')),footnote:box(el('.wc-hub + *')),wordSplits:split,
 controls:all('.wc-page input,.wc-page select,.wc-page textarea,.wc-page .nv-btn').map(e=>({tag:e.tagName,id:e.id,text:e.textContent?.trim(),box:box(e),font:getComputedStyle(e).fontSize,border:getComputedStyle(e).borderColor})),
 swatch:el('.wc-colour')?{value:el('.wc-colour').value,box:box(el('.wc-colour')),opacity:getComputedStyle(el('.wc-colour')).opacity}:null,
 tabbar:box(el('.mobile-nav')),toaster:box(el('.nevora-toaster')),active:document.activeElement?.textContent?.trim()?.slice(0,90)};
}

async function snap(page,key,extra={}){await mkdir(join(out,'matrix-judgment'),{recursive:true});await page.screenshot({path:join(out,'matrix-judgment',key+'.png'),fullPage:false,style:'nextjs-portal{display:none!important}'});records.push({key,...extra,...await page.evaluate(metrics)});await writeFile(join(out,'matrix-judgment.json'),JSON.stringify(records,null,2));}
export async function inspect(page,record){
 const [width,height]=record.size.includes('x')?record.size.split('x').map(Number):[Number(record.size),Number(record.size)<600?844:900];
 if(![320,390,844,1440].includes(width)||![100,200].includes(record.text))return;
 const key=[record.engine,record.account,width,record.text,record.route.replaceAll('/','_')].join('-');
 try{
  await snap(page,key,{kind:'ready',engine:record.engine,width,text:record.text,route:record.route});
  if(width<600&&['/app/settings/features','/app/settings/company-policies'].includes(record.route)){
   await page.evaluate(()=>window.dispatchEvent(new CustomEvent('nevora:toast',{detail:{message:'Features saved',tone:'success'}})));
   await page.waitForTimeout(400);await snap(page,key+'-toast',{kind:'toast'});
   await page.locator('.nevora-toast button').evaluateAll(es=>es.forEach(e=>e.click()));await page.waitForTimeout(250);
  }
  if(width<600&&['/app/settings/features','/app/settings/company-policies','/app/settings/branding'].includes(record.route)){
   if(record.route.endsWith('/features'))await page.locator('input[type=radio]').nth(1).check();
   if(record.route.endsWith('/branding'))await page.getByRole('button',{name:'Ocean, #1D4ED8',exact:true}).click();
   const held=[];let posts=0;
   await page.route('**/*',r=>{if(r.request().method()==='GET')return r.continue();posts++;held.push(r);});
   const before=await page.evaluate(metrics);
   const label=record.route.endsWith('/features')?'Save changes':record.route.endsWith('/branding')?'Save brand':'Save policies';
   await page.getByRole('button',{name:label,exact:true}).evaluate(e=>{e.click();e.click();});await page.waitForTimeout(350);
   await snap(page,key+'-pending',{kind:'pending',posts,before});
   for(const r of held)await r.abort();await page.waitForTimeout(400);
   await snap(page,key+'-failed',{kind:'failed',posts});
  }
 }catch(error){records.push({key,error:error.message});await writeFile(join(out,'matrix-judgment.json'),JSON.stringify(records,null,2));}
}
