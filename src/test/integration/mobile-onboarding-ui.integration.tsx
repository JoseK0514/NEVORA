import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {MobileOnboardingGuide} from '../../components/mobile-access/onboarding-guide';
import {measureRenderedContrast} from '../../../scripts/browser-contrast.mjs';

it('keeps the actual Quick guide readable and keyboard usable in both Employee themes and enlarged text',async()=>{
 const root=process.env.NEVORA_MOBILE_ACCESS_EVIDENCE;if(!root)throw Error('Select external NEVORA_MOBILE_ACCESS_EVIDENCE');
 const evidence=join(root,'onboarding');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const css=(await Promise.all(['src/components/employee-mobile/mobile.css','src/components/mobile-access/onboarding-guide.css'].map(file=>readFile(file,'utf8')))).join('\n');
 const markup=renderToStaticMarkup(<MobileOnboardingGuide employeeId="FICTIONAL-GUIDE" lang="en" timeOffEnabled/>);
 const measurements:unknown[]=[],failures:unknown[]=[];
 try{
  for(const engine of ['chromium','webkit','firefox']){
   const browser=await runtime[engine].launch({headless:true});
   try{
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(10000);
    page.on('pageerror',(error:Error)=>failures.push({engine,error:error.message}));
    for(const theme of ['light','dark'])for(const width of [320,390])for(const scale of [100,200]){
     await page.setViewportSize({width,height:844});
     await page.setContent('<!doctype html><html data-theme="'+theme+'" style="font-size:'+scale+'%"><head><style>*{box-sizing:border-box}body{margin:0}#employee-mobile{min-height:100vh}'+css+'</style></head><body><main id="employee-mobile" class="app-shell nevora-portal" data-employee-mobile="true" data-employee-mobile-page="home">'+markup+'</main></body></html>');
     const summary=page.locator('.ma-onboarding summary');await summary.focus();await page.keyboard.press('Enter');expect(await page.locator('.ma-onboarding details').getAttribute('open')).not.toBeNull();
     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
     for(const label of await page.locator('.ma-onboarding :is(summary,b,small,p):visible').all()){
      const text=(await label.innerText()).trim(),sample=await label.evaluate(measureRenderedContrast);measurements.push({engine,theme,width,scale,text,ratio:sample.ratio});
      if(sample.ratio<4.5)failures.push({engine,theme,width,scale,text,ratio:sample.ratio});
     }
     for(const target of await page.locator('.ma-onboarding :is(a,summary):visible').all())expect(await target.evaluate((el:HTMLElement)=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
     await page.keyboard.press(engine==='webkit'?'Alt+Tab':'Tab');expect(await page.locator('.ma-guide-list a').first().evaluate((el:HTMLElement)=>el===document.activeElement)).toBe(true);
     await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(evidence,engine+'-'+theme+'-'+width+'-text'+scale+'.png'),fullPage:false});
    }
   }finally{await browser.close();}
  }
  expect(failures).toEqual([]);
 }finally{await writeFile(join(evidence,'results.json'),JSON.stringify({scope:'Real guide markup and scoped source CSS in native engines; informational component proof, not authenticated Home/activation acceptance',measurements,failures},null,2));}
},60000);
