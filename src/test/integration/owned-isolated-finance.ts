import {createServer,request,type IncomingHttpHeaders} from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import type {Socket} from 'node:net';

export type OwnedFinanceBridge={origin:string;upstream:string;capability:string};
const MAX=262144,MAX_OFFSET=45*86400000;
export function financeBridgeEnvironment(options?:OwnedFinanceBridge):Record<string,string>{
 if(!options)return {};
 const origin=new URL(options.origin),target=new URL(options.upstream);
 if(origin.origin!==options.origin||origin.protocol!=='https:'||origin.hostname!=='billing.step4.example.invalid'||origin.port||target.origin!==options.upstream||target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port||!/^[a-f0-9]{64}$/.test(options.capability))throw Error('Unowned finance bridge');
 return {NEVORA_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_API_ORIGIN:options.origin,NEVORA_OWNED_FINANCE_BRIDGE:JSON.stringify(options)};
}
/** Native HTTP transport only; the real commerce response is preserved. */
export async function ownedHttpRequest(upstream:string,path:string,canonicalOrigin:string,init:RequestInit={}):Promise<Response>{
 const target=new URL(upstream),origin=new URL(canonicalOrigin);
 if(target.origin!==upstream||target.protocol!=='http:'||target.hostname!=='127.0.0.1'||!target.port||origin.origin!==canonicalOrigin||origin.protocol!=='https:'||!origin.hostname.endsWith('.example.invalid')||!path.startsWith('/')||path.startsWith('//')||init.body!==undefined&&typeof init.body!=='string'||typeof init.body==='string'&&Buffer.byteLength(init.body)>MAX)throw Error('Unowned financial HTTP target');
 init.signal?.throwIfAborted();
 return new Promise((ok,bad)=>{
  const headers=Object.fromEntries(new Headers(init.headers));headers.host=origin.host;headers['x-forwarded-host']=origin.host;headers['x-forwarded-proto']='https';
  const pending=request(upstream+path,{method:init.method??'GET',headers,agent:false,signal:AbortSignal.any([AbortSignal.timeout(5000),...(init.signal?[init.signal]:[])])},response=>{
   const parts:Buffer[]=[];let length=0;response.on('data',(part:Buffer)=>{length+=part.length;if(length>MAX){response.destroy(Error('Owned HTTP response exceeded bound'));return;}parts.push(part);});
   response.once('error',bad);response.once('end',()=>{const copied=new Headers();for(const [name,value] of Object.entries(response.headers))if(value!==undefined&&!['connection','transfer-encoding','content-length'].includes(name))for(const v of Array.isArray(value)?value:[value])copied.append(name,v);ok(new Response([204,205,304].includes(response.statusCode??0)?null:Buffer.concat(parts),{status:response.statusCode??502,headers:copied}));});
  });pending.once('error',bad);pending.end(init.body??undefined);
 });
}
/** Test-only server. It delegates every financial decision to createCommerce;
 * no client-facing operational, payment or entitlement JSON is fabricated. */
