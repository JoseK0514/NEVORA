// Read-only source/protocol checks. No preview, browser, network or data writes.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {checkpoint,jobs,judgmentCells,checkerSha256} from './plan.mjs';
import {collectionPolicy} from './collection-policy.mjs';
import {accountReply,receiptReply,actionReply,actionValue,clientProps,transformClientFlight,clientPropContracts,presentationReply,uploadReply,policyReply,reference} from './fixture-contracts.mjs';
const source='/workspace/inspect-wave-c-combined-8640247',sha=execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();assert.equal(sha,checkpoint);
assert.equal(execFileSync('git',['-C',source,'status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'');
const files={},read=async path=>{const text=await readFile(source+'/'+path,'utf8');files[path]=createHash('sha256').update(text).digest('hex');return text;};
const checks=[];
async function has(path,...needles){const text=await read(path);for(const n of needles)assert.ok(text.includes(n),path+': '+n);checks.push({path,assertions:needles.length});return text;}
await has('src/components/assisted-recovery.tsx','id="assisted-employee"','id="assisted-attestation"','Issue recovery code','How you verified them');
await has('src/components/account-recovery.tsx',"'/api/manager/account-recovery'","data.state==='issued'",'/^[A-Za-z0-9_-]{43}$/','data.employeeId===');
await has('src/components/clocker-recovery-review.tsx',"'/api/manager/clocker-recovery'",'v.commandId !== selected.current','v.receipts.length > 100','v.validForMs > 15000','Saved action reference','Check receipt');
await has('src/components/brand-editor.tsx','id="brand-hex"','id="brand-picker"','id="brand-logo-file"','Save brand','body?.result?.assetId','response.status === 400','response.status === 409');
await has('src/components/features-editor.tsx','name="word-preset"','value={p.id}','body?.state === "busy"','Save changes','type="button"');
await has('src/lib/workspace-presentation/modules.ts','"timeOff"','"marketplace"');
await has('src/components/company-policy-editor.tsx','id="policy-scope"','`policy-${key}`','value="configured"','Save policies','response.status === 409');
await has('src/app/app/settings/positions/position-catalog.tsx','available: boolean','positions: readonly Position[]','id="new-position-name"','Save position','Add position');
await has('src/components/clocker-break-types.tsx','initialTypes: BreakType[]','result.breakType','result.refresh','dialog.current','Classification');
await has('src/components/clocker-device-manager.tsx','initialDevices: ClockerDeviceView[]','result.setup','result.device','Location','Create setup code');
await has('src/lib/clocker/views.ts','ok: true; device: ClockerDeviceView','setup?: { code: string; expiresAt: string }','ok: false; error: string; refresh: boolean');
await has('src/app/app/settings/workspace/page.tsx','id="workspace-name"','submitLabel="Save changes"');
await has('src/components/new-location-form.tsx','id="new-location-name"','id="new-location-short-name"');
const checker=await readFile('/workspace/inspect-wave-c-combined-8640247/scripts/ui-checks/checks.mjs','utf8');assert.equal(createHash('sha256').update(checker).digest('hex'),checkerSha256);assert.ok(checker.indexOf('results.push(record)')<checker.indexOf('await page.close()'));
const collector=await readFile(new URL('./after-check-collector.mjs',import.meta.url),'utf8');for(const forbidden of ['.addInitScript(','.route(','.goto(','.click('])assert.ok(!collector.includes(forbidden));assert.ok(collector.indexOf('page.evaluate(')>collector.indexOf('page.close=async'));
const matrix=jobs.filter(j=>j.stage==='matrix'),cells=matrix.flatMap(j=>j.routes.map(route=>({engine:j.engine,account:j.account,size:j.size,text:j.text,route,axe:j.axe})));assert.equal(cells.length,960);assert.ok(cells.every(c=>c.axe));assert.equal(cells.filter(c=>collectionPolicy(c).screenshots).length,judgmentCells.length);assert.equal(judgmentCells.length,240);assert.ok(!jobs.some(j=>j.stage==='judgment'||j.stage==='axe'));assert.equal(new Set(jobs.map(j=>j.id)).size,jobs.length);
const now=Date.parse('2026-10-19T21:00:00Z');
const account=JSON.parse(accountReply({now}).body);assert.match(account.proof,/^[A-Za-z0-9_-]{43}$/);assert.equal(account.employeeId,'AUDIT-E');assert.equal(Date.parse(account.expiresAt)-now,900000);
for(const [state,count]of [['empty',0],['ready',1],['large',100]]){const value=JSON.parse(receiptReply({now,state,commandId:reference}).body);assert.equal(value.commandId,reference);assert.equal(value.receipts.length,count);assert.equal(value.validForMs,15000);assert.ok(value.receipts.every(r=>r.timeEntryId&&r.action&&r.performedAt));}
assert.equal(presentationReply('busy').status,409);assert.equal(JSON.parse(presentationReply('busy').body).state,'busy');assert.ok(JSON.parse(uploadReply().body).result.assetId);assert.equal(policyReply('conflict').status,409);
// Exercise the installed React Flight decoder entirely in memory. This proves
// the reply envelope; rendered browser state remains a separate gate.
const require=createRequire('/workspace/inspect-wave-c-combined-8640247/package.json'),{createFromNodeStream}=require('next/dist/compiled/react-server-dom-webpack/client.node');
for(const kind of ['break','device','setup','configuration'])for(const state of ['success','refresh','invalid']){const value=actionValue(kind,state,{now}),reply=actionReply(value),decoded=await createFromNodeStream(Readable.from([reply.body]),{moduleMap:{},serverModuleMap:{},moduleLoading:null});assert.equal(decoded.f,'');assert.deepEqual(await decoded.a,value);}
let propModels=0;
for(const [kind,contract]of Object.entries(clientPropContracts))for(const state of contract.supported){const props=Object.fromEntries(contract.keys.map(k=>[k,k==='action'?'$F2':k==='createAction'?'$F3':k==='updateAction'?'$F4':null]));const packet='0:'+JSON.stringify(['$','$L1',null,props])+'\n1:I["fictional",[],"Component"]\n',changed=transformClientFlight(packet,kind,state,now);assert.equal(changed.hits,1);const next=JSON.parse(changed.body.split('\n')[0].slice(2))[3];for(const k of ['action','createAction','updateAction'])if(k in props)assert.equal(next[k],props[k]);assert.ok(changed.body.includes('1:I["fictional",[],"Component"]'));propModels++;}
assert.throws(()=>transformClientFlight('0:{}\n','devices','empty'),/Expected one/);assert.throws(()=>clientProps('locations','first-run-empty',{}),/No truthful/);
console.log(JSON.stringify({checkpoint,mode:'static-only',sourceFiles:files,sourceAssertions:checks,baselineCells:960,axeCells:960,passiveJudgmentCells:240,duplicateJudgmentVisits:0,checkpointJobs:jobs.length,passiveHookOrder:'static assertions passed; live integration pending',flightActionEnvelopes:12,clientPropModels:propModels,previewStarted:false,browserStarted:false,dataWrites:0,limitations:['Protocol/selector preparation is not rendered browser verification.','Server-only list read failures/first-run Location states still need faithful browser-response fixtures; unsupported states remain explicit gaps.']},null,2));
