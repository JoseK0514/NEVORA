import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {expect,it,rs} from '@rstest/core';
import {CLOCKER_COPY,CLOCKER_PUNCH_ERRORS,CLOCKER_PUNCH_ERROR_FALLBACK,CLOCKER_PIN_ERROR_FALLBACK,clockerOthersSavedText,clockerPinErrorKey,clockerPunchErrorKey,clockerText,clockerUnconfirmedText} from './clocker-copy';
import {CLOCKER_TRANSPORT_ERRORS} from '../lib/clocker/transport-errors';
import {ClockerPresentation} from './clocker-language';
import {ClockerReceipt,receiptFacts} from './clocker-receipt';
import {ClockerErrorScreen} from './clocker-fallback';
import {ClockerPaused} from './clocker-paused';
import {ClockerNotFoundBody} from '../app/clocker/[location]/not-found-body';

/* Phase 6 (Nov 17, 2026): the kiosk's clock-in flow. The kiosk is bilingual on screen, so these render both languages. */
rs.mock('next/link',()=>({default:({href,children,...props}:ComponentProps<'a'>)=>createElement('a',{href,...props},children)}));
const source=(file:string)=>readFile(new URL(file,import.meta.url),'utf8');
const KIOSK_FILES=['clocker-shell.tsx','clocker-pin-gate.tsx','clocker-punch-panel.tsx','clocker-recovery.tsx','clocker-receipt.tsx','clocker-fallback.tsx','clocker-paused.tsx','clocker-photo/punch-photo-flow.tsx','clocker-photo/photo-notice.tsx','../app/clocker/[location]/not-found-body.tsx'];

