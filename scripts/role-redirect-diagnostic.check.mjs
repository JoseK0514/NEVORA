import assert from 'node:assert/strict';
import {test} from 'node:test';
import {assessRoleRedirectDiagnostics,finalizeRoleRedirectDiagnostics} from './role-redirect-diagnostic.mjs';

const projection=()=>({error:{name:'TypeError',messageKind:'load-failed'},cause:null,projectionUnavailable:false});
const fixture=()=>{
 const controlCells=['rsc-get','framework-frames-post'].flatMap(kind=>[
  {kind,navigation:false,identityMatches:true,status:200,handled:false,pagehide:0,windowErrors:0,unhandledRejections:0,serverReads:1,nativeEvents:[],caught:[],consolePreserved:true,processingControl:{caught:{error:{name:'SyntaxError',messageKind:'other'},cause:null,projectionUnavailable:false,mainFrame:true},consolePreserved:true}},
  {kind,navigation:true,identityMatches:true,status:0,handled:true,pagehide:0,windowErrors:0,unhandledRejections:0,serverReads:0,nativeEvents:[{exactNative:true,documentNavigation:{phase:'same-url',sourceHistoryEvents:0}}],caught:[{...projection(),mainFrame:true,targetResource:kind==='rsc-get'?'role-home':'next-frames'}],consolePreserved:true,newDocument:true},
 ]);
 const events=[
  {kind:'request',resource:'role-home',rsc:true,navigation:false,requestId:4,elapsedMs:20},
  {kind:'failed',resource:'role-home',rsc:true,navigation:false,requestId:4,failureCategory:'other',elapsedMs:30},
  {kind:'request',resource:'report-route',rsc:false,navigation:true,sameAddress:true,requestId:5,elapsedMs:31},
  {kind:'console-error',code:'rsc-navigation-fallback',targetResource:'role-home',elapsedMs:32},
  {kind:'failed',resource:'report-route',rsc:false,navigation:true,sameAddress:true,requestId:5,failureCategory:'other',elapsedMs:34},
  {kind:'request',resource:'role-home',rsc:false,navigation:true,sameAddress:false,requestId:6,elapsedMs:35},
  {kind:'response',resource:'role-home',rsc:false,navigation:true,sameAddress:false,requestId:6,status:200,elapsedMs:45},
  {kind:'commit',destination:'other',elapsedMs:46},
  {kind:'finished',resource:'role-home',rsc:false,navigation:true,sameAddress:false,requestId:6,elapsedMs:50},
 ];
 return {sourceClean:true,scenarioComplete:true,runtimeClosed:true,errors:['Unrelated error','Role redirect emitted a framework RSC fallback.'],windowExceptions:[],runtimeDiagnostics:[],omittedCaughtRscErrors:0,
  navigationDiagnosticControl:{verified:true,windowObserverVerified:true,status:'mechanism-reproduced',cells:['private-get','today-get','action-center-post-read','clock-monitor-get'].flatMap(profile=>[
   {profile,navigation:false,identityMatches:true,status:200,handled:false,pagehide:0,windowErrors:0,unhandledRejections:0,serverReads:1,nativeDiagnostics:0,onlyExactNativeDiagnostic:true},
   {profile,navigation:true,identityMatches:true,status:0,handled:true,pagehide:0,windowErrors:0,unhandledRejections:0,serverReads:0,nativeDiagnostics:1,onlyExactNativeDiagnostic:true},
  ])},rscCaughtErrorControl:{observerVerified:true,cells:controlCells},
  scopedNavigation:[{engine:'webkit',case:'actual-role-redirect',actor:'D3-M',status:'passed',roleChanged:true,storageTriggered:true,sourcePrivateAbsent:true,destinationVerified:true,cleanupRestored:true,documentTimeOrigin:1000,startedAtMs:100,omittedEvents:0,events,fallbackErrorIndices:[1]}],
  caughtRscErrors:[{...projection(),portal:'D3-M',lifecycle:'scenario',reportControl:{engine:'webkit',control:'actual-role-redirect',phase:'role-changed-destination-release'},mainFrame:true,targetResource:'role-home',sequence:1,timeOrigin:1000,monotonicMs:132,readyState:'complete'}],
 };
};
const classified=report=>assessRoleRedirectDiagnostics(report,'D3-M');
const rejected=report=>{const result=classified(report);assert.deepEqual(result.errorIndices,[]);assert.deepEqual(result.caughtIndices,[]);};

