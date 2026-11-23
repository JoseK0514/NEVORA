import type {ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from '@rstest/core';
import {CorpCorrections,CorpFixTime,CorpPastTimecards,CorpTimeEntry,CorpTimeTab} from './hours-corp';
import {HoursCorrectionOperation} from './hours-operation';
import {MobileLangProvider} from './mobile-lang';
import type {EmployeeTimeEntry,EmployeeTimeReady} from '@/lib/employee-time';

/* The corporate Time pages in Spanish: the same fictional fixtures as hours-corp.test.tsx, drawn inside
 * <MobileLangProvider value="es">. English stays covered (byte for byte) by hours-corp.test.tsx. */
const noop=()=>{};
const zone='America/Puerto_Rico';
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const es=(node:ReactElement)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
const done:EmployeeTimeEntry={id:'own-1',locationName:'Condado',clockInAt:'2026-10-26T11:59:00Z',clockOutAt:'2026-10-26T20:01:00Z',state:'CLOCKED_OUT',elapsedSeconds:28920,breakSeconds:1800,breaks:[{id:'b1',startAt:'2026-10-26T16:00:00Z',endAt:'2026-10-26T16:30:00Z',name:'Meal break',elapsedSeconds:1800}]};
const open:EmployeeTimeEntry={id:'own-2',locationName:'Condado',clockInAt:'2026-10-27T11:58:00Z',clockOutAt:null,state:'CLOCKED_IN',elapsedSeconds:5520,breakSeconds:0,breaks:[]};
const ready=(patch:Partial<EmployeeTimeReady>={}):EmployeeTimeReady=>({state:'ready',observedAt:'2026-10-27T13:30:00Z',validForMs:45000,timeZone:zone,date:'2026-10-27',current:null,today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[done],total:1,limit:20},...patch});

