// External passive preload: no init scripts, handlers, waits or app/checker edits.
// It measures ONLY when unchanged checks.mjs closes a page after computing/pushing its result.
import {createRequire} from 'node:module';import {readFile,mkdir,writeFile} from 'node:fs/promises';import{join,resolve}from'node:path';import{createHash}from'node:crypto';
import {measure} from './geometry-measure.mjs';import {collectionPolicy} from './collection-policy.mjs';import {wrapClose} from './passive-close-core.mjs';
const env=JSON.parse(process.env.WAVE_B_COLLECTOR_CONTEXT??'null');if(!env||process.env.WAVE_B_RELEASED_SHA!==env.sha)throw Error('Passive collector requires exact root-released review SHA');
const dir=join(resolve(env.report),'passive-geometry');await mkdir(dir+'/cells',{recursive:true});await mkdir(dir+'/crops',{recursive:true});
const hash=createHash('sha256');for(const name of ['after-check-collector.mjs','geometry-measure.mjs','collection-policy.mjs','passive-close-core.mjs'])hash.update(await readFile(new URL('./'+name,import.meta.url)));const scriptHash=hash.digest('hex');
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright'),launch=pw[env.engine].launch;let cellIndex=0;
pw[env.engine].launch=async function(...args){const browser=await launch.apply(this,args),newContext=browser.newContext;browser.newContext=async function(...contextArgs){const context=await newContext.apply(this,contextArgs),newPage=context.newPage;context.newPage=async function(...pageArgs){const page=await newPage.apply(this,pageArgs),cell=env.cells[cellIndex++],policy=cell&&collectionPolicy(cell);if(!policy)return page;
 const id=createHash('sha256').update(JSON.stringify([env.sha,env.lineage,cell])).digest('hex').slice(0,20),base={...cell,sha:env.sha,lineage:env.lineage,scriptHash,policy,phase:'after-unchanged-checker-cell'};
 return wrapClose(page,async p=>{const data={...base,observedAt:new Date().toISOString(),pageUrl:p.url(),...await measure(p)};
  if(policy.screenshots){data.topCrop=join(dir,'crops',id+'-top.png');await p.screenshot({path:data.topCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));data.bottom=await measure(p);data.bottomCrop=join(dir,'crops',id+'-bottom.png');await p.screenshot({path:data.bottomCrop,fullPage:false,style:'nextjs-portal{display:none!important}'});}
  await writeFile(join(dir,'cells',id+'.json'),JSON.stringify(data,null,1));
 },async error=>{await writeFile(join(dir,'cells',id+'.json'),JSON.stringify({...base,collectionError:String(error.message)},null,1));});
 };return context;};return browser;};
