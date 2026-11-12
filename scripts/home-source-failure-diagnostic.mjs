// Owned H09 observation only. No headers, IDs, labels, content or authority proofs.
export function homeFailureProjection(value){
 const states=['ready','partial','unavailable','unauthorized'];
 const observation=source=>['complete','partial','unavailable'].includes(source?.state)?source.state:'other';
 return {state:states.includes(value?.state)?value.state:'other',
  publicationState:['complete','partial','unavailable'].includes(value?.snapshot?.publicationState)?value.snapshot.publicationState:'other',
  schedule:observation(value?.snapshot?.sources?.schedule),timeOff:observation(value?.snapshot?.sources?.timeOff),
  nextShift:!!value?.snapshot?.nextShift,currentShift:!!value?.snapshot?.currentShift};
}

export function observeHomeFailure(page){
 const started=Date.now(),events=[],ids=new WeakMap(),pending=new Set();let sequence=0,phase='locked',saturated=false;
 const record=sample=>{if(events.length<96)events.push({at:Date.now(),phase,...sample});else saturated=true;};
 const identify=request=>{try{if(request.method()!=='GET'||new URL(request.url()).pathname!=='/api/employee/home')return;}
  catch{return;}if(!ids.has(request))ids.set(request,++sequence);return ids.get(request);};
 const requested=request=>{const id=identify(request);if(id)record({event:'request',id});};
 const responded=response=>{const id=identify(response.request());if(!id)return;record({event:'response',id,status:response.status()});
  if(pending.size>=8){saturated=true;return;}
  const task=response.json().then(body=>record({event:'body',id,...homeFailureProjection(body)}),()=>record({event:'body-unavailable',id})).finally(()=>pending.delete(task));pending.add(task);};
 const finished=request=>{const id=identify(request);if(id)record({event:'finished',id});};
 const failed=request=>{const id=identify(request);if(id)record({event:'failed',id});};
 page.on('request',requested);page.on('response',responded);page.on('requestfinished',finished);page.on('requestfailed',failed);
 return {started,events,setPhase:value=>{phase=value;},
  async close(){page.off('request',requested);page.off('response',responded);page.off('requestfinished',finished);page.off('requestfailed',failed);
   let timer;try{await Promise.race([Promise.allSettled([...pending]),new Promise(resolve=>{timer=setTimeout(resolve,500);})]);}finally{clearTimeout(timer);}
   return {started,events,saturated,pendingBodies:pending.size};
  }};
}

export function homeSqlEvents(log,started){
 return log.split('\n').flatMap(line=>{
  const at=line.indexOf('[Owned Home SQL] ');if(at<0)return [];
  try{
   const raw=JSON.parse(line.slice(at+17));
   if(!Number.isSafeInteger(raw.at)||raw.at<started||!['start','acquired','statement','result','failed','finished','saturated','observation-unavailable'].includes(raw.event))return [];
   const sample={at:raw.at,event:raw.event};
   for(const key of ['batch','elapsedMs','total','idle','waiting','index','rowCount','futureCount','currentCount'])if(Number.isSafeInteger(raw[key])&&raw[key]>=0)sample[key]=raw[key];
   for(const key of ['aborted','coverageComplete','unchanged'])if(typeof raw[key]==='boolean')sample[key]=raw[key];
   const kinds=['assignment','location-authority','authority','acknowledgements','timeOff','exchanges','ownTime','receipts','communications','final_sources'];
   if(['final',...kinds].includes(raw.phase))sample.phase=raw.phase;
   if(kinds.includes(raw.kind))sample.kind=raw.kind;
   if(['55P03','57014','40P01','53300','08006','ECONNRESET','ECONNREFUSED','other'].includes(raw.code))sample.code=raw.code;
   if(typeof raw.fingerprint==='string'&&/^[a-f0-9]{64}$/.test(raw.fingerprint))sample.fingerprint=raw.fingerprint;
   return [sample];
  }catch{return [];}
 }).slice(-1024);
}

/** Cleanup/capture failures cannot skip listener removal or replace the primary failure. */
export async function finishHomeFailure({blocker,diagnostic,readLog,writeReceipt,render,primaryFailure}){
 const failures=[];
 const attempt=async(name,operation)=>{try{return await operation();}catch{failures.push(name);}};
 await attempt('blocker-rollback',()=>blocker.query('ROLLBACK'));
 await attempt('blocker-close',()=>blocker.end());
 const receipt=await attempt('observer-close',()=>diagnostic.close());
 const log=await attempt('server-log',readLog);
 await attempt('receipt-write',()=>writeReceipt({...receipt,render,sql:typeof log==='string'?homeSqlEvents(log,diagnostic.started):[],captureFailures:failures}));
 if(failures.length){
  console.log('[Owned Home capture failure] '+JSON.stringify({failures}));
  if(!primaryFailure)throw Error('Owned Home diagnostic or cleanup failed; see safe capture receipt');
 }
}
