export const OWNED_REPLAY_KEY='fictional-owned-replay-no-provider-access';
export const OWNED_REPLAY_MODEL='fictional-owned-replay-only';
const loopback=(host:string)=>['localhost','127.0.0.1','[::1]'].includes(host);
/** Owned QA only: one explicit loopback runtime, no provider transport or redirect escape. */
export function createOwnedReplayFetch(fetchImpl:typeof fetch,origin:string,onDeny?:()=>void):typeof fetch{
 let owned:URL;try{owned=new URL(origin);}catch{throw Error('Owned replay origin required');}
 if(owned.origin!==origin||owned.protocol!=='http:'||!loopback(owned.hostname)||!owned.port||owned.username||owned.password||owned.pathname!=='/'||owned.search||owned.hash)throw Error('Owned replay origin required');
 return async(input,init)=>{
  let url:URL|undefined;try{url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url);}catch{}
  if(!url||url.protocol!=='http:'||!loopback(url.hostname)||url.port!==owned.port||url.username||url.password){try{onDeny?.();}catch{}throw Error('Owned replay external fetch denied');}
  return fetchImpl(input,{...init,redirect:'error'});
 };
}
