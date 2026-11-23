import {describe,expect,it} from '@rstest/core';
import {cardStatus,clockAt,clockRange,correctionStatus,dayLong,dayMedium,dayShort,interval,issueText,kindLabel,rangeLabel,sentAt,shiftCount,statusWord,timeSubtitle,timeWeek,type Ready} from './hours-model';

const zone='America/Puerto_Rico';
const sp=(text:string)=>text.replace(/[  ]/g,' ');
const data={state:'ready',observedAt:'2026-10-27T13:30:00Z',validForMs:45000,timeZone:zone,date:'2026-10-27',current:null,
 today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[{id:'e1',locationName:'Condado',clockInAt:'2026-10-26T11:59:00Z',clockOutAt:'2026-10-26T20:01:00Z',state:'CLOCKED_OUT',elapsedSeconds:28920,breakSeconds:0,breaks:[]}],total:1,limit:20}} as Ready;

describe('hours-model in Spanish',()=>{
 it('writes dates, times and ranges in Puerto Rico Spanish',()=>{
  expect(dayShort('2026-10-26','es')).toBe('lun 26');expect(dayMedium('2026-10-26','es')).toBe('lun, 26 oct');expect(dayLong('2026-10-26','es')).toBe('lunes, 26 de octubre');
  expect(rangeLabel('2026-10-19','2026-10-25','es')).toContain('oct');
  expect(sp(clockAt('2026-10-26T11:59:00Z',zone,'es'))).toBe('7:59 a. m.');
  expect(sp(clockRange('2026-10-26T11:59:00Z',null,zone,'es'))).toBe('7:59 a. m. – ahora');
  expect(sp(interval('2026-10-26T11:59:00Z','2026-10-26T20:01:00Z',zone,'es'))).toBe('lun, 26 oct · 7:59 a. m. – 4:01 p. m.');
  expect(sp(sentAt('2026-10-26T20:05:00Z',zone,'es'))).toBe('26 oct, 4:05 p. m.');
  expect(timeSubtitle(data,'es')).toBe('martes, 27 de octubre');
 });
 it('gives the words in Spanish and keeps English the default',()=>{
  expect(cardStatus('APPROVED',[],'es').word).toBe('Aprobada');expect(cardStatus('DRAFT',['period_open'],'es')).toEqual({word:'En curso',tone:'teal',open:true});
  expect(correctionStatus('REJECTED','es').word).toBe('Rechazada');expect(shiftCount(1,'es')).toBe('1 turno');expect(shiftCount(3,'es')).toBe('3 turnos');
  expect(kindLabel('BREAK_BOUNDARY','es')).toBe('Descanso');expect(statusWord('PENDING','es')).toBe('En espera de revisión');expect(issueText('open_break','es')).toBe('Un descanso todavía está en curso.');
  expect(timeWeek(data,'es').tablet).toBe('la tableta de Condado');
  // English stays as it was, indexed or called.
  expect(kindLabel.BREAK_BOUNDARY).toBe('Break');expect(kindLabel('MISSING_ENTRY')).toBe('Missed shift');expect(statusWord.REJECTED).toBe('Declined');expect(issueText.open_entry).toBe('An entry is still missing its clock-out.');
  expect(dayMedium('2026-10-26')).toBe('Mon, Oct 26');expect(dayShort('2026-10-26')).toBe('Mon 26');expect(sp(clockRange('2026-10-26T11:59:00Z',null,zone))).toBe('7:59 AM – now');expect(timeWeek(data).tablet).toBe('the Condado tablet');
  expect(shiftCount(2)).toBe('2 shifts');expect(cardStatus('DRAFT',[]).word).toBe('Not approved yet');
 });
});
