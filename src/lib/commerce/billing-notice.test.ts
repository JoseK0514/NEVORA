import {expect,it} from 'vitest';
import {billingNotice} from './billing-notice';
import type {CommerceStatus} from './status';
const now=Date.parse('2030-01-01T00:00:00Z'),day=86400000;
const status={state:'trial',trialEndsAt:new Date(now+7*day).toISOString(),reason:null} as CommerceStatus;
it('provides distinct stable seven-day and one-day Owner warnings without asserting a payment',()=>{const week=billingNotice(status,now),last=billingNotice(status,now+6*day);expect(week).toMatchObject({kind:'TRIAL_ENDING',daysRemaining:7,href:'/app/billing'});expect(last?.id).not.toBe(week?.id);expect(last?.daysRemaining).toBe(1);expect(billingNotice(status,now-day)).toBeNull();});
it('keeps grace and restricted payment failure visible, and clears the warning after paid access',()=>{expect(billingNotice({...status,state:'grace',reason:'payment_failed',graceEndsAt:new Date(now+2*day).toISOString()},now)).toMatchObject({kind:'PAYMENT_FAILED',daysRemaining:2});expect(billingNotice({...status,state:'paid',reason:null},now)).toBeNull();});
