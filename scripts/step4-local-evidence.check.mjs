import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {step4Fixture,step4TestName,step4Stages,verifyStep4Evidence} from './step4-local-evidence.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(){
 const sha='a'.repeat(40),tree='b'.repeat(40),source='/owned/source',transportSource="import {neon} from '@neondatabase/serverless';\n",typesSource='import "./.next/types/routes.d.ts";\nimport "./.next/types/root-params.d.ts";\n';
 const hashes={'src/lib/db.ts':'c'.repeat(64),'src/lib/workspace-routing/transport.server.ts':hash(transportSource),'next-env.d.ts':hash(typesSource),'src/test/integration/owned-isolated-next.mts':'d'.repeat(64)},custody={checkpoint:sha,tree,sourceClean:true,hashes};
 const inventory=new Map(),matrix=[],latestStatus={};for(const name of ['admission-trace.zip','second-company-trace.zip','billing-retirement-trace.zip'])inventory.set(name,1);
 for(const engine of ['chromium','webkit'])for(const lang of ['en','es']){inventory.set(`recovery-${engine}-${lang}-trace.zip`,1);latestStatus[engine+':'+lang]={status:401};for(const kind of ['billing','paused','unavailable'])for(const width of [320,390,768,1440]){matrix.push({engine,lang,kind,width,textPercent:[100,200]});inventory.set(`recovery-${engine}-${lang}-${kind}-${width}.png`,1);}}
 const ownership=[0,1].map(index=>({ownerId:(index?'2':'1').repeat(8)+'-1111-1111-1111-'+'1'.repeat(12),source,root:'/external/'+(index?'second-app':'app')+'/owned-next-'+index,identity:{oid:index+1,marker:'fuel-phase3-disposable:11111111-1111-1111-1111-111111111111'},pid:index+10,port:index+1000,closedAt:'2026-11-13T10:00:00.000Z',started:true,closed:true,sourceVerified:true,mirrorVerified:true,isolatedIngress:{entryHash:hashes['src/test/integration/owned-isolated-next.mts'],publicPort:443,socket:'owned-ephemeral-loopback-http',productionIngressVerified:false}}));
 const packets=ownership.map((owner,index)=>({kind:index?'second-app':'app',ownership:owner,manifest:{checkpoint:sha,hashes:structuredClone(hashes),originalDbHash:hashes['src/lib/db.ts'],substitutedDbHash:hashes['src/lib/db.ts'],substitutedFiles:['src/lib/workspace-routing/transport.server.ts','next-env.d.ts'],isolatedTransport:{originalHash:hash(transportSource),derivedHash:hash(transportSource.replace("from '@neondatabase/serverless'","from '../../test/integration/owned-isolated-neon'")),scope:'Owned loopback Neon SQL transport only; original routing/role/binding/session/business guards retained'},generatedTypeReferences:{originalHash:hash(typesSource),derivedHash:hash(typesSource.replaceAll('./.next/types/','./.next/dev/types/')),reason:'Next 16.4.2 dev generated type-reference paths'}}}));
 const report={sourceSha:sha,tree,complete:true,admissionComplete:true,lifecycleComplete:true,resilienceComplete:true,cleanupVerified:true,stages:step4Stages.map(stage=>({stage,state:'passed'})),runtimeErrors:[],windowExceptions:[],runtimeErrorsDropped:0,networkDropped:0,network:Array.from({length:200},()=>({ownedDomain:true,method:'GET',path:'/api/commerce/status',status:200})),matrix,matrixClosed:['chromium','webkit'],ownership:ownership.map(()=>({closed:true,sourceVerified:true,mirrorVerified:true})),browserDiagnostics:{webkitAdmission:{console:[],pending:[]},recoveryResilience:{stage:'complete',errors:[],foreignRequests:[],operationalReads:[],dropped:0,focus:Array(4).fill({}),latestStatus},billingSessionRetirement:{statuses:[200,401],privateDetails:0}}};
 const vitest={success:true,numTotalTests:1,numPassedTests:1,numFailedTests:0,numPendingTests:0,numTodoTests:0,testResults:[{name:source+'/'+step4Fixture,status:'passed',assertionResults:[{status:'passed',fullName:step4TestName}]}]},cluster={suite:'step4-local',sourceSha:sha,started:true,stopped:true,removed:true,exitCode:0};
 return {custody,source,transportSource,typesSource,inventory,packets,report,vitest,cluster};
}
test('complete source-bound lifecycle, two closed app mirrors and every bilingual recovery cell are required',()=>{
 assert.deepEqual(verifyStep4Evidence(fixture()),{tests:1,stages:18,matrixCells:48,sourceManifests:2,sourceFileHashesVerified:8});
});
const changes={
 'stale source':value=>value.report.sourceSha='e'.repeat(40),
 'wrong tree':value=>value.report.tree='e'.repeat(40),
 'dirty source':value=>value.custody.sourceClean=false,
 'skipped lifecycle':value=>value.vitest.numPendingTests=1,
 'foreign test':value=>value.vitest.testResults[0].name='/foreign/test.ts',
 'empty test':value=>value.vitest.testResults[0].assertionResults=[],
 'wrong test':value=>value.vitest.testResults[0].assertionResults[0].fullName='not the lifecycle',
 'failed execution':value=>value.vitest.success=false,
 'unclosed cluster':value=>value.cluster.stopped=false,
 'retained cluster':value=>value.cluster.removed=false,
 'failed runner':value=>value.cluster.exitCode=1,
 'incomplete lifecycle':value=>value.report.lifecycleComplete=false,
 'partial resilience':value=>value.report.resilienceComplete=false,
 'missing stage':value=>value.report.stages.pop(),
 'duplicate stage':value=>value.report.stages[1]=value.report.stages[0],
 'runtime error':value=>value.report.runtimeErrors.push({kind:'pageerror'}),
 'unhandled rejection':value=>value.report.windowExceptions.push({kind:'unhandledrejection'}),
 'dropped runtime error':value=>value.report.runtimeErrorsDropped=1,
 'dropped network':value=>value.report.networkDropped=1,
 'foreign network':value=>value.report.network[0].ownedDomain=false,
 'duplicate matrix cell':value=>value.report.matrix[1]=value.report.matrix[0],
 'unclosed engine':value=>value.report.matrixClosed.pop(),
 'missing screenshot':value=>value.inventory.delete('recovery-webkit-es-billing-320.png'),
 'empty trace':value=>value.inventory.set('recovery-chromium-en-trace.zip',0),
 'WebKit delivery error':value=>value.report.browserDiagnostics.webkitAdmission.console.push('failure'),
 'operational reader in recovery':value=>value.report.browserDiagnostics.recoveryResilience.operationalReads.push('/api/notifications'),
 'unproved denial':value=>value.report.browserDiagnostics.recoveryResilience.latestStatus['webkit:es'].status=200,
 'retained private details':value=>value.report.browserDiagnostics.billingSessionRetirement.privateDetails=1,
 'unclosed app':value=>value.packets[1].ownership.closed=false,
 'unverified mirror':value=>value.packets[0].ownership.mirrorVerified=false,
 'wrong runtime source':value=>value.packets[0].ownership.source='/foreign/source',
 'missing runtime file hash':value=>delete value.packets[0].manifest.hashes['src/lib/db.ts'],
 'unapproved DB substitution':value=>value.packets[1].manifest.substitutedDbHash='e'.repeat(64),
 'unapproved transport':value=>value.packets[0].manifest.isolatedTransport.derivedHash='e'.repeat(64),
 'unapproved type substitution':value=>value.packets[0].manifest.generatedTypeReferences.derivedHash='e'.repeat(64),
 'duplicate app identity':value=>value.packets[1].ownership.ownerId=value.packets[0].ownership.ownerId,
 'duplicate database identity':value=>value.packets[1].ownership.identity.oid=value.packets[0].ownership.identity.oid,
 'hosted scope inflation':value=>value.packets[0].ownership.isolatedIngress.productionIngressVerified=true,
};
for(const [name,change]of Object.entries(changes))test('rejects '+name,()=>{const value=fixture();change(value);assert.throws(()=>verifyStep4Evidence(value));});
