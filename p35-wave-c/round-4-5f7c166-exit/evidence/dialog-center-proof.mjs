import {chromium,webkit} from '/workspace/nevora-browser-runtime/node_modules/playwright/index.mjs';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const root='/workspace/paused-previews/wave-c',out=import.meta.dirname;
const runs=(await readdir(root)).filter(n=>n.startsWith('evidence-')).sort();
const {url,checkpoint}=JSON.parse(await readFile(join(root,runs.at(-1),'access.json'),'utf8'));
const flexCss='@media(max-width:599px){html body .app-shell.nevora-portal.nevora-portal .page-frame .wc-page.wc-page .wc-dialog .wc-actions > .nv-btn{flex:0 0 auto}}';
const centerCss='@media(max-width:599px){html body .app-shell.nevora-portal.nevora-portal .page-frame .wc-page.wc-page .wc-dialog .wc-swap > span{align-self:center}}';
const records=[];await mkdir(join(out,'dialog-center-proof'),{recursive:true});
const save=()=>writeFile(join(out,'dialog-center-proof.json'),JSON.stringify({checkpoint,flexCss,centerCss,records},null,2));
function metrics(){
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};};
 const dialog=document.querySelector('dialog[open]');
 return{viewport:{width:innerWidth,height:innerHeight},scrollY,rootOverflow:getComputedStyle(document.documentElement).overflow,bodyOverflow:getComputedStyle(document.body).overflow,dialog:box(dialog),active:{tag:document.activeElement.tagName,text:document.activeElement.innerText,id:document.activeElement.id},buttons:[...dialog.querySelectorAll('.wc-actions > .nv-btn')].map(e=>{
  const span=[...e.querySelectorAll('.wc-swap > span')].find(s=>getComputedStyle(s).visibility!=='hidden');
  const range=document.createRange();range.selectNodeContents(span??e);const style=getComputedStyle(e),buttonBox=box(e),textBox=box(range);
  return{text:e.innerText,box:buttonBox,labelBox:box(span),textBox,font:style.fontSize,lineHeight:style.lineHeight,padding:style.paddingBlock,flex:style.flex,alignSelf:span?getComputedStyle(span).alignSelf:null,disabled:e.disabled,textCenterError:Math.abs((textBox.y+textBox.height/2)-(buttonBox.y+buttonBox.height/2)),textTopInset:textBox.y-buttonBox.y,textBottomInset:buttonBox.bottom-textBox.bottom};
 })};
}
async function snap(p,key,extra={}){records.push({key,...extra,...await p.evaluate(metrics)});await p.screenshot({path:join(out,'dialog-center-proof',key+'.png'),fullPage:false,style:'nextjs-portal{display:none!important}'});await save();}
for(const [engine,launcher]of [['chromium',chromium],['webkit',webkit]]){
 const b=await launcher.launch();
 for(const width of [320,390]){
  const text=200,c=await b.newContext({storageState:join(root,'state','QAOWNER.json'),viewport:{width,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});
  await c.route('**/*',r=>r.request().method()==='GET'?r.continue():r.abort());
  const p=await c.newPage();p.setDefaultTimeout(8000);const errors=[];
  p.on('pageerror',e=>errors.push(e.message.slice(0,200)));
  p.on('console',m=>{if(/hydration|hydrated/i.test(m.text()))errors.push(m.text().slice(0,200));});
  let held=[],posts=0,holding=false;const mutations=[];
  await p.route('**/*',r=>{if(r.request().method()==='GET')return r.continue();posts++;mutations.push({method:r.request().method(),path:new URL(r.request().url()).pathname});if(holding){held.push(r);return;}return r.abort();});
  for(const [route,names]of [['breaks',['Add break type','Edit Rest break','Archive Rest break']],['clocker',['Add device','Rename Fictional payroll clock','Replace tablet for Fictional payroll clock','Revoke access for Fictional payroll clock']]]){
   await p.goto(url+'/app/settings/'+route,{waitUntil:'load',timeout:60000});await p.waitForTimeout(2500);await p.waitForFunction(()=>!document.querySelector('.wc-page [data-guard]'));await p.evaluate(()=>document.fonts.ready);await p.evaluate(t=>document.documentElement.style.fontSize=t+'%',text);await p.waitForTimeout(600);
   for(const name of names){
    const key=[engine,width,text,name.replaceAll(/\W/g,'_')].join('-');let flexStyle,centerStyle;
    try{
     flexStyle=await p.addStyleTag({content:flexCss});
     const trigger=p.getByRole('button',{name,exact:true});if(!await trigger.count())throw Error('Unavailable fixture trigger: '+name);
     await trigger.click();await p.locator('dialog[open]').waitFor();await p.waitForTimeout(100);
     const initialFocus=await p.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.innerText,id:document.activeElement.id}));
     const primary=p.locator('dialog[open] .wc-actions > button[type=submit]');await primary.scrollIntoViewIfNeeded();await snap(p,key+'-ready-flex',{initialFocus,errors:[...errors]});
     centerStyle=await p.addStyleTag({content:centerCss});await p.waitForTimeout(100);await snap(p,key+'-ready-center',{initialFocus,errors:[...errors]});
     await centerStyle.evaluate(e=>e.remove());centerStyle=null;
     if(name==='Add break type'){await p.getByLabel('Break name',{exact:true}).fill('Fictional inspection break');await p.getByLabel('Classification',{exact:true}).selectOption('REST');}
     if(name==='Add device'){await p.getByLabel('Device name',{exact:true}).fill('Fictional inspection tablet');await p.getByLabel('Location',{exact:true}).selectOption('loc-1');}
     await primary.scrollIntoViewIfNeeded();const start=posts,mutationStart=mutations.length;holding=true;await primary.evaluate(e=>{e.click();e.click();});await p.waitForTimeout(250);await snap(p,key+'-pending-flex',{posts:posts-start,mutations:mutations.slice(mutationStart),errors:[...errors]});
     centerStyle=await p.addStyleTag({content:centerCss});await p.waitForTimeout(100);await snap(p,key+'-pending-center',{posts:posts-start,mutations:mutations.slice(mutationStart),errors:[...errors]});
     for(const r of held.splice(0))await r.abort();holding=false;await p.waitForTimeout(300);await p.locator('dialog[open] .wc-actions > .nv-btn').last().scrollIntoViewIfNeeded();await snap(p,key+'-failed-center',{posts:posts-start,mutations:mutations.slice(mutationStart),errors:[...errors]});
     await p.keyboard.press('Escape');await p.waitForTimeout(50);records.push({key:key+'-closed',focusBack:await trigger.evaluate(e=>e===document.activeElement),posts:posts-start,errors:[...errors]});
     console.log('CENTER CASE',engine,width,name);
    }catch(error){records.push({key,error:error.message});holding=false;for(const r of held.splice(0))await r.abort().catch(()=>{});await p.keyboard.press('Escape').catch(()=>{});console.log('CASE ERROR',key,error.message);}
    finally{if(centerStyle)await centerStyle.evaluate(e=>e.remove()).catch(()=>{});if(flexStyle)await flexStyle.evaluate(e=>e.remove()).catch(()=>{});await save();}
   }
  }
  await c.close();
 }
 await b.close();
}
console.log('DIALOG CENTER PROOF DONE',records.length);
