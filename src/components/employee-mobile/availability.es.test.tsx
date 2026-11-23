import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
// Signed-in Spanish: the Availability page drawn from a fictional read, in Puerto Rico Spanish. No server, no session.
const fixture=rs.hoisted(()=>({read:null as unknown}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{},push:()=>{}}),usePathname:()=>'/app/availability'}));
rs.mock('@/app/app/employee-planning/actions',()=>({saveEmployeePlanningAction:rs.fn(),checkEmployeePlanningAction:rs.fn()}));
rs.mock('./use-planning',()=>({usePlanning:()=>({state:{snapshot:fixture.read,paused:false,refreshing:false},read:fixture.read,live:{current:fixture.read},refresh:()=>{},accept:()=>{},allowed:()=>false})}));
import {EmployeeAvailability} from './availability';
import {MobileLangProvider} from './mobile-lang';
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#x27;/g,' ').replace(/\s+/g,' ');
const base={state:'ready',kind:'planning',view:'availability',authority:'a'.repeat(64),observedAt:'2026-11-20T12:00:00Z',validForMs:45000,timeZone:'America/Puerto_Rico',enabled:true};
const windows=[1,2,3,4,5].map(dayOfWeek=>({dayOfWeek,startTime:'07:00',endTime:'15:00'}));
const draw=(selection:string,data:Record<string,unknown>,lang:'en'|'es'='es')=>{fixture.read={...base,selection,data:{basis:'b1',windows,deadline:null,submitted:false,locked:false,nextWeek:'2026-11-30',...data}};return renderToStaticMarkup(<MobileLangProvider value={lang}><EmployeeAvailability authority={base.authority} selection={selection}/></MobileLangProvider>);};
// The Direction B hero (employee-b/availability-b.tsx) and availability-corp.tsx's day rows still draw their own English (Schedule, Availability, Change one week, Not available).
it('the usual week in Spanish',()=>{
 const html=draw('normal',{}),text=plain(html);
 expect(text).toContain('Disponibilidad');expect(text).toContain('Tu semana habitual');expect(text).toContain('Cambiar una semana');
 expect(text).toContain('7:00 a. m. – 3:00 p. m.');expect(html.replace(/\s/g,' ')).toContain('lunes, 7:00 a. m. – 3:00 p. m.');expect(text).toContain('Tu gerente usa esto para armar el horario.');
 expect(text).toContain('Solicitudes');
 for(const english of ['Your usual week','Monday','7:00 AM','Your manager uses this'])expect(text).not.toContain(english);
 // The status stays a data value, not a word on screen.
 expect(html).toContain('data-availability-status="Usual hours"');
});
it('a single week with a deadline in Spanish',()=>{
 const html=draw('2026-11-30',{deadline:'2026-11-27T22:00:00Z'}),text=plain(html);
 expect(text).toContain('Para la semana del');expect(text).toContain('Vence vie, 27 nov');expect(text).toContain('hora de Puerto Rico');
 expect(text).toContain('Horas solo para esta semana');expect(text).toContain('Enviar esta semana');expect(html).toContain('aria-label="Semana anterior"');
 for(const english of ['Due ','Send by','Submit this week','Used for the week of','Puerto Rico time'])expect(text).not.toContain(english);
});
it('English stays as it was',()=>{
 const text=plain(draw('2026-11-30',{deadline:'2026-11-27T22:00:00Z'},'en'));
 expect(text).toContain('Due Fri, Nov 27');expect(text).toContain('Send by Fri, Nov 27, 6:00 PM (Puerto Rico time).');expect(text).toContain('Submit this week');
});
