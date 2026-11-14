import {afterEach,expect,it,vi} from 'vitest';
import {commerceGate,resetCommerceAccessCache} from './access';
afterEach(()=>{vi.unstubAllEnvs();resetCommerceAccessCache();});
function enable(){
 vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');
 vi.stubEnv('NEVORA_COMMERCE_API_ORIGIN','https://billing.example.test');
 vi.stubEnv('NEVORA_COMMERCE_INSTALLATION_ID','fictional');
 vi.stubEnv('NEVORA_COMMERCE_INSTANCE_SECRET','a'.repeat(43));
}
const restricted=async()=>Response.json({state:'restricted',operational:false,validUntil:Date.now()+10000});
it.each(['restricted','unavailable'])('retains the exact tablet path through a %s pause',async state=>{
 enable();const path='/clocker/main-office';
 const response=await commerceGate(path,'GET',state==='restricted'?restricted:async()=>{throw Error('offline');},new Request('https://company.example.test'+path+'?untrusted=discard',{headers:{accept:'text/html'}}));
 expect(response?.status).toBe(303);
 const target=new URL(response!.headers.get('location')!);
 expect(target.origin).toBe('https://company.example.test');expect(target.pathname).toBe('/clocker/access/paused');
 expect(target.searchParams.get('from')).toBe(path);expect(target.searchParams.get('reason')).toBe(state==='restricted'?'subscription_required':'billing_status_unavailable');
 expect(target.searchParams.has('untrusted')).toBe(false);expect(response!.headers.get('cache-control')).toBe('no-store');
});
it('permits the paused page without reading billing and keeps writes and APIs gated',async()=>{
 enable();const never=async()=>{throw Error('must not fetch');};
 expect(await commerceGate('/clocker/access/paused','GET',never)).toBeNull();
 for(const [path,method] of [['/clocker/abcdefgh','POST'],['/api/clocker/abcdefgh/pin','POST']]){
  const response=await commerceGate(path,method,restricted,new Request('https://company.example.test'+path,{method,headers:{accept:'text/html'}}));
  expect(response?.status).toBe(402);expect(response!.headers.has('location')).toBe(false);
 }
});
it.each(['/clocker/Uppercase','/clocker/under_score','/clocker/two--hyphens','/clocker/abcdefgh/extra','/clocker/%2F%2Fevil.test','/clocker/'+ 'a'.repeat(65)])('does not turn an invalid tablet path into a return destination: %s',async path=>{
 enable();const response=await commerceGate(path,'GET',restricted,new Request('https://company.example.test'+path));
 expect(response?.status).toBe(402);expect(response!.headers.has('location')).toBe(false);
});
it.each(['2','110','short','paused','a'.repeat(64)])('preserves valid existing location key %s without colliding with recovery',async key=>{
 enable();const path='/clocker/'+key;
 const response=await commerceGate(path,'GET',restricted,new Request('https://company.example.test'+path));
 expect(response?.status).toBe(303);const target=new URL(response!.headers.get('location')!);
 expect(target.pathname).toBe('/clocker/access/paused');expect(target.searchParams.get('from')).toBe(path);
});
