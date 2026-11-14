import {createServer,request,type IncomingMessage,type ServerResponse} from 'node:http';
import {connect} from 'node:net';
import type {Duplex} from 'node:stream';
/** Owned HTTP domain adapter. Browser redirects/cookies remain native; no API
 * response body, credential or session is manufactured by the proxy. */
export async function startOwnedDomainProxy(upstream:string,mappings:Readonly<Record<string,string>>){
 const target=new URL(upstream);
 if(process.env.NODE_ENV!=='test'||target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port||target.origin!==upstream||Object.keys(mappings).length<1||Object.keys(mappings).length>2)throw Error('Unowned HTTP domain proxy');
 for(const [front,back] of Object.entries(mappings)){
  const f=new URL(front),b=new URL(back);
  if(f.origin!==front||f.protocol!=='http:'||!['.step4.invalid','.step4.localhost'].some(suffix=>f.hostname.endsWith(suffix))||f.port||b.origin!==back||b.protocol!=='https:'||!b.hostname.endsWith('.example.invalid')||b.port)throw Error('Unowned HTTP domain mapping');
 }
 const sockets=new Set<Duplex>();
 const forward=(incoming:IncomingMessage,outgoing:ServerResponse)=>{
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
  const pending=request(upstream+front.pathname+front.search,{method:incoming.method,headers,agent:false},response=>{
   const result={...response.headers};
   if(typeof result.location==='string')result.location=redirect(result.location);
   const action=result['x-action-redirect'];if(typeof action==='string'){const parts=action.split(';');parts[0]=redirect(parts[0]);result['x-action-redirect']=parts.join(';');}
   outgoing.writeHead(response.statusCode??502,result);response.pipe(outgoing);
  });
  pending.on('error',()=>{if(!outgoing.headersSent)outgoing.writeHead(502);outgoing.end();});pending.setTimeout(30000,()=>pending.destroy());
  outgoing.once('close',()=>pending.destroy());incoming.pipe(pending);
 };
 const server=createServer(forward),tunnel=createServer(forward);
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 // New development chunks depend on Next's HMR handshake. Carry only its
 // real fixed-host upgrade; never synthesize a socket or permit another target.
 const upgrade=(incoming:IncomingMessage,socket:Duplex,head:Buffer)=>{
  let front:URL;try{front=new URL(incoming.url??'/',`http://${incoming.headers.host}`);}catch{socket.destroy();return;}
  // WebKit sends absolute ws:// targets through a plain HTTP proxy. It is
  // the same fixed HTTP origin; wss:// and foreign targets remain refused.
  if(front.protocol==='ws:')front.protocol='http:';
  const canonical=mappings[front.origin];
  if(!canonical||front.pathname!=='/_next/hmr'||incoming.headers.origin!==front.origin||incoming.headers.upgrade?.toLowerCase()!=='websocket'){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
  const pending=request(upstream+front.pathname+front.search,{method:'GET',agent:false,headers:{...incoming.headers,host:new URL(canonical).host,origin:canonical,'x-forwarded-host':new URL(canonical).host,'x-forwarded-proto':'https'}});
  pending.once('error',()=>socket.destroy());socket.once('close',()=>pending.destroy());
  pending.once('response',response=>{response.resume();socket.destroy();});
  pending.once('upgrade',(response,remote,remoteHead)=>{
   sockets.add(remote);remote.once('close',()=>sockets.delete(remote));
   const headers=Object.entries(response.headers).flatMap(([name,value])=>value===undefined?[]:(Array.isArray(value)?value:[value]).map(v=>name+': '+v));
   socket.write('HTTP/1.1 '+response.statusCode+' '+response.statusMessage+'\r\n'+headers.join('\r\n')+'\r\n\r\n');
   if(remoteHead.length)socket.write(remoteHead);if(head.length)remote.write(head);
   socket.on('error',()=>remote.destroy());remote.on('error',()=>socket.destroy());socket.once('close',()=>remote.destroy());remote.once('close',()=>socket.destroy());socket.pipe(remote).pipe(socket);
  });pending.end();
 };
 server.on('upgrade',upgrade);tunnel.on('upgrade',upgrade);
 tunnel.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 tunnel.on('connect',(_request,socket)=>socket.destroy());
 await new Promise<void>((ok,bad)=>{tunnel.once('error',bad);tunnel.listen(0,'127.0.0.1',ok);});
 const tunnelAddress=tunnel.address();if(!tunnelAddress||typeof tunnelAddress==='string')throw Error('Owned tunnel unavailable');
 // Chromium carries ws:// over HTTP CONNECT even for plain HTTP proxies.
 // Only known reserved port80 targets reach a second owned HTTP parser. That
 // parser applies the SAME host/path mapping and rejects nested CONNECT; it
 // never resolves or connects to the requested host.
 server.on('connect',(incoming,socket,head)=>{
  if(!Object.keys(mappings).some(front=>new URL(front).hostname+':80'===incoming.url)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
  const local=connect(tunnelAddress.port,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)local.write(head);socket.pipe(local).pipe(socket);});
  sockets.add(local);local.once('close',()=>{sockets.delete(local);socket.destroy();});socket.once('close',()=>local.destroy());local.once('error',()=>socket.destroy());socket.once('error',()=>local.destroy());
 });
 await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});
 const address=server.address();if(!address||typeof address==='string')throw Error('Owned domain proxy unavailable');
 return {server:`http://127.0.0.1:${address.port}`,async close(){for(const socket of sockets)socket.destroy();const closed=await Promise.allSettled([server,tunnel].map(current=>new Promise<void>((ok,bad)=>current.close(error=>error?bad(error):ok()))));const failures=closed.filter(item=>item.status==='rejected').map(item=>item.reason);if(failures.length)throw new AggregateError(failures,'Owned proxy close failed');}};
}