export async function startOwnedFinanceBridge(handle:(request:Request)=>Promise<Response>){
 if(process.env.NODE_ENV!=='test')throw Error('Owned financial test environment required');
 const capability=randomBytes(32).toString('hex'),origin='https://billing.step4.example.invalid',offsets=new Map<string,number>(),sockets=new Set<Socket>();
 const authorized=(headers:IncomingHttpHeaders)=>{const value=headers['x-owned-finance-capability'];return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)&&timingSafeEqual(Buffer.from(value),Buffer.from(capability));};
 const server=createServer(async(req,res)=>{
  if(req.headers.host!==new URL(origin).host||!authorized(req.headers)){res.writeHead(403).end();return;}
  try{
   const url=new URL(req.url??'/',origin);
   if(url.pathname==='/__owned/clock'){
    const company=url.searchParams.get('origin')??'';if(req.method!=='GET'||!offsets.has(company)){res.writeHead(403).end();return;}
    res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({origin:company,offsetMs:offsets.get(company)}));return;
   }
   if(!['/internal/access','/internal/handoff','/v1/status','/v1/checkout','/v1/portal','/v1/plan-change','/webhooks/stripe'].includes(url.pathname)){res.writeHead(403).end();return;}
   const parts:Buffer[]=[];let length=0;for await(const part of req){length+=part.length;if(length>MAX)throw Error('Owned body exceeded bound');parts.push(Buffer.from(part));}
   const headers=new Headers();for(const [name,value] of Object.entries(req.headers))if(value!==undefined&&name!=='x-owned-finance-capability')for(const v of Array.isArray(value)?value:[value])headers.append(name,v);
   const result=await handle(new Request(url,{method:req.method,headers,...(parts.length?{body:Buffer.concat(parts)}:{})}));
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(Buffer.from(await result.arrayBuffer()));
  }catch{if(!res.headersSent)res.writeHead(503);res.end();}
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 await new Promise<void>((ok,bad)=>{server.once('error',bad);server.listen(0,'127.0.0.1',ok);});const address=server.address();if(!address||typeof address==='string')throw Error('Owned financial bind failed');
 const bridge={origin,upstream:'http://127.0.0.1:'+address.port,capability};financeBridgeEnvironment(bridge);
 return {bridge,register(company:string){const u=new URL(company);if(u.origin!==company||u.protocol!=='https:'||!u.hostname.endsWith('.portal.example.invalid')||offsets.has(company))throw Error('Invalid owned financial company');offsets.set(company,0);},advance(company:string,offsetMs:number){if(!offsets.has(company)||!Number.isSafeInteger(offsetMs)||offsetMs<(offsets.get(company)??0)||offsetMs>MAX_OFFSET)throw Error('Invalid owned financial clock');offsets.set(company,offsetMs);},offset(company:string){const value=offsets.get(company);if(value===undefined)throw Error('Unknown owned financial company');return value;},async close(){for(const socket of sockets)socket.destroy();await new Promise<void>((ok,bad)=>server.close(error=>error?bad(error):ok()));}};
}
export function installOwnedFinancialFetch(bridge:OwnedFinanceBridge){
 financeBridgeEnvironment(bridge);const original=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);
  if(url.origin!==bridge.origin)return original(input,init);
  const base=input instanceof Request?{method:input.method,headers:input.headers,signal:input.signal}:{};
  if(input instanceof Request&&input.body)throw Error('Explicit owned finance body required');
  const options={...base,...init},headers=new Headers(options.headers);headers.set('x-owned-finance-capability',bridge.capability);
  return ownedHttpRequest(bridge.upstream,url.pathname+url.search,bridge.origin,{...options,headers});
 };
 return ()=>{globalThis.fetch=original;};
}
/** Date.now alone is controlled for application/commerce billing boundaries.
 * PostgreSQL and the host clock stay real; this never claims SQL wall-clock
 * expiry proof. The separate real-SQL boundary/race suite supplies that proof. */
export async function readOwnedFinancialClock(bridge:OwnedFinanceBridge,company:string){
 financeBridgeEnvironment(bridge);
 const response=await ownedHttpRequest(bridge.upstream,'/__owned/clock?origin='+encodeURIComponent(company),bridge.origin,{headers:{'x-owned-finance-capability':bridge.capability}});
 if(!response.ok)throw Error('Owned financial clock unavailable');const value=await response.json();
 if(value.origin!==company||!Number.isSafeInteger(value.offsetMs)||value.offsetMs<0||value.offsetMs>MAX_OFFSET)throw Error('Invalid owned financial clock response');return value.offsetMs as number;
}
/** One child runtime's application clock; the host and PostgreSQL stay real. */
export function createOwnedFinancialClock(bridge:OwnedFinanceBridge,company:string){
 const realNow=Date.now;let offsetMs=0;
 return {now:()=>realNow()+offsetMs,async refresh(){const observed=await readOwnedFinancialClock(bridge,company);offsetMs=Math.max(offsetMs,observed);}};
}
