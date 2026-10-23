import {subscribe,unsubscribe} from 'node:diagnostics_channel';

export const OWNED_LOGIN_HEADER='x-nevora-qa-login';
export const OWNED_LOGIN_PREFIX='[Owned login trace] ';
const marker=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const events=new Set(['request-start','request-aborted','response-finish','response-close']);
function redirectKind(response,origin){
 const value=response.getHeader('x-action-redirect')??response.getHeader('location');
 if(typeof value!=='string')return null;
 try{const target=new URL(value.split(';')[0],origin);return target.origin!==origin?'other':target.pathname==='/app'?'app':target.pathname==='/login'?'login':'other';}catch{return 'other';}
}
export function installOwnedLoginDiagnostics({origin,publish}){
 const url=new URL(origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.origin!==origin)throw Error('Login diagnostics require the explicit owned loopback origin');
 let sequence=0;
 const observe=({request,response})=>{
  const attempt=request.headers[OWNED_LOGIN_HEADER];
  if(typeof attempt!=='string'||!marker.test(attempt)||!['GET','POST'].includes(request.method)||request.headers.host!==url.host||!['127.0.0.1','::ffff:127.0.0.1'].includes(request.socket.localAddress)||sequence>=1024)return;
  let route;try{route=new URL(request.url,origin);}catch{return;}
  if(route.origin!==origin||route.pathname!=='/login')return;
  const started=performance.now(),requestId=++sequence,method=request.method,serverAction=typeof request.headers['next-action']==='string';
  const emit=event=>{
   const status=event==='request-start'?null:response.statusCode;
   const entry={attempt,processId:process.pid,requestId,event,method,serverAction,elapsedMs:Math.max(0,Math.round(performance.now()-started)),status,redirect:redirectKind(response,origin),complete:response.writableFinished===true};
   try{publish(entry);}catch{process.stderr.write('[Owned login trace unavailable]\n');}
  };
  emit('request-start');request.once('aborted',()=>emit('request-aborted'));
  response.once('finish',()=>emit('response-finish'));response.once('close',()=>emit('response-close'));
 };
 subscribe('http.server.request.start',observe);
 return ()=>unsubscribe('http.server.request.start',observe);
}
export function readOwnedLoginEvents(text,attempt){
 if(typeof attempt!=='string'||!marker.test(attempt))return [];
 return text.split('\n').slice(-4096).flatMap(line=>{
  const index=line.indexOf(OWNED_LOGIN_PREFIX);if(index<0)return [];
  const raw=line.slice(index+OWNED_LOGIN_PREFIX.length);if(raw.length>4096)return [];
  let entry;try{entry=JSON.parse(raw);}catch{return [];}
  if(!entry||entry.attempt!==attempt||!events.has(entry.event)||!['GET','POST'].includes(entry.method)||typeof entry.serverAction!=='boolean'||typeof entry.complete!=='boolean'||![null,'app','login','other'].includes(entry.redirect)||!(entry.status===null||Number.isInteger(entry.status)&&entry.status>=100&&entry.status<=599)||![entry.processId,entry.requestId,entry.elapsedMs].every(value=>Number.isSafeInteger(value)&&value>=0))return [];
  const {processId,requestId,event,method,serverAction,elapsedMs,status,redirect,complete}=entry;
  return [{attempt,processId,requestId,event,method,serverAction,elapsedMs,status,redirect,complete}];
 }).slice(-32);
}

if(process.env.NEVORA_OWNED_LOGIN_ORIGIN){
 if(process.env.NODE_ENV!=='development'||!/^[a-f0-9]{32}$/.test(process.env.NEVORA_OWNED_PROCESS_OWNER??'')||!process.env.NEVORA_OWNED_APP_DATABASE)throw Error('Login diagnostics require the marked owned application');
 installOwnedLoginDiagnostics({origin:process.env.NEVORA_OWNED_LOGIN_ORIGIN,publish:entry=>console.log(OWNED_LOGIN_PREFIX+JSON.stringify(entry))});
}
