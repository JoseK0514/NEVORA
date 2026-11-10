import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {clockerText,CLOCKER_COPY} from './clocker-copy';
import {ClockerPresentation,ClockerText} from './clocker-language';
import {ClockerReceipt,clockTime} from './clocker-receipt';
import {ClockerShell} from './clocker-shell';
import {ClockerSetup} from './clocker-setup';
it('translates complete visible and accessible phrases, retaining interpolation',()=>{for(const [en,es] of Object.entries(CLOCKER_COPY)){expect(es.trim()).not.toBe('');expect(clockerText('en',en)).toBe(en);}expect(clockerText('es','Number {number}',{number:4})).toBe('Número 4');expect(clockerText('es','Set up this tablet')).toBe('Configura esta tableta');});
// Direction B (Nov 8, 2026) is the only Clocker presentation: the NEVORA_CLOCKER_UI_V2 switch and the Signature look were
// retired, so this replaces the old "legacy presentation when V2 is off" check with the single kiosk's markers.
it('renders the one Direction B kiosk: band, workspace chip without a logo, no retired V2 marker',()=>{const html=renderToStaticMarkup(<ClockerShell locationLabel="Office" timeZone="UTC" status="setup" workspaceName="Northside Café">Task</ClockerShell>);expect(html).toContain('data-clocker-kiosk=""');expect(html).toContain('Northside Café');expect(html).not.toContain('data-clocker-v2');expect(html).not.toContain('data-mobile-clocker');});
it('shows the company logo chip instead of the workspace name when a logo is set',()=>{const html=renderToStaticMarkup(<ClockerShell locationLabel="Office" timeZone="UTC" status="connected" workspaceName="Northside Café" brand={{logoUrl:'/brand/logo.png'}}>Task</ClockerShell>);expect(html).toContain('src="/brand/logo.png"');expect(html).not.toContain('Northside Café');expect(html).toContain('Tablet registered');});
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
 const files=['clocker-shell.tsx','clocker-setup.tsx','clocker-pin-gate.tsx','clocker-punch-panel.tsx','clocker-recovery.tsx','clocker-receipt.tsx','clocker-photo/punch-photo-flow.tsx','clocker-photo/photo-notice.tsx'];
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
 expect(clockTime(at,'America/Puerto_Rico','en-US')).toBe('Nov 9 · 10:47 PM');
 expect(clockTime(at,'America/Puerto_Rico','es-PR')).toMatch(/^9 nov\.? · 10:47\sp\.\sm\.$/);
 const es=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerReceipt action="CLOCK_IN" performedAt={at} commandId="c1" timeZone="America/Puerto_Rico" locale="es-PR" firstName="Ana"/></ClockerPresentation>);
 expect(es).toContain('Que tengas un buen turno, Ana.');expect(es).toMatch(/Registrado <time[^>]*>[^<]*p\.\sm\.<\/time> Esta pantalla se borra en 8 segundos\./);
 const en=renderToStaticMarkup(<ClockerReceipt action="CLOCK_OUT" performedAt={new Date().toISOString()} timeZone="UTC" locale="en-US" firstName="James"/>);
 expect(en).toMatch(/Saved <time[^>]*>\d{1,2}:\d{2}\s[AP]M<\/time>\. This screen clears in 8 seconds\./);expect(en).toContain('See you next time, James.');expect(en).not.toContain('Action reference');
});
