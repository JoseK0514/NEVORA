import {it,expect} from '@rstest/core';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';

it('retires reset A drafts and replies when proof B replaces it in the same tab',async()=>{
 const root=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;if(!root)throw Error('Select external proof-replacement evidence');
 const evidence=join(root,'proof-replacement');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence,{mobileAccessEnabled:true,pinDevTypeReferences:true});
 const cells:unknown[]=[];let complete=false;
 try{
  await seedOwnedApp(app.database.executor);
  for(const engine of ['chromium','webkit']){
   const browser=await runtime[engine].launch({headless:true});
   try{for(const lang of ['en','es'])for(const width of [320,1440])for(const oldOutcome of ['reset','invalid']){
    const context=await browser.newContext({viewport:{width,height:1000},locale:lang==='es'?'es-PR':'en-US',serviceWorkers:'block'});
    try{
     // Hold only the reset transport. It deliberately ignores AbortSignal: a
     // committed command's late response is not retractable by observation stop.
     // Assertions below exercise real mounted AccountRecovery DOM and state.
     await context.addInitScript(()=>{
      type Held={proof:string;finish:(state:string)=>void};
      const wire:{calls:Held[]}={calls:[]};
      (window as Window&{__resetWire?:typeof wire}).__resetWire=wire;
      const native=window.fetch.bind(window);
      window.fetch=((input:RequestInfo|URL,init?:RequestInit)=>{
       const url=new URL(input instanceof Request?input.url:String(input),location.href);
       if(url.pathname!=='/api/auth/reset-access')return native(input,init);
       const body=JSON.parse(String(init?.body));
       return new Promise<Response>(done=>wire.calls.push({proof:body.proof,finish:state=>done(new Response(JSON.stringify({state}),{status:state==='reset'?200:400,headers:{'Content-Type':'application/json'}}))}));
      }) as typeof fetch;
     });
     const page=await context.newPage();page.setDefaultTimeout(15000);
     const errors:string[]=[];page.on('pageerror',(error:Error)=>errors.push(error.message));
     const a=randomBytes(32).toString('base64url'),b=randomBytes(32).toString('base64url');
     await page.goto(app.url+'/reset-access#proof='+a);
     const proof=()=>page.locator('#reset-proof'),password=()=>page.locator('#reset-password'),confirm=()=>page.locator('#reset-confirm-password');
     await expect.poll(()=>proof().inputValue()).toBe(a);
     await password().fill('Fictional original password 123!');await confirm().fill('Fictional original password 123!');
     await page.locator('form button[type="submit"]:visible').click();
     await page.waitForFunction(()=>((window as Window&{__resetWire?:{calls:unknown[]}}).__resetWire?.calls.length)===1);
     await page.evaluate(token=>{location.hash='proof='+token;},b);
     await expect.poll(()=>proof().inputValue()).toBe(b);
     expect(await password().inputValue(),'Selecting B clears the original password draft').toBe('');
     expect(await confirm().inputValue(),'Selecting B clears the original confirmation draft').toBe('');
     expect(await password().isEnabled(),'B has its own request state').toBe(true);
     await password().fill('Fictional replacement password 456!');await confirm().fill('Fictional replacement password 456!');
     await page.locator('form button[type="submit"]:visible').click();
     await page.waitForFunction(()=>((window as Window&{__resetWire?:{calls:unknown[]}}).__resetWire?.calls.length)===2);
     await page.evaluate(async state=>{
      (window as Window&{__resetWire?:{calls:{finish:(state:string)=>void}[]}}).__resetWire!.calls[0].finish(state);
      await new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done())));
     },oldOutcome);
     expect(await proof().inputValue()).toBe(b);
     expect(await password().inputValue()).toBe('Fictional replacement password 456!');
     expect(await password().isDisabled(),'A cannot end B pending state').toBe(true);
     expect(await page.locator('.ar-done').count(),'A cannot complete B screen').toBe(0);
     await page.evaluate(()=>{(window as Window&{__resetWire?:{calls:{finish:(state:string)=>void}[]}}).__resetWire!.calls[1].finish('reset');});
     await page.locator('.ar-done').waitFor();expect(await password().count()).toBe(0);
     const sent=await page.evaluate(()=>((window as Window&{__resetWire?:{calls:{proof:string}[]}}).__resetWire!.calls.map(call=>call.proof)));
     expect(sent).toEqual([a,b]);expect(errors).toEqual([]);
     cells.push({engine,lang,width,oldOutcome,retiredDrafts:true,lateReplyFenced:true,originalProofsDistinct:true});
    }finally{await context.close();}
   }}finally{await browser.close();}
  }
  expect(cells).toHaveLength(16);complete=true;
 }finally{await writeFile(join(evidence,'results.json'),JSON.stringify({complete,cells,scope:'Real mounted reset views; only delayed reset transport substituted, no credentials issued or reset'},null,2));await app.close();}
},180000);
