import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const {chromium,webkit}=createRequire('/workspace/nevora-tools/package.json')('playwright');
const out=process.env.PREVIEW_OUT;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url,checkpoint}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const dest=process.env.PROBE_OUT??'/workspace/nevora-evidence/combined';
await mkdir(join(dest,'crops'),{recursive:true});
const result={checkpoint,startedAt:new Date().toISOString(),screens:[],more:[],limitations:['Measured spot inspection, not a complete exit round or full browser matrix.','Owned fictional database; all browser mutations are blocked.','No physical-device or screen-reader claim.']};
const save=()=>writeFile(join(dest,'probe.json'),JSON.stringify(result,null,2));
const roles=['AUDIT-E','AUDIT-LEAD','AUDIT-M','QAOWNER'];
const management=['/app','/app/inbox','/app/schedule/new','/app/schedule/edit?shiftId=audit-shift-0-1','/app/schedule/copy-receipt?operation=bad','/app/requests?tab=pending','/app/exchange?tab=pending','/app/employees/AUDIT-E','/app/employees/new','/app/employees/AUDIT-E/clocker-pin','/app/availability'];
const personal=account=>['/app','/app/inbox',account==='AUDIT-LEAD'?'/app/exchange/swap?sourceShiftId=x-audit-next-AUDIT-LEAD-2':'/app/exchange/swap?sourceShiftId=audit-next-0-1',account==='AUDIT-LEAD'?'/app/exchange/callout?shiftId=x-audit-next-AUDIT-LEAD-3':'/app/exchange/callout?shiftId=audit-shift-1-1'];
for(const phase of ['shell','pages'])for(const [engine,browserType] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await browserType.launch();
 try{for(const account of roles){
  const manager=['AUDIT-M','QAOWNER'].includes(account);
  const context=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await context.route('**/*',route=>{const request=route.request();const u=new URL(request.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==url)return route.abort();if(!['GET','HEAD','OPTIONS'].includes(request.method()))return route.fulfill({status:503,contentType:'text/plain',body:'Fictional inspection: mutation blocked'});return route.continue();});
  const paths=phase==='shell'?['/app','/app/inbox']:(manager?management:personal(account)).filter(p=>!['/app','/app/inbox'].includes(p));
  try{for(const path of paths){
   const page=await context.newPage();page.setDefaultTimeout(7000);const errors=[];
   page.on('pageerror',e=>errors.push(e.message.slice(0,500)));
   const row={engine,account,path,width:390,text:100,errors};result.screens.push(row);
   try{
    const response=await page.goto(url+path,{waitUntil:'load',timeout:45000});row.status=response?.status();
    if(!manager&&path==='/app/inbox')await page.waitForURL(u=>u.pathname!=='/app/inbox',{waitUntil:'load',timeout:10000});
    await page.waitForFunction(()=>document.fonts.status==='loaded',{timeout:10000});await page.waitForTimeout(700);
    row.finalPath=new URL(page.url()).pathname;
    row.metrics=await page.evaluate(()=>{
     const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden],[aria-hidden="true"]');};
     const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
     const label=e=>(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,120);
     return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,h1:[...document.querySelectorAll('h1')].filter(visible).map(label),
      cards:[...document.querySelectorAll('.nv-card')].filter(visible).map(e=>({id:e.id,...rect(e),radius:getComputedStyle(e).borderRadius,border:getComputedStyle(e).borderWidth,head:e.querySelector('header')?rect(e.querySelector('header')):null})),
      buttons:[...document.querySelectorAll('main button,main .nv-btn')].filter(visible).map(e=>({label:label(e),...rect(e),font:parseFloat(getComputedStyle(e).fontSize),radius:getComputedStyle(e).borderRadius})),
      fields:[...document.querySelectorAll('main input:not([type=hidden]),main select,main textarea')].filter(visible).map(e=>({name:e.name,type:e.type,...rect(e),radius:getComputedStyle(e).borderRadius})),
      tabs:[...document.querySelectorAll('.mobile-nav > a,.mobile-nav > button,.mobile-nav > .nevora-action-menu > button')].filter(visible).map(e=>({label:label(e),current:e.getAttribute('aria-current'),...rect(e)})),
      links:[...document.querySelectorAll('main a[href]')].filter(visible).map(e=>({text:label(e),href:e.getAttribute('href')})),
      text:document.querySelector('main')?.innerText.slice(0,9000)??document.body.innerText.slice(0,9000)};
    });
    row.screenshot=`crops/${engine}-${account}-${result.screens.length}.png`;
    await page.screenshot({path:join(dest,row.screenshot),fullPage:false});
    if(path==='/app'){
     const trigger=page.locator('.mobile-nav button[popovertarget]').first();
     const more={engine,account};result.more.push(more);
     if(await trigger.count()){
      const id=await trigger.getAttribute('popovertarget');more.id=id;await trigger.focus();await trigger.press('Enter');await page.waitForTimeout(150);
      const sheet=page.locator('#'+id);more.opened=await sheet.evaluate(e=>e.matches(':popover-open'));
      more.focusInside=await sheet.evaluate(e=>e.contains(document.activeElement));
      more.items=await sheet.locator('a,button').evaluateAll(es=>es.map(e=>({text:(e.getAttribute('aria-label')||e.textContent||'').trim(),height:e.getBoundingClientRect().height})));
      more.screenshot=`crops/${engine}-${account}-more.png`;await page.screenshot({path:join(dest,more.screenshot)});
      await sheet.getByRole('button',{name:'Close',exact:true}).click();await page.waitForTimeout(100);
      more.closed=await sheet.evaluate(e=>!e.matches(':popover-open'));more.focusReturned=await trigger.evaluate(e=>e===document.activeElement);
      await trigger.focus();await trigger.press('Enter');await page.waitForTimeout(100);await page.keyboard.press('Escape');await page.waitForTimeout(100);
      more.escapeClosed=await sheet.evaluate(e=>!e.matches(':popover-open'));more.escapeFocusReturned=await trigger.evaluate(e=>e===document.activeElement);
     }else more.error='No visible More trigger';
    }
    if(engine==='chromium'&&account==='AUDIT-M'&&['/app/schedule/new','/app/employees/new'].includes(path)){
     row.text200=[];
     for(const [width,height] of [[320,844],[844,390],[1440,900]]){
      await page.setViewportSize({width,height});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.waitForTimeout(150);
      const sample=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.nv-card')].map(e=>({width:e.getBoundingClientRect().width,x:e.getBoundingClientRect().x})),columns:[...document.querySelectorAll('.wa-split__main,.wa-split__side')].map(e=>({class:e.className,width:e.getBoundingClientRect().width}))}));
      sample.screenshot=`crops/${engine}-${account}-${result.screens.length}-${width}-200.png`;await page.screenshot({path:join(dest,sample.screenshot)});row.text200.push(sample);
     }
    }
   }catch(e){row.failure=e.message.slice(0,800);console.log('PROBE FAIL '+engine+' '+account+' '+path+' '+row.failure.slice(0,100));}
   finally{await save();await Promise.race([page.close(),new Promise(resolve=>setTimeout(resolve,3000))]);}
  }}finally{await context.close();}
 }}finally{await browser.close();}
}
result.completedAt=new Date().toISOString();await save();
console.log(JSON.stringify({checkpoint,screens:result.screens.length,more:result.more.length,failed:result.screens.filter(s=>s.failure||s.status>=400||s.errors.length).length}));
