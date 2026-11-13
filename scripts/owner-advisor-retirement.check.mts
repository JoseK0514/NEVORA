import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {clickAdvisorRefresh,readAdvisorPrivatePresence,assertAdvisorRetired} from '../src/test/integration/owner-advisor-retirement';
import {withOwnedTestResources} from '../src/test/integration/owned-test-resources';
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
test('advisor guards reject retained private DOM and an inaccessible native Refresh control',async()=>{
 const browser=await runtime.chromium.launch({headless:true});
 const refused:string[]=[];let complete=false,browserClosed=false,positiveNativeInput=false,positiveRetiredDom=false;
 await withOwnedTestResources(async defer=>{
  defer(async()=>{
   const evidence=process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;
   if(process.env.GITHUB_ACTIONS==='true'&&!evidence)throw Error('CI advisor guard receipt requires external evidence');
   if(evidence){const root=resolve(evidence),source=resolve('.');if(root===source||root.startsWith(source+'/'))throw Error('External advisor guard evidence required');
    const hashes:Record<string,string>={};for(const name of ['scripts/owner-advisor-retirement.check.mts','src/test/integration/owner-advisor-retirement.ts'])hashes[name]=createHash('sha256').update(await readFile(name)).digest('hex');
    await mkdir(root,{recursive:true});await writeFile(resolve(root,'retirement-guard-report.json'),JSON.stringify({complete:complete&&browserClosed,browserClosed,negativeControlsRejected:refused,positiveNativeInput,positiveRetiredDom,sourceSha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),hashes},null,2)+'\n',{flag:'wx'});
   }
  });
  defer(async()=>{await browser.close();browserClosed=true;});
  const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(400);
  await context.route('**/*',(route:{abort():Promise<void>})=>route.abort());
  await page.setContent('<button onclick="this.dataset.clicked=\'yes\'">Refresh history</button>');await clickAdvisorRefresh(page);
  assert.equal(await page.getByRole('button',{name:'Refresh history',exact:true}).getAttribute('data-clicked'),'yes');
  positiveNativeInput=true;
  await page.setContent('<button>Refresh history</button><div style="position:fixed;inset:0;z-index:1000;background:white">Native input is obstructed</div>');
  await assert.rejects(clickAdvisorRefresh(page),/Timeout/);
  refused.push('obstructed-native-refresh');
  for(const [index,html] of [
   '<section role="region" aria-label="Day plan comparison">Private answer retained</section>',
   '<p>Source fingerprint: old</p>',
   '<p>Source fingerprint: fresh</p>',
  ].entries()){
   await page.setContent(html);const presence=await readAdvisorPrivatePresence(page,['old','fresh']);assert.throws(()=>assertAdvisorRetired(true,presence),/not verifiably retired/);refused.push(['retained-private-region','retained-old-fingerprint','retained-fresh-fingerprint'][index]);
  }
  await page.setContent('<p>Signed out</p>');const empty=await readAdvisorPrivatePresence(page,['old','fresh']);
  assert.throws(()=>assertAdvisorRetired(false,empty),/not verifiably retired/);assert.doesNotThrow(()=>assertAdvisorRetired(true,empty));
  positiveRetiredDom=true;refused.push('missing-server-denial');complete=true;
 });
});
