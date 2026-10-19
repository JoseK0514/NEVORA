import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const out=process.env.PREVIEW_OUT,dest=import.meta.dirname;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url,checkpoint}=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
const results={checkpoint,startedAt:new Date().toISOString(),cases:[]};
await mkdir(join(dest,'crops'),{recursive:true});
const save=()=>writeFile(join(dest,'stability.json'),JSON.stringify(results,null,2));
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch();
 try{for(const kind of ['swap','delete','scheduling'])for(const scenario of ['press200','desktop100','resize200','rotate100']){
  const phone=scenario==='press200'||scenario==='rotate100',width=scenario==='rotate100'?844:phone?320:1440,text=scenario==='desktop100'||scenario==='rotate100'?100:200;
  const role=kind==='swap'?'AUDIT-E':'AUDIT-M';
  const ctx=await browser.newContext({storageState:join(out,'state',role+'.json'),viewport:{width,height:scenario==='rotate100'?390:phone?844:900},isMobile:phone,hasTouch:phone,serviceWorkers:'block'});
  const row={engine,kind,scenario,role,width,text,posts:0};results.cases.push(row);
  let release;
  const held=new Promise(resolve=>{release=resolve;});
  await ctx.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(['http:','https:'].includes(u.protocol)&&u.origin!==url)return route.abort();
   if(!['GET','HEAD','OPTIONS'].includes(req.method())){row.posts++;await held;return route.abort();}
   return route.continue();
  });
  const page=await ctx.newPage();page.setDefaultTimeout(9000);
  try{
   const path=kind==='swap'?'/app/exchange/swap?sourceShiftId=audit-next-0-1':kind==='delete'?'/app/schedule/edit?shiftId=audit-shift-0-1':'/app/employees/AUDIT-E';
   await page.goto(url+path,{waitUntil:'load',timeout:60000});await page.waitForTimeout(800);
   await page.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);
   if(kind==='swap')await page.locator('input[name=targetShiftId]').first().check();
   if(kind==='delete')await page.locator('summary').filter({hasText:'Delete shift'}).click();
   if(kind==='scheduling')await page.getByRole('tab',{name:'Scheduling',exact:true}).click();
   const button=kind==='swap'?page.getByRole('button',{name:'Send swap request',exact:true}):kind==='delete'?page.getByRole('button',{name:'Delete this shift',exact:true}):page.getByRole('button',{name:'Save scheduling profile',exact:true});
   await button.scrollIntoViewIfNeeded();await page.waitForTimeout(300);
   const measure=()=>button.evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,offsetWidth:e.offsetWidth,offsetHeight:e.offsetHeight,minWidth:e.style.minWidth,minHeight:e.style.minHeight,transform:getComputedStyle(e).transform,text:e.textContent,docWidth:document.documentElement.scrollWidth,docHeight:document.documentElement.scrollHeight,viewport:innerWidth,scrollY,containerWidth:e.parentElement.clientWidth};});
   const prefix=engine+'-'+kind+'-'+scenario;
   row.before=await measure();await page.screenshot({path:join(dest,'crops',prefix+'-before.png')});
   const b=await button.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(200);await page.mouse.up();
   await page.waitForTimeout(200);await page.mouse.click(x,y);await page.waitForTimeout(250);
   row.pending=await measure();await page.screenshot({path:join(dest,'crops',prefix+'-pending.png')});
   if(scenario==='resize200'||scenario==='rotate100'){
    await page.setViewportSize({width:scenario==='rotate100'?390:320,height:844});await page.waitForTimeout(400);
    row.resized=await measure();await button.scrollIntoViewIfNeeded();await page.screenshot({path:join(dest,'crops',prefix+'-resized.png')});
   }
   release();await page.waitForTimeout(900);row.after=await measure();
   row.focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim().slice(0,400)}));
   row.finalPath=new URL(page.url()).pathname;
  }catch(e){row.error=e.message.slice(0,1200);release();}
  finally{release();await ctx.close();await save();console.log(JSON.stringify({engine,kind,scenario,posts:row.posts,before:row.before?.width,pending:row.pending?.width,resize:row.resized?.docWidth,error:row.error}));}
 }}finally{await browser.close();}
}
results.completedAt=new Date().toISOString();await save();
