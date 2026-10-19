import {createRequire} from 'node:module';
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
if(process.env.DESKTOP_REVIEW_RELEASED!=='1')throw Error('Root resource release required');
const pw=createRequire('/workspace/nevora-browser-runtime/package.json')('playwright');
const out=process.env.PREVIEW_OUT??'/workspace/paused-previews/exit-desktop-8640247',dest='/workspace/nevora-inspections/p4-desktop/exit-8640247/evidence/header';
const run=(await readdir(out)).filter(x=>x.startsWith('evidence-')).sort().at(-1),access=JSON.parse(await readFile(join(out,run,'access.json'),'utf8'));
if(access.checkpoint!=='8640247be632ee6382c68b3b1ae3bbed532a5d65')throw Error('Wrong review checkpoint');
const results=[],blocked=[];await mkdir(dest,{recursive:true});
for(const engine of ['chromium','webkit']){
 const browser=await pw[engine].launch();try{for(const width of [768,899,900,1440])for(const text of [100,200]){
  const c=await browser.newContext({storageState:join(out,'state/QAOWNER.json'),viewport:{width,height:900},serviceWorkers:'block'});
  await c.route('**/*',route=>{const req=route.request(),u=new URL(req.url());if(u.origin!==access.url)return route.abort();if(['GET','HEAD','OPTIONS'].includes(req.method()))return route.continue();let read=false;try{const b=req.postDataJSON();read=req.method()==='POST'&&u.pathname==='/api/manager/action-center'&&Object.keys(b).join(',')==='weekStart'&&typeof b.weekStart==='string';}catch{}if(read)return route.continue();blocked.push({path:u.pathname,method:req.method(),forwarded:false});return route.fulfill({status:503,contentType:'application/json',body:'{}'});});
  const p=await c.newPage();try{await p.goto(access.url+'/app',{waitUntil:'load',timeout:90000});await p.locator('.mobile-header .command-finder-trigger').waitFor();await p.evaluate(()=>document.fonts.ready);await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(250);
   const row=await p.locator('.mobile-header .command-finder-trigger').evaluate(e=>{const k=e.querySelector('kbd'),s=getComputedStyle(k),b=e.getBoundingClientRect(),r=k.getBoundingClientRect();return{root:parseFloat(getComputedStyle(document.documentElement).fontSize),font:parseFloat(s.fontSize),lineHeight:parseFloat(s.lineHeight),button:{x:b.x,y:b.y,w:b.width,h:b.height},hint:{x:r.x,y:r.y,w:r.width,h:r.height},hintDisplay:s.display,accountNameVisible:[...document.querySelectorAll('.mobile-header .portal-account-menu .nevora-action-menu-trigger > span:not(.portal-account-avatar)')].some(e=>{const x=e.getBoundingClientRect();return x.width>0&&x.height>0&&getComputedStyle(e).display!=='none';}),visible:r.width>0&&r.height>0,contained:r.x>=b.x&&r.y>=b.y&&r.right<=b.right+1&&r.bottom<=b.bottom+1,viewport:b.x>=0&&b.right<=innerWidth+1,overflow:document.documentElement.scrollWidth>innerWidth+1};});
   row.hintExpectedVisible=width>=900;row.expectedVisibilityReason=width<900?'Source WR4-19 intentionally hides account text and Search keyhint below900':'Visible hint retains desktop14/20 role floor';row.pass=row.root===16*text/100&&(row.hintExpectedVisible?(row.font>=14*text/100-.01&&row.lineHeight>=20*text/100-.01&&row.visible&&row.contained):(!row.visible&&row.hintDisplay==='none'&&!row.accountNameVisible))&&row.viewport&&row.button.h>=24&&!row.overflow;results.push({engine,width,text,...row});await p.locator('.mobile-header').screenshot({path:join(dest,`${engine}-${width}-${text}.png`)});console.log('HEADER '+engine+' '+width+' '+text+' '+JSON.stringify(row));
  }catch(e){results.push({engine,width,text,error:e.message,pass:false});}finally{await c.close();await writeFile(join(dest,'results.json'),JSON.stringify({review:access.checkpoint,finding:'TC-DESKTOP-KBD-01',sourceAlias:'TC-P4-24',results,blockedMutations:blocked,mutationsForwarded:0},null,2));}
 }}finally{await browser.close();}
}
console.log('HEADER_DONE '+results.filter(x=>x.pass).length+'/'+results.length);
