import assert from 'node:assert/strict';
import {join,basename} from 'node:path';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {verifySourceManifestMetadata} from './phase-e-owned.mjs';
import {step4RuntimeHashes} from './step4-local-evidence.mjs';
export const centralBillingScope='Actual public Next page and canonical commerce SQL/SDK over owned loopback HTTP with controlled legacy installation facts. Normal company Owner proof is separate Step4 evidence. Provider navigation is an intercepted local witness; no hosted, physical-device, real Stripe or payment acceptance.';
export const centralBillingChecks=Object.freeze([
 'five canonical English/Spanish entry and callback routes have private headers and issue no mutation without a handoff',
 'one canonical SQL-backed handoff exchange, scrubbed fragment, live public catalog/status and credential-free cross-origin HTTP transport',
 'authoritative dates/capacity and escaped fictional business label reflow in both languages at four widths and 100/200 percent text with no serious/critical axe findings',
 'native keyboard intent, actual committed SQL/SDK checkout reply loss, focused recovery alert, unchanged key/body/language retry, one provider session and one intercepted navigation; Back retains no private display or automatic financial replay',
 'controlled blur retires private details before a held actual response returns; focus obtains a fresh read; real catalog session revocation returns denial and removes private data/actions',
]);
export function verifyCentralBillingEvidence({custody,source,approvedMirrorHashes,packets,inventory,cluster,vitest}){
 assert.match(custody.checkpoint,/^[a-f0-9]{40}$/);assert.match(custody.tree,/^[a-f0-9]{40}$/);assert.equal(custody.sourceClean,true);
 assert.equal(cluster.suite,'central-billing');assert.equal(cluster.sourceSha,custody.checkpoint);for(const key of ['started','stopped','removed'])assert.equal(cluster[key],true);assert.equal(cluster.exitCode,0);
 for(const [key,value]of Object.entries({success:true,numTotalTests:2,numPassedTests:2,numFailedTests:0,numPendingTests:0,numTodoTests:0}))assert.equal(vitest[key],value);
 assert.equal(vitest.testResults.length,1);const execution=vitest.testResults[0];assert.equal(execution.name,join(source,'src/test/integration/central-billing-browser.integration.ts'));assert.equal(execution.status,'passed');assert.equal(execution.assertionResults.length,2);
 const expected=step4RuntimeHashes(custody);assert(Object.keys(expected).length>0);assert.equal(packets.length,2);assert.equal(new Set(packets.map(p=>p.ownership.ownerId)).size,2);
 let layouts=0;const required=name=>assert((inventory.get(name)??0)>0,'Missing central billing evidence: '+name);
 for(const [index,engine]of ['chromium','webkit'].entries()){
  const {report,manifest,ownership}=packets[index];assert.equal(packets[index].engine,engine);assert.equal(report.engine,engine);assert.equal(report.complete,true);assert.equal(report.scope,centralBillingScope);assert.deepEqual(report.checks,centralBillingChecks);
  assert.deepEqual(execution.assertionResults[index],{...execution.assertionResults[index],status:'passed',fullName:'checks the central billing entry, canonical SQL/SDK recovery and private retirement in '+engine});
  for(const key of ['contextClosed','browserClosed','catalogClosed'])assert.equal(report[key],true);for(const key of ['errors','foreign'])assert.deepEqual(report[key],[]);
  assert.equal(manifest.checkpoint,custody.checkpoint);assert.deepEqual(manifest.hashes,expected);assert.deepEqual(report.source,expected);assert.deepEqual(manifest.substitutedFiles,['src/lib/db.ts','next-env.d.ts']);assert.equal(manifest.originalDbHash,expected['src/lib/db.ts']);assert.equal(manifest.substitutedDbHash,approvedMirrorHashes['src/lib/db.ts']);assert.deepEqual(manifest.generatedTypeReferences,{originalHash:expected['next-env.d.ts'],derivedHash:approvedMirrorHashes['next-env.d.ts'],reason:'Next 16.4.2 dev generated type-reference paths'});
  for(const key of ['started','closed','sourceVerified','mirrorVerified'])assert.equal(ownership[key],true);assert.equal(ownership.source,source);assert.match(basename(ownership.root),/^owned-next-[A-Za-z0-9]+$/);assert.match(ownership.ownerId,/^[a-f0-9-]{36}$/);assert(Number.isInteger(ownership.pid)&&ownership.pid>0);assert(Number.isInteger(ownership.port)&&ownership.port>0);assert(Number.isFinite(Date.parse(ownership.closedAt)));assert.match(ownership.identity.marker,/^fuel-phase3-disposable:[a-f0-9-]{36}$/);
  assert.equal(report.providerSessions,1);assert.deepEqual(report.sqlCounts,{operations:1,intents:1});assert.deepEqual(report.retryEvidence,{attempts:2,unchangedKey:true,languages:['es','es'],navigations:1});assert.deepEqual(report.privacyEvidence,{back:true,blur:true,focusFresh:true,offline:true,onlineFresh:true,denialStatus:401,privateRegions:0,financialActions:0});
  assert(report.network.length>=6&&report.network.length<=128);for(const r of report.network){assert(['GET','POST','OPTIONS'].includes(r.method));assert(/^\/v1\/(plans|handoff\/exchange|status|checkout|portal|plan-change|logout)$/.test(r.path));assert.equal(r.cookie,false);assert(Number.isInteger(r.status)&&r.status>=100&&r.status<=599);}
  assert.equal(report.network.filter(r=>r.method==='POST'&&r.path==='/v1/checkout'&&r.status===200).length,2);for(const [path,method,status]of [['/v1/handoff/exchange','POST',200],['/v1/plans','GET',200],['/v1/status','GET',200],['/v1/status','GET',401]])assert(report.network.some(r=>r.path===path&&r.method===method&&r.status===status));
  assert.equal(report.layout.length,16);let cell=0;for(const lang of ['en','es'])for(const width of [320,390,768,1440])for(const scale of [100,200]){const r=report.layout[cell++];for(const [key,value]of Object.entries({lang,width,scale,viewportWidth:width,fonts:'loaded'}))assert.equal(r[key],value);assert(Number.isInteger(r.clientWidth)&&r.clientWidth>0&&r.clientWidth<=width);assert(Number.isInteger(r.scrollWidth)&&r.scrollWidth<=width+1);if(scale===100||width===320)required(`${engine}/${lang}-${width}-${scale}.png`);layouts++;}required(`${engine}/${engine}-trace.zip`);
 }
 return {tests:2,browserChecks:10,layoutMeasurements:layouts,sourceManifests:2,sourceFileHashesVerified:Object.keys(expected).length*2};
}

