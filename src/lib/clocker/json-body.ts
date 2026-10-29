/** Bounded reads also cancel stalled streams; no clock authority is resolved first. */
export async function readClockerJson(request:Request,maxBytes=2048,timeoutMs=12000):Promise<unknown>{
 const reader=request.body?.getReader();if(!reader)throw Error('Invalid body.');
 const decoder=new TextDecoder('utf-8',{fatal:true});let size=0,text='',expired=false;
 const cancel=()=>{expired=true;void reader.cancel().catch(()=>{});},timer=setTimeout(cancel,timeoutMs);
 request.signal.addEventListener('abort',cancel,{once:true});
 try{
  if(request.signal.aborted)cancel();
  while(true){const chunk=await reader.read();if(expired)throw Error('Body read expired.');if(chunk.done)break;size+=chunk.value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('Body is too large.');}text+=decoder.decode(chunk.value,{stream:true});}
  text+=decoder.decode();return JSON.parse(text);
 }finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);reader.releaseLock();}
}