test('a complete successful role fixture may classify its indexed handled load failure while preserving unrelated errors',()=>{
 const report=fixture(),before=structuredClone(report),result=classified(report);
 assert.deepEqual(result.errorIndices,[1]);assert.deepEqual(result.caughtIndices,[0]);assert.deepEqual(report,before,'Assessment must retain every original record');
 assert.equal(report.scopedNavigation[0].events[1].failureCategory,'other','Unknown transport reason is never renamed aborted');
});
test('the contract follows relative event state and request identity, not historical counts or timings',()=>{
 const report=fixture(),row=report.scopedNavigation[0];
 row.events.forEach(event=>{event.elapsedMs=event.elapsedMs*7+100;if(event.requestId)event.requestId+=40;});row.startedAtMs=500;report.caughtRscErrors[0].monotonicMs=500+32*7+100;
 assert.deepEqual(classified(report).errorIndices,[1]);
});
test('a completed same-address source-entry navigation is distinct from the live replacement',()=>{
 const report=fixture();report.scopedNavigation[0].events.unshift(
  {kind:'request',resource:'source-route',navigation:true,rsc:false,sameAddress:true,requestId:1,elapsedMs:1},
  {kind:'response',resource:'source-route',navigation:true,rsc:false,sameAddress:true,requestId:1,status:200,elapsedMs:2},
  {kind:'commit',destination:'source',elapsedMs:3},
  {kind:'finished',resource:'source-route',navigation:true,rsc:false,sameAddress:true,requestId:1,elapsedMs:4},
 );assert.deepEqual(classified(report).errorIndices,[1]);
});
test('a later RSC failure cannot justify a fallback observed before destination completion',()=>{
 const report=fixture(),events=report.scopedNavigation[0].events;
 const [late]=events.splice(1,1);late.elapsedMs=55;events.push(late);rejected(report);
});
test('two apparently live same-address replacements are ambiguous and stay fatal',()=>{
 const report=fixture(),events=report.scopedNavigation[0].events;
 events.splice(3,0,{kind:'request',resource:'source-route',navigation:true,rsc:false,sameAddress:true,requestId:7,elapsedMs:31.5});
 events.push({kind:'failed',resource:'source-route',navigation:true,rsc:false,sameAddress:true,requestId:7,failureCategory:'other',elapsedMs:51});rejected(report);
});
test('scope, completed scenario, retirement and cleanup remain mandatory',()=>{
 for(const mutate of [r=>{r.sourceClean=false;},r=>{r.scenarioComplete=false;},r=>{r.runtimeClosed=false;},r=>{r.scopedNavigation[0].engine='chromium';},r=>{r.scopedNavigation[0].case='ordinary-navigation';},r=>{r.scopedNavigation[0].actor='other';},r=>{r.scopedNavigation[0].status='failed';},...['roleChanged','storageTriggered','sourcePrivateAbsent','destinationVerified','cleanupRestored'].map(key=>r=>{r.scopedNavigation[0][key]=false;})]){const r=fixture();mutate(r);rejected(r);}
});
test('no missing, failed or spoofed calibration is sufficient',()=>{
 for(const mutate of [r=>{delete r.navigationDiagnosticControl;},r=>{r.navigationDiagnosticControl.windowObserverVerified=false;},r=>{r.navigationDiagnosticControl.cells.pop();},r=>{r.navigationDiagnosticControl.cells[1].serverReads=1;},r=>{r.rscCaughtErrorControl.observerVerified=false;},r=>{r.rscCaughtErrorControl.cells.pop();},r=>{r.rscCaughtErrorControl.cells[1].nativeEvents[0].exactNative=false;},r=>{r.rscCaughtErrorControl.cells[0].processingControl.caught.error.name='TypeError';},r=>{r.rscCaughtErrorControl.cells[0].processingControl.consolePreserved=false;},r=>{r.rscCaughtErrorControl.cells[1].newDocument=false;}]){const r=fixture();mutate(r);rejected(r);}
});
test('processing, wrong-target/document/frame, late and incomplete caught records remain fatal',()=>{
 for(const mutate of [r=>{r.caughtRscErrors[0].error.name='SyntaxError';},r=>{r.caughtRscErrors[0].error.messageKind='other';},r=>{r.caughtRscErrors[0].cause={name:'Error',messageKind:'other'};},r=>{r.caughtRscErrors[0].projectionUnavailable=true;},r=>{r.caughtRscErrors[0].mainFrame=false;},r=>{r.caughtRscErrors[0].targetResource='report-route';},r=>{r.caughtRscErrors[0].timeOrigin=999;},r=>{r.caughtRscErrors[0].monotonicMs=9999;},r=>{r.caughtRscErrors[0].reportControl.phase='complete';},r=>{r.caughtRscErrors[0].sequence=2;},r=>{r.caughtRscErrors.push(structuredClone(r.caughtRscErrors[0]));},r=>{r.caughtRscErrors=[];},r=>{r.omittedCaughtRscErrors=1;},r=>{r.scopedNavigation[0].omittedEvents=1;}]){const r=fixture();mutate(r);rejected(r);}
});
test('real window and native errors cannot be hidden by matching fallback text',()=>{
 for(const key of ['windowExceptions','runtimeDiagnostics']){const r=fixture();r[key].push({kind:'error'});rejected(r);}
});
test('an absent, already-ended or failed destination cannot satisfy replacement proof',()=>{
 for(const mutate of [r=>{r.scopedNavigation[0].events[2].sameAddress=false;},r=>{r.scopedNavigation[0].events[4].elapsedMs=31;r.scopedNavigation[0].events.splice(3,0,r.scopedNavigation[0].events.splice(4,1)[0]);},r=>{r.scopedNavigation[0].events[6].status=503;},r=>{r.scopedNavigation[0].events.pop();},r=>{r.scopedNavigation[0].events[7].destination='source';},r=>{r.scopedNavigation[0].events[1].requestId=99;},r=>{r.scopedNavigation[0].events[3].targetResource='other';},r=>{r.scopedNavigation[0].fallbackErrorIndices=[0];},r=>{r.scopedNavigation[0].fallbackErrorIndices=[1,1];},r=>{r.scopedNavigation.push(structuredClone(r.scopedNavigation[0]));}]){const r=fixture();mutate(r);rejected(r);}
});

