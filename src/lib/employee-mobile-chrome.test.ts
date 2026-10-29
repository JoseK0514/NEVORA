import {expect,it} from 'vitest';
import {employeeMobileChrome} from './employee-mobile-chrome';
import {mobileTabsForRole} from './navigation';
import type {PayrollCapabilities} from './payroll/contracts';
const pay:PayrollCapabilities={enabled:true,canConfigure:false,canReview:false,canApprove:false,internalCalculatorAvailable:false,bankCompatibility:'UNVERIFIED'};
const hours=mobileTabsForRole('EMPLOYEE'),paid=mobileTabsForRole('EMPLOYEE',pay);
const chrome=(path:string,query='',tabs=hours)=>employeeMobileChrome('EMPLOYEE',path,tabs,new URLSearchParams(query));
it.each(['/app','/app/schedule','/app/requests/hub','/app/my-time','/app/more'])('brands the actual root %s',path=>expect(chrome(path)).toBe('root'));
it.each(['/app/profile','/app/notifications','/app/updates','/app/availability','/app/requests','/app/exchange','/app/exchange/swap','/app/delete-account'])('uses contextual navigation at %s',path=>expect(chrome(path)).toBe('detail'));
it('follows the real Pay/Hours tab and preserves Hours sub-tabs and redirect context',()=>{
 expect(chrome('/app/my-pay','',paid)).toBe('root');expect(chrome('/app/my-time','',paid)).toBe('detail');expect(chrome('/app/timecards','',paid)).toBe('detail');expect(chrome('/app/timecards')).toBe('root');
 for(const query of ['view=cards','view=corrections','filter=decided','entry=%3Cinvalid%3E','requestId=not-a-uuid','edit='+('x'.repeat(501))])expect(chrome('/app/my-time',query)).toBe('root');
 for(const query of ['entry=own-entry','requestId=12345678-1234-4123-8123-123456789abc','edit=new','view=corrections&edit=entry%3Aown-entry'])expect(chrome('/app/my-time',query)).toBe('detail');
});
it('keeps Schedule sheets and Pay statement disclosures attached to their root',()=>{
 expect(chrome('/app/schedule','week=2026-10-26&day=2026-10-27&shift=own-shift&intent=swap')).toBe('root');expect(chrome('/app/my-pay','statement=12345678-1234-4123-8123-123456789abc',paid)).toBe('root');
});
it('retains Lead headers and does not classify management pages',()=>{
 for(const path of ['/app','/app/schedule','/app/my-time','/app/timecards','/app/my-pay','/app/requests/hub','/app/requests','/app/availability','/app/exchange','/app/exchange/swap'])expect(employeeMobileChrome('LEAD',path,paid,new URLSearchParams('entry=own-entry'))).toBe('root');
 for(const path of ['/app/more','/app/profile','/app/updates'])expect(employeeMobileChrome('LEAD',path,hours,null)).toBe('detail');
 for(const role of ['OWNER','MANAGER'] as const)expect(employeeMobileChrome(role,'/app',hours,null)).toBeUndefined();
});
