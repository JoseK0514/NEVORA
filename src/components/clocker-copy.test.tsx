import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {clockerText,CLOCKER_COPY} from './clocker-copy';
import {ClockerPresentation} from './clocker-language';
import {ClockerShell} from './clocker-shell';
import {ClockerSetup} from './clocker-setup';
it('translates complete visible and accessible phrases, retaining interpolation',()=>{for(const [en,es] of Object.entries(CLOCKER_COPY)){expect(es.trim()).not.toBe('');expect(clockerText('en',en)).toBe(en);}expect(clockerText('es','Number {number}',{number:4})).toBe('Número 4');expect(clockerText('es','Set up this tablet')).toBe('Configura esta tableta');});
it('keeps legacy presentation when V2 is off',()=>{const html=renderToStaticMarkup(<ClockerShell locationLabel="Office" timeZone="UTC" status="setup">Task</ClockerShell>);expect(html).not.toContain('data-clocker-v2="true"');});
it('scopes the approved shell, retains custom brand and translates setup semantics',()=>{const html=renderToStaticMarkup(<ClockerPresentation v2 initialLocale="es"><ClockerShell locationLabel="Office" timeZone="Asia/Tokyo" status="setup" brand={{style:{'--clocker-accent':'#662288'}}}>Task</ClockerShell></ClockerPresentation>);expect(html).toContain('data-clocker-v2="true"');expect(html).toContain('lang="es"');expect(html).toContain('--clocker-accent:#662288');expect(html).toContain('Ir al registro de tiempo');expect(html).not.toContain('Tablet connected');});
it('V2 setup uses one complete language and truthful disabled timekeeping',()=>{const html=renderToStaticMarkup(<ClockerSetup uiV2 initialLocale="es" locationKey="2" locationLabel="Office" timeZone="UTC"/>);expect(html).toContain('Configura esta tableta');expect(html).toContain('Código de configuración');expect(html).not.toContain('clocker-es');expect(html).not.toContain('Marcar entrada');});
it.each([
 ['This punch reference belongs to a different punch. Ask your manager to check it.','Esta referencia pertenece a otra marcación. Pide a tu gerente que la revise.'],
 ['Your PIN check changed. Enter your PIN again; nothing was punched twice.','La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ninguna marcación dos veces.'],
 ["We couldn't confirm your punch. Tap Check Action Status before trying again.",'No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo.'],
])('translates the paired punch recovery message %s', (en,es)=>{expect(clockerText('es',en)).toBe(es);});
it('translates stable PIN/setup codes with legacy-message fallback',async()=>{
 const {clockerErrorText}=await import('./clocker-copy');
 expect(clockerErrorText('es',{code:'PIN_DENIED',error:'Changed wording'})).toBe('PIN no reconocido para esta ubicación. Inténtalo de nuevo o pide ayuda al dueño.');
 expect(clockerErrorText('es',{error:'Enter exactly four PIN digits.'})).toBe('Ingresa exactamente los cuatro dígitos del PIN.');
 expect(clockerErrorText('es',{code:'FUTURE_CODE',error:'Enter exactly four PIN digits.'})).toBe('Ingresa exactamente los cuatro dígitos del PIN.');
});
it('has explicit Spanish entries for every stable PIN/setup failure',async()=>{
 const {CLOCKER_TRANSPORT_ERRORS}=await import('../lib/clocker/transport-errors');
 const {clockerErrorText}=await import('./clocker-copy');
 for(const [code,message] of Object.entries(CLOCKER_TRANSPORT_ERRORS)){
  expect(CLOCKER_COPY[message],code).toBeTruthy();
  expect(clockerErrorText('en',{code,error:'ignored'})).toBe(message);
  expect(clockerErrorText('es',{code})).toBe(CLOCKER_COPY[message]);
 }
});
