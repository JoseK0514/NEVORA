import {PHOTO_MAX_BYTES,type PhotoReference} from '../photo-server/contracts';

/** Authenticated bytes only. No image URL, browser persistence or image logging. */
export async function fetchPrivatePunchPhoto(locationKey:string,reference:PhotoReference,signal:AbortSignal,fetcher:typeof fetch=fetch):Promise<Blob>{
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey)||locationKey.length>64||locationKey.endsWith('\n')||
  !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(reference.deviceId)||reference.deviceId.endsWith('\n')||
  !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(reference.commandId)||reference.commandId.endsWith('\n'))throw Error('The photo reference could not be verified.');
 const controller=new AbortController();const cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
 const timeout=setTimeout(cancel,10000);let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
 let stopped!:()=>void;
 const aborted=new Promise<never>((_,reject)=>{stopped=()=>reject(Error('Photo review was interrupted.'));controller.signal.addEventListener('abort',stopped,{once:true});if(controller.signal.aborted)stopped();});
 try{
  const response=await Promise.race([fetcher(`/api/clocker/${locationKey}/photos/${reference.commandId}`,{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,
   headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1','X-Nevora-Photo-Command':reference.commandId},body:JSON.stringify({operation:'photo',reference})}),aborted]);
  if(!response.ok||response.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='image/jpeg'||!response.headers.get('cache-control')?.split(',').some(value=>value.trim().toLowerCase()==='no-store'))throw Error('This photo is not available for review.');
  const declared=response.headers.get('content-length');if(declared!==null&&(!/^\d+$/.test(declared)||Number(declared)>PHOTO_MAX_BYTES))throw Error('The photo could not be verified.');
  reader=response.body?.getReader();if(!reader)throw Error('The photo could not be verified.');
  const parts:Uint8Array[]=[];let count=0;
  while(true){const next=await Promise.race([reader.read(),aborted]);if(next.done)break;count+=next.value.byteLength;if(count>PHOTO_MAX_BYTES)throw Error('The photo could not be verified.');parts.push(next.value);}
  const bytes=new Uint8Array(count);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
  if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes.at(-2)!==255||bytes.at(-1)!==217)throw Error('The photo could not be verified.');
  return new Blob([bytes],{type:'image/jpeg'});
 }catch(error){controller.abort();await reader?.cancel().catch(()=>{});throw error;}
 finally{reader?.releaseLock();clearTimeout(timeout);signal.removeEventListener('abort',cancel);controller.signal.removeEventListener('abort',stopped);}
}
