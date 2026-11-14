import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {join,basename} from 'node:path';

export const step4Fixture='src/test/integration/step4-lifecycle-browser.integration.ts';
export const step4TestName='completes the fictional-company lifecycle and restricted recovery resilience on actual owned company databases';
export const step4Stages=Object.freeze([
 'registration-provisioning-original-owner-activation',
 'substituted-company-identity-refused-before-launch',
 'normal-owner-browser-sign-in-on-provisioned-company',
 'actual-owner-setup-http-and-company-authority',
 'actual-enrolled-catalog-trial-and-company-owner-browser-billing-authority',
 'cold-webkit-normal-owner-signin-and-live-company-billing-before-clock-advancement',
 'second-provisioned-company-normal-owner-browser-distinct-app-principal-duplicate-local-person-id',
 'canonical-setup-readiness-optional-skips-and-people-without-implicit-invitations',
 'real-local-smtp-acceptance-missing-email-partial-unknown-ack-and-no-resend-on-replay',
 'actual-invitation-activation-http-and-normal-employee-browser-sign-in-owner-boundary',
 'live-revocation-of-actual-owner-browser-session-retires-private-billing-without-user-refresh',
 'published-schedule-domain-service-and-normal-owner-pin-tablet-enrollment-punch-break-browser-flow',
 'actual-employee-missing-historical-entry-http-owner-independent-approval-idempotent-no-self-approval',
 'actual-finalized-approved-historical-correction-native-2026-payroll-worker-private-publication-own-pay-http',
 'controlled-application-commerce-clock-original-trial-expiry-existing-shift-finishes-new-clock-in-402-own-pay-export-profile-read-isolation',
 'actual-restricted-company-en-es-two-engine-four-width-reload-back-keyboard-offline-late-read-fencing-and-current-session-denial',
 'actual-owner-handoff-local-public-billing-api-sdk-lost-checkout-recovery-signed-event-dedup-worker-reconcile-failure-grace-restriction-recovery-no-trial-reset-or-duplicates',
 'native-owner-signout-back-does-not-restore-authority-and-normal-reauthentication-recovers',
]);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function step4RuntimeHashes(custody){
 return Object.fromEntries(Object.entries(custody.hashes).filter(([name])=>['src/','public/','services/','db/'].some(prefix=>name.startsWith(prefix))||['package.json','package-lock.json','tsconfig.json','next-env.d.ts','next.config.ts'].includes(name)));
}
export function verifyStep4Evidence({custody,source,report,vitest,cluster,packets,inventory,transportSource,typesSource}){
 assert.match(custody.checkpoint,/^[a-f0-9]{40}$/);assert.match(custody.tree,/^[a-f0-9]{40}$/);assert.equal(custody.sourceClean,true);
 assert.equal(vitest.success,true);for(const [key,value]of Object.entries({numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0}))assert.equal(vitest[key],value,key);
 assert.equal(vitest.testResults.length,1);const execution=vitest.testResults[0];assert.equal(execution.name,join(source,step4Fixture));assert.equal(execution.status,'passed');assert.equal(execution.assertionResults.length,1);assert.equal(execution.assertionResults[0].status,'passed');assert.equal(execution.assertionResults[0].fullName,step4TestName);
 assert.equal(cluster.suite,'step4-local');assert.equal(cluster.sourceSha,custody.checkpoint);for(const key of ['started','stopped','removed'])assert.equal(cluster[key],true);assert.equal(cluster.exitCode,0);
 assert.equal(report.sourceSha,custody.checkpoint);assert.equal(report.tree,custody.tree);for(const key of ['complete','admissionComplete','lifecycleComplete','resilienceComplete','cleanupVerified'])assert.equal(report[key],true,key);
 assert.deepEqual(report.stages,step4Stages.map(stage=>({stage,state:'passed'})));assert.equal(report.internalRedirectFailures,0,'Owned internal redirect transport must not fail');
 for(const key of ['runtimeErrors','windowExceptions'])assert.deepEqual(report[key],[],key);for(const key of ['runtimeErrorsDropped','networkDropped'])assert.equal(report[key],0,key);
 assert(report.network.length>=200&&report.network.length<=512);assert(report.network.every(row=>row.ownedDomain===true&&['GET','POST'].includes(row.method)&&/^\//.test(row.path)&&!row.path.includes('?')&&Number.isInteger(row.status)&&row.status>=100&&row.status<=599));
 assert.deepEqual(report.matrixClosed,['chromium','webkit']);
 const required=name=>assert((inventory.get(name)??0)>0,'Missing nonempty Step4 evidence: '+name);
 const expectedCells=[];
 for(const engine of ['chromium','webkit'])for(const lang of ['en','es']){
  required(`recovery-${engine}-${lang}-trace.zip`);
  for(const kind of ['billing','paused','unavailable'])for(const width of [320,390,768,1440]){expectedCells.push({engine,lang,kind,width,textPercent:[100,200]});required(`recovery-${engine}-${lang}-${kind}-${width}.png`);}
 }
 assert.deepEqual(report.matrix,expectedCells);for(const name of ['admission-trace.zip','second-company-trace.zip','billing-retirement-trace.zip'])required(name);
 const diagnostics=report.browserDiagnostics;assert.deepEqual(diagnostics.webkitAdmission.console,[]);assert.deepEqual(diagnostics.webkitAdmission.pending,[]);assert.equal(diagnostics.webkitAdmission.capture,undefined);
 assert.deepEqual(diagnostics.isolatedInvitationUi,{engine:'chromium',wrapped:true,fragmentScrubbed:true});
 assert.deepEqual(diagnostics.isolatedAccountAccess,['chromium','webkit'].map(engine=>({resetEngine:engine,issuanceEngine:'chromium',wrappedAssistedUi:true,fullResetProof:true,normalNewPasswordLogin:true,replayDenied:true})));
 const recovery=diagnostics.recoveryResilience;assert.equal(recovery.stage,'complete');for(const key of ['errors','foreignRequests','operationalReads'])assert.deepEqual(recovery[key],[],key);assert.equal(recovery.dropped,0);assert.equal(recovery.capture,undefined);assert.equal(recovery.focus.length,4);
 for(const engine of ['chromium','webkit'])for(const lang of ['en','es'])assert.equal(recovery.latestStatus[engine+':'+lang].status,401);
 assert(diagnostics.billingSessionRetirement.statuses.includes(200));assert(diagnostics.billingSessionRetirement.statuses.some(status=>status===401||status===403));assert.equal(diagnostics.billingSessionRetirement.privateDetails,0);
 const expected=step4RuntimeHashes(custody),originalTransportHash=digest(transportSource),originalTypesHash=digest(typesSource),transportFile='src/lib/workspace-routing/transport.server.ts';
 assert.equal(originalTransportHash,expected[transportFile]);assert.equal(originalTypesHash,expected['next-env.d.ts']);assert.equal(transportSource.split("from '@neondatabase/serverless'").length,2);
 const derivedTransportHash=digest(transportSource.replace("from '@neondatabase/serverless'","from '../../test/integration/owned-isolated-neon'"));let derivedTypes=typesSource;
 for(const name of ['routes.d.ts','root-params.d.ts']){const original=`import "./.next/types/${name}";`;assert.equal(typesSource.split(original).length,2);derivedTypes=derivedTypes.replace(original,`import "./.next/dev/types/${name}";`);}
 const derivedTypesHash=digest(derivedTypes);assert.equal(packets.length,2);assert.equal(new Set(packets.map(packet=>packet.ownership.ownerId)).size,2);assert.equal(new Set(packets.map(packet=>packet.ownership.identity.oid)).size,2);
 for(const [index,packet]of packets.entries()){
  const {manifest,ownership}=packet;assert.equal(packet.kind,index===0?'app':'second-app');assert.equal(manifest.checkpoint,custody.checkpoint);assert.deepEqual(manifest.hashes,expected);assert.deepEqual(manifest.substitutedFiles,[transportFile,'next-env.d.ts']);assert.equal(manifest.originalDbHash,expected['src/lib/db.ts']);assert.equal(manifest.substitutedDbHash,expected['src/lib/db.ts']);
  assert.deepEqual(manifest.isolatedTransport,{originalHash:originalTransportHash,derivedHash:derivedTransportHash,scope:'Owned loopback Neon SQL transport only; original routing/role/binding/session/business guards retained'});
  assert.deepEqual(manifest.generatedTypeReferences,{originalHash:originalTypesHash,derivedHash:derivedTypesHash,reason:'Next 16.4.2 dev generated type-reference paths'});
  for(const key of ['started','closed','sourceVerified','mirrorVerified'])assert.equal(ownership[key],true,key);assert.equal(ownership.source,source);assert.match(basename(ownership.root),/^owned-next-[A-Za-z0-9]+$/);assert.match(ownership.ownerId,/^[a-f0-9-]{36}$/);assert(Number.isSafeInteger(ownership.pid)&&ownership.pid>0);assert(Number.isSafeInteger(ownership.port)&&ownership.port>0);assert(Number.isFinite(Date.parse(ownership.closedAt)));assert.match(ownership.identity.marker,/^fuel-phase3-disposable:[a-f0-9-]{36}$/);
  assert.deepEqual(report.ownership[index],{closed:true,sourceVerified:true,mirrorVerified:true});assert.equal(ownership.isolatedIngress.entryHash,expected['src/test/integration/owned-isolated-next.mts']);assert.equal(ownership.isolatedIngress.publicPort,443);assert.equal(ownership.isolatedIngress.socket,'owned-ephemeral-loopback-http');assert.equal(ownership.isolatedIngress.productionIngressVerified,false);
 }
 return {tests:1,stages:step4Stages.length,matrixCells:48,sourceManifests:2,sourceFileHashesVerified:Object.keys(expected).length*2};
}
