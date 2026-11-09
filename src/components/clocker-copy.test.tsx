import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {clockerText,CLOCKER_COPY} from './clocker-copy';
import {ClockerPresentation} from './clocker-language';
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
 const files=['clocker-shell.tsx','clocker-setup.tsx','clocker-pin-gate.tsx','clocker-punch-panel.tsx','clocker-recovery.tsx','clocker-photo/punch-photo-flow.tsx'];
 const missing:string[]=[];
 for(const file of files){const source=await readFile(new URL('./'+file,import.meta.url),'utf8');for(const m of source.matchAll(/\bt\((['"])((?:(?!\1).)+)\1/g))if(!(m[2] in CLOCKER_COPY))missing.push(file+': '+m[2]);}
 expect(missing).toEqual([]);
});
