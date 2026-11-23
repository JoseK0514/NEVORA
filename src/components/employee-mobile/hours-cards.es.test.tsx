import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from '@rstest/core';
import {HoursCardsView} from './hours-cards';
import {MobileLangProvider} from './mobile-lang';

/* The older timecard view (hours-cards.tsx) in English and Spanish, with a fictional timecard. It had no render test, so
 * this one checks both languages. */
const noop=()=>{};
const zone='America/Puerto_Rico';
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const draw=(node:ReactElement,lang?:'es')=>renderToStaticMarkup(lang?<MobileLangProvider value={lang}>{node}</MobileLangProvider>:node);
const period={startDate:'2026-10-19',endDate:'2026-10-25'};
const card={employeeId:'e',employeeName:'Fictional',timeZone:zone,startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],observedAt:'2026-10-27T13:00:00Z',startAt:'2026-10-19T04:00:00Z',endAt:'2026-10-26T04:00:00Z',recordedNanoseconds:'28920000000000',breakNanoseconds:'1800000000000',issues:['period_open','pending_correction'],
 entries:[{id:'e1',locationId:'l',locationName:'Condado',positionId:null,positionName:null,sourceKind:'RECORDED',adjustmentId:null,recordedVersion:1,startAt:'2026-10-20T11:59:00Z',endAt:'2026-10-20T20:01:00Z',rawStartAt:'2026-10-20T11:59:00Z',rawEndAt:'2026-10-20T20:01:00Z',
  breaks:[{id:'b1',name:'Meal break',startAt:'2026-10-20T16:00:00Z',endAt:'2026-10-20T16:30:00Z',rawStartAt:'2026-10-20T16:00:00Z',rawEndAt:'2026-10-20T16:30:00Z',adjustmentId:null}]}]};
const data={state:'ready',validForMs:1,cards:[{card,state:'APPROVED',history:[{operationId:'op-1',revision:1,action:'APPROVE',occurredAt:'2026-10-26T14:00:00Z',actorName:'Fictional Manager',note:null,snapshot:{timeZone:zone}}]}]} as unknown as Parameters<typeof HoursCardsView>[0]['data'];
const view=<HoursCardsView data={data} period={period} onPeriod={noop} onRefresh={noop}/>;

describe('timecard view',()=>{
 it('keeps its English',()=>{
  const plain=text(draw(view));
  for(const line of ['Start date','View period','Approved','Hours in this period','Effective time','8 h 2 min','About these hours','A correction is waiting for review.','Time entries','Tue, Oct 20','Recorded time','Oct 20, 7:59 AM – Oct 20, 4:01 PM','Original punches','Request a correction','Timecard history','Approved by Fictional Manager','Times in Puerto Rico time. Your manager controls approval and finalization.'])expect(plain.replace(/\s/g,' ')).toContain(line);
 });
 it('draws in Spanish',()=>{
  const plain=text(draw(view,'es')).replace(/\s/g,' ');
  for(const line of ['Fecha de inicio','Ver período','Aprobada','Horas en este período','Tiempo efectivo','8 h 2 min','Sobre estas horas','Este período todavía está en curso. Los totales pueden cambiar.','Una corrección está en espera de revisión.','Entradas de tiempo','mar, 20 oct','Tiempo registrado','20 oct, 7:59 a. m. – 20 oct, 4:01 p. m.','Marcaciones originales','Descansos','Solicitar una corrección','Historial de la tarjeta de tiempo','Aprobada por Fictional Manager','no son un comprobante de pago','Las horas están en hora de Puerto Rico.'])expect(plain).toContain(line);
  expect(plain).not.toMatch(/Start date|View period|Effective time|Time entries|Recorded time|Timecard history|\bAM\b|\bPM\b| by /);
 });
 it('says a missing timecard and a failed read in Spanish',()=>{
  const none=text(draw(<HoursCardsView data={{state:'ready',validForMs:1,cards:[]} as unknown as Parameters<typeof HoursCardsView>[0]['data']} period={period} onPeriod={noop} onRefresh={noop}/>,'es'));
  expect(none).toContain('No hay una tarjeta de tiempo disponible para tu cuenta en este período.');
  const failed=text(draw(<HoursCardsView data={{state:'unavailable',reason:'read_failed'} as unknown as Parameters<typeof HoursCardsView>[0]['data']} period={period} onPeriod={noop} onRefresh={noop}/>,'es'));
  expect(failed).toContain('No pudimos verificar tu tarjeta de tiempo. Tus marcaciones registradas siguen disponibles en Horas.');
 });
});
