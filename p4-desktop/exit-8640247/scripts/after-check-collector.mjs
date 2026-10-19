// External Node preload. It observes pages only at Page.close, AFTER checks.mjs
// has measured the cell and computed/pushed its result. No init scripts, route
// handlers, altered waits, measurement conditions, app code or checker edits.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {measure} from './geometry-measure.mjs';
import {collectionPolicy} from './collection-policy.mjs';
const env=JSON.parse(process.env.DESKTOP_COLLECTOR_CONTEXT??'null');
if(!env||process.env.DESKTOP_RELEASED_SHA!==env.sha)throw Error('Passive collection requires the exact released source context');
const out=resolve(env.report),dir=join(out,'passive-geometry'),cells=env.cells;
await mkdir(join(dir,'cells'),{recursive:true});await mkdir(join(dir,'crops'),{recursive:true});
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const scriptHash=createHash('sha256').update(await readFile(new URL(import.meta.url))).update(await readFile(new URL('./geometry-measure.mjs',import.meta.url))).update(await readFile(new URL('./collection-policy.mjs',import.meta.url))).digest('hex');
let cellIndex=0;
const originalLaunch=pw[env.engine].launch;
pw[env.engine].launch=async function(...args){
 const browser=await originalLaunch.apply(this,args),originalContext=browser.newContext;
 browser.newContext=async function(...contextArgs){
  const context=await originalContext.apply(this,contextArgs),originalPage=context.newPage;
  context.newPage=async function(...pageArgs){
   const page=await originalPage.apply(this,pageArgs),cell=cells[cellIndex++],close=page.close;
   let collected=false;
   page.close=async function(...closeArgs){
    try{if(!collected&&cell){collected=true;const policy=collectionPolicy(cell);
     if(policy){
      const id=createHash('sha256').update(JSON.stringify([env.sha,env.lineage,cell])).digest('hex').slice(0,20),base={...cell,sha:env.sha,lineage:env.lineage,scriptHash,policy,phase:'after-unchanged-checker-cell',observedAt:new Date().toISOString()};
      try{
       const data={...base,pageUrl:page.url(),...await measure(page)};
       data.topCrop=join(dir,'crops',id+'-top.png');await page.screenshot({path:data.topCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});
       // Scroll/screenshot changes occur only after the checker finished this cell.
       await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
       await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
       data.bottom=await page.evaluate(()=>({scrollY,documentHeight:document.documentElement.scrollHeight,nav:document.querySelector('.mobile-nav')?.getBoundingClientRect().toJSON(),main:document.querySelector('main')?.getBoundingClientRect().toJSON(),visualViewport:visualViewport?{height:visualViewport.height,offsetTop:visualViewport.offsetTop}:null}));
       data.bottomCrop=join(dir,'crops',id+'-bottom.png');await page.screenshot({path:data.bottomCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});
       await writeFile(join(dir,'cells',id+'.json'),JSON.stringify(data,null,1));
      }catch(e){await writeFile(join(dir,'cells',id+'.json'),JSON.stringify({...base,collectionError:e.message},null,1));}
     }
    }}catch(e){process.stderr.write('PASSIVE_COLLECTION_ERROR '+String(e.message).slice(0,160)+'\n');}
    finally{return close.apply(this,closeArgs);}
   };
   return page;
  };
  return context;
 };
 return browser;
};
