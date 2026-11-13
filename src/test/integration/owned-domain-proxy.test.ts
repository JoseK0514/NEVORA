import {it,expect} from 'vitest';
import {createServer,request} from 'node:http';
import {startOwnedDomainProxy} from './owned-domain-proxy';
it('forwards real bodies/cookies with fixed host mapping, preserves redirects and refuses foreign origins',async()=>{
 const seen:{url:string|undefined;host:string|undefined;origin:string|undefined;cookie:string|undefined;body:string}[]=[];
 const upstream=createServer((req,res)=>{let body='';req.setEncoding('utf8');req.on('data',chunk=>{body+=chunk;});req.on('end',()=>{seen.push({url:req.url,host:req.headers.host,origin:req.headers.origin,cookie:req.headers.cookie,body});res.writeHead(303,{location:'https://alpha.portal.example.invalid/app','set-cookie':'fictional_cookie=owned; Path=/; HttpOnly'});res.end('Original upstream body');});});
 await new Promise<void>(ok=>upstream.listen(0,'127.0.0.1',ok));const address=upstream.address();if(!address||typeof address==='string')throw Error('Owned test bind failed');
 const proxy=await startOwnedDomainProxy('http://127.0.0.1:'+address.port,{'http://alpha.step4.invalid':'https://alpha.portal.example.invalid'});
 const call=(destination:string,origin:string)=>new Promise<{status:number;location:string|undefined;cookie:string[]|undefined;body:string}>((ok,bad)=>{
  const p=new URL(proxy.server),req=request({hostname:p.hostname,port:p.port,path:destination,method:'POST',headers:{host:new URL(destination).host,origin,cookie:'fictional_cookie=owned'}},res=>{let body='';res.setEncoding('utf8');res.on('data',chunk=>{body+=chunk;});res.on('end',()=>ok({status:res.statusCode!,location:res.headers.location,cookie:res.headers['set-cookie'],body}));});req.on('error',bad);req.end('Original browser body');
 });
 try{
  expect(await call('http://alpha.step4.invalid/login','http://alpha.step4.invalid')).toEqual({status:303,location:'http://alpha.step4.invalid/app',cookie:['fictional_cookie=owned; Path=/; HttpOnly'],body:'Original upstream body'});
  expect(seen).toEqual([{url:'/login',host:'alpha.portal.example.invalid',origin:'https://alpha.portal.example.invalid',cookie:'fictional_cookie=owned',body:'Original browser body'}]);
  await call('http://alpha.step4.invalid/login','https://foreign.example.invalid');expect(seen.at(-1)?.origin).toBe('https://foreign.example.invalid');
  expect((await call('http://unapproved.step4.invalid/login','http://unapproved.step4.invalid')).status).toBe(403);expect(seen).toHaveLength(2);
 }finally{await proxy.close();await new Promise<void>((ok,bad)=>upstream.close(error=>error?bad(error):ok()));}
});
it.each(['https://provider.example.invalid','http://127.0.0.1:1/path'])('refuses a noncanonical upstream target: %s',async target=>{
 await expect(startOwnedDomainProxy(target,{'http://alpha.step4.invalid':'https://alpha.portal.example.invalid'})).rejects.toThrow('Unowned HTTP domain proxy');
});
it('carries the real owned Next development upgrade and refuses foreign socket targets',async()=>{
 const upstream=createServer(),sockets=new Set<import('node:net').Socket>();let upgrades=0;
 upstream.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 upstream.on('upgrade',(req,socket)=>{upgrades++;expect(req.headers.host).toBe('alpha.portal.example.invalid');expect(req.headers.origin).toBe('https://alpha.portal.example.invalid');socket.write('HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\noriginal-owned-stream');});
 await new Promise<void>(ok=>upstream.listen(0,'127.0.0.1',ok));const address=upstream.address();if(!address||typeof address==='string')throw Error('Owned bind failed');
 const proxy=await startOwnedDomainProxy('http://127.0.0.1:'+address.port,{'http://alpha.step4.invalid':'https://alpha.portal.example.invalid'});
 const call=(path:string)=>new Promise<string>((ok,bad)=>{const url=new URL(proxy.server),req=request({host:url.hostname,port:url.port,path,headers:{host:'alpha.step4.invalid',origin:'http://alpha.step4.invalid',connection:'Upgrade',upgrade:'websocket'}},res=>{res.resume();ok(String(res.statusCode));});req.on('error',bad);req.on('upgrade',(_res,socket,head)=>{if(head.length){socket.destroy();ok(head.toString());}else{socket.once('data',data=>{socket.destroy();ok(data.toString());});}socket.on('error',bad);});req.end();});
 try{expect(await call('http://alpha.step4.invalid/_next/hmr?id=owned')).toBe('original-owned-stream');expect(await call('http://alpha.step4.invalid/foreign-socket')).toBe('403');expect(upgrades).toBe(1);}
 finally{await proxy.close();for(const socket of sockets)socket.destroy();await new Promise<void>((ok,bad)=>upstream.close(error=>error?bad(error):ok()));}
});
