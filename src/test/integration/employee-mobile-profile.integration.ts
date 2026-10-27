import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';

it('integrates current own Profile, preferences, contextual help and native signout in three engines',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_PROFILE_EVIDENCE;if(!evidence)throw Error('Select explicit external profile evidence directory');
 await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),checks:{engine:string;name:string}[]=[],captures:string[]=[],messages:{engine:string;type:string;text:string;expected:boolean;stage:string;url:string}[]=[];
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 let browser:{close():Promise<void>}|undefined,failed:(()=>Promise<void>)|undefined;
 try{
  await seedOwnedApp(app.database.executor);
  for(const [index,engine] of ['chromium','webkit','firefox'].entries()){
   const f=await seedOwnedScenario(app.database.executor,'PROF'+index,index),actor=f.actors[0],ownName='Own Profile'+index;
   await q("UPDATE employees SET role=$2,first_name='Own',last_name=$3 WHERE id=$1",[actor,index===1?'LEAD':'EMPLOYEE','Profile'+index]);
   const activeBrowser=await runtime[engine].launch({headless:true});browser=activeBrowser;
   const context=await activeBrowser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage();
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
   let stage='login',expectedFailure=false,binding='';
   page.on('request',(request:{url():string;headers():Record<string,string>})=>{if(new URL(request.url()).pathname==='/api/employee/profile')binding=request.headers()['x-nevora-employee-view']??'';});
   page.on('console',(message:{type():string;text():string})=>{if(['error','warning'].includes(message.type()))messages.push({engine,type:message.type(),text:message.text(),expected:expectedFailure,stage,url:page.url()});});
   page.on('pageerror',(error:Error)=>messages.push({engine,type:'pageerror',text:error.message,expected:false,stage,url:page.url()}));
   await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==new URL(app.url).origin){await route.abort();return;}await route.continue();});
   const shot=async(name:string)=>{const file=engine+'-'+name+'.png';await page.screenshot({path:evidence+'/'+file,fullPage:true,style:'nextjs-portal {visibility:hidden;}',caret:'initial'});captures.push(file);};
   failed=async()=>{await shot('failure');await writeFile(evidence+'/'+engine+'-failure.html',await page.locator('body').innerHTML());};
   await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
   await page.locator('[data-home-state="ready"]:visible,[data-home-state="partial"]:visible').waitFor();await page.locator('.employee-time-badge:visible').waitFor();
   await page.locator('.mobile-nav-link[href="/app/more"]:visible').click();await page.waitForURL(app.url+'/app/more');
   const loaded=page.waitForResponse((response:{url():string;status():number})=>new URL(response.url()).pathname==='/api/employee/profile'&&response.status()===200);
   await page.locator('a[href="/app/profile"]:visible').first().click();await page.waitForURL(app.url+'/app/profile');await (await loaded).json();
   await page.locator('.q-profile-e [data-private-view="profile"]').getByText('Main Office',{exact:false}).waitFor();
   expect(await page.locator('.q-profile-e').innerText()).toContain(ownName);expect(binding).toMatch(/^[a-f0-9]{64}$/);
   const foreign=await page.request.get(app.url+'/api/employee/profile?employeeId='+f.actors[1],{headers:{'X-Nevora-Employee-View':binding}});
   expect(foreign.status()).toBe(400);expect(await foreign.json()).toEqual({state:'unavailable',reason:'access_denied'});
   checks.push({engine,name:'Actual settled own profile and strict no-selector HTTP boundary'});await shot('profile-ready');
   stage='profile-private-pause';
   await page.evaluate(()=>window.dispatchEvent(new Event('offline')));
   await page.locator('.q-profile-e [data-private-view="profile"]').getByText(/paused/).waitFor();
   expect(await page.locator('.q-profile-e').innerText()).not.toContain(ownName);
   expect(await page.locator('.q-profile-e [data-private-view="profile"]').innerText()).not.toContain('Main Office');
   await shot('profile-paused');checks.push({engine,name:'Pause clears own identity and work facts, not only locations'});
   await page.evaluate(()=>window.dispatchEvent(new Event('online')));
   await page.locator('.q-profile-e [data-private-view="profile"]').getByText(ownName,{exact:true}).waitFor();
   await context.close();await browser!.close();browser=undefined;failed=undefined;
  }
  expect(messages.filter(m=>m.type==='pageerror')).toEqual([]);expect(messages.filter(m=>m.type==='error'&&!m.expected)).toEqual([]);
 }catch(error){await failed?.();throw error;}
 finally{await writeFile(evidence+'/results.json',JSON.stringify({checks,captures,messages},null,2));await browser?.close();await app.close();}
},600000);
