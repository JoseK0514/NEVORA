// OPTIONAL initial-only TC-WA-3 ShiftBlock fixture, same fresh owned beforeListen callback.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash,randomUUID} from 'node:crypto';
import {seedInitialALWA10,finalizeInitialALWA10} from './initial-al-wa-10.mts';
const SHA='a21650de50374683d52e32b883d7f419d7344f22',INPUTS={"src/test/integration/owned-app-fixture.ts":"83c48a29d92af1e1a64b877def4d5be645ad69ed103cda269f9e5194a8d10f3a","src/test/integration/shift-change-api.ts":"57a529ef303aa417081c71a81a52d89b7c52fdf52acdb3d1c0fd9ac40b870ee7","src/lib/data/shift-change-snapshot.ts":"75e7e04998e8e17ad0e7da142b8f014641633545557bb457292787a330472e37","src/lib/data/shift-changes.ts":"6ec6c2ba95b34417890319dc150da8ed0703a85307f735ed2138612ad5d4038c"};
const prepared=new Map<string,any>();
export async function seedInitialALWA10AndTC3(owned:any,report:any,evidence:string){
 assert.equal(process.env.WA_AL10_SOURCE_SHA,SHA);for(const[file,expected]of Object.entries(INPUTS))assert.equal(createHash('sha256').update(await readFile(join(owned.source,file))).digest('hex'),expected);
 await seedInitialALWA10(owned,report,evidence);
 const load=(f:string)=>import(pathToFileURL(join(owned.source,f)).href),m={...await load('src/test/integration/owned-app-fixture.ts'),...await load('src/test/integration/shift-change-api.ts'),...await load('src/lib/data/shift-change-snapshot.ts'),...await load('src/lib/data/shift-changes.ts')};
 const ex=owned.database.executor,scenario=await m.seedOwnedScenario(ex,'ALTC3',19),actor=await m.fixtureProof(ex,scenario.actors[0]),terms=await m.readShiftChangeTerms(actor,scenario.sourceId,undefined,ex);assert(terms);
 const result=await m.executeShiftChange(actor,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),sourceShiftId:terms.source.shiftId,sourceEpisodeId:terms.source.assignmentEpisodeId,sourceTermsFingerprint:terms.sourceTermsFingerprint,reasonCode:'ILLNESS'},ex);assert.equal(result.status,'pending');assert(result.requestId&&result.revision);
 const proofs=new Map();for(const id of ['QAOWNER','AUDIT-M'])proofs.set(id,await m.fixtureProof(ex,id));
 prepared.set(owned.root,{requestId:result.requestId,revision:result.revision,proofs,m,sourceShiftId:scenario.sourceId});
 report.tc3Initial={prepared:true,initializedBeforeListen:true,sourceSha:SHA,sourceInputs:INPUTS};
}
export async function finalizeInitialALWA10AndTC3(owned:any,report:any,evidence:string){
 const state=prepared.get(owned.root);assert(state,'Optional initial prepare missing');
 const reads=[];for(const actor of ['QAOWNER','AUDIT-M']){const availability=await state.m.readShiftChangeAvailability(state.proofs.get(actor),{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:state.requestId,expectedRevision:state.revision},owned.database.executor);assert.equal(availability.allowed,true);reads.push({actor,requestId:state.requestId,allowed:true});}
 const finalized=await finalizeInitialALWA10(owned,report,evidence),path=finalized.bindingsPath,bindings=JSON.parse(await readFile(path,'utf8'));
 bindings.tc3ShiftBlock={requestId:state.requestId,selector:'#request-'+state.requestId,sourceShiftId:state.sourceShiftId,readEligible:true};await writeFile(path,JSON.stringify(bindings,null,2),{mode:0o600});
 const receipt={sourceSha:SHA,initializedBeforeListen:true,sourceInputs:INPUTS,requestKind:'SUBMIT_CALLOUT',pending:true,sourceShiftId:state.sourceShiftId,requestId:state.requestId,managerAvailabilityReads:reads,businessPreviewActionsAfterListen:0};await writeFile(join(evidence,'tc-wa-3-initial-fixture.json'),JSON.stringify(receipt,null,2),{flag:'wx',mode:0o600});
 report.tc3Initial={...report.tc3Initial,finalized:true,manifest:join(evidence,'tc-wa-3-initial-fixture.json')};prepared.delete(owned.root);return finalized;
}
