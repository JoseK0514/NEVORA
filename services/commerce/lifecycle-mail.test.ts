import {expect,it} from '@rstest/core';
import type {Business} from './store';
import {lifecycleMailCurrent,lifecycleMailCopy} from './lifecycle-mail';
const now=Date.parse('2030-01-01T00:00:00Z'),day=86400000;
const business=(days=7)=>({id:'owned',state:'ready',email:'owner@example.invalid',origin:'https://owned.invalid',trialStart:now-23*day,trialEnd:now+days*day,paidThrough:null,pastDueSince:null,subscriptionStatus:null} as Business);
it('separates the seven-day and one-day trial warnings and retires an old warning after payment',()=>{
 expect(lifecycleMailCurrent(business(),'trial_7d',now+7*day,now)).toBe(true);expect(lifecycleMailCurrent(business(1),'trial_1d',now+day,now)).toBe(true);
 expect(lifecycleMailCurrent(business(1),'trial_7d',now+day,now)).toBe(false);expect(lifecycleMailCurrent({...business(),paidThrough:now+30*day},'trial_7d',now+7*day,now)).toBe(false);
 expect(lifecycleMailCurrent(business(0),'trial_1d',now,now)).toBe(false);
});
it('binds failed renewal and ready messages to their current lifecycle anchor',()=>{
 const b={...business(-1),paidThrough:now-2*day,pastDueSince:now-day,subscriptionStatus:'past_due'};
 expect(lifecycleMailCurrent(b,'renewal_failed',now-day,now)).toBe(true);expect(lifecycleMailCurrent({...b,subscriptionStatus:'active',pastDueSince:null},'renewal_failed',now-day,now)).toBe(false);
 expect(lifecycleMailCurrent(b,'workplace_ready',b.trialStart!,now)).toBe(true);expect(lifecycleMailCurrent(b,'workplace_ready',now,now)).toBe(false);
});
it('uses public workplace entry links without a bearer or implied completed payment',()=>{
 const copy=lifecycleMailCopy(business(),'trial_7d',now+7*day);expect(copy.url).toBe('https://owned.invalid/app/billing');expect(copy.text).toContain('Trial ends');expect(copy.text).not.toMatch(/#|token=|paid successfully/i);
 expect(()=>lifecycleMailCopy({...business(),origin:'https://evil.invalid/path'},'workplace_ready',now)).toThrow();
});
