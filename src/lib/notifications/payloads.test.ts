import { describe,expect,it } from 'vitest';
import { buildPushEnvelope, REQUEST_PUSH_KINDS } from './payloads';
import type { NotificationIntent } from './types';
const intent:NotificationIntent={id:'abcdefab-abcd-4bcd-8bcd-abcdefabcdef',employeeId:'Medical Name',type:'SCHEDULE_CHANGED',title:'PIN 1234',body:'Medical Name medical note earnings $500',actionHref:'https://evil.test',eventKey:'private-key',environment:'test',source:{kind:'SCHEDULE',id:'week',version:'v1'},effectiveVersion:'v1',purpose:'EVENT',urgency:'normal',dueAt:'2026-10-05T12:00:00Z',expiresAt:'2026-10-06T12:00:00Z'};
describe('privacy-safe push envelopes',()=>{
  it('projects approved generic copy without private event fields or redirects',()=>{
    const envelope=buildPushEnvelope(intent,'generation');
    expect(envelope).toMatchObject({title:'Your schedule changed',body:'Open NEVORA to see what changed.',kind:'SCHEDULE_CHANGED',ownershipGeneration:'generation'});
    const serialized=JSON.stringify(envelope);
    for(const secret of ['Medical Name','medical note','1234','$500','https://evil.test','private-key']) expect(serialized).not.toContain(secret);
    expect(envelope.notificationId).toMatch(/^[a-f0-9-]{36}$/);
    expect(buildPushEnvelope(intent,'generation').notificationId).toBe(envelope.notificationId);
    expect(buildPushEnvelope(intent,'generation').tag).toBe(envelope.tag);
  });
  it.each([
    ['SCHEDULE_PUBLISHED', 'Your schedule is ready', 'Open NEVORA to see it.'],
    ['SCHEDULE_ACKNOWLEDGEMENT_REMINDER', 'Your schedule is ready', 'Open NEVORA to see it.'],
    ['SCHEDULE_CHANGED', 'Your schedule changed', 'Open NEVORA to see what changed.'],
    ['COVERAGE_ATTENTION', 'A shift needs cover', 'Open NEVORA to find cover.'],
    ...REQUEST_PUSH_KINDS.map(kind => /^(TIME_OFF|CALLOUT|SWAP|COVERAGE)_/.test(kind)
      ? [kind, 'Your request has an update', 'Open NEVORA to see it.']
      : [kind, 'NEVORA Request Update', 'Open NEVORA to review your pending task.']),
  ])('uses NEVORA lock-screen copy for %s without changing opaque identity', (kind, title, body) => {
    const envelope = buildPushEnvelope({ ...intent, type: kind }, 'generation');
    expect(envelope).toEqual({
      notificationId: 'abcdefab-abcd-4bcd-8bcd-abcdefabcdef', kind, ownershipGeneration: 'generation',
      expiresAt: '2026-10-06T12:00:00.000Z', tag: 'fuel-bae281b144b7e4352af148ef52bdf07c', title, body,
    });
  });
  it('rejects arbitrary kinds and malformed generations instead of reflecting them',()=>{
    expect(()=>buildPushEnvelope({...intent,type:'Medical Name'},'generation')).toThrow();
    expect(()=>buildPushEnvelope(intent,'../other')).toThrow();
    expect(()=>buildPushEnvelope({...intent,type:'COMMUNICATION',source:{kind:'COMMUNICATION',id:'fictional',version:'v1'},purpose:'TEST'},'generation')).toThrow();
    expect(()=>buildPushEnvelope({...intent,type:'COMMUNICATION'},'generation')).toThrow();
  });
});
