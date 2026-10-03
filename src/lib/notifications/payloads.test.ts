import { describe,expect,it } from 'vitest';
import { buildPushEnvelope } from './payloads';
import type { NotificationIntent } from './types';
const intent:NotificationIntent={id:'abcdefab-abcd-4bcd-8bcd-abcdefabcdef',employeeId:'Medical Name',type:'SCHEDULE_CHANGED',title:'PIN 1234',body:'Medical Name medical note earnings $500',actionHref:'https://evil.test',eventKey:'private-key',environment:'test',source:{kind:'SCHEDULE',id:'week',version:'v1'},effectiveVersion:'v1',purpose:'EVENT',urgency:'normal',dueAt:'2026-10-05T12:00:00Z',expiresAt:'2026-10-06T12:00:00Z'};
describe('privacy-safe push envelopes',()=>{
  it('projects approved generic copy without private event fields or redirects',()=>{
    const envelope=buildPushEnvelope(intent,'generation');
    expect(envelope).toMatchObject({title:'Your Fuel Schedule Changed',body:'Open Fuel to review your schedule.',kind:'SCHEDULE_CHANGED',ownershipGeneration:'generation'});
    const serialized=JSON.stringify(envelope);
    for(const secret of ['Medical Name','medical note','1234','$500','https://evil.test','private-key']) expect(serialized).not.toContain(secret);
    expect(envelope.notificationId).toMatch(/^[a-f0-9-]{36}$/);
    expect(buildPushEnvelope(intent,'generation').notificationId).toBe(envelope.notificationId);
    expect(buildPushEnvelope(intent,'generation').tag).toBe(envelope.tag);
  });
  it('rejects arbitrary kinds and malformed generations instead of reflecting them',()=>{
    expect(()=>buildPushEnvelope({...intent,type:'Medical Name'},'generation')).toThrow();
    expect(()=>buildPushEnvelope(intent,'../other')).toThrow();
  });
});
