import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import type {ComponentProps} from 'react';
import {EmployeeMobileCalendarView} from './calendar';
import {MobileLangProvider} from './mobile-lang';
import {withoutB} from '../owner-b/test-support';
// Signed-in Spanish: the calendar cards (tablets and desktop) in Puerto Rico Spanish. The phone screen (Direction B) is
// employee-b's and is left out here. Fictional state only.
type Props=ComponentProps<typeof EmployeeMobileCalendarView>;
const ready={state:'active' as const,id:'own',generation:'current',issuedAt:'2026-10-27',allowedLocationIds:['loc-1'],authority:'own',observedAt:'2026-10-27',validForMs:45000,canIssue:true};
const base:Props={status:ready,url:null,paused:false,busy:false,notice:'',onCommand:()=>{},onCopy:()=>{},onRetry:()=>{}};
const es=(props:Partial<Props>={})=>withoutB(renderToStaticMarkup(<MobileLangProvider value="es"><EmployeeMobileCalendarView {...base} {...props}/></MobileLangProvider>));
it('active link: subscription, privacy note, providers and the two manage actions in Spanish',()=>{
 const html=es();
 for(const text of ['Suscripción','>Activa<','Cualquier persona con el enlace','Por tu privacidad, el enlace se muestra una sola vez.','O añádelo directamente a','>Obtener enlace nuevo<','El enlace anterior deja de funcionar enseguida.','>Desactivar enlace<'])expect(html).toContain(text);
 for(const text of ['Subscription','>Active<','Anyone with the link','Or add it straight to','Get a new link','Turn off link'])expect(html).not.toContain(text);
});
it('one-time link, create, recovery and read states in Spanish',()=>{
 const once=es({url:'PRIVATE-ONCE'});expect(once).toContain('Tu enlace privado del calendario');expect(once).toContain('>Copiar enlace del calendario<');expect(once).toContain('Se muestra una sola vez.');expect(once).not.toContain('Copy calendar link');
 const none=es({status:{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[]}});expect(none).toContain('>Inactiva<');expect(none).toContain('>Crear enlace del calendario<');
 expect(es({status:{...ready,state:'none',id:null,generation:null,issuedAt:null,allowedLocationIds:[],canIssue:false}})).toContain('Pide a tu gerente que revise tu acceso.');
 expect(es({notice:'Fictional notice',pendingKind:'ROTATE'})).toContain('>Reintentar solicitud original<');
 expect(es({paused:true})).toContain('Ajustes del calendario en pausa.');expect(es({busy:true})).toContain('Guardando tu solicitud del calendario…');expect(es({status:null})).toContain('Verificando tu enlace del calendario…');
 const denied=es({status:{state:'unauthorized',reason:'access_denied'}});expect(denied).toContain('No pudimos confirmar tu acceso.');expect(denied).toContain('>Iniciar sesión<');expect(denied).not.toContain('Sign in');
});