// Item 1: stable error codes.
it('has a kiosk sentence, in both languages, for every punch code the server can send',async()=>{
 const text=await source('../lib/clocker/punch-command.ts');
 const codes=[...(text.match(/export type PunchErrorCode = ([^;]+);/)?.[1]??'').matchAll(/'([A-Z_]+)'/g)].map(m=>m[1]);
 expect(codes.length).toBeGreaterThanOrEqual(13);
 for(const code of codes){
  if(code==='UNAVAILABLE'){expect(clockerPunchErrorKey(code)).toBeNull();continue;}
  const sentence=clockerPunchErrorKey(code);
  expect(sentence,code).toBe(CLOCKER_PUNCH_ERRORS[code]);expect(CLOCKER_COPY[sentence!],code).toBeTruthy();
  // The kiosk's sentence, not the server's.
  expect(text,code).not.toContain(`'${sentence}'`);
 }
 expect(clockerPunchErrorKey('FUTURE_CODE')).toBe(CLOCKER_PUNCH_ERROR_FALLBACK);expect(CLOCKER_COPY[CLOCKER_PUNCH_ERROR_FALLBACK]).toBeTruthy();
 expect(clockerPunchErrorKey(undefined)).toBeNull();
});
it('has a kiosk sentence, in both languages, for every code the PIN route can send',async()=>{
 const text=await source('../lib/clocker/pin-transport.server.ts');
 const codes=[...new Set([...text.matchAll(/code:'([A-Z_]+)'/g)].map(m=>m[1]))];
 expect(codes).toEqual(expect.arrayContaining(['ORIGIN_REJECTED','LOCATION_INVALID','PIN_INPUT_INVALID','DEVICE_REQUIRED','PIN_DENIED','PIN_LIMITED','PIN_UNAVAILABLE']));
 // The origin check can also answer with the setup codes it shares (setup.server.ts clockerOriginFailure).
 for(const code of [...codes,'SETUP_UNAVAILABLE']){
  const sentence=clockerPinErrorKey({code});
  expect(sentence,code).not.toBe(CLOCKER_PIN_ERROR_FALLBACK);expect(CLOCKER_COPY[sentence],code).toBeTruthy();
  expect(Object.keys(CLOCKER_TRANSPORT_ERRORS)).toContain(code);
 }
 expect(CLOCKER_COPY[CLOCKER_PIN_ERROR_FALLBACK]).toBeTruthy();
});
it('says what to do next in every error sentence, and never "sign in"',()=>{
 const sentences=[...Object.values(CLOCKER_PUNCH_ERRORS),CLOCKER_PUNCH_ERROR_FALLBACK,CLOCKER_PIN_ERROR_FALLBACK,
  ...['PIN_DENIED','PIN_LIMITED','ORIGIN_REJECTED','LOCATION_INVALID'].map(code=>clockerPinErrorKey({code}))];
 for(const sentence of sentences){
  expect(sentence).not.toMatch(/sign in|log in|password/i);expect(CLOCKER_COPY[sentence]).not.toMatch(/iniciar sesión|contraseña/i);
  expect(sentence).not.toMatch(/payload|operation|entity|resource|command|request id|verification id/i);
 }
});
it('never draws a server sentence on the staff-facing screens',async()=>{
 for(const file of ['clocker-pin-gate.tsx','clocker-punch-panel.tsx','clocker-recovery.tsx','clocker-fallback.tsx']){
  const text=await source('./'+file);
  expect(text,file).not.toMatch(/data\??\.error/);expect(text,file).not.toContain('clockerErrorText(');
  expect(text,file).not.toMatch(/PunchRequestError\?error\.message/);
 }
});
it('has a Spanish line for every phrase the Phase 6 screens translate',async()=>{
 const missing:string[]=[];
 for(const file of KIOSK_FILES){const text=await source('./'+file);for(const m of text.matchAll(/\bt\((['"])((?:(?!\1).)+)\1/g))if(!(m[2] in CLOCKER_COPY))missing.push(file+': '+m[2]);
  // Phrases chosen in a ternary inside t(...).
  for(const m of text.matchAll(/[?:]\s*'([A-Z][^'\n]{12,}[.…?])'/g))if(/\bt\(/.test(text)&&!(m[1] in CLOCKER_COPY)&&!/^[A-Z_]+$/.test(m[1]))missing.push(file+' (ternary): '+m[1]);}
 expect(missing).toEqual([]);
});
it('keeps system words and title case out of the kiosk copy the staff see',async()=>{
 const shown=new Set<string>();
 for(const file of KIOSK_FILES.filter(file=>!file.includes('photo')&&!file.includes('shell'))){const text=await source('./'+file);for(const m of text.matchAll(/\bt\((['"])((?:(?!\1).)+)\1/g))shown.add(m[2]);}
 for(const phrase of shown){
  expect(phrase,phrase).not.toMatch(/clock state|action status|saved action|action reference|recovery record|recovery data|browser storage|tablet verification|original action|review request/i);
  expect(phrase,phrase).not.toMatch(/!|—|\bsimply\b|\bjust\b|seamlessly|successfully|Oops/);
 }
 for(const gone of ['Check action status','Retry same action','Review current status','Clock state unavailable','Browser storage needed','Previous action needs review','Recording your action…'])
  for(const file of ['clocker-punch-panel.tsx','clocker-recovery.tsx'])expect(await source('./'+file),gone).not.toContain(`'${gone}'`);
});

// Item 3: other people's saved punches, as a count only.
it('counts other people’s saved punches in the singular and the plural, in both languages',()=>{
 expect(clockerOthersSavedText('en',0)).toBe('');expect(clockerOthersSavedText('en',-1)).toBe('');expect(clockerOthersSavedText('en',1.5)).toBe('');
 expect(clockerOthersSavedText('en',1)).toBe('1 more saved on this tablet.');expect(clockerOthersSavedText('en',2)).toBe('2 more saved on this tablet.');
 expect(clockerOthersSavedText('es',1)).toBe('1 más guardada en esta tableta.');expect(clockerOthersSavedText('es',4)).toBe('4 más guardadas en esta tableta.');
});

// Item 5: a result that is not confirmed is never "failed" and never "saved".
it('names the action that is not confirmed, with its time when the tablet knows it',()=>{
 expect(clockerUnconfirmedText('en','CLOCK_IN','9:02 AM')).toBe('Your clock in at 9:02 AM is not confirmed yet.');
 expect(clockerUnconfirmedText('en','END_BREAK',null)).toBe('Your break end is not confirmed yet.');
 expect(clockerUnconfirmedText('es','CLOCK_OUT','5:30 p. m.')).toBe('Tu salida de las 5:30 p. m. aún no está confirmada.');
 // Phase 8 (#34): no brackets, and "de la 1:05".
 expect(clockerUnconfirmedText('es','CLOCK_IN','1:05 p. m.')).toBe('Tu entrada de la 1:05 p. m. aún no está confirmada.');
 expect(clockerUnconfirmedText('es','CLOCK_IN','11:05 a. m.')).toBe('Tu entrada de las 11:05 a. m. aún no está confirmada.');
 expect(clockerUnconfirmedText('es','START_BREAK',null)).toBe('El inicio de tu descanso aún no está confirmado.');
 for(const action of ['CLOCK_IN','CLOCK_OUT','START_BREAK','END_BREAK'])for(const time of ['9:02 AM',null])
  expect(clockerUnconfirmedText('en',action,time)).not.toMatch(/failed|not saved|is saved|recorded/i);
});
it('shows the kiosk error screen with a no-connection wording set in both languages and no link',()=>{
 const en=renderToStaticMarkup(<ClockerErrorScreen retry={()=>{}}/>);
 expect(en).toContain('The time clock hit a problem');expect(en).not.toContain('<a ');
 for(const key of ['This tablet is offline, so nothing can be recorded right now.','Tell a manager so your time gets recorded.','This tablet checks again by itself when the connection returns.','No connection. This tablet checks again by itself when it returns.','This tablet checks again by itself.'])
  expect(clockerText('es',key),key).not.toBe(key);
});

// Item 4: the receipt.
const at='2026-11-17T21:30:00Z',zone='America/Puerto_Rico';
const entry={id:'te-1',locationId:'loc-1',clockInAt:'2026-11-17T13:04:00Z',status:'CLOCKED_IN' as const,version:2};
it('adds the next useful fact from what the reply and the screen already hold',()=>{
 const out=receiptFacts({action:'CLOCK_OUT',performedAt:at,timeEntryId:'te-1',breakEntryId:null},{revision:4,entry,break:null},zone);
 expect(out).toEqual([{label:'Clocked in at',value:'9:04\u202fAM',dateTime:entry.clockInAt},{label:'Clocked in for',value:'8 h 26 min',translate:false}]);
 const pause={id:'br-1',breakStartAt:'2026-11-17T21:18:20Z',version:1,type:null};
 expect(receiptFacts({action:'END_BREAK',performedAt:at,timeEntryId:'te-1',breakEntryId:'br-1'},{revision:5,entry:{...entry,status:'ON_BREAK'},break:pause},zone))
  .toEqual([{label:'Break started at',value:'5:18\u202fPM',dateTime:pause.breakStartAt},{label:'Break length',value:'11 min',translate:false}]);
 const type={id:'bt-1',version:1,name:'Rest break',category:'REST' as const,targetMinutes:10};
 expect(receiptFacts({action:'START_BREAK',performedAt:at,timeEntryId:'te-1',breakEntryId:'br-2',breakType:type},{revision:4,entry,break:null},zone))
  .toEqual([{label:'Break type',value:'Rest break'},{label:'Suggested length',value:'{minutes} min',translate:true,params:{minutes:10}}]);
 expect(receiptFacts({action:'START_BREAK',performedAt:at,timeEntryId:'te-1',breakEntryId:'br-2',breakType:{...type,targetMinutes:null}},null,zone)).toEqual([{label:'Break type',value:'Rest break'}]);
 // Clock in: the reply carries nothing more. A screen that held another shift or break adds nothing.
 expect(receiptFacts({action:'CLOCK_IN',performedAt:at,timeEntryId:'te-9',breakEntryId:null},{revision:0,entry:null,break:null},zone)).toEqual([]);
 expect(receiptFacts({action:'CLOCK_OUT',performedAt:at,timeEntryId:'te-OTHER',breakEntryId:null},{revision:4,entry,break:null},zone)).toEqual([]);
 expect(receiptFacts({action:'END_BREAK',performedAt:at,timeEntryId:'te-1',breakEntryId:'br-OTHER'},{revision:5,entry:{...entry,status:'ON_BREAK'},break:pause},zone)).toEqual([]);
 expect(receiptFacts({action:'CLOCK_OUT',performedAt:at,timeEntryId:'te-1',breakEntryId:null},undefined,zone)).toEqual([]);
});
it.each([['en','en-US'],['es','es-PR']] as const)('renders every receipt complete in %s: what, when, who, the fact, the countdown',(lang,intl)=>{
 const facts=receiptFacts({action:'CLOCK_OUT',performedAt:at,timeEntryId:'te-1',breakEntryId:null},{revision:4,entry,break:null},zone,intl);
 const out=renderToStaticMarkup(<ClockerPresentation initialLocale={lang}><ClockerReceipt action="CLOCK_OUT" performedAt={at} commandId="c1" timeZone={zone} locale={intl} firstName="Ana" facts={facts}/></ClockerPresentation>);
 expect(out).toContain(lang==='en'?'See you next time, Ana.':'Hasta la próxima, Ana.');
 expect(out).toContain(lang==='en'?'Clocked in at':'Entrada');expect(out).toContain(lang==='en'?'Clocked in for':'Tiempo en turno');expect(out).toContain('8 h 26 min');
 expect(out).toContain('data-clocker-receipt-facts');expect(out).toMatch(/role="status"/);expect(out).toContain(lang==='en'?'This screen clears in 8 seconds.':'Se borra en 8 segundos.');
 const start=renderToStaticMarkup(<ClockerPresentation initialLocale={lang}><ClockerReceipt action="START_BREAK" performedAt={at} timeZone={zone} locale={intl} firstName="Ana"
  facts={receiptFacts({action:'START_BREAK',performedAt:at,timeEntryId:'te-1',breakEntryId:'br-2',breakType:{id:'bt-1',version:1,name:'Rest break',category:'REST',targetMinutes:10}},null,zone,intl)}/></ClockerPresentation>);
 expect(start).toContain(lang==='en'?'Enjoy your break, Ana.':'Disfruta tu descanso, Ana.');expect(start).toContain(lang==='en'?'Suggested length':'Duración sugerida');expect(start).toContain('10 min');
 const end=renderToStaticMarkup(<ClockerPresentation initialLocale={lang}><ClockerReceipt action="END_BREAK" performedAt={at} timeZone={zone} locale={intl} firstName="Ana"/></ClockerPresentation>);
 expect(end).toContain(lang==='en'?'Welcome back, Ana.':'Qué bueno verte de vuelta, Ana.');
 // Nothing another person in line should not see.
 for(const html of [out,start,end])expect(html).not.toMatch(/\$|pay\b|wage|this week|esta semana|pago/i);
 if(lang==='es')for(const html of [out,start,end])expect(html).not.toMatch(/Clocked|Saved|Since|Break|Welcome|Enjoy|Reference|screen/);
});
it('keeps the approved break lines when the receipt has no name',()=>{
 expect(renderToStaticMarkup(<ClockerReceipt action="START_BREAK" performedAt={at} timeZone={zone} locale="en-US" firstName=""/>)).toContain('Enjoy your break.');
 expect(renderToStaticMarkup(<ClockerReceipt action="END_BREAK" performedAt={at} timeZone={zone} locale="en-US" firstName=""/>)).toContain('Welcome back.');
});

// Items 6 to 8: language and shared-tablet honesty.
it('renders the paused page with the tablet’s own language switch and no sign-in',()=>{
 const en=renderToStaticMarkup(<ClockerPaused from="/clocker/main" unavailable={false} initialLocale="en"/>);
 expect(en).toContain('data-clocker-language=""');expect(en).toContain('aria-label="Español, switch language to Spanish"');
 expect(en).toContain('Open billing on your own device.');expect(en).toContain('Until then, ask a manager to record your time.');
 expect(en).not.toContain('/login');expect(en).not.toMatch(/sign in/i);
 const es=renderToStaticMarkup(<ClockerPaused from="/clocker/main" unavailable={false} initialLocale="es"/>);
 expect(es).toContain('aria-label="English, cambiar idioma a inglés"');expect(es).toContain('Mientras tanto, pide a un gerente que registre tu tiempo.');expect(es).not.toMatch(/iniciar sesión/i);
});
it.each(['en','es'] as const)('renders the Clocker’s own not-found page in %s: who can fix it, one legal line, no sign-in',lang=>{
 const html=renderToStaticMarkup(<ClockerNotFoundBody initialLocale={lang} legal={{en:<p className="q-legal">EN LEGAL</p>,es:<p className="q-legal">ES LEGAL</p>}}/>);
 expect(html).toContain(`lang="${lang}"`);expect(html).toContain('data-clocker-not-found=""');expect(html).toContain('nf-card');
 // Premium pass (#23): one Spanish name for the product, "registro de tiempo", as on every other kiosk screen; (#22) the band
 // names the place, not "Error 404".
 expect(html).toContain(lang==='en'?'This time clock link doesn’t work':'El enlace de este registro de tiempo no funciona');
 expect(html).not.toContain('404');expect(html).toContain(lang==='en'?'>Time clock</p>':'>Registro de tiempo</p>');
 // Phase 8 (#1): staff tell a manager; only the Owner sets a tablet up again (Settings is Owner only).
 expect(html).toContain(lang==='en'?'<strong>Tell a manager</strong> Your Owner sets this tablet up again in':'<strong>Avísale a un gerente</strong> El dueño vuelve a configurar esta tableta en');
 expect(html).not.toMatch(/manager or Owner|gerente o el dueño/);
 expect(html).toContain(lang==='en'?'Until then, ask a manager to record your time.':'Mientras tanto, pide a un gerente que registre tu tiempo.');
 expect(html).toContain(lang==='en'?'EN LEGAL':'ES LEGAL');expect(html).not.toContain(lang==='en'?'ES LEGAL':'EN LEGAL');
 expect(html.match(/q-legal/g)).toHaveLength(1);expect(html).not.toContain('login-brand');expect(html).not.toContain('brand-legal');
 expect(html).not.toContain('/login');expect(html).not.toMatch(/sign in|iniciar sesión/i);expect(html).not.toContain('<a ');
 expect(html).toContain('data-clocker-language=""');expect(html).toMatch(/<button[^>]*>[^<]*(Try again|Intentar de nuevo)<\/button>/);
 if(lang==='es')expect(html).not.toMatch(/time clock|manager|Owner can|Try again/);
});
it('starts a tablet with no saved choice in the language the page was served in',()=>{
 const html=(lang?:'en'|'es')=>renderToStaticMarkup(<ClockerPresentation initialLocale={lang}><ClockerErrorScreen retry={()=>{}}/></ClockerPresentation>);
 // The error screen brings its own language source: English on the server, the browser's first language once live.
 expect(html()).toContain('lang="en"');
});
it('says what punches being off means and who can turn them on',()=>{
 for(const key of ['Clocking in is not turned on for this workplace yet.','Nothing was recorded this time.','Your Owner can ask NEVORA support to turn it on. Until then, ask a manager to record your time.','Your PIN works on this tablet.'])
  expect(clockerText('es',key),key).not.toBe(key);
});

// Item 10: accessibility, as far as a stylesheet and markup can be checked without a browser.
it('keeps every kiosk control at 56px and paints focus and edges in forced colours',async()=>{
 const css=(await source('./clocker.module.css')).replace(/\/\*[\s\S]*?\*\//g,'');
 expect(css).not.toMatch(/min-height:\s*48px/);expect(css).not.toMatch(/--ck-btn:\s*52px/);
 for(const rule of [/\.link \{[^}]*min-height: 56px/,/\.lang \{[^}]*min-height: 56px/,/\.back \{[^}]*width: 56px; height: 56px/,/\.reference summary \{[^}]*min-height: 56px/])expect(css).toMatch(rule);
 const forced=css.slice(css.indexOf('@media (forced-colors: active)'));
 expect(forced).toMatch(/\.btn, \.key, \.act, \.lang, \.langSolid, \.back \{ border: 2px solid ButtonText; \}/);
 expect(forced).toMatch(/\.slots > span\[data-filled=true\] \{ background: CanvasText; \}/);expect(forced).toMatch(/outline: 3px solid Highlight/);
 // The PIN field and the Employee ID keep a transparent outline that forced colours can paint (round 1, RA-17).
 expect(css).toMatch(/\.pin:focus-within \{ outline: 2px solid transparent/);expect(css).toMatch(/\.idEntry input:focus-visible \{ outline: 2px solid transparent/);
});
