// Initial fictional owned-data extension only. Never import as a browser state probe.
import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
const SOURCE='/workspace/inspect-wave-c-candidate-a21650d';
const SHA='a21650de50374683d52e32b883d7f419d7344f22';
const INPUTS={"src/lib/workspace-presentation/service.ts":"289d83b388a83ae05df40f62fe2b94f70a8a900c9688c7a8e66eae7332690c2e","src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/lib/data/workspaces.ts":"c87727de9f7191247a74fb745bde17529af0b887bd6f6bfe0bd636266a4cb9ae","src/lib/time-zone-label.ts":"baa45f8c91f8481dbe1fd660653c3d80f6007e7617598e16235764d19d325412","scripts/ui-checks/checks.mjs":"e1324bcdafee65f70142a35e3cc27edd205e03b2fd13618835b8eb74a802ff2d"};
export async function seedInitialWaveCBrandHistory({database,identity,root,source},report,evidence){
 assert.equal(source,SOURCE,'Wrong Wave C frozen worktree');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),SHA);
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'');
 for(const [path,expected]of Object.entries(INPUTS))assert.equal(createHash('sha256').update(await readFile(join(source,path))).digest('hex'),expected,'Initial Wave C input changed '+path);
 const [actual]=await database.executor.query({text:"SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()",values:[]});
 assert.deepEqual(actual,identity,'Wave C owned database identity mismatch');
 assert.match(identity.name,/^nevora_exchange_test_audit_[a-f0-9]{12}$/);assert.ok(identity.marker?.startsWith('fuel-phase3-disposable:'));
 await writeFile(join(root,'wave-c-brand-history.started'),SHA,{flag:'wx'});
 const {fixtureProof}=await import('/workspace/inspect-wave-c-candidate-a21650d/src/test/integration/shift-change-api.ts');
 const {saveWorkspacePresentation,readPresentationHistory,readActivePresentation}=await import('/workspace/inspect-wave-c-candidate-a21650d/src/lib/workspace-presentation/service.ts');
 const proof=await fixtureProof(database.executor,'QAOWNER');
 const prior=await readPresentationHistory(proof,database.executor);let revision=prior[0]?.revision??0;
 for(const seed of ['#1D4ED8',null]){const saved=await saveWorkspacePresentation(proof,{operationId:randomUUID(),expectedRevision:revision,section:'brand',seed,logoAssetId:null},database.executor);revision=saved.revision;}
 const history=await readPresentationHistory(proof,database.executor),active=await readActivePresentation('workspace-fuel',database.executor);
 assert.ok(history.length>=2,'Canonical Branding history required');assert.equal(history[0].settings.brand.seed,null);assert.equal(active.words,'standard');assert.equal(active.logoAssetId,null);
 const receipt={checkpoint:SHA,ownedIdentity:identity,initializedBeforeListen:true,fixtureMode:process.env.INSPECTION_FIXTURE_MODE??'normal',inputHashes:INPUTS,history:history.map(({revision,changedAt,changedKeys})=>({revision,changedAt,changedKeys})),defaultBrandRestored:true,generationBoundHints:false};
 await writeFile(join(evidence,'wave-c-initial-brand-history.json'),JSON.stringify(receipt,null,2));
 report.waveCInitialFixture={manifest:join(evidence,'wave-c-initial-brand-history.json'),initializedBeforeListen:true,historyRows:history.length,defaultBrandRestored:true};
}
