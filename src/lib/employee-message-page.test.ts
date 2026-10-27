import {it,expect} from 'vitest';
import {encodeMessageCursor,parseMessageCursor} from './employee-message-page';
it('retains the database microsecond boundary and actor-owned text key without treating a cursor as authority',()=>{
 const value={at:'2026-10-27T16:00:01.123456Z',id:'own-notice_19'};const token=encodeMessageCursor(value);
 expect(parseMessageCursor(token)).toEqual(value);expect(token).not.toMatch(/[+/=]/);
});
it('refuses invalid dates, invalid keys, alternate or oversized cursor payloads',()=>{
 for(const input of [{at:'2026-02-30T12:00:00.000000Z',id:'own'}, {at:'2026-10-27T12:00:00.000000Z',id:'../other'}, {at:'2026-10-27T25:00:00.000000Z',id:'own'}])expect(()=>encodeMessageCursor(input)).toThrow();
 for(const value of ['', 'a'.repeat(800), 'not-a-cursor',btoa(JSON.stringify({v:1,at:'2026-10-27T12:00:00.000000Z',id:'own',employeeId:'peer'}))])expect(parseMessageCursor(value)).toBeNull();
});
