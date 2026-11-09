import { describe, expect, it } from 'vitest';
import { DEFAULT_NOTIFICATION_POLICY as policy, nextRoutineTime, planReminder, retryDecision } from './policy';
import type { NotificationIntent } from './types';
const intent: NotificationIntent = {id:'12345678-1234-4234-8234-123456789abc',employeeId:'a',type:'AVAILABILITY_REMINDER',title:'Fuel',body:'Open Fuel',eventKey:'event',environment:'test',source:{kind:'AVAILABILITY',id:'week',version:'v1'},effectiveVersion:'v1',purpose:'REMINDER',urgency:'normal',dueAt:'2026-10-05T12:00:00Z',expiresAt:'2026-10-06T12:00:00Z'};
describe('notification timing',()=>{
  it.each([
    ['2026-10-05T00:59:00Z','2026-10-05T00:59:00.000Z'],
    ['2026-10-05T01:00:00Z','2026-10-05T11:00:00.000Z'],
    ['2026-10-05T10:59:00Z','2026-10-05T11:00:00.000Z'],
    ['2026-10-05T11:00:00Z','2026-10-05T11:00:00.000Z'],
    ['2026-10-05T03:59:00Z','2026-10-05T11:00:00.000Z'],
    ['2026-10-05T04:00:00Z','2026-10-05T11:00:00.000Z'],
  ])('Puerto Rico quiet/week boundary %s',(input,want)=>expect(nextRoutineTime(new Date(input),policy).toISOString()).toBe(want));
  it('plans one availability reminder exactly deadline minus 24h and never catches up after closure',()=>{
    expect(planReminder({intent,now:new Date('2026-10-04T12:00:00Z'),resolved:false,policy})).toMatchObject({dueAt:'2026-10-05T12:00:00.000Z',eventKey:'test:AVAILABILITY:week:v1:a:REMINDER:2026-10-05'});
    expect(planReminder({intent,now:new Date('2026-10-06T11:30:00Z'),resolved:false,policy})?.dueAt).toBe('2026-10-06T11:30:00.000Z');
    expect(planReminder({intent,now:new Date(intent.expiresAt),resolved:false,policy})).toBeNull();
    expect(planReminder({intent,now:new Date('2026-10-04T12:00:00Z'),resolved:true,policy})).toBeNull();
  });
  it('expires a quiet-hours deferral past the deadline',()=>expect(planReminder({intent:{...intent,expiresAt:'2026-10-05T10:00:00Z'},now:new Date('2026-10-05T02:00:00Z'),resolved:false,policy})).toBeNull());
  it('does not move an acknowledgement follow-up before 24h for a near shift',()=>expect(planReminder({intent:{...intent,type:'SCHEDULE_PUBLISHED',source:{kind:'SCHEDULE',id:'week',version:'v1'},purpose:'EVENT',dueAt:'2026-10-05T12:00:00Z',expiresAt:'2026-10-06T11:00:00Z'},now:new Date('2026-10-05T12:00:00Z'),resolved:false,policy})).toBeNull());
  it.each([1,2,3,4])('bounded retry delay for attempt %i',attempt=>{
    const decision=retryDecision({attempt,now:new Date('2026-10-05T12:00:00Z'),expiresAt:new Date('2026-10-06T12:00:00Z'),result:{kind:'retry',errorClass:'timeout'},deliveryId:'delivery',policy});
    const minutes=[1,5,15,60][attempt-1];
    expect(decision.retryAt?.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-10-05T12:00:00Z')+minutes*60000);
    expect(decision.retryAt?.getTime()).toBeLessThanOrEqual(Date.parse('2026-10-05T12:00:00Z')+minutes*60000+15000);
  });
  it('bounds attempt count, Retry-After and expiry',()=>{
    const base={attempt:5,now:new Date('2026-10-05T12:00:00Z'),expiresAt:new Date('2026-10-05T12:00:30Z'),result:{kind:'retry' as const,errorClass:'busy',retryAfterSeconds:1e9},deliveryId:'d',policy};
    expect(retryDecision(base)).toEqual({terminal:'failed'});
    expect(retryDecision({...base,attempt:1})).toEqual({terminal:'expired'});
    expect(retryDecision({...base,result:{kind:'accepted'}})).toEqual({});
    expect(retryDecision({...base,attempt:1,result:{kind:'invalid_subscription'}})).toEqual({terminal:'failed'});
  });
});

describe('persisted policy decisions',()=>{
  it('preserves an existing acknowledgement reminder identity across a later materialization day',()=>{
    const original={...intent,source:{kind:'SCHEDULE' as const,id:'week',version:'v2'},effectiveVersion:'v1',type:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',dueAt:'2026-10-06T12:00:00Z',expiresAt:'2026-10-09T12:00:00Z',eventKey:'test:SCHEDULE:week:v1:a:REMINDER:2026-10-05'};
    expect(planReminder({intent:original,now:new Date('2026-10-07T12:00:00Z'),resolved:false,policy})?.eventKey).toBe('test:SCHEDULE:week:v1:a:REMINDER:2026-10-05');
  });
  it('assigns a distinct durable id when deriving a reminder from an event',()=>{
    const event={...intent,purpose:'EVENT' as const};
    const reminder=planReminder({intent:event,now:new Date('2026-10-04T12:00:00Z'),resolved:false,policy});
    expect(reminder?.id).not.toBe(event.id);
  });
  it('honors finite Retry-After with bounded deterministic jitter',()=>{
    const input={attempt:1,now:new Date('2026-10-05T12:00:00Z'),expiresAt:new Date('2026-10-06T12:00:00Z'),result:{kind:'retry' as const,errorClass:'busy',retryAfterSeconds:300},deliveryId:'delivery',policy};
    const result=retryDecision(input);
    expect(result.retryAt?.getTime()).toBeGreaterThanOrEqual(Date.parse('2026-10-05T12:05:00Z'));
    expect(result.retryAt?.getTime()).toBeLessThanOrEqual(Date.parse('2026-10-05T12:05:15Z'));
    expect(retryDecision(input)).toEqual(result);
  });
});

it.each([
  ['America/Puerto_Rico','2026-10-04T01:00Z','2026-10-04T11:00:00.000Z'],
  ['America/New_York','2026-03-08T03:00Z','2026-03-08T11:00:00.000Z'],
  ['America/New_York','2026-11-01T02:00Z','2026-11-01T12:00:00.000Z'],
  ['Asia/Tokyo','2026-10-03T14:00Z','2026-10-03T22:00:00.000Z'],
])('quiet hours cross a DST boundary in workspace time: %s %s',(timeZone,now,expected)=>{
  expect(nextRoutineTime(new Date(now),{...policy,timeZone}).toISOString()).toBe(expected);
});
it('reminder budget identity uses the configured local day',()=>{
  const result=planReminder({intent:{...intent,expiresAt:'2026-10-05T22:00:00Z'},now:new Date('2026-10-04T21:00Z'),resolved:false,policy:{...policy,timeZone:'Asia/Tokyo'}});
  expect(result?.itemKeys?.[0]).toBe('test:AVAILABILITY:week:a:2026-10-05');
});
