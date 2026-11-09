import {createHash} from 'node:crypto';

const fallback='Role redirect emitted a framework RSC fallback.';
const network=value=>value?.projectionUnavailable===false&&value.error?.name==='TypeError'&&value.error.messageKind==='load-failed'&&value.cause===null;
const quiet=cell=>cell?.identityMatches===true&&cell.pagehide===0&&cell.windowErrors===0&&cell.unhandledRejections===0;

export function projectFrameworkNativeDiagnostic(error,origin,portal){
 try{
  const url=new URL(origin),name=error?.name,message=error?.message;
  if(url.origin!==origin||url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||Number(url.port)<1||typeof portal!=='string'||!/^[A-Za-z0-9_-]{1,32}$/.test(portal))return null;
  if(name!=='Fetch API cannot load http'||message!=='/'+url.host+'/__nextjs_original-stack-frames due to access control checks.')return null;
  return {signature:'webkit-native-framework-fetch',resourceKind:'next-frames',sameOwnedOrigin:true,exactMessage:true,messageFingerprint:createHash('sha256').update('Portal '+portal+': '+message).digest('hex')};
 }catch{return null;}
}
const framework=value=>value?.signature==='webkit-native-framework-fetch'&&value.resourceKind==='next-frames'&&value.sameOwnedOrigin===true&&value.exactMessage===true&&/^[a-f0-9]{64}$/.test(value.messageFingerprint??'');

function assessNativeDiagnostics(report,actor,row,caughtIndices,lastConsole,destinationId){
 if(report.runtimeDiagnostics.length===0)return {errorIndices:[],decisions:[]};
 if(report.runtimeDiagnostics.length>caughtIndices.length||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(row.traceId??''))return null;
 const calibration=report.rscCaughtErrorControl.cells.find(cell=>cell.kind==='framework-frames-post'&&cell.navigation);
 if(!framework(calibration?.nativeEvents?.[0]?.framework))return null;
 const errorIndices=[],events=row.events,lastRoot=Math.max(...caughtIndices.map(index=>report.caughtRscErrors[index].monotonicMs));
 for(const diagnostic of report.runtimeDiagnostics){
  const observation=diagnostic?.navigationObservation,index=diagnostic?.errorIndex;
  if(diagnostic?.portal!==actor||diagnostic.lifecycle!=='scenario'||diagnostic.nativeFetchName!==true||!framework(diagnostic.framework)||diagnostic.reportControl?.engine!=='webkit'||diagnostic.reportControl.control!=='actual-role-redirect'||diagnostic.reportControl.phase!=='role-changed-destination-release'||diagnostic.pendingDocumentNavigation!==true||diagnostic.documentNavigation?.phase!=='requested'||diagnostic.documentNavigation.sourceHistoryEvents!==0)return null;
  if(!Number.isSafeInteger(index)||index<0||typeof report.errors[index]!=='string'||!report.errors[index].startsWith('Portal '+actor+': ')||errorIndices.includes(index)||row.fallbackErrorIndices.includes(index)||createHash('sha256').update(report.errors[index]).digest('hex')!==diagnostic.framework.messageFingerprint)return null;
  if(!observation||observation.traceId!==row.traceId||observation.onlyMainFrame!==true||!['source-route','report-route'].includes(observation.currentResource)||!Number.isFinite(diagnostic.monotonicMs)||diagnostic.monotonicMs<=lastRoot||observation.monotonicMs!==diagnostic.monotonicMs||!Number.isFinite(observation.elapsedMs)||Math.abs(diagnostic.monotonicMs-row.startedAtMs-observation.elapsedMs)>1)return null;
  const count=observation.eventCount;
  if(!Number.isSafeInteger(count)||count<=lastConsole+1||count>events.length||observation.elapsedMs<events[count-1].elapsedMs||count<events.length&&observation.elapsedMs>events[count].elapsedMs||!Array.isArray(observation.pendingDocuments)||observation.pendingDocuments.length!==1)return null;
  const before=events.slice(0,count),live=before.flatMap((request,at)=>request.kind==='request'&&request.navigation===true&&!before.some((event,after)=>after>at&&(event.kind==='commit'||event.requestId===request.requestId&&['failed','finished'].includes(event.kind)))?[request]:[]);
  const document=live[0],observed=observation.pendingDocuments[0];
  if(live.length!==1||document.requestId!==destinationId||document.resource!=='role-home'||document.rsc!==false||document.sameAddress!==false||!observed||observed.requestId!==document.requestId||observed.resource!==document.resource||observed.navigation!==true||observed.rsc!==false||observed.sameAddress!==false)return null;
  errorIndices.push(index);
 }
 return {errorIndices,decisions:[{control:'actual-role-redirect',engine:'webkit',contract:'secondary-native-framework-diagnostic',diagnosticIndices:report.runtimeDiagnostics.map((_value,index)=>index),errorIndices:[...errorIndices],transportReason:'unknown',networkRequestAssociation:'not-established'}]};
}

