import {createRequire} from 'node:module';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const {chromium}=createRequire('/workspace/nevora-tools/package.json')('playwright');
const out=process.env.PREVIEW_OUT,folder=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url,checkpoint}=JSON.parse(await readFile(join(out,folder,'access.json'),'utf8'));
const dest=process.env.PROBE_OUT??'/workspace/nevora-evidence/combined';await mkdir(join(dest,'crops'),{recursive:true});
const results={checkpoint,forms:[]};const browser=await chromium.launch();
try{for(const kind of ['callout','swap']){
 const context=await browser.newContext({storageState:join(out,'state/AUDIT-E.json'),viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const row={kind,posts:0,allMutationsBlocked:true};results.forms.push(row);
 await context.route('**/*',async route=>{
  const request=route.request(),u=new URL(request.url());
  if(['http:','https:'].includes(u.protocol)&&u.origin!==url)return route.abort();
  if(!['GET','HEAD','OPTIONS'].includes(request.method())){row.posts++;await new Promise(resolve=>setTimeout(resolve,2500));return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();page.setDefaultTimeout(8000);
 try{
  await page.goto(url+(kind==='swap'?'/app/exchange/swap?sourceShiftId=audit-next-0-1':'/app/exchange/callout?shiftId=audit-shift-1-1'),{waitUntil:'load',timeout:45000});
  await page.waitForTimeout(600);
  if(kind==='swap')await page.locator('input[name=targetShiftId]').first().check();
  else{
   const value=await page.locator('select[name=reasonCode] option').evaluateAll(es=>es.find(e=>e.value&&!e.disabled).value);
   await page.locator('select[name=reasonCode]').selectOption(value);
   await page.locator('textarea[name=reasonNote]').fill('Fictional intercepted browser check.');
  }
  const button=page.getByRole('button',{name:kind==='swap'?'Send swap request':'Send report',exact:true});
  row.before=await button.boundingBox();await button.dblclick({delay:30});await page.waitForTimeout(250);
  row.pending=await page.locator('main').innerText();row.pendingBox=await page.locator('main button[type=submit]').last().boundingBox();
  await page.screenshot({path:join(dest,'crops',kind+'-pending.png')});
  await page.waitForTimeout(3000);row.after=await page.locator('main').innerText();
  row.focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.trim().slice(0,300)}));
  await page.screenshot({path:join(dest,'crops',kind+'-failure.png')});
 }catch(e){row.failure=e.message.slice(0,1000);}
 finally{await writeFile(join(dest,'forms.json'),JSON.stringify(results,null,2));await context.close();}
}}finally{await browser.close();}
console.log(JSON.stringify(results.forms.map(({kind,posts,failure})=>({kind,posts,failure}))));
