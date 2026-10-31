import {expect,it} from 'vitest';
import {availabilitySummary} from './availability-summary';
const w=(dayOfWeek:number,startTime='07:00',endTime='17:00')=>({dayOfWeek,startTime,endTime});
it('says the weekly availability in a few words',()=>{
 expect(availabilitySummary([1,2,3,4,5].map(d=>w(d)))).toBe('Weekdays · 7 AM – 5 PM');
 expect(availabilitySummary([0,6].map(d=>w(d,'09:30','24:00')))).toBe('Weekends · 9:30 AM – 12 AM');
 expect(availabilitySummary([0,1,2,3,4,5,6].map(d=>w(d,'12:00','20:00')))).toBe('Every day · 12 PM – 8 PM');
 expect(availabilitySummary([w(1),w(3,'08:00')])).toBe('Mon, Wed');
 expect(availabilitySummary([1,2,3,4].map(d=>w(d)))).toBe('4 days a week · 7 AM – 5 PM');
 expect(availabilitySummary([])).toBe('Not set');
});
