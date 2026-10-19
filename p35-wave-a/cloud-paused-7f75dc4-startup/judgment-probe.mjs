import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const out=process.env.PREVIEW_OUT,dest=import.meta.dirname;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url,checkpoint}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const axe=await readFile('/workspace/NEVORA/node_modules/axe-core/axe.min.js','utf8');
const result={checkpoint,screens:[],interactions:[],startedAt:new Date().toISOString()};
await mkdir(join(dest,'crops'),{recursive:true});
const save=()=>writeFile(join(dest,'judgment.json'),JSON.stringify(result,null,2));
let coverage='/app/schedule/coverage?week=2026-10-19&date=2026-10-19&locationId=loc-1&start=00%3A00&end=07%3A00';
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch();
 try{for(const role of ['AUDIT-M','QAOWNER','AUDIT-E','AUDIT-LEAD']){
  const management=role==='AUDIT-M'||role==='QAOWNER';
  const widths=engine==='webkit'?[[390,844],[1440,900]]:role==='QAOWNER'?[[320,844],[1440,900]]:[[320,844],[390,844],[844,390],[1440,900]];
  for(const [width,height]of widths){
   const ctx=await browser.newContext({storageState:join(out,'state',role+'.json'),viewport:{width,height},isMobile:width<600||height<431,hasTouch:width<600||height<431,serviceWorkers:'block'});
   await ctx.route('**/*',r=>{const req=r.request(),u=new URL(req.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==url)return r.abort();if(!['GET','HEAD','OPTIONS'].includes(req.method()))return r.abort();return r.continue();});
   const page=await ctx.newPage();page.setDefaultTimeout(7000);
   try{
    if(management&&role==='AUDIT-M'&&width===320&&engine==='chromium'){
     await page.goto(url+'/app/inbox',{waitUntil:'load',timeout:60000});await page.waitForTimeout(600);
     coverage=await page.locator('a[href*="/schedule/coverage?"]').first().getAttribute('href').catch(()=>coverage);
     await writeFile(join(dest,'coverage-route.json'),JSON.stringify({coverage}));
    }
    const paths=management?[
     '/app/schedule/new','/app/schedule/new?week=2026-10-19&date=2026-10-22&employeeId=AUDIT-LONG&locationId=loc-1&start=22%3A00&end=06%3A30',
     '/app/schedule/edit?shiftId=audit-shift-0-1','/app/schedule/edit?shiftId=audit-shift-0-2&error=SHIFT_OVERLAP',coverage,
     '/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111','/app/schedule/copy-receipt?operation=bad',
     '/app/requests?tab=pending','/app/requests?tab=approved','/app/requests?tab=declined',
     '/app/exchange?tab=pending','/app/exchange?tab=coverage','/app/exchange?tab=activity',
     '/app/availability','/app/availability?week=2026-10-26','/app/availability?week=2026-99-99',
     '/app/employees/AUDIT-E','/app/employees/AUDIT-LONG','/app/employees/QAOWNER',
     '/app/employees/new','/app/employees/new?error=save','/app/employees/AUDIT-E/clocker-pin','/app/employees/QAOWNER/clocker-pin'
    ]:role==='AUDIT-E'?[
     '/app/exchange/swap?sourceShiftId=audit-shift-0-1','/app/exchange/swap?sourceShiftId=audit-next-0-1','/app/exchange/callout?shiftId=audit-shift-1-1','/app/exchange/callout?shiftId=audit-shift-1-1&error=details'
    ]:['/app/exchange/swap?sourceShiftId=x-audit-next-AUDIT-LEAD-2','/app/exchange/callout?shiftId=x-audit-next-AUDIT-LEAD-3','/app/exchange/callout?shiftId=x-audit-next-AUDIT-LEAD-3&error=details'];
    for(const route of paths){
     let row={engine,role,width,height,route,errors:[],samples:[]};result.screens.push(row);
     const error=e=>row.errors.push(e.message.slice(0,500));page.on('pageerror',error);
     try{
      const res=await page.goto(url+route,{waitUntil:'load',timeout:60000});row.status=res?.status();await page.waitForTimeout(450);
      row.finalPath=new URL(page.url()).pathname;
      for(const text of [100,200]){
       await page.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await page.waitForTimeout(200);
       const measure=()=>page.evaluate(()=>{
        const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[hidden],[aria-hidden="true"]');};
        const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
        const label=e=>(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,120);
        const root=document.querySelector('.wa-page');
        const all=s=>[...(root?.querySelectorAll(s)??[])].filter(visible);
        const smallText=[];if(root){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode()){const e=n.parentElement;if(!e||!n.textContent.trim()||!visible(e))continue;const size=parseFloat(getComputedStyle(e).fontSize),floor=innerWidth<600||innerHeight<431?15:14;const badge=/badge|count/i.test(e.className)&&/^\d+$/.test(n.textContent.trim());if(size<(badge?12:floor)-0.01)smallText.push({text:n.textContent.trim().slice(0,100),size,className:e.className});}}
        return {smallText,viewport:innerWidth,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,
         text:root?.innerText.slice(0,15000),h1:all('h1').map(e=>({label:label(e),...box(e)})),
         cards:all('.nv-card').map(e=>({id:e.id,...box(e),radius:getComputedStyle(e).borderRadius,border:getComputedStyle(e).borderWidth})),
         fields:all('.wa-field').map(e=>{const f=e.querySelector('input:not([type=hidden]),select,textarea'),l=e.querySelector('.wa-field__label'),h=e.querySelector('.wa-field__help');return {name:f?.name,field:f?box(f):null,label:l?box(l):null,help:h?box(h):null,labelGap:f&&l?box(f).y-box(l).bottom:null,helpGap:f&&h?box(h).y-box(f).bottom:null};}),
         titles:all('.nv-row__title,.wa-option__title,.wa-check__title,.wa-notice__title').map(e=>({text:label(e),...box(e),font:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,clamp:getComputedStyle(e).webkitLineClamp})),
         buttons:all('button,a.nv-btn').map(e=>({text:label(e),...box(e),font:getComputedStyle(e).fontSize,disabled:e.disabled})),
         steps:all('.wa-steps > li').map(e=>({text:label(e),font:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight})),
         overflow:all('p,h1,h2,h3,label,.nv-row__title').filter(e=>e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(getComputedStyle(e).overflowX)&&getComputedStyle(e).textOverflow!=='ellipsis').map(e=>({label:label(e),...box(e),scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}))};
       });
       const sample={text,metrics:await measure()};row.samples.push(sample);
       if(width===390&&text===100&&engine==='chromium'&&role!=='QAOWNER'||text===200&&width===320&&role==='AUDIT-M'){
        sample.crop='crops/judgment-'+engine+'-'+role+'-'+result.screens.length+'-'+text+'.png';await page.screenshot({path:join(dest,sample.crop)});
       }
       if(route.startsWith('/app/employees/')&&!route.includes('clocker-pin')&&!route.includes('/new')){
        const tab=page.getByRole('tab',{name:'Scheduling',exact:true});if(await tab.count()){
         await tab.click();await page.waitForTimeout(80);sample.scheduling=await measure();
         await tab.focus();await page.keyboard.press('ArrowLeft');sample.keyboardBack=await page.getByRole('tab',{name:'Details',exact:true}).evaluate(e=>({focused:e===document.activeElement,selected:e.getAttribute('aria-selected')}));
        }
       }
      }
      if(width===390&&engine==='chromium'&&role!=='QAOWNER'){
       await page.addScriptTag({content:axe});row.axe=await page.evaluate(async()=>{const scope=document.querySelector('.wa-page');return scope?(await window.axe.run(scope,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})):[];});
      }
     }catch(e){row.failure=e.message.slice(0,1000);console.log('JUDGMENT GAP '+engine+' '+role+' '+width+' '+route+' '+row.failure.slice(0,100));}
     finally{page.off('pageerror',error);await save();}
    }
   }finally{await ctx.close();}
  }
 }}finally{await browser.close();}
}
result.completedAt=new Date().toISOString();await save();
console.log(JSON.stringify({screens:result.screens.length,samples:result.screens.reduce((n,r)=>n+r.samples.length,0),failures:result.screens.filter(r=>r.failure).length}));
