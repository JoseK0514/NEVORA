import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const pw=createRequire('/workspace/nevora-browser-runtime/package.json')('playwright');
const out='/workspace/paused-previews/desktop', evidence='/workspace/nevora-inspections/p4-desktop/round-5-8012d97/evidence';
const runs=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort();
const {url}=JSON.parse(await readFile(join(out,runs.at(-1),'access.json'),'utf8'));
const account=process.env.CAP_ACCOUNT??'QAOWNER',engine=process.env.CAP_ENGINE??'chromium';
const sizes=(process.env.CAP_WIDTHS??'761,768,1023,1024,1179,1180,1440,320,390,844x390').split(',');
const texts=(process.env.CAP_TEXTS??'100,125,150,200').split(',').map(Number);
const routes=(process.env.CAP_ROUTES??'/app/inbox,/app?view=team,/app/timecards,/app/payroll-export,/app/schedule,/app/employees').split(',');
const prefix=process.env.CAP_LABEL??`${account}-${engine}`;
await mkdir(join(evidence,'shots'),{recursive:true});
const browser=await pw[engine].launch();const records=[];
try{
for(const size of sizes){
 const [width,height]=size.includes('x')?size.split('x').map(Number):[Number(size),Number(size)<600?844:900];
 const phone=width<600||height<431;
 const c=await browser.newContext({storageState:join(out,'state',account+'.json'),viewport:{width,height},hasTouch:phone,isMobile:phone,serviceWorkers:'block'});
 await c.route('**/*',route=>{const req=route.request(),target=new URL(req.url());if(target.origin!==url)return route.abort();if(!['GET','HEAD','OPTIONS'].includes(req.method())&&!['/api/manager/action-center','/api/timecards','/api/reports','/api/manager/action-intelligence'].includes(target.pathname))return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({status:'unavailable'})});return route.continue();});
 await c.addInitScript(()=>{window.__cls=0;try{new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}});
 for(const route of routes){
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  try{
   const res=await p.goto(url+route,{waitUntil:'load',timeout:90000});await p.waitForTimeout(1200);await p.evaluate(()=>document.fonts.ready);
   for(const text of texts){
    await p.evaluate(t=>{document.documentElement.style.fontSize=t+'%';},text);await p.waitForTimeout(200);
    const metrics=await p.evaluate(()=>{
     const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),d=e.closest('details:not([open])');return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&(!d||d.querySelector(':scope > summary')?.contains(e));};
     const describe=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {tag:e.tagName,cls:String(e.className?.baseVal??e.className).slice(0,180),text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,160),x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,font:s.fontSize,line:s.lineHeight,color:s.color,bg:s.backgroundColor,padding:s.padding,radius:s.borderRadius,shadow:s.boxShadow,overflow:s.overflow,display:s.display,position:s.position,top:s.top,mask:s.maskImage,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,current:e.getAttribute('aria-current')};};
     const selected=[...document.querySelectorAll('.nv-pageband,.nv-masthead__title,.nv-masthead__extra,.nv-masthead__summary,.nv-pageband__eyebrow-row,.section-tabs,.section-tab,.nv-card,.nv-card__title,.inbox-list-column,.inbox-side-column,.inbox-detail__head,.inbox-detail__title,#inbox-all-requests .nv-row,#inbox-all-requests .nv-row__title,.employee-time-overview>.employee-view-surface,.my-schedule-side,.my-schedule-agenda,.my-shift-copy,.updates-row-action,.schedule-location-control .segmented,.sidebar-group-label,.sidebar .nav-link,.sidebar-platform-footer,.portal-location,.portal-account-menu .nevora-action-menu-trigger,[class*="payroll-export-module"][class*="__employeeCard"],[class*="payroll-export-module"][class*="__sectionHeading"],[class*="payroll-export-module"][class*="__employeeRow"],.employee-form legend')].filter(vis).map(describe);
     const clipped=[...document.querySelectorAll('main h1,main h2,main h3,main p,main label,main button,main a,.portal-location li')].filter(vis).filter(e=>e.scrollWidth>e.clientWidth+1&&['hidden','clip'].includes(getComputedStyle(e).overflowX)&&getComputedStyle(e).textOverflow!=='ellipsis').map(describe);
     const controls=[...document.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary')].filter(vis).map(describe);
     const splitWords=[];const walker=document.createTreeWalker(document.querySelector('main')??document.body,NodeFilter.SHOW_TEXT);for(let n=walker.nextNode();n;n=walker.nextNode()){
      const e=n.parentElement;if(!e||!vis(e)||e.closest('[aria-hidden=true],.sr-only,.nv-sr,svg'))continue;
      for(const m of n.textContent.matchAll(/\b[\p{L}\p{N}’'-]{4,}\b/gu)){const r=document.createRange();r.setStart(n,m.index);r.setEnd(n,m.index+m[0].length);const rects=[...r.getClientRects()];if(new Set(rects.map(x=>Math.round(x.y))).size>1)splitWords.push({word:m[0],element:describe(e),rects:rects.map(x=>({x:x.x,y:x.y,w:x.width,h:x.height}))});}
     }
     return {viewport:[innerWidth,innerHeight],doc:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],cls:window.__cls,selected,clipped,controls,splitWords,text:document.querySelector('main')?.innerText.slice(0,24000),active:describe(document.activeElement)};
    });
    const slug=route.replace(/[^a-z0-9]+/gi,'_'),key=`${prefix}-${size}-${text}-${slug}`;
    const record={key,account,engine,width,height,text,route,status:res?.status(),finalPath:new URL(p.url()).pathname,errors:[...errors],...metrics};records.push(record);
    if(process.env.CAP_SHOTS==='1'){const path=join(evidence,'shots',key+'.png');await p.screenshot({path,fullPage:false});record.screenshot='shots/'+key+'.png';}
    await writeFile(join(evidence,'capture-'+prefix+'.json'),JSON.stringify(records,null,1));console.log('CAPTURE '+key+' '+metrics.doc.join('x')+' split='+metrics.splitWords.length+' clipped='+metrics.clipped.length);
   }
  }catch(e){records.push({account,engine,width,height,route,error:e.message});await writeFile(join(evidence,'capture-'+prefix+'.json'),JSON.stringify(records,null,1));console.log('CAPTURE_ERROR '+account+' '+route+' '+size+' '+e.message.slice(0,140));}
  await p.close();
 }
 await c.close();
}
}finally{await browser.close();}
