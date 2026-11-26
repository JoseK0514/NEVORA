import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import {clockerText,CLOCKER_COPY} from './clocker-copy';
import {ClockerPresentation,ClockerText} from './clocker-language';
import {ClockerReceipt,clockTime} from './clocker-receipt';
import {ClockerShell} from './clocker-shell';
import {ClockerSetup} from './clocker-setup';
it('translates complete visible and accessible phrases, retaining interpolation',()=>{for(const [en,es] of Object.entries(CLOCKER_COPY)){expect(es.trim()).not.toBe('');expect(clockerText('en',en)).toBe(en);}expect(clockerText('es','Number {number}',{number:4})).toBe('Número 4');expect(clockerText('es','Set up this tablet')).toBe('Configura esta tableta');});
// Direction B (Nov 8, 2026) is the only Clocker presentation: the NEVORA_CLOCKER_UI_V2 switch and the Signature look were
// retired, so this replaces the old "legacy presentation when V2 is off" check with the single kiosk's markers.
it('renders the one Direction B kiosk: band, workspace chip without a logo, no retired V2 marker',()=>{const html=renderToStaticMarkup(<ClockerShell locationLabel="Office" timeZone="UTC" status="setup" workspaceName="Northside Café">Task</ClockerShell>);expect(html).toContain('data-clocker-kiosk=""');expect(html).toContain('Northside Café');expect(html).not.toContain('data-clocker-v2');expect(html).not.toContain('data-mobile-clocker');});
it('shows the company logo chip instead of the workspace name when a logo is set',()=>{const html=renderToStaticMarkup(<ClockerShell locationLabel="Office" timeZone="UTC" status="connected" workspaceName="Northside Café" brand={{logoUrl:'/brand/logo.png'}}>Task</ClockerShell>);expect(html).toContain('src="/brand/logo.png"');expect(html).not.toContain('Northside Café');expect(html).toContain('Tablet connected');});
it('scopes the approved shell, retains custom brand and translates setup semantics',()=>{const html=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerShell locationLabel="Office" timeZone="Asia/Tokyo" status="setup" brand={{style:{'--clocker-accent':'#662288'}}}>Task</ClockerShell></ClockerPresentation>);expect(html).toContain('data-clocker-kiosk=""');expect(html).toContain('lang="es"');expect(html).toContain('--clocker-accent:#662288');expect(html).toContain('Ir al registro de tiempo');expect(html).not.toContain('Tablet connected');});
it('setup uses one complete language and truthful disabled timekeeping',()=>{const html=renderToStaticMarkup(<ClockerSetup initialLocale="es" locationKey="2" locationLabel="Office" timeZone="UTC"/>);expect(html).toContain('Configura esta tableta');expect(html).toContain('Código de configuración');expect(html).not.toContain('clocker-es');expect(html).not.toContain('Marcar entrada');});

