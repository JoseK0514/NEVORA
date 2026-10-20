import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import config from '../../../../next.config';
it('activation shell and claim responses carry private no-referrer and same-origin-only browser policy',async()=>{
 const rules=await config.headers?.();
 for(const source of ['/activate','/api/auth/activate']){
  const headers=Object.fromEntries((rules?.find(r=>r.source===source)?.headers??[]).map(h=>[h.key.toLowerCase(),h.value]));
  expect(headers['cache-control']).toContain('no-store');expect(headers['referrer-policy']).toBe('no-referrer');expect(headers['x-content-type-options']).toBe('nosniff');expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain("connect-src 'self'");
  expect(headers['content-security-policy']).toContain("form-action 'self'");
 }
 expect(config.logging&&typeof config.logging==='object'&&config.logging.incomingRequests&&typeof config.logging.incomingRequests==='object'&&config.logging.incomingRequests.ignore?.some(pattern=>pattern.test('/activate?proof=synthetic-query-must-not-log'))).toBe(true);
});
it('the actual portal service worker declines activation page and API navigation before any cache access',async()=>{
 const listeners:Record<string,(event:unknown)=>void>={};
 vm.runInNewContext(await readFile('public/fuel-portal-sw.js','utf8'),{URL,self:{location:{origin:'https://owned.invalid'},addEventListener:(type:string,listener:(event:unknown)=>void)=>{listeners[type]=listener;}}});
 let handled=0;
 for(const path of ['/activate','/api/auth/activate']){
  listeners.fetch({request:{url:'https://owned.invalid'+path,method:'GET',mode:'navigate',headers:new Headers()},respondWith:()=>{handled++;}});
 }
 expect(handled).toBe(0);
});
