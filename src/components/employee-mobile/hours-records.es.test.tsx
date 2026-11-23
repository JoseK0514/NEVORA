import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import {HoursRecordsView} from './hours-records';
import {MobileLangProvider} from './mobile-lang';
import type {EmployeeTime} from '@/lib/employee-time';

const noop=()=>{};
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/[\s  ]+/g,' ');
const entry={id:'own-1',locationName:'Main Office',clockInAt:'2026-10-27T13:00:00Z',clockOutAt:'2026-10-27T17:00:00Z',state:'CLOCKED_OUT' as const,elapsedSeconds:14400,breakSeconds:900,breaks:[{id:'break-1',startAt:'2026-10-27T15:00:00Z',endAt:'2026-10-27T15:15:00Z',name:null,elapsedSeconds:900}]};
const data:EmployeeTime={state:'ready',observedAt:'2026-10-27T18:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',date:'2026-10-27',current:null,today:{entries:[entry],recordedSeconds:14400,breakSeconds:900},recent:{entries:[],total:0,limit:20}};
const es=(view:EmployeeTime,entryId:string|null)=>plain(renderToStaticMarkup(<MobileLangProvider value="es"><HoursRecordsView data={view} entryId={entryId} onRefresh={noop}/></MobileLangProvider>));

it('draws the Hours overview in Spanish',()=>{
 const text=es(data,null);
 expect(text).toContain('martes, 27 oct');expect(text).toContain('Fuera de turno');expect(text).toContain('Tiempo registrado hoy');expect(text).toContain('Entradas de hoy');expect(text).toContain('mar, 27 oct');expect(text).toContain('27 oct, 9:00 a. m.');expect(text).toContain('No hay entradas anteriores registradas.');expect(text).toContain('Ver mis tarjetas de tiempo');
 expect(text).not.toContain('Off clock');expect(text).not.toContain('Earlier entries');expect(text).not.toContain('AM');
});
it('draws an entry and the unavailable notice in Spanish',()=>{
 const text=es(data,'own-1');
 expect(text).toContain('Entrada completada');expect(text).toContain('Marcaciones registradas');expect(text).toContain('Descanso registrado');expect(text).toContain('Solicitar una corrección');expect(text).toContain('Horas según la hora de Puerto Rico.');
 expect(text).not.toContain('Request a correction');expect(text).not.toContain('Recorded punches');
 const failed=es({state:'unavailable',reason:'read_failed'},null);
 expect(failed).toContain('No pudimos verificar tu tiempo registrado.');expect(failed).toContain('Intentar de nuevo');expect(failed).not.toContain('Try again');
});