describe('corporate Time in Spanish',()=>{
 it('draws the Time tab in Spanish, with Spanish times and days',()=>{
  const plain=text(es(<CorpTimeTab data={ready({current:open,today:{entries:[open],recordedSeconds:5520,breakSeconds:0}})}/>));
  expect(plain).toContain('Turno actual');expect(plain).toContain('En turno');expect(plain).toMatch(/En turno desde las 7:58\sa\.\sm\./);
  expect(plain).toContain('Condado · 1 h 32 min hasta ahora');expect(plain).toContain('Esta semana · 26 oct–1 nov');expect(plain).toContain('lun 26');
  expect(plain).toContain('30 min de descanso');expect(plain).toContain('Corregir una marcación');expect(plain).toContain('Las horas incluyen los descansos.');
  expect(plain).not.toMatch(/Current shift|Clocked in|This week|Fix a missed punch|Hours include breaks|\bAM\b|\bPM\b/);
  const off=text(es(<CorpTimeTab data={ready()}/>));
  expect(off).toContain('Ahora mismo');expect(off).toContain('Sin marcar entrada');expect(off).toContain('Marca tu entrada en la tableta de Condado.');expect(off).not.toContain('Not clocked in');
 });
 it('lists a day’s punches in Spanish',()=>{
  const plain=text(es(<CorpTimeEntry entry={done} zone={zone}/>));
  expect(plain).toContain('Marcaciones');expect(plain).toContain('Entrada');expect(plain).toContain('Salida');expect(plain).toContain('Incluye 30 min de descansos');
  expect(plain).toContain('Solicitar una corrección');expect(plain).toContain('Localidad');expect(plain).toMatch(/4:01\sp\.\sm\./);
  expect(plain).not.toMatch(/Punches|Clock in|Clock out|Request a correction|Location/);
  expect(text(es(<CorpTimeEntry entry={open} zone={zone}/>))).toContain('Termina esta entrada en la tableta de tu localidad antes de solicitar una corrección.');
 });
 it('shows past timecards in Spanish',()=>{
  const card={employeeId:'e',employeeName:'Fictional',timeZone:zone,startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],observedAt:'2026-10-27T13:00:00Z',startAt:'2026-10-19T04:00:00Z',endAt:'2026-10-26T04:00:00Z',recordedNanoseconds:'28920000000000',breakNanoseconds:'1800000000000',issues:['open_break'],
   entries:[{id:'e1',locationId:'l',locationName:'Condado',positionId:null,positionName:null,sourceKind:'RECORDED' as const,adjustmentId:null,recordedVersion:1,startAt:'2026-10-20T11:59:00Z',endAt:'2026-10-20T20:01:00Z',rawStartAt:'2026-10-20T11:59:00Z',rawEndAt:'2026-10-20T20:01:00Z',breaks:[]}]};
  const data={state:'ready',validForMs:1,cards:[{card,state:'APPROVED',history:[]}]} as unknown as Parameters<typeof CorpPastTimecards>[0]['data'];
  const plain=text(es(<CorpPastTimecards authority="a" data={data} period={{startDate:'2026-10-19',endDate:'2026-10-25'}} today="2026-10-27" entryId={null} onRefresh={noop}/>));
  expect(plain).toContain('19–25 oct');expect(plain).toContain('Aprobada');expect(plain).toContain('mar 20');expect(plain).toContain('Semana siguiente');
  expect(plain).toContain('Horas · incluye 30 min de descansos');expect(plain).toContain('Un descanso todavía está en curso.');
  expect(plain).toContain('Ver semanas anteriores');expect(plain).toContain('Tus solicitudes de corrección');
  expect(plain).not.toMatch(/Approved|Later week|Show earlier weeks|Oct 19|of breaks/);
  const missing=text(es(<CorpPastTimecards authority="a" data={data} period={{startDate:'2026-10-19',endDate:'2026-10-25'}} today="2026-10-27" entryId="nope" onRefresh={noop}/>));
  expect(missing).toContain('Esta entrada no está en esta tarjeta de tiempo.');expect(missing).toContain('Intentar de nuevo');
 });
 it('lists correction requests in Spanish',()=>{
  const snapshot={state:'ready' as const,observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[],targets:[],requests:[]};
  const plain=text(es(<CorpCorrections snapshot={snapshot} decisions={[]} requestId={null} filter="waiting" onRefresh={noop}/>));
  expect(plain).toContain('No hay solicitudes en espera en tu historial reciente.');expect(plain).toContain('En espera de revisión');expect(plain).toContain('Decididas');
  expect(plain).toContain('Para corregir un día que ya marcaste, ábrelo desde Tiempo.');
  expect(plain).not.toMatch(/No requests are waiting|Waiting for review|Decided|Fix a missed punch/);
 });
 it('asks what to fix in Spanish, with Spanish times in the fields',()=>{
  const snapshot={state:'ready' as const,authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[{id:'loc-1',name:'Condado'},{id:'loc-2',name:'Old San Juan'}],requests:[],
   targets:[{kind:'ENTRY_BOUNDARY' as const,timeEntryId:'own-1',breakEntryId:null,recordedStartAt:done.clockInAt,recordedEndAt:done.clockOutAt!,context:{state:'confirmed' as const,sourceKind:'RECORDED' as const,startAt:done.clockInAt,endAt:done.clockOutAt!,totalDecisions:0,decisions:[]}}]};
  const render=(edit:string,operation=new HoursCorrectionOperation())=>es(<CorpFixTime snapshot={snapshot} basis={'b'.repeat(32)} edit={edit} draft={undefined} onDraft={noop} operation={operation} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop} cancel="/app/my-time"/>);
  const html=render('new'),plain=text(html);
  for(const label of ['Cancelar','Corregir mi tiempo','Enviar','Qué corregir','No marqué un turno completo','lun, 26 oct','Localidad','Día','Inicio','Fin','Nota (obligatoria)','Elegir localidad'])expect(plain).toContain(label);
  expect(html).toContain('placeholder="Elegir"');expect(plain).toContain('Tu gerente la revisa. Tu tarjeta de tiempo cambia cuando se aprueba.');
  expect(plain).not.toMatch(/What to fix|Missed a whole shift|Note \(required\)|Your manager reviews it|>Send</);
  const entry=render('entry:own-1');
  expect(entry).toMatch(/value="7:59\sa\.\sm\."/);expect(entry).toMatch(/value="4:01\sp\.\sm\."/);expect(text(entry)).toMatch(/Registrado: 7:59\sa\.\sm\. – 4:01\sp\.\sm\./);
 });
 it('keeps request recovery in Spanish',async()=>{
  const operation=new HoursCorrectionOperation();
  await operation.submit({basis:'a'.repeat(32),command:{operationId:'c3849d11-f86e-4f08-8b90-84a8e2053290',kind:'ENTRY_BOUNDARY',timeEntryId:'no-longer-editable',proposedStartAt:'2026-10-27T13:00:00Z',proposedEndAt:'2026-10-27T17:00:00Z',reason:'Original proposal'}},async()=>({status:'unknown'}),()=>true);
  const snapshot={state:'ready' as const,authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[],requests:[],targets:[]};
  const plain=text(es(<CorpFixTime snapshot={snapshot} basis={'b'.repeat(32)} edit="entry:no-longer-editable" draft={undefined} onDraft={noop} operation={operation} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop} cancel="/app/my-time"/>));
  expect(plain).toContain('Ver estado de la solicitud');expect(plain).toContain('Revisa tu solicitud anterior');expect(plain).not.toContain('Check request status');
 });
});
