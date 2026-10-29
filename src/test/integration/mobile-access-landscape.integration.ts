import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve,join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from './owned-next-app';

it('keeps one mobile Access presentation in short touch landscape and preserves unsent fields through rotation',async()=>{
 const root=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;if(!root)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 const evidence=join(root,'landscape');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence,{mobileAccessEnabled:true,mobileSupportEnabled:true,pinDevTypeReferences:true});
 const failures:unknown[]=[],measurements:unknown[]=[],rotations:unknown[]=[];let complete=false;
 try{
  for(const engine of ['chromium','webkit','firefox']){
   const browser=await runtime[engine].launch({headless:true});
   try{
    const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,...(engine==='firefox'?{}:{isMobile:true}),reducedMotion:'reduce',serviceWorkers:'block'});
    await context.route('**/*',async(route:{request():{url():string};abort(reason?:string):Promise<void>;continue():Promise<void>})=>{const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url)await route.abort('blockedbyclient');else await route.continue();});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',(error:Error)=>failures.push({engine,error:error.message}));
    await context.addInitScript(()=>{addEventListener('error',()=>{document.documentElement.dataset.accessWindowError='true';});addEventListener('unhandledrejection',()=>{document.documentElement.dataset.accessWindowError='true';});});
    for(const theme of ['light','dark'])for(const scale of [100,200])for(const path of ['/welcome','/login','/forgot-access','/reset-access','/activate','/access-help','/access-help/email','/access-help/invitation','/access-help/support','/access-help/owner-contact']){
     expect((await page.goto(app.url+path))?.status()).toBe(200);await page.locator('#mobile-access-page').waitFor();await page.waitForLoadState('networkidle');
     await page.evaluate(({theme,scale}:{theme:string;scale:number})=>{localStorage.setItem('nv-theme',theme);document.documentElement.dataset.theme=theme;(window as Window&{__nvApplyTheme?:()=>void}).__nvApplyTheme?.();document.documentElement.style.fontSize=scale+'%';scrollTo(0,0);},{theme,scale});
     const sample=await page.evaluate(()=>{
      const visible=(selector:string)=>[...document.querySelectorAll<HTMLElement>(selector)].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
      const heading=visible('h1')[0]?.getBoundingClientRect(),primary=visible('.ma-actions > .q-btn')[0]?.getBoundingClientRect();
      return {coarse:matchMedia('(pointer:coarse)').matches,overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),mobileHeaders:visible('.ma-header').length,desktopHeaders:visible('.ma-desktop').length,cards:visible('.ma-card').length,forms:visible('form').length,headings:visible('h1').length,headingTop:heading?.top,headingBottom:heading?.bottom,primaryBottom:primary?.bottom,targets:visible('.ma-language,.q-btn').map(el=>el.getBoundingClientRect().height),windowError:document.documentElement.dataset.accessWindowError==='true'};
     });
     measurements.push({engine,theme,scale,path,...sample});
     const check=(ok:boolean,reason:string)=>{if(!ok)failures.push({engine,theme,scale,path,reason,sample});};
     check(sample.coarse,'Native pointer must be coarse');check(sample.overflow<=1,'No sideways document scroll');check(sample.mobileHeaders===1&&sample.desktopHeaders===0,'Exactly one mobile header');check(sample.headings===1&&sample.forms<=1,'One operative page and at most one form');check(!sample.windowError,'No window exceptions');
     check(sample.targets.every((height:number)=>height>=44),'44px interactive targets');
     if(['/login','/forgot-access'].includes(path))check(sample.cards===1,'Approved mobile form card must remain active');
     if(path==='/welcome'){check((sample.headingTop??Infinity)<390,'Welcome heading starts in viewport');if(scale===100)check((sample.primaryBottom??Infinity)<=390,'Welcome sign-in action fits the first viewport');}
     if(['/welcome','/login','/forgot-access'].includes(path))await page.screenshot({path:join(evidence,engine+'-'+theme+'-'+scale+path.replaceAll('/','-')+'.png'),fullPage:false});
    }
    for(const path of ['/login','/forgot-access']){
     await page.setViewportSize({width:390,height:844});await page.goto(app.url+path);await page.locator('.ma-card').waitFor();
     const fields=path==='/login'?[['login-employee-id','FICTIONAL-ROTATION'],['login-password','Unsent fixture only 123!']]:[['recovery-employee-id','FICTIONAL-ROTATION'],['recovery-email','rotation@example.invalid']];
     for(const [id,value]of fields)await page.locator('#'+id).fill(value);
     for(const viewport of [{width:844,height:390},{width:1440,height:900},{width:320,height:844},{width:390,height:844}]){
      await page.setViewportSize(viewport);await expect.poll(()=>page.locator('.ma-card:visible').count(),{timeout:2000}).toBe(viewport.width<=767||viewport.height<=500?1:0).catch(()=>{failures.push({engine,path,viewport,reason:'Form presentation did not follow rotation'});});
      for(const [id,value]of fields){expect(await page.locator('#'+id).count()).toBe(1);expect(await page.locator('#'+id).inputValue()).toBe(value);}
      expect(await page.locator('form:visible').count()).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);rotations.push({engine,path,viewport,fieldsPreserved:true});
     }
    }
    await context.close();
   }finally{await browser.close();}
  }
  expect(failures).toEqual([]);complete=true;
 }finally{await writeFile(join(evidence,'results.json'),JSON.stringify({complete,scope:'Owned local public Access pages, native touch contexts, no submitted credentials/provider delivery',measurements,rotations,failures},null,2));await app.close();}
},360000);
