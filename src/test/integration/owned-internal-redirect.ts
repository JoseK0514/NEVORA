import {request} from 'node:http';
import {Readable} from 'node:stream';
type InternalInit=RequestInit&{next?:{internal?:unknown}};
/** Native Next internal GETs only. Node24 fetch omits Host overrides, so the
 * reserved canonical identity uses the same real HTTP transport as the owned
 * browser proxy. No application response, session or authority is fabricated. */
export function createOwnedInternalRedirectFetch(upstream:string,origin:string,original:typeof fetch=fetch):typeof fetch{
 const socket=new URL(upstream),canonical=new URL(origin);
 if(!['test','development'].includes(process.env.NODE_ENV??'')||socket.origin!==upstream||socket.protocol!=='http:'||socket.hostname!=='127.0.0.1'||!socket.port||socket.username||socket.password||canonical.origin!==origin||canonical.protocol!=='https:'||!canonical.hostname.endsWith('.example.invalid')||canonical.port||canonical.username||canonical.password)throw Error('Owned internal redirect identity required');
 return async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url),marker=(init as InternalInit|undefined)?.next?.internal,base=input instanceof Request?input:null,method=(init?.method??base?.method??'GET').toUpperCase();
  if(url.origin!==upstream||![1,true].includes(marker as number|boolean)||method!=='GET')return original(input,init);
  if(url.username||url.password)throw Error('Owned internal redirect identity required');
  const headers=new Headers(init?.headers??base?.headers);headers.set('host',canonical.host);headers.set('x-forwarded-host',canonical.host);headers.set('x-forwarded-proto','https');headers.set('accept-encoding','identity');
  const signal=init?.signal===undefined?base?.signal:init.signal??undefined,redirect=init?.redirect??base?.redirect??'follow';
  async function get(path:string,remaining=20):Promise<Response>{
   signal?.throwIfAborted();
   return new Promise<Response>((resolve,reject)=>{
    const pending=request(upstream+path,{method:'GET',headers:Object.fromEntries(headers),agent:false,signal},response=>{
     response.once('error',reject);response.once('close',()=>pending.destroy());
     const status=response.statusCode??502,location=response.headers.location;
     if([301,302,303,307,308].includes(status)&&location&&redirect!=='manual'){
      response.resume();if(redirect==='error'){reject(Error('Owned internal redirect refused'));return;}
      let destination:URL;try{destination=new URL(location,origin+path);}catch{reject(Error('Owned internal redirect left its scope'));return;}
      if(remaining<=0||![origin,upstream].includes(destination.origin)||destination.username||destination.password){reject(Error('Owned internal redirect left its scope'));return;}
      void get(destination.pathname+destination.search,remaining-1).then(resolve,reject);return;
     }
     const copied=new Headers();for(const [name,value]of Object.entries(response.headers))if(value!==undefined&&!['connection','transfer-encoding','content-length'].includes(name))for(const v of Array.isArray(value)?value:[value])copied.append(name,v);
     if([204,205,304].includes(status)){response.resume();resolve(new Response(null,{status,headers:copied}));return;}
     resolve(new Response(Readable.toWeb(response) as ReadableStream<Uint8Array>,{status,headers:copied}));
    });pending.once('error',reject);pending.end();
   });
  }
  return get(url.pathname+url.search);
 };
}
