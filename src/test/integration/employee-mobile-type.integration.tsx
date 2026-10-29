import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {SchedulePublicationChange} from '../../components/schedule-publication-change';
import {QuietPage} from '../../components/quiet/quiet';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';
it('uses the Employee type scale and readable reflow for actual schedule-change markup',async()=>{
 const evidence=process.env.NEVORA_EMPLOYEE_TYPE_EVIDENCE;if(!evidence)throw Error('Select explicit external type evidence');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const css=(await Promise.all(['src/app/globals.css','src/app/app/portal-gusto.css','src/components/quiet/quiet.css','src/components/employee-mobile/mobile.css'].map(file=>readFile(file,'utf8')))).join('\n');
 const before={employeeId:'fictional-self',locationId:'fictional-place',date:'2026-10-26',startTime:'08:00',endTime:'12:00',isDesignatedLead:false,isCalloutApproved:false};
 const markup=renderToStaticMarkup(<QuietPage className="q-sched-e"><div className="q-changes"><SchedulePublicationChange changes={[{type:'TIME_CHANGED',before,after:{...before,startTime:'09:00'},affectedEmployeeIds:['fictional-self']}]} locationNames={{'fictional-place':'Northside QA Workforce'}}/></div></QuietPage>);
 const measurements:unknown[]=[],errors:string[]=[];
 try{for(const engine of ['chromium','webkit','firefox']){
  const browser=await runtime[engine].launch({headless:true});try{
   const page=await browser.newPage({hasTouch:true,reducedMotion:'reduce'});page.on('pageerror',(error:Error)=>errors.push(error.message));
   for(const theme of ['light','dark'])for(const width of [320,390,844])for(const scale of [100,200]){
    await page.setViewportSize({width,height:width===844?390:844});await page.setContent('<!doctype html><html data-theme="'+theme+'" style="font-size:'+scale+'%"><head><style>'+css+'\nbody{margin:0}*{box-sizing:border-box}</style></head><body><div id="employee-mobile" class="app-shell nevora-portal" data-employee-mobile="true" data-employee-mobile-page="schedule"><main class="page-frame">'+markup+'</main></div></body></html>');
    const summary=page.locator('.schedule-publication-change > summary');await summary.focus();await page.keyboard.press('Enter');expect(await page.locator('.schedule-publication-change').getAttribute('open')).not.toBeNull();await page.screenshot({path:join(evidence,engine+'-'+theme+'-'+width+'-'+scale+'.png'),fullPage:false});
    const size=await summary.evaluate((el:HTMLElement)=>Number.parseFloat(getComputedStyle(el).fontSize));expect(size).toBe(16*scale/100);expect(await summary.locator('svg').count()).toBe(1);expect(await summary.evaluate((el:HTMLElement)=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    for(const target of await page.locator('.schedule-publication-change :is(summary,strong,li>span)').all()){
     expect(await target.evaluate((el:HTMLElement)=>Number.parseFloat(getComputedStyle(el).fontSize))).toBe(16*scale/100);const sample=await target.evaluate(measureRenderedContrast);expect(sample.ratio).toBeGreaterThanOrEqual(4.5);measurements.push({engine,theme,width,scale,label:(await target.innerText()).trim(),ratio:sample.ratio});
    }
    const splitWords=await page.locator('.schedule-publication-change').evaluate((el:HTMLElement)=>{const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),parts:number[]=[];for(let node=walker.nextNode();node;node=walker.nextNode()){const offset=node.textContent?.indexOf('Workforce')??-1;if(offset<0)continue;const range=document.createRange();range.setStart(node,offset);range.setEnd(node,offset+'Workforce'.length);parts.push(range.getClientRects().length);}return parts;});expect(splitWords).toEqual([1,1]);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    const clipping=await page.locator('.schedule-publication-change').evaluate((el:HTMLElement)=>{const bounds=el.getBoundingClientRect(),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),failures:string[]=[];let node:Node|null;while((node=walker.nextNode())){if(!node.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const rect of range.getClientRects())if(rect.left<bounds.left-1||rect.right>bounds.right+1)failures.push(node.textContent);}return failures;});expect(clipping).toEqual([]);
    await summary.focus();await page.keyboard.press('Enter');expect(await page.locator('.schedule-publication-change').getAttribute('open')).toBeNull();
   }
  }finally{await browser.close();}
 }}finally{await writeFile(join(evidence,'results.json'),JSON.stringify({scope:'Native rendered source component and source CSS only; real publication authorization remains in the owned Schedule journey',measurements,errors},null,2));}
 expect(errors).toEqual([]);
},60000);
