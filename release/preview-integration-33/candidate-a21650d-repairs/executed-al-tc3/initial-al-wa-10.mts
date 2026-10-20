/** Initial-only narrow AL-WA-10 source fixture. Never call after listening/inspection.
 * Two-phase API: prepare before communications; final reads AFTER all initial mutations.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {join,dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
const EXPECTED_SOURCE='a21650de50374683d52e32b883d7f419d7344f22';
const EXPECTED_TREE='2e16c3d2d1bcb498ccd3ea7e6660a4314fc0c70f';
const REPAIR='0caadb3505342ef331e2adeb141c02eafcc13f96';
const INPUTS={"src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/lib/data/coverage-repair.server.ts":"a53cf3d1bc7b9e757193cd543ebe6e0a648e59ceddf6c5b6be765ea42334a5bf","src/lib/scheduling/coverage-repair.ts":"ca1aed303a9e8d29ebee09d4bdace57a63414d4cfef537b87df40fac747e1cbc","src/lib/data/generation-guards.ts":"a63622ce804204a04d846c0004e8d062131d10b03dada251697251f3b50edac5","src/lib/payroll-export/json.ts":"23c16ed9139de5f349843a5766165d379804bf9246aec490df2fb0e8d1a11a8a","src/lib/date-utils.ts":"4e4545d0a4a70df78fde730fb3bd99823c47ec5758e12d2e471142f8454a1e41"};
const prepared=new Map<string,any>();
const hash=(b:any)=>createHash('sha256').update(b).digest('hex');
type Owned={database:{executor:{query:(statement:any)=>Promise<any[]>}};identity:{name:string;oid:number;marker:string};root:string;source:string};
async function verify(owned:Owned){
 const source=await realpath(owned.source),root=await realpath(owned.root),sha=process.env.WA_AL10_SOURCE_SHA;
 assert.equal(sha,EXPECTED_SOURCE,'Explicita21650d released fixed-source SHA required');
 assert.equal(process.env.READY_REVIEW_RELEASED_SHA,sha,'Initial fixture needs exact coordinator release');
 const git=(...args:string[])=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),sha);assert.equal(git('rev-parse','HEAD^{tree}'),EXPECTED_TREE);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 execFileSync('git',['merge-base','--is-ancestor',REPAIR,sha!],{cwd:source,stdio:'pipe'});
 for(const [file,expected]of Object.entries(INPUTS))assert.equal(hash(await readFile(join(source,file))),expected,'Changed source fixture input requires rebind: '+file);
 const manifestBytes=await readFile(join(root,'source-manifest.json')),manifest=JSON.parse(manifestBytes.toString());assert.equal(manifest.checkpoint,sha);
 const ownership=JSON.parse(await readFile(join(root,'ownership.json'),'utf8'));assert.equal(ownership.source,source);assert.equal(ownership.root,root);assert.equal(ownership.started,false,'Never initialize a listening/inspected DB');assert(!ownership.closed);
 assert.match(owned.identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);assert(owned.identity.marker.startsWith('fuel-phase3-disposable:'));
 const q=(text:string,values:readonly unknown[]=[])=>owned.database.executor.query({text,values});
 const [actual]=await q("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");assert.deepEqual(actual,owned.identity,'Wrong owned executor');
 return{source,root,sha,tree:git('rev-parse','HEAD^{tree}'),q,sourceManifestSha256:hash(manifestBytes)};
}
async function sourceModules(source:string){
 const load=(file:string)=>import(pathToFileURL(join(source,file)).href);
 return{...await load('src/test/integration/shift-change-api.ts'),...await load('src/lib/data/coverage-repair.server.ts'),...await load('src/lib/scheduling/coverage-repair.ts'),...await load('src/lib/data/generation-guards.ts'),...await load('src/lib/payroll-export/json.ts'),...await load('src/lib/date-utils.ts')};
}
export async function seedInitialALWA10(owned:Owned,report:any,evidence:string){
 const v=await verify(owned);assert(!prepared.has(v.root),'One initial setup per owned root');
 const [{n}]=await v.q('SELECT count(*)::int n FROM communications');assert.equal(n,0,'Prepare before communications publication');
 const token=randomUUID();await writeFile(join(v.root,'al-wa-10-initialization.started'),token,{flag:'wx',mode:0o600});
 const m=await sourceModules(v.source),[{week}]=await v.q("SELECT week_start::text AS week FROM schedules WHERE id='audit-next' AND status='PUBLISHED'");assert(week,'Base + exact seed-extra schedules must exist first');
 const rows=await v.q("UPDATE location_coverage_windows SET start_time='08:00',end_time='16:00' WHERE id='qa-loc-2-0' RETURNING id,location_id,day_of_week,start_time::text,end_time::text");assert.equal(rows.length,1);assert.equal(rows[0].location_id,'loc-2');assert.equal(rows[0].day_of_week,0);
 const actors=new Map();for(const id of ['QAOWNER','AUDIT-M'])actors.set(id,await m.fixtureProof(owned.database.executor,id));
 const locator={version:1,weekStart:week,gapKey:`loc-2|${m.addDays(week,6)}|08:00|16:00`,locationId:'loc-2',date:m.addDays(week,6),startTime:'08:00',endTime:'16:00',target:'STAFFING',reported:{missingStaff:1,requiresLead:false,positions:[]}};
 prepared.set(v.root,{token,actors,locator,m});
 report.alwa10Initial={prepared:true,initializedBeforeListen:true,sourceSha:v.sha,finalized:false};
 // Do not mint retained hints here: employee/location/scheduling changes later in
 // the generic initializer are part of sourceVersion and would make them stale.
 return{finalizeExport:'finalizeInitialALWA10',mustRunAfterAllInitialMutations:true};
}
export async function finalizeInitialALWA10(owned:Owned,report:any,evidence:string){
 const v=await verify(owned),state=prepared.get(v.root);assert(state,'Prepare in this same initial callback first');
 assert.equal(await readFile(join(v.root,'al-wa-10-initialization.started'),'utf8'),state.token);
 const {actors,locator,m}=state,ex=owned.database.executor,repairReads=[],reviewReplacement:Record<string,string>={};
 const before=await m.readGenerationSource(ex),fingerprint=hash(m.stableExportJson(before.source));
 for(const actor of ['QAOWNER','AUDIT-M']){
  const proof=actors.get(actor),read=await m.readCoverageRepair(locator,proof,false,ex);assert.equal(read.status,'READY');
  const candidate=read.candidates.find((c:any)=>c.employeeId==='AUDIT-E');assert(candidate,'Actual AUDIT-E eligibility required; never fabricate a hint');
  const selected=await m.readCoverageRepairSelection(candidate.review,proof,ex);assert.equal(selected.employeeId,'AUDIT-E');assert.equal(selected.locator.date,locator.date);assert.equal(selected.locator.locationId,locator.locationId);
  const decoded=m.decodeCoverageRepairReview(candidate.review,proof);assert.equal(decoded.actorEmployeeId,actor);assert.equal(decoded.employeeId,selected.employeeId);
  reviewReplacement[actor]='/app/schedule/new?review='+encodeURIComponent(candidate.review);
  repairReads.push({actor,status:read.status,candidates:read.candidates.length,selectedEmployeeId:selected.employeeId,date:selected.locator.date,start:selected.locator.startTime,end:selected.locator.endTime,actorBoundVerified:true,readSelectionVerified:true});
 }
 const after=await m.readGenerationSource(ex);assert.equal(hash(m.stableExportJson(after.source)),fingerprint,'Source changed during initial positive reads');
 const [{n:pushDeliveries}]=await v.q('SELECT count(*)::int n FROM push_deliveries');assert.equal(pushDeliveries,0,'Local-only notification fixture');
 const privateDir=join(dirname(evidence),'private-state-jobs');await mkdir(privateDir,{recursive:true,mode:0o700});
 const bindingsPath=join(privateDir,'wave-a-bindings.json');await writeFile(bindingsPath,JSON.stringify({sourceSha:v.sha,fixtureProfile:'AL-WA-10 narrow positive exact-source',fixtureFingerprint:fingerprint,fixturesReady:true,reviewReplacement},null,2),{flag:'wx',mode:0o600});
 const record={sourceSha:v.sha,sourceTree:v.tree,initializedBeforeListen:true,identity:owned.identity,sourceManifestSha256:v.sourceManifestSha256,sourceInputs:INPUTS,fixtureFingerprint:fingerprint,repairReads,notificationsLocalOnly:true,pushDeliveries,bindingsPrivate:true,noSchedulingWritesAfterFinalization:true};
 await writeFile(join(evidence,'wave-a-positive-fixture.json'),JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
 report.alwa10Initial={prepared:true,finalized:true,initializedBeforeListen:true,sourceSha:v.sha,manifest:join(evidence,'wave-a-positive-fixture.json'),bindingsPath,actorReads:repairReads.length};
 report.checks.push({name:'Fresh AL-WA-10 canonical actor-bound Coverage review source eligibility before listen',passed:true});
 prepared.delete(v.root);return{bindingsPath};
}
