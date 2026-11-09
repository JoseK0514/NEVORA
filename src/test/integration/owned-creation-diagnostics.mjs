import {subscribe,unsubscribe} from 'node:diagnostics_channel';
export const CREATION_TRACE_PREFIX='[Owned creation trace] ';
/** Observe only the fictional Cover fixture; never record headers, bodies or URLs. */
export function installOwnedCreationDiagnostics({origin,publish}){
 const url=new URL(origin);
 if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.origin!==origin)throw Error('Creation diagnostics require an owned loopback origin');
 let sequence=0,saturated=false;
 const send=entry=>{try{publish({...entry,process:process.pid,at:Date.now()});}catch{process.stderr.write(CREATION_TRACE_PREFIX+'unavailable\n');}};
 const observe=({request,response})=>{
  if(request.method!=='POST'||typeof request.headers['next-action']!=='string'||request.headers.host!==url.host||!['127.0.0.1','::ffff:127.0.0.1'].includes(request.socket.localAddress))return;
  let route;try{route=new URL(request.url,origin);}catch{return;}
  const subject=route.searchParams.get('sourceShiftId');
  if(route.origin!==origin||route.pathname!=='/app/exchange/swap'||route.searchParams.get('mode')!=='cover'||!/^creation-own-cover-[0-2]$/.test(subject??''))return;
  if(sequence>=16){if(!saturated){saturated=true;send({event:'unavailable',request:sequence,complete:false,status:null});}return;}
  const serial=++sequence;
  const emit=event=>send({event,request:serial,subject,complete:response.writableFinished===true,status:event==='start'?null:response.statusCode});
  emit('start');request.once('end',()=>emit('request-end'));request.once('aborted',()=>emit('request-aborted'));response.once('finish',()=>emit('finish'));response.once('close',()=>emit('close'));
 };
 subscribe('http.server.request.start',observe);return()=>unsubscribe('http.server.request.start',observe);
}
if(process.env.NEVORA_OWNED_CREATION_ORIGIN){
 if(process.env.NODE_ENV!=='development'||!/^[a-f0-9]{32}$/.test(process.env.NEVORA_OWNED_PROCESS_OWNER??'')||!process.env.NEVORA_OWNED_APP_DATABASE)throw Error('Creation diagnostics require a marked owned application');
 installOwnedCreationDiagnostics({origin:process.env.NEVORA_OWNED_CREATION_ORIGIN,publish:entry=>console.log(CREATION_TRACE_PREFIX+JSON.stringify(entry))});
}
