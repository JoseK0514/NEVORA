// Three source-bound attribution probes, for a216 only. Not a replacement for any official result.
import assert from 'node:assert/strict';
import{readFile,mkdir}from'node:fs/promises';
import{execFileSync}from'node:child_process';
import{join,resolve}from'node:path';
const expectedSHA='a21650de50374683d52e32b883d7f419d7344f22';
const checkerHash='e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d';
const original=[
 {name:'diag-wb-contrast-templates-320-200',route:'/app/schedule/templates?applied=3&skipped=1&warnings=1',size:[320,844,200],raw:'p35-wave-b/full-exit-cd764f6/checks/batch-0015.json'},
 {name:'diag-wb-contrast-rules-360-100',route:'/app/schedule/settings?windowSaved=1',size:[360,844,100],raw:'p35-wave-b/full-exit-cd764f6/checks/batch-0020.json'},
 {name:'diag-wb-contrast-rules-430-125',route:'/app/schedule/settings?windowSaved=1',size:[430,844,125],raw:'p35-wave-b/full-exit-cd764f6/checks/batch-0056.json'},
];
export function registerScopedCases(h){
 const{register,baseUrl,check,hash,wait}=h;
 for(const config of original)register(config.name,['WB-CONTRAST-ATTRIBUTION'],async({page,row})=>{
  assert.equal(row.engine,'chromium','These three original failures are Chromium; caller must select VERIFY_ENGINES=chromium');
  const source=resolve(process.env.VERIFY_SOURCE??'');assert.equal(process.env.VERIFY_SHA,expectedSHA);assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),expectedSHA);assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
  const sourceChecker=await readFile(join(source,'scripts/ui-checks/checks.mjs'),'utf8');assert.equal(hash(sourceChecker),checkerHash,'Official checker/oracle changed');
  const begin=sourceChecker.indexOf('phone => {'),end=sourceChecker.indexOf('}, phone).catch',begin);assert(begin>=0&&end>begin,'Known official basic probe bounds unavailable');
  const officialBasic=Function('return ('+sourceChecker.slice(begin,end+1)+')')();
  const axe=await readFile(join(source,'node_modules/axe-core/axe.min.js'),'utf8');
  row.diagnostic={sourceSHA:expectedSHA,originalSourceSHA:'cd764f614be8ca5b5215be19d46e07cf968638d7',originalRaw:config.raw,originalEngine:'chromium',originalRoute:config.route,checkerHash,axeHash:hash(axe),timing:'Original load+2500ms; root text mutation only at non100% +600ms; extracted unchanged basic probe; identical axe-core and tags. Instrumentation overhead explicitly recorded. No fonts-ready wait.',findingsSuppressed:false,sourceOrStyleSubstitution:false,instrumentationLimit:'Passive rAF style/animation sampling and diagnostic logging can affect wall-clock scheduling. Actual original raw rows remain authoritative and are never replaced.'};
  const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text().slice(0,200));});
  // The common targeted driver uses reduced motion. Match the original official checker before navigation.
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
   window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
   const state=window.__wbContrastDiagnostic={frames:[],phase:'navigation',stopped:false};let previous=-Infinity;
   const describe=e=>{
    const s=getComputedStyle(e),r=e.getBoundingClientRect(),ancestors=[];for(let a=e;a;a=a.parentElement){const q=getComputedStyle(a);if(q.opacity!=='1'||q.backgroundColor!=='rgba(0, 0, 0, 0)')ancestors.push({tag:a.tagName,id:a.id,cls:String(a.className?.baseVal??a.className).slice(0,160),opacity:q.opacity,color:q.color,background:q.backgroundColor});}
    const mid={x:r.x+r.width/2,y:r.y+r.height/2},hit=document.elementFromPoint(mid.x,mid.y),animations=e.getAnimations().map(a=>{const timing=a.effect?.getComputedTiming();return{name:a.animationName??null,currentTime:a.currentTime,startTime:a.startTime,playState:a.playState,timing:timing?{duration:timing.duration,progress:timing.progress,easing:timing.easing,localTime:timing.localTime}:null};});
    const textRange=document.createRange();textRange.selectNodeContents(e);const textRects=[...textRange.getClientRects()].map(q=>q.toJSON());
    return{tag:e.tagName,id:e.id,cls:String(e.className?.baseVal??e.className),text:e.textContent?.trim().slice(0,220),box:r.toJSON(),textRects,style:{color:s.color,background:s.backgroundColor,backgroundImage:s.backgroundImage,opacity:s.opacity,visibility:s.visibility,display:s.display,font:s.font,transform:s.transform,translate:s.translate,animationName:s.animationName,animationDuration:s.animationDuration,animationDelay:s.animationDelay,animationFillMode:s.animationFillMode},ancestors,animations,centerHit:!!hit&&(hit===e||e.contains(hit)),hit:hit?{tag:hit.tagName,id:hit.id,cls:String(hit.className?.baseVal??hit.className).slice(0,160)}:null};
   };
   state.describe=describe;
   const sample=t=>{if(state.stopped)return;if(t-previous>=75){previous=t;state.frames.push({t,phase:state.phase,fonts:document.fonts.status,nodes:[...document.querySelectorAll('.form-success[role=status],.form-success[role=status]>span,.form-warning,.form-warning>span,.form-warning a,.nevora-toast,.mobile-nav [class*=badge],.mobile-nav [class*=count]')].map(describe)});}requestAnimationFrame(sample);};requestAnimationFrame(sample);
  });
  const wallStarted=new Date().toISOString(),nodeStarted=performance.now();let status=0;
  try{const response=await page.goto(baseUrl+config.route,{waitUntil:'load',timeout:30000});status=response?.status()??0;row.diagnostic.load=await page.evaluate(()=>({t:performance.now(),fonts:document.fonts.status,readyState:document.readyState}));await page.waitForTimeout(2500);if(row.text!==100){await page.evaluate(t=>{window.__wbContrastDiagnostic.phase='root-text-step';document.documentElement.style.fontSize=t+'%';},row.text);await page.waitForTimeout(600);}}
  catch(error){errors.push('load: '+error.message.slice(0,200));}
  row.diagnostic.basicProbeStarted=await page.evaluate(()=>{window.__wbContrastDiagnostic.phase='basic-probe';return performance.now();});row.diagnostic.basic=await page.evaluate(officialBasic,row.width<600||row.height<431);
  await page.addScriptTag({content:axe});row.diagnostic.axeStarted=await page.evaluate(()=>{window.__wbContrastDiagnostic.phase='axe';return performance.now();});row.diagnostic.qualificationAtAxe=await page.evaluate(()=>({t:performance.now(),path:location.pathname+location.search,fonts:document.fonts.status,interLoaded:document.fonts.check('16px "Inter"'),rootFont:getComputedStyle(document.documentElement).fontSize,viewport:{width:innerWidth,height:innerHeight},motion:matchMedia('(prefers-reduced-motion: no-preference)').matches?'no-preference':'reduce'}));
  const result=await page.evaluate(async()=>{const results=await window.axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa','wcag22aa']});return{violations:results.violations,incomplete:results.incomplete,testEngine:results.testEngine,testEnvironment:results.testEnvironment,timestamp:results.timestamp};});
  row.diagnostic.axeEnded=await page.evaluate(()=>{window.__wbContrastDiagnostic.phase='after-axe';return performance.now();});row.diagnostic.axe=result;row.diagnostic.status=status;row.diagnostic.errors=errors;
  row.diagnostic.actualNodes=await page.evaluate(violations=>violations.map(v=>({id:v.id,nodes:v.nodes.map(node=>{
   let elements=[];try{elements=Array.from(window.axe.utils.querySelectorAll(document,node.target));}catch{for(const selector of node.target??[])if(typeof selector==='string')try{elements.push(...document.querySelectorAll(selector));}catch{}}
   return{target:node.target,html:node.html,failureSummary:node.failureSummary,at:performance.now(),observed:elements.map(window.__wbContrastDiagnostic.describe)};
  })})),result.violations);
  const report=resolve(process.env.VERIFY_REPORT_ROOT),dir=join(report,'contrast-diagnostic');await mkdir(dir,{recursive:true});const crop=join(dir,config.name+'-actual-after-axe.png');
  row.diagnostic.paintBefore=await page.evaluate(()=>performance.now());await page.screenshot({path:crop,fullPage:false,animations:'allow',caret:'initial'});row.diagnostic.paintAfter=await page.evaluate(()=>performance.now());row.diagnostic.actualPaintCrop=crop;
  // Continue the unchanged animation through its nominal exit, without holding it or changing its style.
  const tail=await page.evaluate(()=>{const now=performance.now(),ends=window.__wbContrastDiagnostic.frames.flatMap(f=>f.nodes.flatMap(n=>n.animations.filter(a=>/^nevora-banner-/.test(a.name??'')&&Number.isFinite(a.startTime)&&Number.isFinite(a.timing?.duration)).map(a=>a.startTime+a.timing.duration+120)));return{now,end:Math.min(now+6000,Math.max(5600,...ends))};});if(tail.end>tail.now)await wait(tail.end-tail.now);
  row.diagnostic.trace=await page.evaluate(()=>{const s=window.__wbContrastDiagnostic;s.stopped=true;return{frames:s.frames,endedAt:performance.now(),fontFaces:[...document.fonts].map(f=>({family:f.family,weight:f.weight,style:f.style,status:f.status})),interLoaded:document.fonts.check('16px "Inter"'),rootFont:getComputedStyle(document.documentElement).fontSize,motion:matchMedia('(prefers-reduced-motion: no-preference)').matches?'no-preference':'reduce'};});
  row.diagnostic.startedAt=wallStarted;row.diagnostic.wallDurationMs=performance.now()-nodeStarted;
  check(row,status===200,'Diagnostic reached actual source route HTTP200',{status});check(row,errors.length===0,'No unexpected original-checker console/load error',errors);check(row,row.diagnostic.trace.interLoaded,'Actual source Inter font is loaded by trace completion');check(row,row.diagnostic.trace.motion==='no-preference','Diagnostic motion matches the original official checker');
  check(row,Array.isArray(result.violations),'Full actual axe nodes were retained without filtering or suppressing findings',{rules:result.violations.map(v=>({id:v.id,nodes:v.nodes.length}))});
  row.diagnostic.classification='Attribution evidence only; all violations, incomplete nodes, actual paint/opacity/animation timestamps and original raw rows preserved. Visible dwell/readability still requires judgment.';
 },{accounts:['QAOWNER'],sizes:[config.size]});
}