// Direction B's approved new copy (Jose, Nov 8, 2026) is in the copy module in both languages.
it('carries the approved recorded and recording lines in English and Spanish',()=>{
 expect(clockerText('es','Have a good shift, {first}.',{first:'James'})).toBe('Que tengas un buen turno, James.');
 expect(clockerText('es','See you next time, {first}.',{first:'James'})).toBe('Hasta la próxima, James.');
 expect(clockerText('es','Enjoy your break.')).toBe('Disfruta tu descanso.');expect(clockerText('es','Welcome back.')).toBe('Qué bueno verte de vuelta.');
 expect(clockerText('es','Clocking in {first}…',{first:'Ana'})).toBe('Registrando la entrada de Ana…');expect(clockerText('es','Clocking out {first}…',{first:'Ana'})).toBe('Registrando la salida de Ana…');
 expect(clockerText('es','Starting {first}’s break…',{first:'Ana'})).toBe('Iniciando el descanso de Ana…');expect(clockerText('es','Ending {first}’s break…',{first:'Ana'})).toBe('Terminando el descanso de Ana…');
 expect(clockerText('en','Clocking in {first}…',{first:'Ana'})).toBe('Clocking in Ana…');
});
// Every literal the kiosk passes to t() has its Spanish line, so a Spanish tablet never falls back to the generic sentence.
it('has a Spanish line for every phrase the kiosk screens translate',async()=>{
 const {readFile}=await import('node:fs/promises');
 const files=['clocker-shell.tsx','clocker-setup.tsx','clocker-pin-gate.tsx','clocker-punch-panel.tsx','clocker-recovery.tsx','clocker-receipt.tsx','clocker-fallback.tsx','clocker-paused.tsx','clocker-photo/punch-photo-flow.tsx','clocker-photo/photo-notice.tsx'];
 const missing:string[]=[];
 for(const file of files){const source=await readFile(new URL('./'+file,import.meta.url),'utf8');for(const m of source.matchAll(/\bt\((['"])((?:(?!\1).)+)\1/g))if(!(m[2] in CLOCKER_COPY))missing.push(file+': '+m[2]);}
 expect(missing).toEqual([]);
});

// Nov 10 review (NV-045): every message the Clocker's server sends to the kiosk has its Spanish line.
it('has a Spanish line for every message the Clocker server can send to the kiosk',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sources=['../lib/clocker/pin-transport.server.ts','../lib/clocker/setup.server.ts','../lib/clocker/punch-transport.server.ts','../lib/clocker/punch-command.ts','../lib/clocker/punch-client.ts','../lib/clocker/photo-server/transport.ts'];
 const found=new Set<string>();
 for(const file of sources){const source=await readFile(new URL(file,import.meta.url),'utf8');
  for(const m of source.matchAll(/\berror\s*:\s*'([^']+)'/g))found.add(m[1]);
  // punch-command.ts: the message for each punch error code.
  for(const m of source.matchAll(/^\s*[A-Z_]+:'([^']+)'/gm))found.add(m[1]);
  for(const m of source.matchAll(/PunchRequestError\([^;]*?'([A-Z][^']{15,})'/g))found.add(m[1]);}
 expect(found.size).toBeGreaterThan(25);
 expect([...found].filter(text=>!(text in CLOCKER_COPY))).toEqual([]);
});
it('shows a Spanish tablet an unknown message in English, marked as English, never an unrelated sentence',()=>{
 expect(clockerText('es','A message the kiosk has never seen.')).toBe('A message the kiosk has never seen.');
 const html=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerText text="A message the kiosk has never seen."/>|<ClockerText text="Too many attempts. Wait a few minutes before trying again."/></ClockerPresentation>);
 expect(html).toBe('<span lang="en">A message the kiosk has never seen.</span>|Demasiados intentos. Espera unos minutos antes de reintentar.');
 expect(clockerText('es','PIN not recognized for this location. Try again or ask your manager.')).toContain('tu gerente');
 expect(Object.values(CLOCKER_COPY).join(' ')).not.toContain('acción de tiempo');
});
// Nov 10 review (NV-183, NV-173, NV-303): Intl orders the date, one sentence carries the time, and today's date isn't repeated.
it('orders the receipt date for each language and writes one Saved sentence',()=>{
 const at='2026-11-10T02:47:00Z';
 expect(clockTime(at,'America/Puerto_Rico','en-US')).toBe('Nov 9 · 10:47\u202fPM');
 expect(clockTime(at,'America/Puerto_Rico','es-PR')).toMatch(/^9 nov\.? · 10:47\sp\.\sm\.$/);
 const es=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerReceipt action="CLOCK_IN" performedAt={at} commandId="c1" timeZone="America/Puerto_Rico" locale="es-PR" firstName="Ana"/></ClockerPresentation>);
 expect(es).toContain('Que tengas un buen turno, Ana.');expect(es).toMatch(/Guardado el <time[^>]*>[^<]*p\.\sm\.<\/time> <span[^>]*>Se borra en 8 segundos\.<\/span>/);
 const en=renderToStaticMarkup(<ClockerReceipt action="CLOCK_OUT" performedAt={new Date().toISOString()} timeZone="UTC" locale="en-US" firstName="James"/>);
 // K11 (Nov 23, 2026): today the large time already says when, so the line under it is only the countdown: the time
 // appears once on the receipt (it read "1:40 AM" and "Saved at 1:40 AM.").
 expect(en).toMatch(/<p role="status"[^>]*>This screen clears in 8 seconds\.<\/p>/);expect(en).not.toContain('Saved');
 expect(en.match(/<time /g)).toHaveLength(1);
 const today=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerReceipt action="CLOCK_IN" performedAt={new Date().toISOString()} timeZone="UTC" locale="es-PR" firstName="Ana"/></ClockerPresentation>);
 expect(today).toMatch(/<p role="status"[^>]*>Esta pantalla se borra en 8 segundos\.<\/p>/);expect(today).not.toContain('Guardado');expect(today.match(/<time /g)).toHaveLength(1);expect(en).toContain('See you next time, James.');expect(en).not.toContain('Reference');
});
it.each([
 ['This punch reference belongs to a different punch. Ask your manager to check it.','Esta referencia pertenece a otra marcación. Pide a tu gerente que la revise.'],
 ['Your PIN check changed. Enter your PIN again; nothing was punched twice.','La verificación de tu PIN cambió. Ingresa tu PIN de nuevo; no se registró ninguna marcación dos veces.'],
 ["We couldn't confirm your punch. Tap Check Action Status before trying again.",'No pudimos confirmar tu marcación. Toca Verificar estado de la acción antes de volver a intentarlo.'],
])('translates the paired punch recovery message %s', (en,es)=>{expect(clockerText('es',en)).toBe(es);});
it('translates stable PIN/setup codes with legacy-message fallback',async()=>{
 const {clockerErrorText}=await import('./clocker-copy');
 expect(clockerErrorText('es',{code:'PIN_DENIED',error:'Changed wording'})).toBe('PIN no reconocido para esta ubicación. Inténtalo de nuevo o pide ayuda a tu gerente.');
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

// Nov 14 inspection (BR-10): kiosk buttons and headings are sentence case, in plain words, with their Spanish lines.
it('uses sentence case and plain words for the kiosk actions',()=>{
 for(const gone of ['Clock In','Clock Out','Clock In recorded','Clock Out recorded','Clock Out?','Confirm Clock Out','Try Again','Refresh clock state','Help with a saved action','Hide saved action help','Action reference'])expect(CLOCKER_COPY,gone).not.toHaveProperty([gone]);
 expect(clockerText('es','Clock in')).toBe('Marcar entrada');expect(clockerText('es','Clock out')).toBe('Marcar salida');
 expect(clockerText('es','Clock in recorded')).toBe('Entrada registrada');expect(clockerText('es','Clock out recorded')).toBe('Salida registrada');
 expect(clockerText('es','Confirm clock out')).toBe('Confirmar salida');expect(clockerText('es','Try again')).toBe('Intentar de nuevo');
 expect(clockerText('es','Refresh')).toBe('Actualizar');expect(clockerText('es','Something didn’t save?')).toBe('¿Algo no se guardó?');expect(clockerText('es','Reference')).toBe('Referencia');
 const receipt=renderToStaticMarkup(<ClockerReceipt action="CLOCK_IN" performedAt="2026-11-10T02:47:00Z" commandId="c1" timeZone="UTC" locale="en-US" firstName="Ana"/>);
 expect(receipt).toContain('Reference');expect(receipt).not.toContain('Action reference');
});
// Jose's approved lockout wording (Nov 11, 2026): the real wait as a clock time, in each language.
it('writes when a pause ends as one sentence in English and Spanish',async()=>{
 const {clockerRetryText}=await import('./clocker-copy');
 expect(clockerRetryText('en','10:58 PM','10')).toBe('Try again at 10:58 PM.');
 expect(clockerRetryText('es','10:58 p. m.','10')).toBe('Inténtalo de nuevo a las 10:58 p. m.');
 expect(clockerRetryText('es','1:05 p. m.','1')).toBe('Inténtalo de nuevo a la 1:05 p. m.');
 expect(clockerText('es','Your PIN is paused')).toBe('Tu PIN está en pausa');expect(clockerText('es','This tablet is paused')).toBe('Esta tableta está en pausa');
 expect(Object.keys(CLOCKER_COPY).join(' ')).not.toContain('about five minutes');
});
// Nov 14 inspection (JR-26): a disabled time clock names the next step.
it('gives a next step when punches are not enabled',()=>{
 expect(clockerText('es','Ask your Owner to contact NEVORA support.')).toBe('Pide al dueño que contacte al soporte de NEVORA.');
});
// Nov 14 inspection (RA-4): the kiosk's own error and loading screens, in the tablet's language, with no sign-in link.
it('renders the kiosk error and loading screens without a sign-in link',async()=>{
 const {ClockerErrorScreen,ClockerLoadingScreen}=await import('./clocker-fallback');
 const error=renderToStaticMarkup(<ClockerErrorScreen retry={()=>{}}/>);
 expect(error).toContain('data-clocker-kiosk=""');expect(error).toContain('lang="en"');expect(error).toContain('The time clock hit a problem');
 // Phase 8 (#18, #28): the band keeps its clock, and the line under the heading is the one alert (no hidden copy).
 expect(error).toContain('<time class=');expect(error).toMatch(/<p role="alert"[^>]*>Tap Try\u00a0again\. If it happens again, ask a manager to record your time\.<\/p>/);expect(error.match(/role="alert"/g)).toHaveLength(1);
 expect(error).toMatch(/<button[^>]*>.*Try again<\/button>/);
 expect(error).not.toContain('<a ');expect(error).not.toMatch(/sign in/i);
 const loading=renderToStaticMarkup(<ClockerLoadingScreen/>);
 expect(loading).toContain('data-clocker-kiosk=""');expect(loading).toContain('aria-busy="true"');expect(loading).toContain('Checking this tablet…');expect(loading).not.toContain('<a ');
 expect(clockerText('es','The time clock hit a problem')).toBe('El registro de tiempo tuvo un problema');
 expect(clockerText('es','Tap Try again. If it happens again, ask a manager to record your time.')).toBe('Toca Intentar de nuevo. Si vuelve a pasar, pide a un gerente que registre tu tiempo.');
});
// Nov 14 inspection (RA-13, JR-12): the paused page speaks the tablet's language and never offers sign-in on the tablet.
it('renders the paused page in the given language with billing on the Owner’s own device',async()=>{
 const {ClockerPaused}=await import('./clocker-paused');
 const en=renderToStaticMarkup(<ClockerPaused from="/clocker/main" unavailable={false} initialLocale="en"/>);
 expect(en).toContain('lang="en"');expect(en).toContain('This time clock is paused');expect(en).toMatch(/<a [^>]*href="\/clocker\/main"[^>]*>Try again<\/a>/);expect(en).not.toContain('>Clocker<');expect(en).toContain('Open billing on your own device. This tablet starts working again when billing is settled.');
 expect(en).toContain('href="/clocker/main"');expect(en).not.toContain('/login');expect(en).not.toContain('Owner sign in');
 const es=renderToStaticMarkup(<ClockerPaused from={null} unavailable initialLocale="es"/>);
 expect(es).toContain('lang="es"');expect(es).toContain('No se pudo verificar el acceso');expect(es).toContain('Abre la facturación en tu propio dispositivo.');
 expect(es).not.toContain('cuando la facturación esté al día');expect(es).not.toContain('<a ');
});
