import {createHash} from 'node:crypto';
// Browser-local state preparation. No request is sent by importing this module.
export const sourceSHA='368e98a18c16d47df04a93f2bea560843e461e0e';
const clone=value=>structuredClone(value);
export function buildState(kind,captured,now=new Date().toISOString()){
 const v=clone(captured);
 if(kind==='report-empty'){if(v.state!=='ready'||!v.source)throw Error('Capture a real ready report envelope first');for(const k of ['cards','schedules','requests','changes','publications','attendanceSources'])v.source[k]=[];v.source.observedAt=now;v.validForMs=15000;return v;}
 if(kind==='report-partial'){if(v.state!=='ready'||!v.source)throw Error('Capture real report first');v.source.publishedWeeks=[];v.validForMs=15000;return v;}
 if(kind==='context-empty'){if(v.state!=='ready'||!Array.isArray(v.locations))throw Error('Capture real context first');v.locations=[];v.shifts=[];v.observedAt=now;return v;}
 if(kind==='detail-acknowledged'||kind==='detail-read'){if(v.state!=='ready'||!v.id)throw Error('Capture a real authorized detail first');if(kind==='detail-acknowledged')v.ownAcknowledgedAt=now;else{v.acknowledgement='OPTIONAL';v.ownReadAt=now;}v.observedAt=now;return v;}
 if(kind==='detail-optional'){if(v.state!=='ready'||!v.id)throw Error('Capture a real detail first');v.acknowledgement='OPTIONAL';v.ownAcknowledgedAt=null;v.ownReadAt=null;v.observedAt=now;return v;}
 if(kind==='detail-withdrawn')return {state:'withdrawn',reason:'update_unavailable'};
 if(kind==='runs-empty'){if(v.version!=='PAYROLL_API_V1')throw Error('Capture payroll envelope first');v.runs=[];v.jobs=[];if(v.missingPeriods)v.missingPeriods=[];if(v.backlog)Object.assign(v.backlog,{overflow:false,returnedCount:0,missingCount:0,remainingCount:0,ambiguousCount:0});return v;}
 if(kind==='payroll-review-only'){if(v.version!=='PAYROLL_API_V1'||!v.capabilities)throw Error('Capture payroll access envelope first');Object.assign(v.capabilities,{canReview:true,canApprove:false});return v;}
 if(kind==='settings-empty'){if(v.version!=='PAYROLL_API_V1')throw Error('Capture payroll settings first');for(const k of ['revisions','exceptions','grants','employees','futureDraftImpact'])v[k]=[];return v;}
 if(kind==='receipt-not-found')return {receipt:null};
 if(kind==='operation-not-found')return {status:'unavailable',reason:'operation_not_found'};
 throw Error('Unbound state '+kind);
}
export const readOnlyPosts={
 '/api/reports':body=>body&&Object.keys(body).length===2&&typeof body.startDate==='string'&&typeof body.endDate==='string',
 '/api/reports/export':body=>body&&Object.keys(body).length===2&&typeof body.startDate==='string'&&typeof body.endDate==='string',
 '/api/manager/action-center':body=>body&&Object.keys(body).length===1&&typeof body.weekStart==='string',
};
export function classifyRequest(request,origin){
 const u=new URL(request.url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin)return 'external-abort';
 if(['GET','HEAD','OPTIONS'].includes(request.method()))return 'own-read';
 let body;try{body=request.postDataJSON();}catch{}
 return request.method()==='POST'&&readOnlyPosts[u.pathname]?.(body)?'own-read-post':'must-intercept';
}
// Install BEFORE navigation in a separate manual context. Official checker is unchanged.
export async function installManualGuard(context,origin,intercept){
 const log=[];await context.route('**/*',async route=>{const req=route.request(),kind=classifyRequest(req,origin),u=new URL(req.url());
  if(kind==='external-abort')return route.abort();
  const handled=await intercept?.({route,request:req,path:u.pathname,kind,log});if(handled)return;
  if(kind==='must-intercept'){log.push({method:req.method(),path:u.pathname,result:'aborted-before-server'});return route.abort();}
  return route.continue();
 });return log;
}
// Hold an action with an explicit release. Repeated commands are fingerprinted by the caller;
// only metadata/hashes are written to evidence, never browser credentials or auth headers.
export function heldAction({path,method='POST',finish='abort',response}){
 let release;const done=new Promise(r=>release=r),requests=[];
 return {requests,release,handle:async({route,request,path:actual})=>{if(actual!==path||request.method()!==method)return false;let body;try{body=request.postDataJSON();}catch{}requests.push({method,path,bodySha256:createHash('sha256').update(request.postDataBuffer()??'').digest('hex'),operationId:typeof body?.operationId==='string'?body.operationId:null,command:body?.kind??body?.action??null});await done;if(finish==='abort')await route.abort();else await route.fulfill(response);return true;}};
}
