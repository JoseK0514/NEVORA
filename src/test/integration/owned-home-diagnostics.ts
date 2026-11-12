import {createHmac,randomBytes} from 'node:crypto';

type Batch={id:number;phase:string;started:number};
const kind=(text:string)=>text.includes('WITH clock AS MATERIALIZED')&&text.includes('"coverageComplete"')?'assignment':
 text.includes(' AS unchanged')?'location-authority':
 /\/\* home_(authority|acknowledgements|timeOff|exchanges|ownTime|receipts|communications|final_sources) \*\//.exec(text)?.[1]??'other';

/** Owned loopback SQL only. Observations never control execution or carry input values. */
export function createHomeSqlDiagnostic(write:(sample:Record<string,unknown>)=>void,limit=8192){
 const key=randomBytes(32);let sequence=0,count=0;
 function emit(batch:Batch|undefined,event:string,fields:Record<string,unknown>={}){
  if(!batch||count>limit)return;
  try{
   if(count++===limit){write({event:'saturated',at:Date.now()});return;}
   write({at:Date.now(),batch:batch.id,phase:batch.phase,event,elapsedMs:Math.round(performance.now()-batch.started),...fields});
  }catch{/* Diagnostic output cannot change SQL results or original failures. */}
 }
 return {
  begin(texts:readonly string[]):Batch|undefined{
   const kinds=texts.map(kind);if(kinds.every(value=>value==='other'))return;
   const batch={id:++sequence,phase:kinds.includes('final_sources')?'final':kinds.includes('assignment')?'assignment':kinds.filter(value=>value!=='other')[0],started:performance.now()};
   emit(batch,'start');return batch;
  },emit,
  result(batch:Batch|undefined,text:string,rows:Record<string,unknown>[]){
   if(!batch||count>limit)return;
   try{
   const category=kind(text);if(category==='other')return;
   const facts:Record<string,unknown>={kind:category,rowCount:rows.length};
   if(category==='assignment'){
    // Omit observation time just as the application's coherent final comparison does.
    facts.fingerprint=createHmac('sha256',key).update(JSON.stringify(rows.map(row=>{const {observedAt:_at,...rest}=row;void _at;return rest;}))).digest('hex');
    const row=rows[0];facts.futureCount=Array.isArray(row?.future)?row.future.length:null;facts.currentCount=Array.isArray(row?.current)?row.current.length:null;
    facts.coverageComplete=typeof row?.coverageComplete==='boolean'?row.coverageComplete:null;
   }
   if(category==='location-authority')facts.unchanged=rows[0]?.unchanged===true;
   emit(batch,'result',facts);
   }catch{emit(batch,'observation-unavailable');}
  },
  failure(batch:Batch|undefined,error:unknown){
   let code:unknown;try{code=error&&typeof error==='object'&&'code'in error?error.code:null;}catch{code=null;}
   emit(batch,'failed',{code:typeof code==='string'&&['55P03','57014','40P01','53300','08006','ECONNRESET','ECONNREFUSED'].includes(code)?code:'other'});
  },
 };
}