function controlsVerified(report){
 const baseline=report.navigationDiagnosticControl,control=report.rscCaughtErrorControl;
 if(baseline?.verified!==true||baseline.windowObserverVerified!==true||baseline.status!=='mechanism-reproduced'||!Array.isArray(baseline.cells)||baseline.cells.length!==8||control?.observerVerified!==true||!Array.isArray(control.cells)||control.cells.length!==4)return false;
 for(const profile of ['private-get','today-get','action-center-post-read','clock-monitor-get'])for(const navigation of [false,true]){
  const cells=baseline.cells.filter(cell=>cell?.profile===profile&&cell.navigation===navigation),cell=cells[0];
  if(cells.length!==1||!quiet(cell)||cell.onlyExactNativeDiagnostic!==true)return false;
  if(navigation?(cell.status!==0||cell.handled!==true||cell.serverReads!==0||cell.nativeDiagnostics!==1):(cell.status!==200||cell.handled!==false||cell.serverReads!==1||cell.nativeDiagnostics!==0))return false;
 }
 for(const kind of ['rsc-get','framework-frames-post'])for(const navigation of [false,true]){
  const cells=control.cells.filter(cell=>cell?.kind===kind&&cell.navigation===navigation),cell=cells[0];
  if(cells.length!==1||!quiet(cell)||cell.consolePreserved!==true)return false;
  if(navigation){
   const native=cell.nativeEvents?.[0],caught=cell.caught?.[0];
   if(cell.status!==0||cell.handled!==true||cell.serverReads!==0||cell.newDocument!==true||!Array.isArray(cell.nativeEvents)||cell.nativeEvents.length!==1||native?.exactNative!==true||native.documentNavigation?.phase!=='same-url'||native.documentNavigation.sourceHistoryEvents!==0||!Array.isArray(cell.caught)||cell.caught.length!==1||!network(caught)||caught.mainFrame!==true||caught.targetResource!==(kind==='rsc-get'?'role-home':'next-frames'))return false;
  }else{
   const processing=cell.processingControl;
   if(cell.status!==200||cell.handled!==false||cell.serverReads!==1||cell.nativeEvents?.length!==0||cell.caught?.length!==0||processing?.consolePreserved!==true||processing.caught?.projectionUnavailable!==false||processing.caught.error?.name!=='SyntaxError'||processing.caught.error.messageKind!=='other'||processing.caught.cause!==null||processing.caught.mainFrame!==true)return false;
  }
 }
 return true;
}

/** Acceptance of this owned fixture's handled failure, not an abort/root-cause
 * claim. Every other console/window/native error retains its fatal outcome. */
