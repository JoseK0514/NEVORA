import {chromium,webkit} from '/workspace/nevora-browser-runtime/node_modules/playwright/index.mjs';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const root='/workspace/paused-previews/wave-c',out=import.meta.dirname;
const runs=(await readdir(root)).filter(n=>n.startsWith('evidence-')).sort();
const {url,checkpoint}=JSON.parse(await readFile(join(root,runs.at(-1),'access.json'),'utf8'));
const records=[];await mkdir(join(out,'states-guarded'),{recursive:true});
function metrics(){const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};return {text:document.querySelector('.wc-page')?.innerText,scrollY,docHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth,nav:box(document.querySelector('.mobile-nav')),bar:box(document.querySelector('.wc-actions.nv-actionbar')),buttons:[...document.querySelectorAll('.wc-page .nv-btn')].map(e=>{const label=[...e.querySelectorAll('.wc-swap > span')].find(s=>getComputedStyle(s).visibility!=='hidden');const range=document.createRange();range.selectNodeContents(label??e);return{text:e.innerText,box:box(e),label:box(range),disabled:e.disabled};}),feedback:box(document.querySelector('.wc-feedback')),active:{tag:document.activeElement.tagName,text:document.activeElement.textContent?.trim(),id:document.activeElement.id},dialog:box(document.querySelector('dialog[open]')),rootOverflow:getComputedStyle(document.documentElement).overflow,errors:[...document.querySelectorAll('.wc-error,.field-error')].map(e=>({text:e.innerText,box:box(e)})),back:document.querySelector('.nv-masthead__back')?.textContent?.trim()};}
async function snap(p,key,extra={}){await p.screenshot({path:join(out,'states-guarded',key+'.png'),fullPage:false,style:'nextjs-portal{display:none!important}'});records.push({key,...extra,...await p.evaluate(metrics)});await writeFile(join(out,'states-guarded.json'),JSON.stringify({checkpoint,records},null,2));}
async function load(p,route,text=100){await p.goto(url+'/app/'+route,{waitUntil:'networkidle',timeout:60000});await p.waitForTimeout(2500);await p.waitForFunction(()=>!document.querySelector('.wc-page [data-guard]'));await p.evaluate(()=>document.fonts.ready);if(text!==100)await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(300);}
for(const [engine,launcher] of [['chromium',chromium],['webkit',webkit]]){
 const b=await launcher.launch();
 for(const [width,height] of engine==='chromium'?[[320,568],[390,844],[844,390],[1440,900]]:[[320,568],[390,844]]){
  const c=await b.newContext({storageState:join(root,'state','QAOWNER.json'),viewport:{width,height},isMobile:width<600||height<431,hasTouch:width<600||height<431,serviceWorkers:'block'});
  let mode='abort',posts=0,held=[];
  await c.route('**/*',async r=>{if(r.request().method()==='GET')return r.continue();posts++;if(mode==='hold'){held.push(r);return;}if(mode==='401')return r.fulfill({status:401,contentType:'application/json',body:'{}'});return r.abort();});
  const p=await c.newPage();p.setDefaultTimeout(8000);
  for(const text of [100,200])for(const route of ['settings/features','settings/company-policies','settings/branding']){try{
    await load(p,route,text);
    if(route==='settings/features')await p.locator('input[type=radio]').nth(1).check();
    if(route==='settings/branding')await p.getByRole('button',{name:'Ocean, #1D4ED8',exact:true}).click();
    const save=p.getByRole('button',{name:route==='settings/company-policies'?'Save policies':route==='settings/branding'?'Save brand':'Save changes',exact:true});
    mode='hold';const start=posts;const before=await p.evaluate(metrics);await save.evaluate(e=>{e.click();e.click();});await p.waitForTimeout(350);
    await snap(p,[engine,width,text,route.replaceAll('/','_'),'pending'].join('-'),{requestCount:posts-start,before});
    for(const r of held.splice(0))await r.abort();mode='abort';await p.waitForTimeout(400);
    await snap(p,[engine,width,text,route.replaceAll('/','_'),'failed'].join('-'),{requestCount:posts-start});
   }catch(e){records.push({key:[engine,width,text,route].join('-'),error:e.message});}}
  for(const dialogText of [100,200]) for(const [route,names] of [['settings/breaks',['Add break type','Edit Rest break','Archive Rest break']],['settings/clocker',['Add device','Rename Fictional payroll clock','Replace tablet for Fictional payroll clock','Revoke access for Fictional payroll clock']]]){
   try{await load(p,route,dialogText);for(const name of names){const trigger=p.getByRole('button',{name,exact:true});if(!await trigger.count()){records.push({key:engine+'-'+width+'-'+name,gap:'Trigger unavailable; actual buttons: '+await p.locator('.wc-page button').allTextContents()});continue;}await trigger.click();await p.locator('dialog[open]').waitFor();await p.waitForTimeout(100);const before=await p.evaluate(()=>scrollY);await p.mouse.wheel(0,300);await p.waitForTimeout(100);await snap(p,engine+'-'+width+'-t'+dialogText+'-'+name.replaceAll(/\W/g,'_'),{backgroundDelta:await p.evaluate(()=>scrollY)-before});
if(name==='Add break type'){await p.getByLabel('Break name',{exact:true}).fill('Fictional inspection break');await p.getByLabel('Classification',{exact:true}).selectOption('REST');}
if(name==='Add device'){await p.getByLabel('Device name',{exact:true}).fill('Fictional inspection tablet');await p.getByLabel('Location',{exact:true}).selectOption('loc-1');}
const priorPosts=posts;mode='hold';await p.locator('dialog[open] button[type=submit]').evaluate(e=>{e.click();e.click();});await p.waitForTimeout(200);
await snap(p,engine+'-'+width+'-t'+dialogText+'-'+name.replaceAll(/\W/g,'_')+'-pending',{requestCount:posts-priorPosts});
for(const r of held.splice(0))await r.abort();mode='abort';await p.waitForTimeout(250);
await snap(p,engine+'-'+width+'-t'+dialogText+'-'+name.replaceAll(/\W/g,'_')+'-failed',{requestCount:posts-priorPosts});
const backgroundFocus=[];for(let i=0;i<10;i++){await p.keyboard.press('Tab');const escaped=await p.evaluate(()=>{const e=document.activeElement;return !e.closest('dialog[open]')&&!['BODY','HTML'].includes(e.tagName)?{tag:e.tagName,text:e.textContent?.trim()}:null;});if(escaped)backgroundFocus.push(escaped);}const trapped=backgroundFocus.length===0;await p.keyboard.press('Escape');await p.waitForTimeout(100);records.push({key:engine+'-'+width+'-t'+dialogText+'-'+name+'-closed',trapped,backgroundFocus,focusBack:await trigger.evaluate(e=>e===document.activeElement)});}}catch(e){records.push({key:engine+'-'+width+'-'+route,error:e.message});}
  }
  for(const route of ['account-recovery','clocker-recovery']){try{await load(p,route,200);const button=p.getByRole('button',{name:route==='account-recovery'?'Issue recovery code':'Check receipt',exact:true});await button.click();await p.waitForTimeout(150);await snap(p,engine+'-'+width+'-'+route+'-validation');}catch(e){records.push({key:engine+'-'+width+'-'+route,error:e.message});}}
  if(width===390){
   for(const route of ['settings/features','settings/branding','settings/company-policies','clocker-recovery','account-recovery']){try{
    await load(p,route);mode='401';
    if(route==='settings/features')await p.locator('input[type=radio]').nth(1).check();
    if(route==='settings/branding')await p.getByRole('button',{name:'Ocean, #1D4ED8',exact:true}).click();
    if(route==='clocker-recovery')await p.getByLabel('Saved action reference',{exact:true}).fill('4a9c7ed1-9b42-4dc0-8847-324d7ade7832');
    if(route==='account-recovery'){await p.getByLabel('Employee ID',{exact:true}).fill('AUDIT-E');await p.getByLabel('How you verified them',{exact:true}).fill('Verified fictional employee in person.');await p.locator('input[type=checkbox]').check();}
    const label=route==='settings/company-policies'?'Save policies':route==='settings/branding'?'Save brand':route==='settings/features'?'Save changes':route==='clocker-recovery'?'Check receipt':'Issue recovery code';
    await p.getByRole('button',{name:label,exact:true}).click();await p.waitForTimeout(500);await snap(p,engine+'-'+route.replaceAll('/','_')+'-401');mode='abort';
   }catch(e){mode='abort';records.push({key:engine+'-'+route+'-401',error:e.message});}}
  }
  await c.close();
 }
 await b.close();
}
// Access checks use the exact server role guards; no sign-out request is sent.
const b=await chromium.launch();
for(const account of ['AUDIT-M','AUDIT-LEAD','AUDIT-E']){const c=await b.newContext({storageState:join(root,'state',account+'.json'),viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});await c.route('**/*',r=>r.request().method()==='GET'?r.continue():r.abort());const p=await c.newPage();p.setDefaultTimeout(8000);for(const route of ['settings','settings/branding','account-recovery?from=settings','clocker-recovery?from=settings']){try{await load(p,route);await snap(p,account+'-'+route.replaceAll(/\W/g,'_'),{finalPath:new URL(p.url()).pathname});}catch(e){records.push({key:account+'-'+route,error:e.message});}}await c.close();}await b.close();
await writeFile(join(out,'states-guarded.json'),JSON.stringify({checkpoint,records},null,2));console.log('STATES DONE',records.length);
