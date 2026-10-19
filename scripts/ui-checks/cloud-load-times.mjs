import {createRequire} from 'node:module';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
const out=process.env.PREVIEW_OUT;
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1);
const {url}=JSON.parse(await readFile(join(out,run,'runtime.json'),'utf8'));
const playwright=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const routes=['/app','/app/inbox','/app/schedule','/app/employees','/app/timecards','/app/payroll-export','/app/reports'];
const results=[];
for(const browserName of ['chromium','webkit']){
 const browser=await playwright[browserName].launch();
 try{for(const account of ['AUDIT-M','QAOWNER'])for(const width of [390,1440]){
  const context=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width,height:width===390?844:900},isMobile:width===390,hasTouch:width===390,serviceWorkers:'block'});
  try{for(const route of routes){const page=await context.newPage();const start=performance.now();const row={account,width,browser:browserName,route};
   try{const response=await page.goto(url+route,{waitUntil:'load',timeout:30000});row.navigationMs=Math.round(performance.now()-start);row.status=response.status();row.finalPath=new URL(page.url()).pathname;
    Object.assign(row,await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return{ttfbMs:Math.round(n.responseStart-n.requestStart),domContentLoadedMs:Math.round(n.domContentLoadedEventEnd-n.startTime),loadEventMs:Math.round(n.loadEventEnd-n.startTime)};}));
    await page.waitForTimeout(2500);row.withFixedSettleMs=Math.round(performance.now()-start);
   }catch(error){row.error=error.message;row.navigationMs=Math.round(performance.now()-start);}finally{results.push(row);await page.close();await writeFile(join(out,'load-times.json'),JSON.stringify(results,null,2));}
  }}finally{await context.close();}
 }}finally{await browser.close();}
}
console.log('LOAD_TIMES_READY '+results.length+' navigation measurements');