export function assessRoleRedirectDiagnostics(report,actor){
 const rejected={errorIndices:[],caughtIndices:[],decisions:[]};
 if(!report||report.sourceClean!==true||report.scenarioComplete!==true||report.runtimeClosed!==true||report.windowExceptions?.length!==0||!Array.isArray(report.runtimeDiagnostics)||report.omittedCaughtRscErrors!==0||!Array.isArray(report.errors)||!Array.isArray(report.caughtRscErrors)||!controlsVerified(report))return rejected;
 const rows=Array.isArray(report.scopedNavigation)?report.scopedNavigation.filter(row=>row?.engine==='webkit'&&row.case==='actual-role-redirect'):[];
 if(rows.length!==1)return rejected;
 const row=rows[0],events=row.events;
 if(row.actor!==actor||row.status!=='passed'||!['roleChanged','storageTriggered','sourcePrivateAbsent','destinationVerified','cleanupRestored'].every(key=>row[key]===true)||!Number.isFinite(row.documentTimeOrigin)||row.documentTimeOrigin<=0||!Number.isFinite(row.startedAtMs)||row.omittedEvents!==0||!Array.isArray(events)||events.length===0||events.length>64)return rejected;
 const kinds=new Set(['request','response','finished','failed','commit','console-error']);
 if(!events.every((event,index)=>event&&kinds.has(event.kind)&&Number.isFinite(event.elapsedMs)&&event.elapsedMs>=0&&event.elapsedMs<60000&&(index===0||event.elapsedMs>=events[index-1].elapsedMs)))return rejected;
 const consoles=events.flatMap((event,index)=>event.kind==='console-error'?[index]:[]);
 if(consoles.length===0||consoles.some(index=>events[index].code!=='rsc-navigation-fallback'||events[index].targetResource!=='role-home'))return rejected;
 const failures=events.flatMap((event,index)=>event.kind==='failed'&&event.resource==='role-home'&&event.rsc===true&&event.navigation===false?[index]:[]);
 if(failures.length!==consoles.length||new Set(failures.map(index=>events[index].requestId)).size!==failures.length||failures.some((index,offset)=>index>=consoles[offset]))return rejected;
 for(const index of failures){
  const failed=events[index];
  if(!['other','aborted'].includes(failed.failureCategory)||!Number.isSafeInteger(failed.requestId))return rejected;
  const related=events.map((event,at)=>({event,at})).filter(({event})=>event.requestId===failed.requestId);
  if(related.some(({event})=>event.resource!=='role-home'||event.rsc!==true||event.navigation!==false)||related.filter(({event,at})=>event.kind==='request'&&at<index).length!==1||related.filter(({event})=>event.kind==='response').length>1||related.some(({event,at})=>event.kind==='finished'||event.kind==='response'&&(event.status!==200||at>index)))return rejected;
 }
 const attempts=events.filter(event=>event.kind==='request'&&event.resource==='role-home'&&event.rsc===true&&event.navigation===false);
 if(attempts.some(request=>events.filter(event=>event.requestId===request.requestId&&['failed','finished'].includes(event.kind)).length!==1))return rejected;
 const lastConsole=consoles.at(-1);
 const replacements=events.flatMap((request,at)=>{
  if(request.kind!=='request'||request.navigation!==true||request.rsc!==false||request.sameAddress!==true||!['report-route','source-route'].includes(request.resource)||at>=consoles[0]||!Number.isSafeInteger(request.requestId))return [];
  const related=events.map((event,index)=>({event,index})).filter(({event})=>event.requestId===request.requestId);
  if(related.some(({event})=>event.resource!==request.resource||event.navigation!==true||event.rsc!==false||event.sameAddress!==true||event.kind==='response'&&(!Number.isInteger(event.status)||event.status<200||event.status>=400))||related.filter(({event})=>event.kind==='request').length!==1||related.filter(({event})=>['failed','finished'].includes(event.kind)).length!==1)return [];
  if(events.some((event,index)=>index>at&&index<=lastConsole&&(event.kind==='commit'||event.requestId===request.requestId&&['failed','finished'].includes(event.kind))))return [];
  return related.some(({event,index})=>index>lastConsole&&['failed','finished'].includes(event.kind))?[at]:[];
 });
 if(replacements.length!==1)return rejected;
 const destination=events.findIndex((event,index)=>index>lastConsole&&event.kind==='request'&&event.navigation===true&&event.sameAddress===false&&event.resource==='role-home');
 if(destination<0)return rejected;
 const destinationId=events[destination].requestId;
 const destinationEvents=events.map((event,index)=>({event,index})).filter(({event})=>event.requestId===destinationId);
 if(!Number.isSafeInteger(destinationId)||destinationEvents.some(({event})=>event.resource!=='role-home'||event.navigation!==true||event.rsc!==false||event.sameAddress!==false)||destinationEvents.filter(({event})=>event.kind==='response').length!==1||!destinationEvents.some(({event,index})=>index>destination&&event.kind==='response'&&event.status===200)||destinationEvents.filter(({event,index})=>index>destination&&event.kind==='finished').length!==1||destinationEvents.some(({event})=>event.kind==='failed')||!events.some((event,index)=>index>destination&&event.kind==='commit'&&event.destination==='other'))return rejected;
 const caughtIndices=report.caughtRscErrors.flatMap((value,index)=>value?.portal===actor&&value.timeOrigin===row.documentTimeOrigin?[index]:[]);
 if(caughtIndices.length!==consoles.length)return rejected;
 for(const [offset,index] of caughtIndices.entries()){
  const value=report.caughtRscErrors[index];
  if(!network(value)||value.mainFrame!==true||value.sequence!==offset+1||value.targetResource!=='role-home'||value.lifecycle!=='scenario'||value.readyState!=='complete'||value.reportControl?.engine!=='webkit'||value.reportControl.control!=='actual-role-redirect'||value.reportControl.phase!=='role-changed-destination-release'||!Number.isFinite(value.monotonicMs)||value.monotonicMs<row.startedAtMs||value.monotonicMs>row.startedAtMs+events.at(-1).elapsedMs)return rejected;
 }
 const errorIndices=row.fallbackErrorIndices;
 if(!Array.isArray(errorIndices)||errorIndices.length!==consoles.length||new Set(errorIndices).size!==errorIndices.length||errorIndices.some(index=>!Number.isSafeInteger(index)||index<0||report.errors[index]!==fallback))return rejected;
 const native=assessNativeDiagnostics(report,actor,row,caughtIndices,lastConsole,destinationId);
 if(!native)return rejected;
 return {errorIndices:[...errorIndices,...native.errorIndices],caughtIndices,decisions:[{control:'actual-role-redirect',engine:'webkit',contract:'handled-load-failure',errorIndices:[...errorIndices],caughtIndices:[...caughtIndices],transportReason:'unknown'},...native.decisions]};
}

export function finalizeRoleRedirectDiagnostics(report,actor){
 const assessment=assessRoleRedirectDiagnostics(report,actor),rawErrors=[...report.errors];
 const classifiedErrors=new Set(assessment.errorIndices),classifiedCaught=new Set(assessment.caughtIndices);
 const errors=rawErrors.filter((_error,index)=>!classifiedErrors.has(index));
 for(let index=0;index<report.caughtRscErrors.length;index++)if(!classifiedCaught.has(index))errors.push('Unclassified caught RSC console error.');
 return {rawErrors,errors,roleRedirectDiagnosticDecisions:assessment.decisions};
}
