// External preload, adapted from the Phase 3 collector. App and checks.mjs
// remain untouched. No page reads, writes, events, routes or waits are added
// before Page.close, which the pinned checker calls AFTER results.push(record).
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {geometryMeasure} from './geometry-measure.mjs';
import {collectionPolicy} from './collection-policy.mjs';
const env=JSON.parse(process.env.WC_COLLECTOR_CONTEXT??'null');
if(!env||process.env.NEVORA_WC_EXIT_RELEASE!=='root-released'||process.env.EXPECTED_SOURCE_SHA!==env.sha)throw Error('Passive Wave C collection requires the exact released source context');
const dir=resolve(env.report);await mkdir(join(dir,'cells'),{recursive:true});await mkdir(join(dir,'crops'),{recursive:true});
const pw=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT,'package.json'))('playwright');
const scriptHash=createHash('sha256').update(await readFile(new URL(import.meta.url))).update(await readFile(new URL('./geometry-measure.mjs',import.meta.url))).update(await readFile(new URL('./collection-policy.mjs',import.meta.url))).digest('hex');
let cellIndex=0;const launch=pw[env.engine].launch;
pw[env.engine].launch=async function(...args){
 const browser=await launch.apply(this,args),newContext=browser.newContext;
 browser.newContext=async function(...args){
  const context=await newContext.apply(this,args),newPage=context.newPage;
  context.newPage=async function(...args){
   const page=await newPage.apply(this,args),cell=env.cells[cellIndex++],close=page.close;let collected=false;
   page.close=async function(...args){
    try{if(!collected&&cell){collected=true;const policy=collectionPolicy(cell),id=createHash('sha256').update(JSON.stringify([env.sha,env.lineage,cell])).digest('hex').slice(0,20),base={...cell,sha:env.sha,lineage:env.lineage,scriptHash,policy,phase:'after-unchanged-checker-cell',observedAt:new Date().toISOString()};
     try{
      const data={...base,pageUrl:page.url(),top:await page.evaluate(geometryMeasure)};
      if(policy.screenshots){
       data.crops={};for(const [phase,fraction]of [['top',0],['middle',0.5],['bottom',1]]){
        // Only after the baseline record: scrolling may update live bar dimensions.
        await page.evaluate(f=>scrollTo(0,(document.documentElement.scrollHeight-innerHeight)*f),fraction);
        await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
        data[phase]=await page.evaluate(geometryMeasure);const path=join(dir,'crops',id+'-'+phase+'.png');data.crops[phase]=path;await page.screenshot({path,fullPage:false,style:'nextjs-portal{display:none!important}'});
       }
      }
      await writeFile(join(dir,'cells',id+'.json'),JSON.stringify(data,null,1));
     }catch(error){await writeFile(join(dir,'cells',id+'.json'),JSON.stringify({...base,collectionError:error.message},null,1));}
    }}catch(error){process.stderr.write('WC_PASSIVE_COLLECTION_ERROR '+String(error.message).slice(0,160)+'\n');}
    finally{return close.apply(this,args);}
   };
   return page;
  };
  return context;
 };
 return browser;
};
