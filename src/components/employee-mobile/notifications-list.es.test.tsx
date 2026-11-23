import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
import {EmployeeNotificationList,EmployeeNotificationsSnapshotView,notificationTitle} from './notifications-list';
import {MobileLangProvider} from './mobile-lang';
import type {EmployeeNotificationItem} from '../../lib/employee-view';
const zone='America/Puerto_Rico',now=new Date('2026-10-31T16:00:00Z');
const item=(id:string,at:string,label='Schedule update',extra:Partial<EmployeeNotificationItem>={}):EmployeeNotificationItem=>({id,label,at,href:'/app/notifications/open?notificationId='+id,reviewState:'read',actionState:'none',...extra});
const items=[item('a','2026-10-30T23:45:00Z','Schedule update',{reviewState:'unread',actionState:'required'}),item('b','2026-10-30T15:20:00Z','Time off update'),item('c','2026-10-28T12:00:00Z','Pay statement update')];
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const es=(node:React.ReactNode)=>renderToStaticMarkup(<MobileLangProvider value="es">{node}</MobileLangProvider>);
const draw=(tab:'all'|'unread'='all',list=items)=>es(<EmployeeNotificationList items={list} partial={false} tab={tab} onTab={()=>{}} timeZone={zone} now={now}/>);
it('draws the Notifications list in Spanish: tabs, day groups, titles, facts and times',()=>{
 const html=draw(),text=plain(html);
 for(const word of ['Todas','Sin leer 1','Ayer','Antes','Confirma tu horario','Tu solicitud de días libres fue respondida','Se compartió contigo un comprobante de pago','Requiere acción','7:45 p. m.','mié, 28 oct'])expect(text).toContain(word);
 expect(html).toContain('aria-label="Mostrar notificaciones"');expect(html).toContain('aria-label="Notificaciones de ayer"');
 expect(html).toMatch(/aria-label="Confirma tu horario, sin leer, requiere acción, 7:45\sp\.\sm\."/);
 for(const word of ['Yesterday','Earlier','Unread','Action needed','Confirm your schedule',' PM','Wed, Oct 28'])expect(text).not.toContain(word);
 // The card ids stay the same in both languages.
 expect(html).toContain('id="notifications-yesterday"');
});
it('says the empty and caught-up states in Spanish',()=>{
 expect(plain(draw('unread',[items[1]]))).toContain('Estás al día');expect(plain(draw('unread',[items[1]]))).toContain('No hay notificaciones sin leer.');
 const empty=plain(draw('all',[]));expect(empty).toContain('No hay notificaciones actuales');expect(empty).not.toContain('No current notifications');
});
it('titles a notice in Spanish with Spanish dates, and keeps English as the default',()=>{
 const day={kind:'requestDate' as const,startDate:'2026-11-26',endDate:'2026-11-26'},span={kind:'requestDate' as const,startDate:'2026-11-28',endDate:'2026-12-02'};
 const title=(label:string,extra:Partial<EmployeeNotificationItem>,lang?:'en'|'es')=>notificationTitle(item('x','2026-10-30T15:20:00Z',label,extra),lang);
 expect(title('Time-off update',{subject:span},'es')).toBe('Tu solicitud de días libres del 28 nov–2 dic fue respondida');
 expect(title('Time off approved',{eventType:'TIME_OFF_APPROVED',subject:day},'es')).toBe('Tu solicitud de días libres del 26 nov fue aprobada');
 expect(title('Shift request update',{actionState:'available',subject:day,eventType:'SWAP_RESPONSE_REQUIRED',names:['Ana']},'es')).toBe('Ana te pidió intercambiar un turno del 26 nov');
 expect(title('Team update',{actionState:'required'},'es')).toBe('Confirma el aviso del equipo');
 expect(title('Time off approved',{eventType:'TIME_OFF_APPROVED',subject:day})).toBe('Your time-off request for Nov 26 was approved');
});
it('the desktop snapshot view says its states in Spanish',()=>{
 const html=es(<EmployeeNotificationsSnapshotView state={{snapshot:null,paused:false,refreshing:false}} onRetry={()=>{}}/>),text=plain(html);
 expect(text).toContain('No pudimos verificar tus notificaciones.');expect(text).toContain('Intentar de nuevo');expect(text).not.toContain('Try again');
});
