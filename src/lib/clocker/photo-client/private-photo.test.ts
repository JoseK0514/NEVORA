import {expect,it,vi} from 'vitest';
import {fetchPrivatePunchPhoto} from './private-photo';

const reference={deviceId:'fictional-tablet',commandId:'90ef3e34-415b-4513-bb06-6017d35367e3'};
const bytes=new Uint8Array([255,216,255,224,0,2,255,217]);
const response=()=>new Response(bytes,{headers:{'content-type':'image/jpeg','cache-control':'no-store, private'}});
it('requests bounded private bytes with exact original metadata and same-origin security options',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>response());const controller=new AbortController();
 const blob=await fetchPrivatePunchPhoto('fictional-location',reference,controller.signal,fetcher);
 expect(blob.type).toBe('image/jpeg');expect(blob.size).toBe(bytes.length);
 const [path,options]=fetcher.mock.calls[0];expect(path).toBe('/api/clocker/fictional-location/photos/'+reference.commandId);
 expect(options).toMatchObject({method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error'});
 expect(options?.body).toBe(JSON.stringify({operation:'photo',reference}));
 expect(new Headers(options?.headers).get('x-nevora-photo-command')).toBe(reference.commandId);
});
it.each([
 ()=>new Response(bytes,{status:403}),
 ()=>new Response(bytes,{headers:{'content-type':'image/png','cache-control':'no-store, private'}}),
 ()=>new Response(bytes,{headers:{'content-type':'image/jpeg'}}),
 ()=>new Response(new Uint8Array(524289),{headers:{'content-type':'image/jpeg','cache-control':'no-store, private'}}),
 ()=>new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'image/jpeg','cache-control':'no-store, private'}}),
])('never previews rejected, cacheable, oversized or invalid image bytes: %j',async make=>{
 await expect(fetchPrivatePunchPhoto('fictional-location',reference,new AbortController().signal,async()=>make())).rejects.toThrow();
});
it('rejects arbitrary paths and references before any HTTP',async()=>{
 const fetcher=vi.fn<typeof fetch>();
 await expect(fetchPrivatePunchPhoto('../other',reference,new AbortController().signal,fetcher)).rejects.toThrow();
 await expect(fetchPrivatePunchPhoto('fictional-location',{...reference,commandId:'other'},new AbortController().signal,fetcher)).rejects.toThrow();
 expect(fetcher).not.toHaveBeenCalled();
});
it('stops a pending image read when the Owner leaves the review',async()=>{
 const abort=new AbortController();let cancelled=false;
 const pending=new ReadableStream<Uint8Array>({cancel(){cancelled=true;}});
 const reading=fetchPrivatePunchPhoto('fictional-location',reference,abort.signal,async()=>new Response(pending,{headers:{'content-type':'image/jpeg','cache-control':'no-store, private'}}));
 await Promise.resolve();abort.abort();await expect(reading).rejects.toThrow();expect(cancelled).toBe(true);
});
