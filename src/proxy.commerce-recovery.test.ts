import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import type {NextRequest} from 'next/server';
import {proxy} from './proxy';
import {resetCommerceAccessCache} from './lib/commerce/access';

const fixture=vi.hoisted(()=>({bind:vi.fn()}));
vi.mock('./lib/commerce/isolated-connection.server',()=>({
  withCommerceRequest:fixture.bind,
  isolatedCommerceConnection:async()=>({origin:'https://billing.example.test',installationId:'fictional',secret:'a'.repeat(43)}),
}));
beforeEach(()=>{
  vi.stubEnv('NEVORA_COMMERCE_ENABLED','true');
  vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
  fixture.bind.mockReset().mockImplementation(async(_request,work)=>work());
});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();resetCommerceAccessCache();});
const request=(path:string,headers:Record<string,string>,method='GET')=>
  Object.assign(new Request('https://company.example.test'+path,{method,headers}),{
    nextUrl:new URL('https://company.example.test'+path),
  }) as NextRequest;
function authority(state:'restricted'|'unavailable'){
  const fetcher=vi.fn(async()=>{
    if(state==='unavailable')throw Error('Synthetic billing outage');
    return Response.json({state:'restricted',operational:false,validUntil:Date.now()+10000});
  });
  vi.stubGlobal('fetch',fetcher);return fetcher;
}
const documentHeaders:Record<string,string>[]=[{accept:'text/html'},{'sec-fetch-mode':'navigate'}];
const documents=['/app','/app/schedule','/app/notifications'].flatMap(path=>
  (['restricted','unavailable'] as const).flatMap(state=>
    documentHeaders.map(headers=>({path,state,headers}))));
it.each(documents)('redirects $state document $path to the signed-in recovery route',async({path,state,headers})=>{
  authority(state);
  const response=await proxy(request(path+'?private-query=must-not-forward',headers));
  expect(response?.status).toBe(303);
  const target=new URL(response!.headers.get('location')!);
  expect(target.origin).toBe('https://company.example.test');
  expect(target.pathname).toBe('/app/billing');
  expect([...target.searchParams.keys()]).toEqual(['reason']);
  expect(target.searchParams.get('reason')).toBe(state==='restricted'?'subscription_required':'billing_status_unavailable');
  expect(response!.headers.get('cache-control')).toBe('no-store');
  expect(response!.headers.get('referrer-policy')).toBe('no-referrer');
  expect(await response!.text()).toBe('');
});
const apiPaths=['/api/notifications','/app/api/push/status','/app/api/push/test'];
it.each(apiPaths.flatMap(path=>(['restricted','unavailable'] as const).map(state=>({path,state}))))(
  'retains JSON for $state API $path despite navigation-like headers',async({path,state})=>{
    authority(state);
    const response=await proxy(request(path,{accept:'text/html','sec-fetch-mode':'navigate'}));
    expect(response?.status).toBe(state==='restricted'?402:503);
    expect(response!.headers.has('location')).toBe(false);
    expect(await response!.json()).toEqual({error:{code:state==='restricted'?'subscription_required':'billing_status_unavailable'}});
  });
it.each(['restricted','unavailable'] as const)('keeps writes and explicit JSON/RSC reads gated when $state',async state=>{
  authority(state);
  for(const req of [
    request('/app/schedule',{accept:'text/html','sec-fetch-mode':'navigate'},'POST'),
    request('/app/schedule',{accept:'application/json'}),
    request('/app/schedule',{accept:'text/x-component','sec-fetch-mode':'cors'}),
  ]){
    const response=await proxy(req);
    expect(response?.status).toBe(state==='restricted'?402:503);
    expect(response!.headers.has('location')).toBe(false);
  }
});
it('keeps the exact recovery GET independent of commerce binding and avoids redirect loops',async()=>{
  const fetcher=authority('unavailable');
  fixture.bind.mockRejectedValue(new Error('Synthetic binding unavailable'));
  expect(await proxy(request('/app/billing?reason=billing_status_unavailable',{accept:'text/html'}))).toBeUndefined();
  expect(fixture.bind).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();
  const write=await proxy(request('/app/billing',{accept:'text/html'},'POST'));
  expect(write?.status).toBe(503);expect(write!.headers.has('location')).toBe(false);
});
it('redirects document binding failures as unavailable without exposing query data',async()=>{
  authority('restricted');
  fixture.bind.mockRejectedValue(new Error('Synthetic binding unavailable'));
  const response=await proxy(request('/app/settings?secret=discard',{'sec-fetch-mode':'navigate'}));
  expect(response?.status).toBe(303);
  const url=new URL(response!.headers.get('location')!);
  expect(url.pathname).toBe('/app/billing');expect(url.search).toBe('?reason=billing_status_unavailable');
});

const nonDocumentHeaders:Record<string,string>[]=[
 {accept:'application/json','sec-fetch-mode':'navigate'},
 {accept:'text/x-component','sec-fetch-mode':'navigate'},
 {accept:'application/json,text/html'},
 {accept:'application/problem+json,text/html'},
 {accept:'text/html;q=0'},
 {accept:'text/html;q=0','sec-fetch-mode':'navigate'},
 {accept:'text/html;q=0.000'},
 {accept:'text/html;q=invalid','sec-fetch-mode':'navigate'},
 {accept:'text/html;q=0;q=1'},
 {accept:'text/html','sec-fetch-mode':'cors',rsc:'1'},
];
it.each((['restricted','unavailable'] as const).flatMap(state=>nonDocumentHeaders.map(headers=>({state,headers}))))(
 'retains JSON denial for conflicting or refused document negotiation when $state: $headers',async({state,headers})=>{
  authority(state);
  const response=await proxy(request('/app/schedule?private=discard',headers));
  expect(response?.status).toBe(state==='restricted'?402:503);
  expect(response!.headers.has('location')).toBe(false);
  expect(await response!.json()).toEqual({error:{code:state==='restricted'?'subscription_required':'billing_status_unavailable'}});
 });
it.each(['text/html;q=0.7','TEXT/HTML; Q=0.8'])('retains recovery for accepted HTML quality: %s',async accept=>{
 authority('restricted');const response=await proxy(request('/app/schedule',{accept}));
 expect(response?.status).toBe(303);expect(new URL(response!.headers.get('location')!).pathname).toBe('/app/billing');
});