test('finalization retains the complete raw errors and makes every unmatched caught record fatal',()=>{
 const report=fixture(),original=structuredClone(report);report.caughtRscErrors.push({...projection(),portal:'other',timeOrigin:2000});
 const result=finalizeRoleRedirectDiagnostics(report,'D3-M');
 assert.deepEqual(result.rawErrors,original.errors);assert.deepEqual(result.errors,['Unrelated error','Unclassified caught RSC console error.']);
 assert.equal(result.roleRedirectDiagnosticDecisions[0].transportReason,'unknown');assert.deepEqual(report.errors,original.errors);
});
test('incomplete evidence and unrelated transport failures remain unclassified',()=>{
 for(const mutate of [r=>{r.navigationDiagnosticControl.cells={length:8};},r=>{r.rscCaughtErrorControl.cells[1].nativeEvents={length:1};},r=>{r.scopedNavigation={};},r=>{r.scopedNavigation[0].events[1].failureCategory='connection-failed';},r=>{r.scopedNavigation[0].events.push({kind:'request',resource:'role-home',rsc:true,navigation:false,requestId:88,elapsedMs:51});},r=>{delete r.caughtRscErrors[0].targetResource;},r=>{delete r.scopedNavigation[0].documentTimeOrigin;}]){
  const report=fixture();mutate(report);rejected(report);const result=finalizeRoleRedirectDiagnostics(report,'D3-M');assert(result.errors.includes('Role redirect emitted a framework RSC fallback.'));assert(result.errors.includes('Unclassified caught RSC console error.'));
 }
});
