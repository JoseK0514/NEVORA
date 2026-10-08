import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it,vi} from 'vitest';
it('actual public worker does not intercept or persist capability routes and private settings fetches',()=>{
 const handlers=new Map<string,(event:unknown)=>void>(),fetch=vi.fn(),respondWith=vi.fn(),put=vi.fn();
 runInNewContext(readFileSync('public/fuel-portal-sw.js','utf8'),{self:{location:{origin:'https://fixture.invalid'},addEventListener:(name:string,fn:(event:unknown)=>void)=>handlers.set(name,fn)},fetch,caches:{open:()=>({put})},URL,Request,Response,Headers,Date,Promise,Set,console});
 for(const path of ['/api/calendar/fictional-sentinel/schedule.ics','/api/employee/calendar-subscriptions','/api/manager/calendar-subscriptions/fictional/revoke'])handlers.get('fetch')?.({request:{url:'https://fixture.invalid'+path,method:'GET',mode:'navigate',headers:new Headers()},respondWith});
 expect(respondWith).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();expect(put).not.toHaveBeenCalled();
});
