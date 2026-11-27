import {expect,it} from '@rstest/core';
import {createRequire} from 'node:module';
import {randomBytes,createHash} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp} from './owned-app-fixture';
import {OWNED_COLLAB_ORIGIN} from './owned-collab-origin';
import {startOwnedTlsProxy} from './owned-tls-proxy';

it('enlarges the actual bilingual retirement question at mobile and desktop sizes',async()=>{
 const root=process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;
 if(!root)throw Error('External evidence required');
 const dir=resolve(root,'location-retirement-type');await mkdir(dir,{recursive:true});
 const origin=OWNED_COLLAB_ORIGIN,app=await createOwnedNextApp(dir,{production:true,portalHttpsOrigin:origin});
 const proxy=await startOwnedTlsProxy({[origin]:app.url});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE||resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const checks:unknown[]=[];
 try{
  const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
  await seedOwnedApp(app.database.executor);
  await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES('qa-type','workspace-fuel','qa-type','Café Brisa','Brisa',true)");
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-TYPE-WORKER','Alma','Mar','7875550187','EMPLOYEE','loc-1')");
  await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('QA-TYPE-WORKER','loc-1')");
  for(const engine of ['chromium','webkit']){
   const browser=await runtime[engine].launch({headless:true,proxy:{server:proxy.server}});
   try{for(const lang of ['en','es'])for(const width of [320,390,768,1024,1440]){
    const touch=width<=768,context=await browser.newContext({viewport:{width,height:1000},hasTouch:touch,isMobile:touch,ignoreHTTPSErrors:true,reducedMotion:'reduce',serviceWorkers:'block'});
    try{
     const token=randomBytes(32).toString('hex');await q("INSERT INTO employee_sessions(employee_id,token_hash,expires_at) VALUES('QAOWNER',$1,now()+interval '1 hour')",[createHash('sha256').update(token).digest('hex')]);
     await context.addCookies([{name:'fuel_session',value:token,url:origin,httpOnly:true,secure:true,sameSite:'Lax'},{name:'nv-lang',value:lang,url:origin}]);
     await context.route('**/*',(route:any)=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
     const page=await context.newPage();const sizes:number[]=[];
     for(const rootSize of [16,32]){
      await page.goto(origin+'/app/settings/locations/qa-type',{waitUntil:'networkidle'});
      await page.evaluate((size:number)=>document.documentElement.style.setProperty('font-size',size+'px','important'),rootSize);
      await page.locator('label[for="edit-location-active"]').click();await page.getByRole('button',{name:lang==='es'?'Guardar':'Save',exact:true}).click();
      const title=page.locator('#retire-title');await title.waitFor();await page.evaluate(()=>document.fonts.ready);
      const dialog = page.locator('dialog[open]').filter({has: title});
      const paint = await dialog.evaluate(async (sheet: HTMLDialogElement) => {
        const colors = () => [sheet, sheet.querySelector('.q-sheet__in'), sheet.querySelector('.b-discard')].map(node => {
          if (!node) return null;
          const style = getComputedStyle(node);
          return {opacity: style.opacity, background: style.backgroundColor, filter: style.filter};
        });
        const before = colors();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const transitions = sheet.getAnimations({subtree: true}).filter(animation =>
          animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity);
        await Promise.all(transitions.map(animation => animation.finished.catch(() => undefined)));
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        return {before, settled: colors()};
      });
      expect(paint.settled[0]?.opacity).toBe('1');
      const actions: {width:number; height:number; left:number; top:number; textLines:number}[] = await dialog.locator('.b-discard__acts > button').evaluateAll((buttons: HTMLButtonElement[]) => buttons.map(button => {
        const bounds = button.getBoundingClientRect(), text = document.createRange();
        text.selectNodeContents(button);
        return {width:bounds.width, height:bounds.height, left:bounds.left, top:bounds.top, textLines:text.getClientRects().length};
      }));
      expect(actions).toHaveLength(2);
      expect(Math.abs(actions[0].width-actions[1].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(actions[0].height-actions[1].height)).toBeLessThanOrEqual(1);
      expect(actions.every(action=>action.height>=44 && action.textLines===1)).toBe(true);
      if (actions[0].top!==actions[1].top) expect(actions[0].left).toBe(actions[1].left);

      const geometry=await title.evaluate((element:HTMLElement)=>({font:parseFloat(getComputedStyle(element).fontSize),line:parseFloat(getComputedStyle(element).lineHeight),root:parseFloat(getComputedStyle(document.documentElement).fontSize),text:element.textContent,clipped:element.scrollWidth>element.clientWidth+1,overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)>innerWidth+1}));
      const screenshot=resolve(dir,[engine,lang,'retire-confirm',width,rootSize].join('-')+'.png');await page.screenshot({path:screenshot,fullPage:true});
      sizes.push(geometry.font);checks.push({engine,lang,width,scale:rootSize===32?200:100,state:'retire-confirm',paint,actions,metric:geometry,geometry:{...geometry,overflow:geometry.overflow?1:0},file:screenshot});await writeFile(resolve(dir,'checks.json'),JSON.stringify({checks,failures:[]},null,2));
      expect(geometry.root).toBe(rootSize);expect(geometry.font).toBe(rootSize*1.125);expect(geometry.line).toBe(rootSize*1.5);expect(geometry.clipped).toBe(false);expect(geometry.overflow).toBe(false);
     }
     expect(sizes[1]).toBe(sizes[0]*2);
     for(const rootSize of [16,32]){
      await page.goto(origin+'/app/employees/QA-TYPE-WORKER?view=access',{waitUntil:'networkidle'});
      await page.evaluate((size:number)=>document.documentElement.style.setProperty('font-size',size+'px','important'),rootSize);
      const descriptions=page.locator('.c-access a:is([href$="/clocker-pin"],[href^="/app/account-recovery?employee="]) .c-row__detail > span:first-child');await descriptions.first().waitFor();
      const metrics=await descriptions.evaluateAll((elements:HTMLElement[])=>elements.map(element=>({text:element.textContent,clipped:element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+1,font:getComputedStyle(element).fontSize,whiteSpace:getComputedStyle(element).whiteSpace})));
      expect(metrics).toHaveLength(2);
      const wordBreaks=await page.locator('.c-access a:is([href$="/clocker-pin"],[href^="/app/account-recovery?employee="]) :is(.c-row__title,.c-row__detail > span,.c-row__value), .c-access #person-access .c-rows > li:first-child .c-row__value').evaluateAll((elements:HTMLElement[])=>elements.flatMap(element=>{
       const broken:string[]=[];const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node:Node|null;
       while((node=walker.nextNode()))for(const match of (node.textContent||'').matchAll(/\S+/gu)){const range=document.createRange();range.setStart(node,match.index!);range.setEnd(node,match.index!+match[0].length);if(new Set([...range.getClientRects()].map(rect=>Math.round(rect.top))).size>1)broken.push(match[0]);}
       return broken;
      }));
      const file=resolve(dir,[engine,lang,'employee-access',width,rootSize].join('-')+'.png');await page.screenshot({path:file,fullPage:true});
      const geometry=await page.evaluate(()=>({overflow:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,bodyText:document.body.innerText}));expect(geometry.overflow).toBeLessThanOrEqual(1);
      checks.push({engine,lang,width,scale:rootSize===32?200:100,state:'employee-access',metrics,wordBreaks,file,geometry});await writeFile(resolve(dir,'checks.json'),JSON.stringify({checks},null,2));expect(metrics.every((metric:{clipped:boolean})=>!metric.clipped)).toBe(true);expect(wordBreaks).toEqual([]);
     }
    }finally{await context.close();}
   }}finally{await browser.close();}
  }
 }finally{await proxy.close();await app.close();}
},900000);
