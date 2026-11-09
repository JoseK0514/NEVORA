import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {createCalendarToken,calendarDigest,validCalendarToken} from './token.server';
it('creates independent 256-bit canonical credentials and stores their SHA-256 identity',()=>{const first=createCalendarToken(),second=createCalendarToken();expect(Buffer.from(first.token,'base64url').length).toBe(32);expect(first.token===second.token).toBe(false);expect(validCalendarToken(first.token)).toBe(true);expect(first.digest).toBe(calendarDigest(first.token));expect(/^[a-f0-9]{64}$/.test(first.digest)).toBe(true);});
it('denies malformed and noncanonical capability aliases',()=>{for(const value of ['', 'A'.repeat(42),'A'.repeat(44),'A'.repeat(42)+'B','A'.repeat(43)+'=','/api/calendar/foo','A'.repeat(42)+'%'])expect(validCalendarToken(value)).toBe(false);});
