import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {NextRequest} from 'next/server';
import {proxy} from './proxy';

beforeEach(()=>rs.stubEnv('NEVORA_COMMERCE_ENABLED','false'));
afterEach(()=>rs.unstubAllEnvs());

it.each(['GET','POST'])('P4-AUTH-01 replaces caller destinations with the actual vetted %s request',async method=>{
 const request=new NextRequest('https://actual.example/app/schedule?week=2030-01-07',{method,headers:{
  'x-nevora-auth-return-to':'/app/requests?tab=team',
  'x-forwarded-host':'spoof.example',referer:'https://spoof.example/app/requests?tab=my',
 }});
 const response=await proxy(request);
 expect(response?.headers.get('x-middleware-request-x-nevora-auth-return-to')).toBe('/app/schedule?week=2030-01-07');
 expect(response?.headers.get('x-middleware-override-headers')).toContain('x-nevora-auth-return-to');
});

it.each(['/app/requests?tab=my&next=//spoof.example','/app/requests?tab=my&tab=team','/app/settings?private=discard','/api/auth/recovery','/api/timecards','/clocker/2'])(
 'P4-AUTH-01 strips a forged return marker at %s',async path=>{
  const response=await proxy(new NextRequest('https://actual.example'+path,{headers:{'x-nevora-auth-return-to':'/app/requests?tab=team'}}));
  expect(response).toBeDefined();
  expect(response?.headers.has('x-middleware-request-x-nevora-auth-return-to')).toBe(false);
  expect(response?.headers.get('x-middleware-override-headers')??'').not.toContain('x-nevora-auth-return-to');
 });

it('P4-AUTH-01 strips the marker on isolated auth bypass routes too',async()=>{
 rs.stubEnv('NEVORA_COMMERCE_ENABLED','true');rs.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
 const response=await proxy(new NextRequest('https://actual.example/api/auth/recovery',{headers:{'x-nevora-auth-return-to':'/app/requests?tab=my'}}));
 expect(response).toBeDefined();
 expect(response?.headers.has('x-middleware-request-x-nevora-auth-return-to')).toBe(false);
});
