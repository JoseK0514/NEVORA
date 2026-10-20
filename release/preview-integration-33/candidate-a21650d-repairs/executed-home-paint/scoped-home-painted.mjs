import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir}from'node:fs/promises';
import {join}from'node:path';
import {execFileSync}from'node:child_process';
import {bindPaintMeasure}from'./home-painted-measure.mjs';
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./home-painted-manifest.json',import.meta.url),'utf8')),source=process.env.VERIFY_SOURCE;
 assert.equal(process.env.VERIFY_SHA,manifest.checkpoint);assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),manifest.checkpoint);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
 assert.equal(h.hash(await readFile(new URL('./home-painted-measure.mjs',import.meta.url),'utf8')),manifest.measureModuleSha256);
 for(const[file,digest]of Object.entries(manifest.sourceFiles))assert.equal(h.hash(await readFile(join(source,file),'utf8')),digest);
 h.register('scoped-home-published-pass-painted-contrast',['Actual root H03 pixel-helper API/paint diagnostic only'],async({page,row})=>{
  row.manifest=manifest;row.scope='One genuine Employee published Home pass, four native pointer/focus states; no full CI journey or other-source closure';
  let actual;const telemetry=[];page.on('response',async response=>{const request=response.request();if(request.method()!=='GET'||new URL(response.url()).pathname!=='/api/employee/home')return;let body;try{body=await response.json()}catch{return;}const authority=request.headers()['x-nevora-home'];const record={status:response.status(),state:body.state,authorityHeaderHash:authority?h.hash(authority):null,authorityMatches:!!authority&&body.snapshot?.authority===authority,publishedAssignments:[body.snapshot?.currentShift,body.snapshot?.nextShift].filter(Boolean).map(v=>({shiftHash:h.hash(v.shiftId),week:v.weekStart,date:v.date,publicationRevisionHash:h.hash(v.publicationRevisionId)}))};telemetry.push(record);if(response.status()===200&&record.authorityMatches&&['ready','partial'].includes(record.state)&&record.publishedAssignments.length)actual=record;});
  await page.emulateMedia({reducedMotion:'no-preference'});await h.go(page,row,'/app');await h.until(()=>!!actual,'SETUP GAP: no genuine authorized Employee Home200 with a published assignment');
  const section=page.locator('[aria-labelledby="employee-reviewed-next-heading"]'),link=section.getByRole('link',{name:'View schedule',exact:false}).first();
  await link.waitFor({state:'visible'});
  const href=new URL(await link.getAttribute('href'),h.baseUrl),bound=actual.publishedAssignments.some(s=>href.searchParams.get('week')===s.week&&href.searchParams.get('day')===s.date);
  assert(bound,'SETUP GAP: visible pass is not bound to the actual own published assignment');row.actualOwnRead={...actual,linkHref:href.pathname+href.search};row.readTelemetry=telemetry;
  await page.locator('h1').click();let reached=false;for(let i=0;i<55;i++){await page.keyboard.press('Tab');if(await link.evaluate(e=>e===document.activeElement)){reached=true;break;}}
  h.check(row,reached,'Native Tab reaches the real published pass link');assert(reached,'SETUP GAP: native keyboard did not reach pass link');
  await link.evaluate(e=>{window.__actualHomePaintLink=e;});let current='focus';const dir=join(process.env.VERIFY_REPORT_ROOT,'home-painted-contrast');await mkdir(dir,{recursive:true});row.actualCrops={};
  const proxy=new Proxy(link,{get(target,key){if(key==='screenshot')return async options=>{const bytes=await target.screenshot(options),name=row.engine+'-AUDIT-E-390x1000-'+current+'.png';await writeFile(join(dir,name),bytes);row.actualCrops[current]='home-painted-contrast/'+name;return bytes;};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;}});
  const details={},measure=bindPaintMeasure(proxy,page,details);row.stateSemantics={};row.minimums={};
  const sample=async state=>{current=state;row.stateSemantics[state]=await link.evaluate(e=>({connected:e.isConnected,sameNode:e===window.__actualHomePaintLink,focused:e===document.activeElement,focusVisible:e.matches(':focus-visible'),hover:e.matches(':hover'),active:e.matches(':active'),box:e.getBoundingClientRect().toJSON(),hoverMedia:matchMedia('(hover:hover)').matches,reducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches}));const min=await measure(state);row.minimums[state]=min;row.paint=details.linkContrastPaint;h.check(row,min>=4.5,state+': actual painted pass contrast meets4.5',details.linkContrastPaint[state]);};
  try{await sample('focus');await link.evaluate(e=>e.blur());await page.mouse.move(0,0);await sample('normal');await link.hover();await sample('hover');await page.mouse.down();await sample('pressed');}finally{await page.mouse.move(0,0);await page.mouse.up();}
  h.check(row,Object.keys(row.minimums).length===4,'All four actual states decoded CanvasBlob/PNG pixels');h.check(row,Object.values(row.stateSemantics).every(s=>s.connected&&s.sameNode),'All states retain the same genuine published pass link');
  await writeFile(join(dir,row.engine+'-report.json'),JSON.stringify({checkpoint:manifest.checkpoint,actualOwnRead:row.actualOwnRead,readTelemetry:telemetry,stateSemantics:row.stateSemantics,minimums:row.minimums,paint:row.paint,actualCrops:row.actualCrops,manifest},null,2)+'\n');
 },{accounts:['AUDIT-E'],sizes:[[390,1000,100]]});
}
