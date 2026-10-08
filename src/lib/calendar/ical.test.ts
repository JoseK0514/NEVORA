import {expect,it} from 'vitest';
import {serializeCalendar} from './ical';
import type {CalendarEvent} from './types';
const event:CalendarEvent={uid:'opaque@nevora.calendar',sequence:4,stamp:'2026-10-08T10:00:00Z',lastModified:'2026-10-08T10:00:00Z',status:'CONFIRMED',startAt:'2026-10-09T12:00:00Z',endAt:'2026-10-09T20:00:00Z',summary:'Work shift',location:'Café 😀; west, branch\r\nATTENDEE:evil'};
it('stable RFC calendar escapes injection and preserves committed UTC identity',()=>{
 const value=serializeCalendar([event]);expect(value).toContain('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n');expect(value).toContain('UID:opaque@nevora.calendar\r\nSEQUENCE:4');expect(value).toContain('DTSTART:20261009T120000Z');expect(value).toContain('Café 😀\\; west\\, branch\\nATTENDEE:evil');expect(value).not.toContain('\r\nATTENDEE:');expect(value).toBe(serializeCalendar([event]));
});
it('folds UTF8 by 75 octets including continuation space without splitting characters',()=>{
 const value=serializeCalendar([{...event,location:'😀'.repeat(80)}]);for(const line of value.split('\r\n'))expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);expect(value.replace(/\r\n /g,'')).toContain('😀'.repeat(80));
});
it('cancellation omits location and rejects invalid or overflowing versions and boundaries',()=>{
 expect(serializeCalendar([{...event,status:'CANCELLED',location:null}])).toContain('STATUS:CANCELLED');expect(serializeCalendar([{...event,status:'CANCELLED',location:null}])).not.toContain('LOCATION:');
 for(const sequence of [-1,0.5,2147483648])expect(()=>serializeCalendar([{...event,sequence}])).toThrow();expect(()=>serializeCalendar([{...event,endAt:event.startAt}])).toThrow();
});