/** Read every archived packet without accepting symlinks or a second app per engine.
 * Runtime paths identify the CI source; sourceFilesRoot supplies verified Git bytes. */
export function readCentralBillingEvidence(root,sourceFilesRoot,custody,runtimeSource=sourceFilesRoot){
 const inventory=new Map();function scan(dir,prefix=''){for(const entry of readdirSync(dir,{withFileTypes:true})){assert(!entry.isSymbolicLink());const path=join(dir,entry.name),name=prefix+entry.name;if(entry.isDirectory())scan(path,name+'/');else{assert(entry.isFile());inventory.set(name,lstatSync(path).size);}}}scan(root);
 const json=name=>JSON.parse(readFileSync(join(root,name),'utf8'));assert.deepEqual(json('source-custody.json'),custody);
 let approvedMirrorHashes;
 const packets=['chromium','webkit'].map(engine=>{const apps=readdirSync(join(root,engine),{withFileTypes:true}).filter(e=>e.isDirectory()&&/^owned-next-[A-Za-z0-9]+$/.test(e.name));assert.equal(apps.length,1);const manifest=json(engine+'/'+apps[0].name+'/source-manifest.json');const approved=verifySourceManifestMetadata(sourceFilesRoot,manifest,custody.checkpoint);if(approvedMirrorHashes)assert.deepEqual(approved,approvedMirrorHashes);else approvedMirrorHashes=approved;return {engine,report:json(engine+'/report.json'),manifest,ownership:json(engine+'/'+apps[0].name+'/ownership.json')};});
 return {custody,source:runtimeSource,approvedMirrorHashes,packets,inventory,vitest:json('vitest.json'),cluster:json('owned-cluster.json')};
}
