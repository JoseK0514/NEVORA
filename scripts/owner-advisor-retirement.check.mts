import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {clickAdvisorRefresh,readAdvisorPrivatePresence,assertAdvisorRetired} from '../src/test/integration/owner-advisor-retirement';
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
test('advisor guards reject retained private DOM and an inaccessible native Refresh control',async()=>{
 const browser=await runtime.chromium.launch({headless:true});
 try{
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(400);
  await context.route('**/*',(route:{abort():Promise<void>})=>route.abort());
  await page.setContent('<button onclick="this.dataset.clicked=\'yes\'">Refresh history</button>');await clickAdvisorRefresh(page);
  assert.equal(await page.getByRole('button',{name:'Refresh history',exact:true}).getAttribute('data-clicked'),'yes');
  await page.setContent('<button>Refresh history</button><div style="position:fixed;inset:0;z-index:1000;background:white">Native input is obstructed</div>');
  await assert.rejects(clickAdvisorRefresh(page),/Timeout/);
  for(const html of [
   '<section role="region" aria-label="Day plan comparison">Private answer retained</section>',
   '<p>Source fingerprint: old</p>',
   '<p>Source fingerprint: fresh</p>',
  ]){
   await page.setContent(html);const presence=await readAdvisorPrivatePresence(page,['old','fresh']);assert.throws(()=>assertAdvisorRetired(true,presence),/not verifiably retired/);
  }
  await page.setContent('<p>Signed out</p>');const empty=await readAdvisorPrivatePresence(page,['old','fresh']);
  assert.throws(()=>assertAdvisorRetired(false,empty),/not verifiably retired/);assert.doesNotThrow(()=>assertAdvisorRetired(true,empty));
 }finally{await browser.close();}
});
