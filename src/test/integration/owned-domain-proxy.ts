import {createServer,request} from 'node:http';
import type {Socket} from 'node:net';
/** Owned HTTP domain adapter. Browser redirects/cookies remain native; no API
 * response body, credential or session is manufactured by the proxy. */
export async function startOwnedDomainProxy(upstream:string,mappings:Readonly<Record<string,string>>){
 const target=new URL(upstream);
 if(process.env.NODE_ENV!=='test'||target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port||target.origin!==upstream||Object.keys(mappings).length<1||Object.keys(mappings).length>2)throw Error('Unowned HTTP domain proxy');
 for(const [front,back] of Object.entries(mappings)){
  const f=new URL(front),b=new URL(back);
  if(f.origin!==front||f.protocol!=='http:'||!f.hostname.endsWith('.step4.invalid')||f.port||b.origin!==back||b.protocol!=='https:'||!b.hostname.endsWith('.example.invalid')||b.port)throw Error('Unowned HTTP domain mapping');
 }
 const sockets=new Set<Socket>();
 const server=createServer((incoming,outgoing)=>{
  let front:URL;try{front=new URL(incoming.url??'/',`http://${incoming.headers.host}`);}catch{outgoing.writeHead(400).end();return;}
  const canonical=mappings[front.origin];if(!canonical){outgoing.writeHead(403).end();return;}
  const headers={...incoming.headers,host:new URL(canonical).host,'x-forwarded-host':new URL(canonical).host,'x-forwarded-proto':'https'};
  if(headers.origin===front.origin)headers.origin=canonical;
  if(headers.referer?.startsWith(front.origin+'/'))headers.referer=canonical+headers.referer.slice(front.origin.length);
  const redirect=(value:string)=>{
   if(value.startsWith('/'))return value;
   try{const u=new URL(value);for(const [browser,app] of Object.entries(mappings))if(u.origin===app)return browser+u.pathname+u.search+u.hash;if(u.origin===upstream)return front.origin+u.pathname+u.search+u.hash;}catch{/* Preserve malformed destinations for real browser refusal. */}
   return value;
  };
  const pending=request(upstream,{path:canonical+front.pathname+front.search,method:incoming.method,headers,agent:false},response=>{
   const result={...response.headers};
   if(typeof result.location==='string')result.location=redirect(result.location);
   const action=result['x-action-redirect'];if(typeof action==='string'){const parts=action.split(';');parts[0]=redirect(parts[0]);result['x-action-redirect']=parts.join(';');}
   outgoing.writeHead(response.statusCode??502,result);response.pipe(outgoing);
  });
  pending.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});pending.setTimeout(30000,()=>pending.destroy());
  outgoing.once('close',()=>pending.destroy());incoming.pipe(pending);
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 // No CONNECT/DNS/provider escape. All approved browser origins are plain HTTP
 // reserved domains carried to the existing loopback Next runtime.
 server.on('connect',(_request,socket)=>socket.destroy());
 await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned domain proxy unavailable');
 return {server:`http://127.0.0.1:${address.port}`,async close(){for(const socket of sockets)socket.destroy();await new Promise<void>((ok,bad)=>server.close(error=>error?bad(error):ok()));}};
}
