import {afterEach,expect,it,vi} from 'vitest';
import {createServer} from 'node:http';
import {createOwnedInternalRedirectFetch} from './owned-internal-redirect';
const canonical='https://step4-alpha.portal.example.invalid';
// Next 16.4.2's native action handler uses this private extension (its source
// suppresses the public-type mismatch); keep it local to this owned fixture.
const internal:RequestInit&{next:NonNullable<RequestInit['next']>&{internal:number|boolean}}={method:'GET',headers:{host:new URL(canonical).host,'x-forwarded-host':new URL(canonical).host,'x-forwarded-proto':'https',cookie:'fictional=owned',rsc:'1'},next:{internal:1}};
async function fixture(){
 let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});const seen:{path:string;host:string|undefined;cookie:string|undefined;forwarded:string|string[]|undefined}[]=[];
 const server=createServer(async(req,res)=>{
  seen.push({path:req.url??'/',host:req.headers.host,cookie:req.headers.cookie,forwarded:req.headers['x-forwarded-host']});
  if(req.headers.host!==new URL(canonical).host||req.headers['x-forwarded-host']!==new URL(canonical).host||req.headers['x-forwarded-proto']!=='https'){res.writeHead(403).end('refused');return;}
  if(req.url==='/redirect'){res.writeHead(303,{location:'/login'}).end();return;}if(req.url==='/escape'){res.writeHead(303,{location:'https://foreign.invalid/private'}).end();return;}if(req.url==='/malformed'){res.writeHead(303,{location:'http://['}).end();return;}
  res.writeHead(200,{'content-type':'text/x-component','cache-control':'private, no-store'});res.flushHeaders();res.write('first');if(req.url==='/held')await held;res.end('last');
 });await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const address=server.address();if(!address||typeof address==='string')throw Error('Owned listener required');
 return {origin:'http://127.0.0.1:'+address.port,release,seen,async close(){release();server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}};
}
async function bounded<T>(promise:Promise<T>){let timer:ReturnType<typeof setTimeout>|undefined;try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Owned stream did not settle before release')),1500);})]);}finally{clearTimeout(timer);}}
afterEach(()=>vi.unstubAllEnvs());
it('carries canonical Host and unchanged cookie through real owned HTTP when native Node fetch omits Host',async()=>{
 const f=await fixture();try{const native=await fetch(f.origin+'/login',internal);expect(native.status).toBe(403);await native.text();const response=await createOwnedInternalRedirectFetch(f.origin,canonical)(f.origin+'/login',internal);expect(response.status).toBe(200);expect(response.headers.get('content-type')).toBe('text/x-component');expect(await response.text()).toBe('firstlast');expect(f.seen.at(-1)).toEqual({path:'/login',host:new URL(canonical).host,forwarded:new URL(canonical).host,cookie:'fictional=owned'});}finally{await f.close();}
});
it('streams a real RSC response before its final chunk is released',async()=>{
 const f=await fixture();try{const response=await bounded(createOwnedInternalRedirectFetch(f.origin,canonical)(f.origin+'/held',internal));expect(response.status).toBe(200);const reader=response.body!.getReader();expect(new TextDecoder().decode((await bounded(reader.read())).value)).toBe('first');f.release();expect(new TextDecoder().decode((await bounded(reader.read())).value)).toBe('last');expect((await bounded(reader.read())).done).toBe(true);}finally{await f.close();}
});
it('cancels an actual held response through the original caller signal',async()=>{
 const f=await fixture(),controller=new AbortController();try{const response=await bounded(createOwnedInternalRedirectFetch(f.origin,canonical)(new Request(f.origin+'/held',{headers:internal.headers,signal:controller.signal}),{next:{internal:1}} as RequestInit));expect(response.status).toBe(200);const reader=response.body!.getReader();await bounded(reader.read());controller.abort();await expect(bounded(reader.read())).rejects.toThrow();}finally{await f.close();}
});
it('leaves foreign, unmarked, unknown-marker and non-GET calls with their original transport',async()=>{
 const base=vi.fn<typeof fetch>(async()=>new Response(null,{status:204})),upstream='http://127.0.0.1:39981',run=createOwnedInternalRedirectFetch(upstream,canonical,base);
 for(const [input,init]of [['https://foreign.invalid/login',internal],[upstream+'/login',{}],[upstream+'/login',{...internal,next:{internal:false}}],[upstream+'/login',{...internal,method:'POST',body:'unchanged'}]] as const){expect((await run(input,init as RequestInit)).status).toBe(204);expect(base.mock.calls.at(-1)?.[0]).toBe(input);expect(base.mock.calls.at(-1)?.[1]).toBe(init);}
});
it.each(['https://127.0.0.1:39981','http://192.168.0.1:39981','http://127.0.0.1:39981/path','http://user:secret@127.0.0.1:39981'])('refuses an unowned internal socket %s',upstream=>expect(()=>createOwnedInternalRedirectFetch(upstream,canonical)).toThrow());
it('refuses production mode and unregistered canonical identities before creating any request',()=>{vi.stubEnv('NODE_ENV','production');expect(()=>createOwnedInternalRedirectFetch('http://127.0.0.1:39981',canonical)).toThrow();vi.stubEnv('NODE_ENV','test');expect(()=>createOwnedInternalRedirectFetch('http://127.0.0.1:39981','https://foreign.invalid')).toThrow();});

it('follows only actual in-scope redirects while preserving manual/error modes',async()=>{const f=await fixture();try{const run=createOwnedInternalRedirectFetch(f.origin,canonical);expect(await (await run(f.origin+'/redirect',internal)).text()).toBe('firstlast');const manual=await run(f.origin+'/redirect',{...internal,redirect:'manual'});expect(manual.status).toBe(303);expect(manual.headers.get('location')).toBe('/login');await manual.text();await expect(run(f.origin+'/redirect',{...internal,redirect:'error'})).rejects.toThrow('refused');}finally{await f.close();}});
it.each(['/escape','/malformed'])('rejects an out-of-scope or malformed redirect %s without another request',async path=>{const f=await fixture();try{const run=createOwnedInternalRedirectFetch(f.origin,canonical);await expect(run(f.origin+path,internal)).rejects.toThrow('left its scope');expect(f.seen).toHaveLength(1);}finally{await f.close();}});
