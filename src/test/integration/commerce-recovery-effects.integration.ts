import {expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {withOwnedTestResources} from './owned-test-resources';

type FixtureRoute={request():{url():string};abort(reason?:string):Promise<void>;fulfill(options:{contentType:string;body:string}):Promise<void>};

it('unmounts retained shell state and cancels late billing reads/handoffs in native browser effects',async()=>{
 const parent=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;if(!parent)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 const evidence=join(parent,'commerce-effects');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const compiled=await build({entryPoints:['src/test/fixtures/commerce-recovery-component.tsx'],bundle:true,write:false,format:'iife',platform:'browser',outfile:'owned-recovery.js',define:{'process.env':'{"NODE_ENV":"production"}'}});
 const js=compiled.outputFiles.find(file=>file.path.endsWith('.js'))!.text,css=compiled.outputFiles.find(file=>file.path.endsWith('.css'))!.text;
 const tokens=await readFile('src/components/signature/tokens.css','utf8'),checks:string[]=[],errors:string[]=[];
 const status={state:'restricted',operational:false,trialEndsAt:null,paidThrough:null,graceEndsAt:null,plan:'small',employeeLimit:15,activeEmployees:2,reason:'trial_ended',billing:true,export:true};
 const origin='http://127.0.0.1:32199',checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
 let passed=false;const closed:string[]=[];
 await withOwnedTestResources(async defer=>{
  defer(()=>writeFile(join(evidence,'report.json'),JSON.stringify({checkpoint,tree,status:passed&&closed.length===2?'passed':'failed',closedBrowsers:closed,checks,errors,scope:'Actual production components, real React effects and Next PathnameContext in native engines; controlled presentation-only HTTP fixtures, not full Next router or provider acceptance.'},null,2)));
  for(const engine of ['chromium','webkit']){
   const browser=await runtime[engine].launch({headless:true});defer(async()=>{await browser.close();closed.push(engine);});
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.setDefaultTimeout(10000);
   page.on('pageerror',(error:Error)=>errors.push(engine+':'+error.message));
   let holdStatus=true;const held:{status?:FixtureRoute;handoff?:FixtureRoute}={},navigations:string[]=[],externalRequests:string[]=[];let recoveryDocuments=0;
   page.on('framenavigated',(frame:{url():string})=>{if(frame===page.mainFrame())navigations.push(frame.url());});
   await context.route('**/*',async(route:FixtureRoute)=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)externalRequests.push(url.origin+url.pathname);
    if(url.origin==='https://www.thevelani.com'&&url.pathname==='/pages/plans'){await route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><h1>Fictional trusted billing destination</h1></body></html>'});return;}
    if(url.origin!==origin){await route.abort('blockedbyclient');return;}
    if(url.pathname==='/fixture'&&url.searchParams.get('initial')==='recovery'&&recoveryDocuments++>0){await route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><h1>Fresh recovery exit document</h1></body></html>'});return;}
    if(url.pathname==='/fixture'){await route.fulfill({contentType:'text/html',body:'<!doctype html><html><head><style>'+tokens+css+'</style></head><body><div id="root"></div></body></html>'});return;}
    if(url.pathname==='/api/commerce/status'){
     if(holdStatus){held.status=route;return;}
     await route.fulfill({contentType:'application/json',body:JSON.stringify(status)});return;
    }
    if(url.pathname==='/api/commerce/handoff'){held.handoff=route;return;}
    await route.abort('blockedbyclient');
   });
   await page.goto(origin+'/fixture');await page.addScriptTag({content:js});
   await expect.poll(()=>page.evaluate(()=>(window.recoveryReceipt.mounted))).toBe(1);
   await page.getByRole('button',{name:'Enter recovery'}).click();await page.getByText('Checking workplace access…',{exact:true}).waitFor();
   expect(await page.getByRole('button',{name:'Open billing in Velani'}).isDisabled()).toBe(true);
   await expect.poll(()=>Boolean(held.status)).toBe(true);
   expect(await page.getByText('Operational pollers and parallel sheet',{exact:true}).count()).toBe(0);
   await expect.poll(()=>page.evaluate(()=>(window.recoveryReceipt.unmounted))).toBe(1);
   await page.getByRole('button',{name:'Leave recovery'}).click();await page.getByText('Operational pollers and parallel sheet',{exact:true}).waitFor();
   await expect.poll(()=>page.evaluate(()=>(window.recoveryReceipt.aborted))).toContain('/api/commerce/status');
   if(!held.status)throw Error('Held status request missing');
   await held.status.fulfill({contentType:'application/json',body:JSON.stringify(status)}).catch(()=>undefined);
   expect(await page.getByText('2 / 15',{exact:true}).count()).toBe(0);
   holdStatus=false;await page.getByRole('button',{name:'Enter recovery'}).click();await page.getByText('Access paused',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Open billing in Velani'}).click();await page.getByRole('button',{name:'Opening billing…',exact:true}).waitFor();
   await expect.poll(()=>Boolean(held.handoff)).toBe(true);
   await page.getByRole('button',{name:'Leave recovery'}).click();
   await expect.poll(()=>page.evaluate(()=>(window.recoveryReceipt.aborted))).toContain('/api/commerce/handoff');
   if(!held.handoff)throw Error('Held handoff request missing');
   await held.handoff.fulfill({contentType:'application/json',body:JSON.stringify({url:'https://www.thevelani.com/pages/plans#handoff='+'a'.repeat(43)})}).catch(()=>undefined);
   await page.getByText('Operational pollers and parallel sheet',{exact:true}).waitFor();
   expect(navigations).toEqual([origin+'/fixture']);expect(externalRequests).toEqual([]);expect(await page.getByText('2 / 15',{exact:true}).count()).toBe(0);
   await page.getByRole('button',{name:'Enter recovery'}).click();await page.getByText('Access paused',{exact:true}).waitFor();held.handoff=undefined;
   await page.getByRole('button',{name:'Open billing in Velani'}).click();await expect.poll(()=>Boolean(held.handoff)).toBe(true);
   expect(await page.getByRole('button',{name:'Opening billing…'}).isDisabled()).toBe(true);
   if(!held.handoff)throw Error('Success handoff request missing');
   const destination='https://www.thevelani.com/pages/plans#handoff='+'a'.repeat(43);
   await held.handoff.fulfill({contentType:'application/json',body:JSON.stringify({url:destination})});await page.waitForURL(destination);await page.getByRole('heading',{name:'Fictional trusted billing destination'}).waitFor();
   expect(externalRequests).toEqual(['https://www.thevelani.com/pages/plans']);
   await page.goto(origin+'/fixture?initial=recovery');await page.addScriptTag({content:js});await page.getByText('Access paused',{exact:true}).waitFor();
   await page.getByRole('button',{name:'Leave recovery'}).click();await page.getByRole('heading',{name:'Fresh recovery exit document',exact:true}).waitFor();expect(recoveryDocuments).toBe(2);
   checks.push(engine+': healthy → recovery → healthy unmounts pollers/sheet; loading disables action; late read/handoff abort with no stale status or attempted navigation; valid trusted handoff navigates; recovery-first exit reloads a fresh document');
   await context.close();
  }
  expect(errors).toEqual([]);passed=true;
 });
},60000);
