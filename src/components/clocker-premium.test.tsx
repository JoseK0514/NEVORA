import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from '@rstest/core';
import {QuestionIcon} from '@phosphor-icons/react/dist/ssr/Question';
import {WarningIcon} from '@phosphor-icons/react/dist/ssr/Warning';
import {WarningCircleIcon} from '@phosphor-icons/react/dist/ssr/WarningCircle';
import {WifiSlashIcon} from '@phosphor-icons/react/dist/ssr/WifiSlash';
import {ArrowClockwiseIcon} from '@phosphor-icons/react/dist/ssr/ArrowClockwise';
import {CLOCKER_COPY,clockerText} from './clocker-copy';
import {ClockerIcon} from './clocker-icon';
import {ClockerPresentation} from './clocker-language';
import {ClockerShell} from './clocker-shell';

/* Premium pass, final kiosk review (Nov 18, 2026): one glyph per meaning, one colour per state, and the words the review
 * found wrong. The kiosk is bilingual, so the copy checks run in English and Spanish. */
const svg=(node:React.ReactElement)=>renderToStaticMarkup(node);
const bold={size:24,weight:'bold' as const,'aria-hidden':'true' as const,focusable:'false' as const};

it('draws the product’s glyph for each meaning (spec 3.2, decision 2)',()=>{
 expect(svg(<ClockerIcon name="unknown"/>)).toBe(svg(<QuestionIcon {...bold}/>));
 expect(svg(<ClockerIcon name="stop"/>)).toBe(svg(<WarningCircleIcon {...bold}/>));
 expect(svg(<ClockerIcon name="warning"/>)).toBe(svg(<WarningIcon {...bold}/>));
 expect(svg(<ClockerIcon name="offline"/>)).toBe(svg(<WifiSlashIcon {...bold}/>));
 // The circular arrow stays the Refresh and Try again glyph only.
 expect(svg(<ClockerIcon name="refresh"/>)).toBe(svg(<ArrowClockwiseIcon {...bold}/>));
 expect(readFileSync(new URL('./clocker-icon.tsx',import.meta.url),'utf8')).not.toContain('XCircle');
});

it('gives the band the card’s tone: a setup with no connection is the red stop dot',()=>{
 const shell=(status:'offline'|'unconfirmed'|'connected',locale:'en'|'es'='en')=>renderToStaticMarkup(<ClockerPresentation initialLocale={locale}><ClockerShell locationLabel="Office" timeZone="UTC" status={status}>Task</ClockerShell></ClockerPresentation>);
 expect(shell('offline')).toMatch(/data-tone="stop"[^>]*>.*No connection/);
 expect(shell('offline','es')).toContain('Sin conexión');
 // Gate check (Nov 23): the card's heading says "Setup not confirmed"; the band's pill doesn't repeat it.
 expect(shell('unconfirmed')).toMatch(/data-tone="attn"[^>]*>.*Check needed/);
 expect(shell('connected')).toContain('data-tone="ok"');
 const source=readFileSync(new URL('./clocker-shell.tsx',import.meta.url),'utf8');
 // No connection, NEVORA not reached, a tablet to set up again and punches that can't be saved stop every punch; a pause waits.
 expect(source).toContain("const healthTones: Record<TabletHealth, 'attn' | 'stop'> = { reconnect: 'stop', offline: 'stop', unreached: 'stop', paused: 'attn', storage: 'stop' };");
 const css=readFileSync(new URL('./clocker.module.css',import.meta.url),'utf8');
 expect(css).toContain('.status[data-tone=stop] .dot { background: var(--b-coral);');
});

it('names the screens in both languages without the words the review found wrong',()=>{
 const keys=Object.keys(CLOCKER_COPY),values=Object.values(CLOCKER_COPY);
 // Sign-in starts at the Employee ID: nothing returns "to PIN".
 expect(keys).not.toContain('Return to PIN');expect(values.join(' ')).not.toContain('Volver al PIN');
 expect(clockerText('es','Start over')).toBe('Empezar de nuevo');
 // The Owner's pages show "Clocker recovery"; Spanish names the place as the Owner sees it.
 expect(clockerText('es','Request sent. Your Owner will see it under Clocker recovery.')).toBe('Solicitud enviada. El dueño la verá en Recuperación de Clocker.');
 expect(clockerText('es','Your Owner can find this in Clocker recovery.')).toBe('El dueño puede encontrarla en Recuperación de Clocker.');
 // One Spanish name for the product, and "personal" for the people who clock in.
 expect(values.join(' ')).not.toContain('reloj de asistencia');
 expect(clockerText('es','{device} is ready. Your team can clock in now.')).toContain('Tu personal ya puede marcar.');
 // One verb for a set-up tablet.
 expect(clockerText('es','This shift was started at another location. Use the connected tablet at that location.')).toBe('Este turno comenzó en otra ubicación. Usa la tableta conectada de esa ubicación.');
 for(const value of values)expect(value).not.toMatch(/tableta[^.]*registrada/);expect(keys.join(' ')).not.toContain('registered Clocker');
 // Said once: the unavailable screen's line doesn't repeat its title.
 expect(keys).not.toContain('We couldn’t load your time, so nothing was recorded. Tell a manager if you need your time recorded now.');
 expect(clockerText('es','Nothing was recorded. Tell a manager if you need your time recorded now.')).toBe('No se registró nada. Avísale a un gerente si necesitas que registre tu tiempo ahora.');
 // The setup step's menu path never breaks at its arrow.
 expect(keys).toContain('On another device, the Owner opens Settings → Clocker tablets.');
 // The photo path's plain words.
 for(const key of ['Use this photo','Check if the photo saved','Send the photo again'])expect(CLOCKER_COPY[key],key).toBeTruthy();
 expect(keys).not.toContain('Use photo & continue');
});

it('sets references in the kiosk’s Inter, not system monospace',()=>{
 const css=readFileSync(new URL('./clocker.module.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const reference=css.match(/\.reference code \{[^}]*\}/)?.[0]??'';
 expect(reference).toContain('font-family: inherit');expect(reference).not.toContain('tabular-nums');
 expect(css).not.toMatch(/monospace/);
 // No off-scale 18px inset corner on a state card.
 expect(css).not.toMatch(/\.(blocked|other) \{[^}]*border-radius: 18px/);
});
