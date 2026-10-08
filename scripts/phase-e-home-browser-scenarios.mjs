import assert from 'node:assert/strict';
import {join} from 'node:path';
import {writeFile} from 'node:fs/promises';
import {seedOwnedScenario,TEST_PASSWORD} from '../src/test/integration/owned-app-fixture.ts';

// Prospective baseline only: captured before Task5 application changes.
export async function runScenario({app,page,engine,width,evidenceDirectory}){
 const label=`HBC${engine==='chromium'?'C':'W'}${width}`,index=[320,375,390,430,768,1024,1440].indexOf(width)+(engine==='webkit'?7:0);
 const scenario=await seedOwnedScenario(app.database.executor,label,index),actor=scenario.actors[0];
 await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([page.waitForURL(u=>u.pathname==='/app'),page.getByRole('button',{name:'Sign In',exact:true}).click()]);await page.waitForLoadState('networkidle');
 await page.getByText('No open time entry was recorded at the last check.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('heading',{level:1}).count(),1);assert.equal(await page.locator('.employee-home').count(),1);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const screenshot=join(evidenceDirectory,`home-baseline-${engine}-${width}.png`);await page.screenshot({path:screenshot,fullPage:true});
 const checks=['BASELINE ONLY: authenticated persisted existing Home, own recorded-time reader, single heading and viewport reflow; no Task5 acceptance claimed'];
 await writeFile(join(evidenceDirectory,`home-baseline-${engine}-${width}.json`),JSON.stringify({stage:'pre-implementation baseline',actor,scenario,checks,screenshot,html:await page.locator('.employee-home').innerHTML()},null,2));
 return {checks};
}
