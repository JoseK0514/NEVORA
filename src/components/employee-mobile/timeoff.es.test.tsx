import {beforeEach,expect,it,rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture=rs.hoisted(()=>({read:null as unknown,paused:false}));
rs.mock('@/app/app/exchange/actions',()=>({shiftChangeAction:rs.fn(),reconcileShiftChangeAction:rs.fn()}));
rs.mock('@/app/app/employee-planning/actions',()=>({saveEmployeePlanningAction:rs.fn(),checkEmployeePlanningAction:rs.fn()}));
rs.mock('./use-planning',()=>({usePlanning:()=>({state:{snapshot:fixture.read?{state:'ready'}:null,paused:fixture.paused,refreshing:!fixture.read&&!fixture.paused},read:fixture.read,refresh:()=>{},accept:()=>{},allowed:()=>true,live:{current:null}})}));
import {EmployeeTimeOff} from './timeoff';
import {MobileLangProvider} from './mobile-lang';
import {TimeOffListRow,TimeOffRequestCard,timeOffDecision,timeOffLength} from './timeoff-parts';
import {withoutB} from '../owner-b/test-support';

// Fictional requests only.
const request=(id:string,status:string,startDate:string,endDate:string,times?:[string,string])=>({id,status,startDate,endDate,startTime:times?.[0]??null,endTime:times?.[1]??null,note:null,createdAt:'2026-11-02T15:00:00Z',reviewedAt:null as string|null,reviewer:null as string|null});
const PENDING='11111111-1111-4111-8111-111111111111';
const es=(node:React.ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>).replace(/ /g,' ');
beforeEach(()=>{fixture.read=null;fixture.paused=false;});

it('draws the time-off list in Spanish',()=>{
 fixture.read={view:'timeoff',enabled:true,timeZone:'America/New_York',data:{requests:[request(PENDING,'PENDING','2026-11-12','2026-11-14')]}};
 const html=withoutB(es(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>));
 for(const value of ['>En espera<','>Decididas<','Pedir días libres','jue, 12 nov – sáb, 14 nov','3 días','aria-label="Solicitudes de días libres"'])expect(html).toContain(value);
 for(const value of ['>Waiting<','>Decided<','Request time off','Thu, Nov 12','3 days'])expect(html).not.toContain(value);
 fixture.read={view:'timeoff',enabled:true,timeZone:'America/New_York',data:{requests:[]}};
 const empty=withoutB(es(<EmployeeTimeOff authority="a" selection="list" filter="decided"/>));
 expect(empty).toContain('Todavía no hay decisiones');expect(empty).not.toContain('No decisions yet');
});

it('draws the request form in Spanish',()=>{
 fixture.read={view:'timeoff',enabled:true,timeZone:'America/New_York',data:{requests:[]}};
 const html=withoutB(es(<EmployeeTimeOff authority="a" selection="new" filter="waiting"/>));
 for(const value of ['>Todo el día<','>Parte del día<','>Desde<','>Hasta<','Elegir fecha','Motivo (opcional)','Enviar solicitud','Tu gerente tiene que aprobar esta solicitud.'])expect(html).toContain(value);
 for(const value of ['>All day<','Choose date','Reason (optional)','Send request','Your manager needs to approve'])expect(html).not.toContain(value);
});

it('draws one request and its withdraw step in Spanish',()=>{
 fixture.read={view:'timeoff',enabled:true,timeZone:'America/New_York',data:{requests:[request(PENDING,'PENDING','2026-11-12','2026-11-14')]}};
 const html=withoutB(es(<EmployeeTimeOff authority="a" selection={PENDING} filter="waiting"/>));
 for(const value of ['Enviada el lun, 2 nov','En espera de tu gerente','Tu gerente decide sobre esta solicitud','Retirar solicitud','Primero te pediremos que confirmes.'])expect(html).toContain(value);
 for(const value of ['Sent Mon','Waiting for your manager','Withdraw request'])expect(html).not.toContain(value);
 fixture.read={view:'timeoff',enabled:false,timeZone:'America/New_York',data:{requests:[]}};
 expect(withoutB(es(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>))).toContain('Los días libres están desactivados en tu trabajo.');
});

it('the shared parts speak Spanish when asked and English by default',()=>{
 const decided={...request('r','APPROVED','2026-11-12','2026-11-12',['09:00','13:00']),reviewer:'Ana Ficticia',reviewedAt:'2026-11-03T18:00:00Z'};
 expect(timeOffLength(decided,'es').replace(/\u00a0/g,' ')).toBe('Parte del día · 9:00 a. m. – 1:00 p. m.');
 expect(timeOffLength(decided).replace(/ /g,' ')).toBe('Part of day · 9:00 AM – 1:00 PM');
 expect(timeOffDecision(decided,'America/New_York','es').title).toBe('Aprobada por Ana Ficticia');
 expect(timeOffDecision(decided,'America/New_York','es').detail?.replace(/ /g,' ')).toBe('3 nov a la 1:00 p. m.');
 expect(timeOffDecision(decided,'America/New_York').detail?.replace(/ /g,' ')).toBe('Nov 3, 1:00 PM');
 const card=renderToStaticMarkup(<TimeOffRequestCard request={decided} zone="America/New_York" lang="es"/>).replace(/ /g,' ');
 expect(card).toContain('jue, 12 nov');expect(card).toContain('Aprobada por Ana Ficticia');expect(card).not.toContain('Approved');
 const row=renderToStaticMarkup(<TimeOffListRow request={{...decided,status:'CANCELLED'}} href="/x" lang="es"/>);
 expect(row).toContain('>Retirada<');
 expect(renderToStaticMarkup(<TimeOffListRow request={{...decided,status:'CANCELLED'}} href="/x"/>)).toContain('>Withdrawn<');
});
