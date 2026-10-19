// Read-only custody/readiness receipt; never records access credentials.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const source=process.env.VERIFY_SOURCE,sha=process.env.VERIFY_SHA,out=process.env.PREVIEW_OUT,report=process.env.VERIFY_REPORT_ROOT;
assert(source&&sha&&out&&report);
assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha);
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
const run=(await readdir(out)).filter(n=>n.startsWith('evidence-')).sort().at(-1),evidence=join(out,run),owned=(await readdir(evidence)).find(n=>n.startsWith('owned-next-'));
const json=async p=>JSON.parse(await readFile(p,'utf8'));
const identity=await json(join(evidence,owned,'ownership.json')),manifest=await json(join(evidence,owned,'source-manifest.json')),access=await json(join(evidence,'access.json')),fixture=await json(join(evidence,'inspection-initial-fixture.json'));
const withdrawals=await json(join(evidence,'initial-own-withdrawal-fixture.json'));
assert.equal(withdrawals.checkpoint,sha);assert.deepEqual(withdrawals.identity,identity.identity);assert.equal(withdrawals.initializedBeforeListen,true);assert.equal(withdrawals.withdrawalExecuted,false);
for(const account of ['AUDIT-E','AUDIT-LEAD']){const actor=withdrawals.actors.find(a=>a.account===account);assert(actor?.ownActorVerified&&actor.canonicalCommandValid&&actor.status==='PENDING'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(actor.requestId),'Canonical pending withdrawal fixture missing for '+account);}
assert.equal(identity.source,source);assert.equal(identity.started,true);assert(!identity.closed);assert.equal(manifest.checkpoint,sha);assert.equal(access.checkpoint,sha);
assert.equal(fixture.sourceImportSHA,sha);assert.equal(fixture.initializedBeforeListen,true);assert.deepEqual(fixture.fixtureIdentity,identity.identity);assert.equal(fixture.actors.length,12);assert.equal(fixture.readyReads.length,12);assert(fixture.readyReads.every(r=>r.state==='ready'));assert.equal(fixture.longManagerEmailCharacters,69);
assert.equal(fixture.extraSeedSha256,createHash('sha256').update(await readFile(join(source,'scripts/ui-checks/seed-extra.mts'))).digest('hex'));
const accounts=['QAOWNER','AUDIT-M','AUDIT-LEAD','payroll-qa-b','AUDIT-E','payroll-qa-a','AUDIT-LONG','AUDIT-ON','AUDIT-BREAK','AUDIT-SWAP'];
const loggedIn=[];
for(const account of accounts){const state=await json(join(out,'state',account+'.json'));assert(state.cookies.some(c=>c.value),'Missing owned login session for '+account);loggedIn.push({account,sessionCookiePresent:true});}
const receipt={checkpoint:sha,source,preview:out,checkedAt:new Date().toISOString(),sourceClean:true,sourceManifestCheckpointVerified:true,ownedDatabaseIdentityVerified:true,initializedBeforeListen:true,fixtureMode:fixture.fixtureMode,fixtureCounts:fixture.fixtureCounts,longManagerEmailCharacters:69,actorCount:fixture.actors.length,positiveFixtureReadCount:fixture.readyReads.length,canonicalOwnWithdrawals:withdrawals.actors,withdrawalFixtureReceipt:join(evidence,'initial-own-withdrawal-fixture.json'),loggedIn,fixtureReceipt:join(evidence,'inspection-initial-fixture.json'),fixtureReceiptSha256:createHash('sha256').update(await readFile(join(evidence,'inspection-initial-fixture.json'))).digest('hex')};
await writeFile(join(report,'initial-owned-readiness.json'),JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({checkpoint:sha,ready:true,positiveFixtureReads:12,loggedIn:loggedIn.length,longManagerEmailCharacters:69}));
