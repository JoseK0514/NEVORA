import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createOwnedNextApp} from './owned-next-app';
import {withOwnedTestResources} from './owned-test-resources';
import {centralBillingFixture} from './central-billing-fixture';

it.each(['chromium','webkit'] as const)('checks the central billing entry, canonical SQL/SDK recovery and private retirement in %s',async engine=>{
 const root=process.env.NEVORA_CENTRAL_BILLING_EVIDENCE;if(!root)throw Error('Explicit external evidence directory required');
 const evidence=join(resolve(root),engine);await mkdir(evidence,{recursive:true});
 const runtimeRequire=createRequire(resolve('tools/ci-browser-runtime/package.json')),runtime=runtimeRequire('playwright'),axe=await readFile(runtimeRequire.resolve('axe-core/axe.min.js'),'utf8');
 const {observeWindowExceptions}=await import(pathToFileURL(resolve('scripts/browser-navigation-diagnostic.mjs')).href);
 const checks:string[]=[],errors:string[]=[],foreign:string[]=[],layout:unknown[]=[];let complete=false,contextClosed=false,browserClosed=false,catalogClosed=false,appRoot='',source:unknown=null,network:unknown[]=[],providerSessions=0,sqlCounts:{operations:number;intents:number}|null=null;const lifecycle:unknown[]=[];
 await withOwnedTestResources(async defer=>{
  defer(async()=>{const ownership=appRoot?JSON.parse(await readFile(join(appRoot,'ownership.json'),'utf8')):null;await writeFile(join(evidence,'report.json'),JSON.stringify({complete:complete&&contextClosed&&browserClosed&&catalogClosed&&ownership?.closed===true,engine,checks,errors,foreign,layout,contextClosed,browserClosed,catalogClosed,source,network,providerSessions,sqlCounts,lifecycle,scope:'Actual public Next page and canonical commerce SQL/SDK over owned loopback HTTP with controlled legacy installation facts. Normal company Owner proof is separate Step4 evidence. Provider navigation is an intercepted local witness; no hosted, physical-device, real Stripe or payment acceptance.'},null,2));});
  const fixture=await centralBillingFixture();defer(async()=>{network=fixture.requests.map(({path,method,status,cookie})=>({path,method,status,cookie}));providerSessions=fixture.provider.sessions.size;sqlCounts=await fixture.counts();await fixture.close();catalogClosed=true;});
  const app=await createOwnedNextApp(evidence,{centralBillingApiOrigin:fixture.apiOrigin});appRoot=app.root;source=app.sourceHashes;defer(()=>app.close());fixture.setUiOrigin(app.url);
  const browser=await runtime[engine].launch({headless:true});defer(async()=>{await browser.close();browserClosed=true;});
  const context=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844}});defer(async()=>{await context.close();contextClosed=true;});
  await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{const origin=new URL(route.request().url()).origin;if(![app.url,fixture.apiOrigin].includes(origin)){foreign.push(origin);await route.abort();return;}await route.continue();});
  await context.tracing.start({screenshots:true,snapshots:true});defer(()=>context.tracing.stop({path:join(evidence,'trace.zip')}));
  await observeWindowExceptions(context,(_page:unknown,kind:string)=>errors.push('window:'+kind));
  await context.exposeBinding('observeCentralLifecycle',(_source:unknown,value:unknown)=>{if(lifecycle.length<80)lifecycle.push(value);});await context.addInitScript(()=>{const observe=(event:Event)=>{void (window as unknown as {observeCentralLifecycle(value:unknown):Promise<void>}).observeCentralLifecycle({event:event.type,focus:document.hasFocus(),visible:document.visibilityState,at:performance.now()});};for(const event of ['blur','focus','pagehide','pageshow'])window.addEventListener(event,observe);document.addEventListener('visibilitychange',observe);});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',()=>errors.push('pageerror'));
  for(const [path,title] of [['/pages/plans','NEVORA billing'],['/pages/nevora-billing','NEVORA billing'],['/pages/nevora-billing-return','NEVORA billing'],['/pages/es-facturacion','Facturación de NEVORA'],['/pages/es-pago','Facturación de NEVORA']]){
   const response=await page.goto(app.url+path);expect(response?.status()).toBe(200);expect(response?.headers()['referrer-policy']).toBe('no-referrer');expect(response?.headers()['cache-control']).toContain('no-store');expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");await page.getByRole('heading',{name:title,exact:true}).waitFor();
  }
  expect(fixture.requests.filter(r=>r.method==='POST')).toHaveLength(0);checks.push('five canonical English/Spanish entry and callback routes have private headers and issue no mutation without a handoff');
  await page.goto(app.url+'/pages/plans#handoff='+await fixture.handoff());await page.getByRole('heading',{name:fixture.businessName,exact:true}).waitFor();
  expect(await page.evaluate(()=>location.hash)).toBe('');expect(fixture.requests.filter(r=>r.method==='POST'&&r.path==='/v1/handoff/exchange')).toHaveLength(1);expect(fixture.requests.every(r=>!r.cookie)).toBe(true);
  expect(await page.evaluate(()=>Object.values({...localStorage,...sessionStorage}).some(value=>typeof value==='string'&&/handoff|Bearer/.test(value)))).toBe(false);
  checks.push('one canonical SQL-backed handoff exchange, scrubbed fragment, live public catalog/status and credential-free cross-origin HTTP transport');
  await page.addScriptTag({content:axe});const baseFont=await page.evaluate(()=>parseFloat(getComputedStyle(document.documentElement).fontSize));
  for(const lang of ['en','es']){
   await page.getByRole('button',{name:lang==='en'?'English':'Español',exact:true}).click();
   for(const width of [320,390,768,1440])for(const scale of [100,200]){
    await page.setViewportSize({width,height:900});await page.evaluate((size:number)=>{document.documentElement.style.fontSize=size+'px';},baseFont*scale/100);
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    const measured=await page.evaluate(()=>({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,fonts:document.fonts.status}));expect(measured.fonts).toBe('loaded');expect(measured.scrollWidth).toBeLessThanOrEqual(width+1);layout.push({lang,width,scale,...measured});
    if(scale===100||width===320)await page.screenshot({path:join(evidence,`${lang}-${width}-${scale}.png`),fullPage:true});
   }
  }
  await page.evaluate((size:number)=>{document.documentElement.style.fontSize=size+'px';},baseFont);await page.setViewportSize({width:390,height:844});
  const violations=await page.evaluate(async()=>{const result=await (window as unknown as {axe:{run():Promise<{violations:{impact:string|null}[]}>}}).axe.run();return result.violations.filter(v=>v.impact==='serious'||v.impact==='critical');});expect(violations).toEqual([]);
  checks.push('authoritative dates/capacity and escaped fictional business label reflow in both languages at four widths and 100/200 percent text with no serious/critical axe findings');
  let drop=true,navigations=0;
  await context.route(fixture.apiOrigin+'/v1/checkout',async(route:{fetch():Promise<{status():number}>;abort(reason:string):Promise<void>;continue():Promise<void>})=>{if(drop){drop=false;const actual=await route.fetch();expect(actual.status()).toBe(200);await route.abort('connectionreset');}else await route.continue();});
  await context.route('https://checkout.stripe.com/**',async(route:{fulfill(value:{status:number;contentType:string;body:string}):Promise<void>})=>{navigations++;await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><h1>Owned provider navigation witness</h1>'});});
  await page.getByRole('button',{name:'Español',exact:true}).click();lifecycle.push({stage:'before-native-tab',...await page.evaluate(()=>({focus:document.hasFocus(),visible:document.visibilityState,privateRegions:document.querySelectorAll('dl').length}))});await page.keyboard.press(engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab');lifecycle.push({stage:'after-native-tab',...await page.evaluate(()=>({focus:document.hasFocus(),visible:document.visibilityState,activeTag:document.activeElement?.tagName}))});const subscribe=page.getByRole('button',{name:'Revisar suscripción en Stripe',exact:true});expect(await subscribe.evaluate((element:HTMLElement)=>document.activeElement===element)).toBe(true);await page.keyboard.press('Enter');
  const alert=page.getByRole('alert').filter({hasText:'No se pudo confirmar'});await alert.waitFor();expect(await alert.textContent()).toContain('No se pudo confirmar');await expect.poll(()=>alert.evaluate((element:HTMLElement)=>document.activeElement===element)).toBe(true);expect(await page.getByRole('button',{name:'English',exact:true}).isDisabled()).toBe(true);
  await page.keyboard.press(engine==='webkit'&&process.platform==='darwin'?'Alt+Tab':'Tab');const retry=page.getByRole('button',{name:'Reintentar la solicitud original',exact:true});expect(await retry.evaluate((element:HTMLElement)=>document.activeElement===element)).toBe(true);await page.keyboard.press('Enter');await page.getByRole('heading',{name:'Owned provider navigation witness',exact:true}).waitFor();
  const attempts=fixture.requests.filter(r=>r.path==='/v1/checkout'&&r.method==='POST');expect(attempts).toHaveLength(2);expect(attempts[0].operation).toBe(attempts[1].operation);expect(attempts.map(r=>r.lang)).toEqual(['es','es']);expect(fixture.provider.sessions.size).toBe(1);expect(await fixture.counts()).toEqual({operations:1,intents:1});expect(navigations).toBe(1);
  await page.goBack();await page.getByRole('heading',{name:'NEVORA billing',exact:true}).waitFor();expect(await page.getByText(fixture.businessName,{exact:true}).count()).toBe(0);expect(fixture.requests.filter(r=>r.path==='/v1/checkout'&&r.method==='POST')).toHaveLength(2);
  checks.push('native keyboard intent, actual committed SQL/SDK checkout reply loss, focused recovery alert, unchanged key/body/language retry, one provider session and one intercepted navigation; Back retains no private display or automatic financial replay');
  await page.goto(app.url+'/pages/nevora-billing#handoff='+await fixture.handoff());await page.getByRole('heading',{name:fixture.businessName,exact:true}).waitFor();
  let held=false,release!:()=>void,observed!:()=>void;const hold=new Promise<void>(resolve=>{release=resolve;}),started=new Promise<void>(resolve=>{observed=resolve;});
  await context.route(fixture.apiOrigin+'/v1/status',async(route:{fetch():Promise<unknown>;fulfill(value:{response:unknown}):Promise<void>;continue():Promise<void>})=>{if(!held){held=true;const response=await route.fetch();observed();await hold;await route.fulfill({response}).catch(()=>{});}else await route.continue();});
  await page.getByRole('button',{name:'Refresh status',exact:true}).click();await started;await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect.poll(()=>page.getByText(fixture.businessName,{exact:true}).count()).toBe(0);release();await new Promise(resolve=>setTimeout(resolve,50));expect(await page.getByText(fixture.businessName,{exact:true}).count()).toBe(0);
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('heading',{name:fixture.businessName,exact:true}).waitFor();
  await fixture.revoke();await page.getByRole('button',{name:'Refresh status',exact:true}).click();await expect.poll(()=>page.getByText(fixture.businessName,{exact:true}).count()).toBe(0);await page.getByText('This billing access has ended. Return to your workplace and open Billing again.',{exact:true}).waitFor();expect(await page.getByRole('button',{name:'Review subscription in Stripe',exact:true}).count()).toBe(0);
  checks.push('controlled blur retires private details before a held actual response returns; focus obtains a fresh read; real catalog session revocation returns denial and removes private data/actions');
  expect(errors).toEqual([]);expect(foreign).toEqual([]);expect(fixture.unexpected).toEqual([]);providerSessions=fixture.provider.sessions.size;network=fixture.requests.map(({path,method,status,cookie})=>({path,method,status,cookie}));complete=true;
 });
});
