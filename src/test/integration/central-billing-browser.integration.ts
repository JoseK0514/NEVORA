import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from './owned-next-app';

it.each(['chromium','webkit'] as const)('opens the central billing entry as an actual owned public page in %s',async engine=>{
 const root=process.env.NEVORA_CENTRAL_BILLING_EVIDENCE;if(!root)throw Error('Explicit external evidence directory required');
 const evidence=join(resolve(root),engine);await mkdir(evidence,{recursive:true});
 const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),browser=await runtime[engine].launch({headless:true});
 let complete=false;const errors:string[]=[],foreign:string[]=[];
 try{
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});
  await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{
   const origin=new URL(route.request().url()).origin;if(origin!==app.url){foreign.push(origin);await route.abort();return;}await route.continue();
  });
  await context.tracing.start({screenshots:true,snapshots:true});
  const page=await context.newPage();page.on('pageerror',()=>errors.push('pageerror'));
  try{
   const response=await page.goto(app.url+'/pages/plans');
   expect(response?.status(),'The canonical public billing entry must exist before hosted testing').toBe(200);
   await page.getByRole('heading',{name:'NEVORA billing',exact:true}).waitFor();
   expect(errors).toEqual([]);expect(foreign).toEqual([]);complete=true;
  }finally{await page.screenshot({path:join(evidence,'entry.png'),fullPage:true}).catch(()=>{});await context.tracing.stop({path:join(evidence,'trace.zip')});await context.close();}
 }finally{
  await browser.close();await app.close();
  await writeFile(join(evidence,'report.json'),JSON.stringify({complete,engine,errors,foreign,source:app.sourceHashes,scope:'Actual owned public Next page; no hosted, provider, normal Owner or payment acceptance'},null,2));
 }
});
