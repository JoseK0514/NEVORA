import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mountedJournalBundle,runMountedJournalTransition} from './clocker-journal-mounted-browser.mjs';
import {externalEvidence} from './phase-e-owned.mjs';
import {build} from 'esbuild';
const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium,webkit}=runtime('playwright');
const mounted=await mountedJournalBundle();
const bundle=await build({entryPoints:['src/lib/clocker/recovery-journal.browser.ts'],bundle:true,format:'iife',globalName:'ClockerJournal',write:false});
const server=createServer((req,res)=>{if(req.url==='/mounted.js'){res.setHeader('Content-Type','text/javascript');res.end(mounted.js);return;}if(req.url==='/mounted.css'){res.setHeader('Content-Type','text/css');res.end(mounted.css);return;}if(req.url==='/mounted'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/mounted.css"></head><body><main id="root"></main><script src="/journal.js"></script><script src="/mounted.js"></script></body></html>');return;}res.setHeader('Content-Type',req.url==='/journal.js'?'text/javascript':'text/html');res.end(req.url==='/journal.js'?bundle.outputFiles[0].text:'<script src="/journal.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const url=`http://127.0.0.1:${server.address().port}`;
const pending={subject:'a'.repeat(64),command:{commandId:'11111111-1111-4111-8111-111111111111',action:'CLOCK_IN',verificationId:'b'.repeat(64),expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}}};
const evidence=process.env.CLOCKER_JOURNAL_EVIDENCE_DIR?externalEvidence(process.cwd(),process.env.CLOCKER_JOURNAL_EVIDENCE_DIR):null;
const git=args=>execFileSync('git',args,{encoding:'utf8'}).trim();
const custody={checkpoint:git(['rev-parse','HEAD']),tree:git(['rev-parse','HEAD^{tree}']),sourceClean:git(['status','--porcelain'])==='',runtime:{playwright:runtime('playwright/package.json').version,react:JSON.parse(await readFile('node_modules/react/package.json','utf8')).version,node:process.version},mountedBundleSha256:createHash('sha256').update(mounted.js).digest('hex'),componentHashes:Object.fromEntries(await Promise.all(['src/components/clocker-pin-gate.tsx','src/components/clocker-punch-panel.tsx','src/components/clocker-recovery.tsx','src/lib/clocker/recovery-journal.browser.ts'].map(async path=>[path,createHash('sha256').update(await readFile(path)).digest('hex')])))};
if(process.env.PHASE_C_EXPECTED_SHA){assert.equal(custody.checkpoint,process.env.PHASE_C_EXPECTED_SHA);assert(custody.sourceClean);}
let checks=0;const mountedResults=[];
try{for(const [name,type] of Object.entries({chromium,webkit})){
 const browser=await type.launch({headless:true});try{
  const context=await browser.newContext();let page=await context.newPage();await page.goto(url);
  await page.evaluate(async p=>{const j=await ClockerJournal.openClockerJournal();await j.saveExact('2',p);j.close();},pending);
  await page.close();page=await context.newPage();await page.goto(url);
  assert.deepEqual(await page.evaluate(async p=>{const j=await ClockerJournal.openClockerJournal();const r=await j.read('2',p.subject);j.close();return r;},pending),pending);checks++;
  const race=await page.evaluate(async p=>{
   const a=await ClockerJournal.openClockerJournal(),b=await ClockerJournal.openClockerJournal(),p2={...p,subject:'c'.repeat(64)},p3={...p2,command:{...p.command,commandId:'22222222-2222-4222-8222-222222222222'}};
   const results=await Promise.allSettled([a.saveExact('2',p2),b.saveExact('2',p3)]);await a.saveExact('2',p);const winner=await b.read('2',p2.subject);const other=await b.read('2',p.subject);a.close();b.close();return {results:results.map(r=>r.status),winner,other};
  },pending);
  assert.deepEqual(race.results.sort(),['fulfilled','rejected']);assert.deepEqual(race.other,pending);assert.ok(race.winner);checks+=3;
  const mutation=await page.evaluate(async p=>{const j=await ClockerJournal.openClockerJournal();try{await j.resolveExact('2',{...p,command:{...p.command,commandId:'33333333-3333-4333-8333-333333333333'}},'recorded');return false;}catch{return JSON.stringify(await j.read('2',p.subject))===JSON.stringify(p);}finally{j.close();}},pending);assert.equal(mutation,true);checks++;
  const migration=await page.evaluate(async p=>{
   const next={...p,subject:'d'.repeat(64)},key='nevora.clocker.pending.v2:2:'+next.subject;sessionStorage.setItem(key,JSON.stringify(next));sessionStorage.setItem('nevora.clocker.pending.v1:2','corrupt');
   const j=await ClockerJournal.openClockerJournal();const migrated=await j.read('2',next.subject),preserved=sessionStorage.getItem('nevora.clocker.pending.v1:2'),removed=sessionStorage.getItem(key);await j.resolveExact('2',next,'recorded');const refs=await j.references('2'),cleared=await j.read('2',next.subject);j.close();return {migrated,preserved,removed,refs,cleared};
  },pending);assert.equal(migration.preserved,'corrupt');assert.equal(migration.removed,null);assert.equal(migration.cleared,null);assert.ok(migration.refs.some(r=>r.commandId===pending.command.commandId));assert.ok(migration.refs.some(r=>r.commandId===null));checks+=3;
  const scoped=await page.evaluate(async p=>{
   const j=await ClockerJournal.openClockerJournal(),location='subject-privacy';
   const own={...p,subject:'1'.repeat(64)},other={...p,subject:'2'.repeat(64),command:{...p.command,commandId:'22222222-2222-4222-8222-222222222222'}};
   const ownHistory={...own,command:{...p.command,commandId:'33333333-3333-4333-8333-333333333333'}},otherHistory={...other,command:{...p.command,commandId:'44444444-4444-4444-8444-444444444444'}};
   await j.saveExact(location,ownHistory);await j.resolveExact(location,ownHistory,'recorded');
   await j.saveExact(location,otherHistory);await j.resolveExact(location,otherHistory,'reviewed-context');
   await j.saveExact(location,own);await j.saveExact(location,other);
   await j.saveExact('different-location',own);
   sessionStorage.setItem('nevora.clocker.pending.v1:'+location,'corrupt');
   const selected=await j.references(location,own.subject),all=await j.references(location);
   let invalidRejected=false;try{await j.references(location,'not-a-subject');}catch{invalidRejected=true;}
   j.close();return {selected,all,invalidRejected};
  },pending);
  assert.deepEqual(scoped.selected,{references:[{commandId:pending.command.commandId,action:'CLOCK_IN'},{commandId:'33333333-3333-4333-8333-333333333333',action:'CLOCK_IN'}],otherCount:3});
  assert.equal(scoped.all.length,5,'Owner overload retains every reference and unreadable recovery record');
  assert.equal(scoped.invalidRejected,true);checks+=3;
  // A failed write cannot replace an unresolved intent, nor dispatch a command.
  const blocked=await page.evaluate(async p=>{let sent=0;const j=await ClockerJournal.openClockerJournal();try{await j.saveExact('2',{...p,command:{...p.command,commandId:'44444444-4444-4444-8444-444444444444'}});sent++;}catch{}finally{j.close();}return sent;},pending);assert.equal(blocked,0);checks++;
  const tombstone=await page.evaluate(async p=>{const old={...p,subject:'d'.repeat(64)},key='nevora.clocker.pending.v2:2:'+old.subject;sessionStorage.setItem(key,JSON.stringify(old));const j=await ClockerJournal.openClockerJournal();const r=await j.read('2',old.subject);j.close();return r;},pending);assert.equal(tombstone,null,'a second tab cannot resurrect a resolved legacy command');checks++;
  const quota=await page.evaluate(async p=>{const j=await ClockerJournal.openClockerJournal(),original=IDBObjectStore.prototype.put;let sent=0,rejected=false;IDBObjectStore.prototype.put=function(){throw new DOMException('Owned quota failure','QuotaExceededError');};try{await j.saveExact('quota',p);sent++;}catch{rejected=true;}finally{IDBObjectStore.prototype.put=original;}const result=await j.read('quota',p.subject);j.close();return {sent,rejected,result};},pending);assert.deepEqual(quota,{sent:0,rejected:true,result:null});checks++;
  const blockedOpen=await page.evaluate(async()=>{const held=await new Promise((resolve,reject)=>{const r=indexedDB.open('owned-blocked',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});let rejected=false;try{await ClockerJournal.openClockerJournal({open:()=>indexedDB.open('owned-blocked',2)},sessionStorage);}catch{rejected=true;}finally{held.close();}return rejected;});assert.equal(blockedOpen,true);checks++;
  mountedResults.push(await runMountedJournalTransition(context,url,name,evidence));await context.close();console.log(`${name}: 15 journal checks and mounted identity transition passed`);
 }finally{await browser.close();}
}}finally{await new Promise(resolve=>server.close(resolve));}
assert.equal(git(['rev-parse','HEAD']),custody.checkpoint,'Source checkpoint is unchanged');
if(process.env.PHASE_C_EXPECTED_SHA)assert.equal(git(['status','--porcelain']),'','Source remains clean');
if(evidence)await writeFile(join(evidence,'journal-results.json'),JSON.stringify({...custody,checks,mountedResults,limitations:['Actual React ClockerPinGate/PunchPanel/RecoveryHandoff and IndexedDB, with fictional HTTP PIN/state/receipt boundaries. Unscoped journal retention is not authenticated Owner API acceptance.']},null,2));
console.log(`PASS: ${checks} journal checks and ${mountedResults.length} mounted identity transitions across Chromium and WebKit.`);
