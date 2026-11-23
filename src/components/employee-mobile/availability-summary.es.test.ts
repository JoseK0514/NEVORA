import {expect,it} from '@rstest/core';
import {availabilitySummary} from './availability-summary';
const spaces=(text:string|null)=>text?.replace(/\s/g,' ');
const w=(dayOfWeek:number,startTime='07:00',endTime='17:00')=>({dayOfWeek,startTime,endTime});
it('says the weekly availability in Spanish',()=>{
 expect(spaces(availabilitySummary([1,2,3,4,5].map(d=>w(d)),'es'))).toBe('Días de semana · 7:00 a. m. – 5:00 p. m.');
 expect(availabilitySummary([w(1),w(3,'08:00')],'es')).toBe('lun, mié');
 expect(spaces(availabilitySummary([1,2,3,4].map(d=>w(d)),'es'))).toBe('4 días a la semana · 7:00 a. m. – 5:00 p. m.');
 expect(availabilitySummary([0,1,2,3,4,5,6].map(d=>w(d,'00:00','24:00')),'es')).toBe('Todos los días · todo el día');
 expect(availabilitySummary([],'es')).toBe('Sin indicar');
});
