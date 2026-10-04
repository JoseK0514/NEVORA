/** Source-component fixture QA only. No authentication, persistence, provider,
 * physical-device, or production onboarding claim is made by this verifier. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { widths, engines, protectedScreens, genericScreens, caseId, loopbackOrigin, validateOutput, matrixPlan, applyReviewedComparisons, assertRouteIdentity, assertScheduleLocationFit } from './verify-nevora-foundation-config.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const output = process.env.NEVORA_QA_OUTPUT;
await validateOutput(output, root);
const base = loopbackOrigin(process.env.NEVORA_QA_BASELINE_URL);
const fuel = loopbackOrigin(process.env.NEVORA_QA_FUEL_URL);
const generic = loopbackOrigin(process.env.NEVORA_QA_GENERIC_URL);
assert(new Set([base, fuel, generic]).size === 3, 'Use separate immutable parent, Fuel and generic fixture origins');
assert(process.env.NEVORA_QA_PLAYWRIGHT_PATH, 'Supply an existing local Playwright module; installs nothing');
assert(process.env.NEVORA_QA_BASELINE_DIR, 'Supply immutable exact-parent evidence directory');
const baselineDir = process.env.NEVORA_QA_BASELINE_DIR;
const manifest = JSON.parse(await readFile(resolve(baselineDir, 'baseline-manifest.json'), 'utf8'));
assert.equal(manifest.parent, '0a12f1f4ac7212a8cbbe195f013407a8bc74c4d5');
for (const url of [base + '/app?employee', fuel + '/app?employee', generic + '/app/settings/locations?owner']) {
  const response = await fetch(url, { redirect: 'error' });
  assert.equal(response.status, 200, 'Fixture preflight: ' + url);
}
const playwright = await import(pathToFileURL(process.env.NEVORA_QA_PLAYWRIGHT_PATH).href);
const { nativePushDouble } = await import(pathToFileURL(resolve(baselineDir, 'browser-fixture/push-double.mjs')).href);
await mkdir(resolve(output, 'screenshots'), { recursive: true });
const results = { provenance: { parent: manifest.parent, base, fuel, generic, evidence: 'actual source components; frozen fictional fixtures; intercepted actions; no real auth/database/provider' }, plan: matrixPlan(), protected: [], generic: [], setup: [], errors: [] };
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function freeze() { const O = Date; window.Date = class extends O { constructor(...args) { super(...(args.length ? args : ['2026-10-01T16:00:00Z'])); } static now() { return new O('2026-10-01T16:00:00Z').getTime(); } }; }
const expectedPages = new WeakMap();
async function settled(page, url) {
  expectedPages.set(page, url);
  const response = await page.goto(url); assert.equal(response.status(), 200, url + ': ' + (response.status() === 200 ? '' : (await response.text()).slice(0,400)));
  await page.waitForFunction(() => window.fixtureReady === true);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  await page.waitForTimeout(80);
  assert.deepEqual(await page.evaluate(() => window.fixtureHydrationErrors ?? []), []);
  assertRouteIdentity(url, page.url(), await page.locator('h1').first().textContent());
}
async function audit(page) {
  const data = await page.evaluate(() => {
    const root = document.querySelector('.page-frame,.clocker-terminal-page,.auth-card') ?? document.body;
    const visible = e => { const r=e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
    const controls = [...root.querySelectorAll('button,input:not([type=hidden]),select,textarea,a')].filter(visible).map(e => {
      const r=e.getBoundingClientRect(), s=getComputedStyle(e), range=document.createRange(); range.selectNodeContents(e); const t=range.getBoundingClientRect();
      return {tag:e.tagName,name:e.getAttribute('name'),text:e.textContent.trim(),class:e.className,x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,color:s.color,background:s.backgroundColor,opacity:s.opacity,justify:s.justifyContent,align:s.alignItems,labelCenterDelta:t.height && !e.querySelector('svg,input,select')?Math.abs((t.top+t.bottom-r.top-r.bottom)/2):null};
    });
    const textBounds=[];const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode()){const node=walker.currentNode;if(!node.textContent.trim()||!visible(node.parentElement))continue;const range=document.createRange();range.selectNodeContents(node);for(const r of range.getClientRects())if(r.width&&r.height&&(r.left < -1 || r.right > innerWidth+1))textBounds.push({text:node.textContent.trim().slice(0,100),left:r.left,right:r.right,parent:node.parentElement.className});}
    const selector=document.querySelector('.schedule-location-control')?.getBoundingClientRect(),toolbar=document.querySelector('.schedule-operations-toolbar')?.getBoundingClientRect();
    const locationLinks = [...document.querySelectorAll('.schedule-location-control a')];
    const actionRects = [...document.querySelectorAll('.schedule-command-actions > .button, .schedule-more-menu > summary')]
      .filter(visible).map(element => element.getBoundingClientRect());
    // Independent of the product's sibling-region measurement: enumerate all
    // visible interactive peers plus the whole named week panel (including its
    // central label), excluding the location selector itself.
    const locationPeers = [...document.querySelectorAll(
      '.schedule-operations-toolbar [aria-label="Schedule week"], .schedule-operations-toolbar a, .schedule-operations-toolbar button, .schedule-operations-toolbar summary, .schedule-operations-toolbar input, .schedule-operations-toolbar select',
    )].filter(element => !element.closest('.schedule-location-control') && element.checkVisibility() && visible(element));
    const locationPeerRegions = locationPeers.map(element => element.getAttribute('aria-label') || element.textContent.trim());
    const locationPeerOverlaps = [];
    const intersects = (a, b) => a.width && b.width && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const locationTextBounds = [];
    let locationActionOverlap = false;
    let locationAnchorActionOverlap = false;
    for (const link of locationLinks) {
      const box = link.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(link);
      locationAnchorActionOverlap ||= actionRects.some(action => intersects(box, action));
      for (const text of range.getClientRects()) {
        locationActionOverlap ||= actionRects.some(action => intersects(text, action));
        for (const peer of locationPeers) {
          const peerBox = peer.getBoundingClientRect();
          if (intersects(text, peerBox)) locationPeerOverlaps.push({
            label: link.textContent,
            peer: peer.getAttribute('aria-label') || peer.textContent.trim(),
            text: text.toJSON(),
            control: peerBox.toJSON(),
          });
        }
        if (text.left < box.left - 1 || text.right > box.right + 1 || text.top < box.top - 1 || text.bottom > box.bottom + 1 || text.left < 0 || text.right > innerWidth) {
          locationTextBounds.push({ label: link.textContent, box: box.toJSON(), text: text.toJSON() });
        }
      }
    }
    return {locationPeerRegions,locationPeerOverlaps,locationTextBounds,url:location.href,heading:document.querySelector('h1')?.textContent,locationAnchorActionOverlap,locationActionOverlap,locationSelector:selector&&toolbar?{links:locationLinks.map(link=>({label:link.textContent,...link.getBoundingClientRect().toJSON()})),expanded:document.querySelector('.schedule-location-control').dataset.expandedLocations==='true',width:selector.width,toolbarWidth:toolbar.width,toolbarHeight:toolbar.height}:null,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,controls, textBounds, text:root.innerText, geometry:[...root.querySelectorAll('*')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return [e.tagName,e.className,...[r.x,r.y,r.width,r.height].map(x=>Math.round(x*100)/100),s.color,s.backgroundColor,s.fontSize,s.lineHeight];})};
  });
  assertRouteIdentity(expectedPages.get(page), data.url, data.heading);
  return data;
}
async function capture(page, name) { const path=resolve(output,'screenshots',name+'.png'); const png=await page.screenshot({path,fullPage:true,animations:'disabled'});return {path,sha256:hash(png)}; }
async function flush() { await writeFile(resolve(output,'browser-results.json'),JSON.stringify(results,null,2)); }
for (const engine of engines) {
  const browser=await playwright[engine].launch({headless:true});
  try {
    const cases=[...protectedScreens.flatMap(s=>widths.map(width=>({...s,width}))),...['/clocker/2','/clocker/110'].flatMap(path=>[1024,768].map(width=>({path,role:'employee',width})))];
    for(const {role,path,width} of cases){
      const height=width===768?1024:width===1024?768:844;
      const context=await browser.newContext({viewport:{width,height},timezoneId:'America/Puerto_Rico',locale:'en-US',reducedMotion:'reduce'});await context.addInitScript(freeze);
      const row={id:caseId(engine,role,path,width),engine,role,path,width,height,passed:false};
      try {
        const a=await context.newPage(),b=await context.newPage();
        for(const page of [a,b])page.on('pageerror',e=>results.errors.push({id:row.id,message:e.message,url:page.url()}));
        if(role==='manager'&&path==='/app/settings'){
          for(const origin of [base,fuel]){const response=await fetch(origin+path+'?'+role);assert.equal(response.status,500);assert.match(await response.text(),/redirect:\/app/);}
          row.accessDenied='Actual requireRoles redirects Manager to /app; fixture redirect transport is HTTP500 on both sources';row.passed=true;continue;
        }
        await settled(a,base+path+'?'+role);await settled(b,fuel+path+'?'+role);
        row.before=await capture(a,`${engine}-${role}-${path.replaceAll('/','_')}-${width}-before`);row.after=await capture(b,`${engine}-${role}-${path.replaceAll('/','_')}-${width}-after`);
        row.baselineFile=resolve(baselineDir,`screenshots/${role==='employee'&&path==='/app/schedule'?'retry-':''}${engine}-${role}-${path.replaceAll('/','_')}-${width}x${height}.png`);
        row.immutableBaselineHash=hash(await readFile(row.baselineFile));row.freshBaselineMatches=row.before.sha256===row.immutableBaselineHash;
        row.beforeAudit=await audit(a);row.afterAudit=await audit(b);if(row.afterAudit.locationSelector)assertScheduleLocationFit(row.afterAudit);row.pixelsEqual=row.before.sha256===row.after.sha256;row.geometryEqual=JSON.stringify(row.beforeAudit.geometry)===JSON.stringify(row.afterAudit.geometry);
        row.textEqual=row.beforeAudit.text===row.afterAudit.text;row.passed=row.pixelsEqual&&row.freshBaselineMatches&&!row.afterAudit.overflow;
        // Changed source screens require a separately recorded human/agent review
        // of exact pixels + text + geometry. Never update or mask the parent.
      }catch(error){row.error=String(error);}finally{results.protected.push(row);await context.close();await flush();}
    }
    for(const path of genericScreens)for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:width===768?1024:width===1024?768:844},timezoneId:'America/New_York',locale:'en-US',reducedMotion:'reduce'});await context.addInitScript(freeze);
      const row={id:caseId(engine,path,width),engine,path,width,passed:false};
      try{const page=await context.newPage();page.on('pageerror',e=>results.errors.push({id:row.id,message:e.message,url:page.url()}));await settled(page,generic+path);row.audit=await audit(page);
        if (path.startsWith('/app/schedule?manager')) {
          assertScheduleLocationFit(row.audit);
          const query = new URL(generic + path).searchParams;
          const links = row.audit.locationSelector.links;
          if (query.has('natural') || query.has('wide')) {
            const count = query.has('one') ? 1 : query.has('two') ? 2 : 3;
            const labels = query.has('wide') ? Array(3).fill('W'.repeat(16)) : ['Operations North', 'Operations South', 'Customer Service'];
            assert.deepEqual(links.map(link => link.label), ['All locations', ...labels.slice(0, count)], 'Boundary fixture must render its exact catalog');
          } else {
            assert.equal(links.length, query.has('one') ? 2 : query.has('twenty') ? 20 : query.has('long') ? 4 : 3);
          }
          assert(links.every(link => link.height >= 44), 'Every location remains a full tap target');
        }
        assert.deepEqual(row.audit.locationTextBounds,[],'Location glyphs must remain within controls and viewport');assert.equal(row.audit.locationActionOverlap,false,'Location labels must not intersect action controls');if(path.startsWith('/app/schedule?manager')&&row.audit.locationSelector.expanded&&width>=768){assert(row.audit.locationSelector.width>=row.audit.locationSelector.toolbarWidth-24,'Many-location selector must use the full toolbar row');assert(row.audit.locationSelector.toolbarHeight<400,'Many-location toolbar must remain compact');}row.screenshot=await capture(page,`${engine}-generic-${path.replaceAll(/[^a-z0-9]/gi,'_')}-${width}`);row.passed=!row.audit.overflow&&row.audit.controls.every(c=>c.x>=-1&&c.x+c.width<=width+1);}
      catch(error){row.error=String(error);}finally{results.generic.push(row);await context.close();await flush();}
    }
    for(const state of ['ready','denied','error','enabled'])for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:width===768?1024:width===1024?768:844},timezoneId:'America/Puerto_Rico',locale:'en-US',reducedMotion:'reduce'});
      // Permission and provider APIs are fixture doubles, never native subscribe.
      await context.addInitScript(nativePushDouble,{permission:state==='denied'?'denied':'default'});
      await context.route('**/app/api/push/**',route=>state==='error'?route.fulfill({status:503,json:{error:'Fictional unavailable'}}):route.fulfill({json:{supported:true,configurationAvailable:true,enabled:state==='enabled',testAllowed:state==='enabled',dismissalScope:'QA-account',vapidPublicKey:'B'+'A'.repeat(86),...(state==='enabled'?{ownershipGeneration:'QA-generation'}:{})}}));
      const row={id:caseId(engine,state,width),engine,state,width,passed:false};
      try{const a=await context.newPage(),b=await context.newPage();for(const p of [a,b]){await settled(p,(p===a?base:fuel)+'/app?owner&push');await p.locator('#portal-device-settings').evaluate(e=>e.showPopover());await p.waitForTimeout(350);}row.before=await capture(a,`${engine}-setup-${state}-${width}-before`);row.after=await capture(b,`${engine}-setup-${state}-${width}-after`);row.pixelsEqual=row.before.sha256===row.after.sha256;row.audit=await audit(b);row.passed=row.pixelsEqual&&!row.audit.overflow;await b.getByRole('button',{name:'Show Install Instructions'}).click();row.install=await capture(b,`${engine}-install-${state}-${width}`);}
      catch(error){row.error=String(error);}finally{results.setup.push(row);await context.close();await flush();}
    }
  }finally{await browser.close();}
}
await flush();
if(process.env.NEVORA_QA_REVIEW){applyReviewedComparisons(results,JSON.parse(await readFile(process.env.NEVORA_QA_REVIEW,'utf8')));await flush();}
const summary=Object.fromEntries(['protected','generic','setup'].map(key=>[key,{count:results[key].length,passed:results[key].filter(r=>r.passed).length,errors:results[key].filter(r=>r.error).length}]));
console.log(JSON.stringify({summary,runtimeErrors:results.errors.length,report:resolve(output,'browser-results.json')},null,2));
// A nonzero status keeps unresolved comparisons visible for explicit review.
if(results.errors.length||['protected','generic','setup'].some(key=>results[key].some(row=>!row.passed)))process.exitCode=1;
