import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,rs} from '@rstest/core';
import {ClockerPresentation} from './clocker-language';
import {ClockerPinGate,PinRequestError,pinStepScroll,requestPin} from './clocker-pin-gate';

afterEach(()=>{ rs.unstubAllGlobals(); });
const reply=(status:number,body:object)=>rs.fn(async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
const failure=async(status:number,body:object)=>{
 rs.stubGlobal('fetch',reply(status,body));
 return requestPin('main',{action:'verify',employeeId:'AB12',pin:'2468'}).then(()=>{throw Error('expected a failure');},(error:unknown)=>error as PinRequestError);
};

// Jose's approved sign-in (Nov 11, 2026): the Employee ID first, on the tablet's keyboard with capitals, then the PIN.
it('starts at the Employee ID with the tablet keyboard, capitals on and corrections off',()=>{
 const html=renderToStaticMarkup(<ClockerPinGate locationKey="main" initialRoster={{kind:'id'}}/>);
 expect(html).toContain('data-clocker-step="id"');expect(html).toContain('Enter your Employee ID');
 const field=html.match(/<input[^>]*name="employeeId"[^>]*>/)?.[0]??'';
 expect(field).toContain('type="text"');expect(field).toContain('inputMode="text"');expect(field).toMatch(/autoCapitalize="characters"/i);
 expect(field).toMatch(/autoCorrect="off"/i);expect(field).toMatch(/spellCheck="false"/i);expect(field).toMatch(/autoComplete="off"/i);
 expect(html).not.toContain('name="pin"');expect(html).not.toContain('data-clocker-keypad');
 expect(html).toContain('Don’t know your Employee ID? Ask your manager.');
});
it('asks for the Employee ID in Spanish on a Spanish tablet',()=>{
 const html=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerPinGate locationKey="main" initialRoster={{kind:'id'}}/></ClockerPresentation>);
 expect(html).toContain('Ingresa tu ID de empleado');expect(html).toContain('¿No sabes tu ID de empleado? Pregúntale a tu gerente.');expect(html).not.toContain('Employee ID');
});
it('sends the Employee ID with the PIN and uses the verify reply without a status request',async()=>{
 const fetch=reply(200,{state:'verified',firstName:'Ana',expiresAt:'2026-11-14T12:00:00.000Z'});rs.stubGlobal('fetch',fetch);
 await expect(requestPin('main office',{action:'verify',employeeId:'AB12',pin:'2468'})).resolves.toEqual({state:'verified',firstName:'Ana',expiresAt:'2026-11-14T12:00:00.000Z'});
 expect(fetch).toHaveBeenCalledTimes(1);
 const [url,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('/api/clocker/main%20office/pin');expect(JSON.parse(String(init.body))).toEqual({action:'verify',employeeId:'AB12',pin:'2468'});
 const source=await (await import('node:fs/promises')).readFile(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');
 expect(source).toContain("verifyBody(sel?{selection:sel}:{employeeId:id},pin)");expect(source).not.toContain("action:'status'");
});
// Jose's approved lockout (Nov 11, 2026): who is paused and for how long come from limitScope and retryAfterSeconds.
it.each([['person','person'],['device','tablet'],['workspace','tablet']] as const)('reads a %s limit as a paused %s with the real wait',async(limitScope,scope)=>{
 const error=await failure(429,{state:'limited',code:'PIN_LIMITED',error:'Reworded by the server.',retryAfterSeconds:187,limitScope});
 expect(error).toBeInstanceOf(PinRequestError);expect(error.status).toBe(429);expect(error.recover).toBe(true);expect(error.code).toBe('PIN_LIMITED');
 expect(error.pause).toEqual({scope,retryAfterSeconds:187});
 // The stable code picks the sentence, not the server's English.
 expect(error.message).toBe('Too many attempts. Wait a few minutes before trying again.');
});
it('falls back to a paused tablet with no time when an older reply carries neither field',async()=>{
 const error=await failure(429,{state:'limited',error:'Too many attempts. Wait a few minutes before trying again.'});
 expect(error.pause).toEqual({scope:'tablet',retryAfterSeconds:null});expect(error.code).toBeNull();
});
it('keeps a wrong entry on the form and a missing tablet registration blocking',async()=>{
 const denied=await failure(401,{state:'denied',code:'PIN_DENIED',error:'PIN not recognized for this location. Try again or ask your manager.'});
 expect(denied.recover).toBe(false);expect(denied.code).toBe('PIN_DENIED');expect(denied.pause).toBeNull();
 const device=await failure(401,{state:'device_required',code:'DEVICE_REQUIRED',error:'Reconnect this tablet before entering an employee PIN.'});
 expect(device.recover).toBe(true);expect(device.message).toBe('Tell a manager. Your Owner sets this tablet up again in Settings\u00a0→ Clocker\u00a0tablets.');
 // Phase 6: a code the kiosk has never seen gets the kiosk's general sentence, never the server's words.
 const unknown=await failure(400,{code:'FUTURE_CODE',error:'A message the kiosk has never seen.'});
 expect(unknown.message).toBe('We couldn’t check your PIN. Try again, or ask a manager to record your time.');expect(unknown.recover).toBe(false);
});
// Phase 6 (item 1): every refusal reads by its stable code; the server's English sentence never reaches the screen.
it.each([
 [401,{state:'denied',code:'PIN_DENIED',error:'Server words A.'},'Employee ID or PIN not recognized. Check your Employee ID and PIN, or ask your manager.'],
 [503,{state:'unavailable',code:'PIN_UNAVAILABLE',error:'Server words B.'},'Your PIN was not checked, and nothing was recorded.'],
 [403,{code:'ORIGIN_REJECTED',error:'Server words C.'},'This tablet did not open the Clocker from its own link. Ask a manager to open it again.'],
 [400,{code:'LOCATION_INVALID',error:'Server words D.'},'This tablet’s link is not valid. Tell a manager.'],
 [400,{code:'PIN_INPUT_INVALID',error:'Server words E.'},'Enter exactly four PIN digits.'],
 // An older server that sends no code: the status decides.
 [401,{state:'device_required',error:'Server words F.'},'Tell a manager. Your Owner sets this tablet up again in Settings\u00a0→ Clocker\u00a0tablets.'],
 [401,{error:'Server words G.'},'Employee ID or PIN not recognized. Check your Employee ID and PIN, or ask your manager.'],
 [503,{error:'Server words H.'},'Your PIN was not checked, and nothing was recorded.'],
 [418,{error:'Server words I.'},'We couldn’t check your PIN. Try again, or ask a manager to record your time.'],
] as const)('reads a %s refusal by its code, not by the server sentence',async(status,body,sentence)=>{
 const error=await failure(status,body);
 expect(error.message).toBe(sentence);expect(error.message).not.toContain('Server words');
});
it('never reads the server sentence in the gate, and never offers sign-in',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');
 expect(source).not.toMatch(/data\??\.error/);expect(source).not.toContain('clockerErrorText(');expect(source).not.toContain('/login');expect(source).not.toContain('href=');
});
// Phase 6 (RA-28): the keypad is a labelled group of real buttons, and the entered count has its own live line.
it('announces the PIN keypad as a group and keeps a live line for the entered count',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');
 expect(source).toContain('role="group" data-clocker-keypad');expect(source).toContain("role=\"status\" data-clocker-pin-count=\"\"");
 expect(source).toContain("t('{count} of 4 digits entered',{count})");
 // The line carries a count, never the field's value.
 expect(source).not.toMatch(/data-clocker-pin-count[^\n]*input\.current/);
});
// Phase 8: the right person for a tablet that is no longer set up (#1), its own heading (#6), "not reached" while online
// (#7), no green done mark when nothing was recorded (#3), and the lockout said once (#28).
it('names who does what, titles each blocked card by its state, and never shows the done mark for nothing recorded',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');
 expect(source).not.toMatch(/Ask a manager to set up this tablet/);expect(source).toContain("'This tablet needs to be set up again'");
 expect(source).toContain("unreachable&&!online?'Time can’t be recorded':unreachable?'Can’t reach NEVORA'");
 expect(source).toContain("online?'unreached':'offline'");
 expect(source).not.toContain('data-tone="green"');expect(source).not.toContain('This screen clears automatically');
 expect(source).not.toMatch(/role="alert"[^\n]*styles\.sr/);
 const {clockerText}=await import('./clocker-copy');
 expect(clockerText('es','This tablet needs to be set up again')).toBe('Hay que configurar esta tableta de nuevo');
 expect(clockerText('es','Can’t reach NEVORA')).toBe('No se puede conectar con NEVORA');expect(clockerText('es','Keep my place')).toBe('Guardar mi lugar');
});

// Final polish, round 2 (C3): the language pill under Continue is shown whole or not at all when the PIN step opens.
it('stops the PIN step with the language pill whole, or out of view, never cut by the screen',()=>{
 // Continue is in view and only the pill is cut (817 to 873 on an 844px screen): scroll until the pill has 8px under it.
 expect(pinStepScroll({viewport:844,cardTop:270,continueBottom:803,footTop:817,footBottom:873})).toBe(37);
 // Everything is in view, so nothing moves.
 expect(pinStepScroll({viewport:932,cardTop:270,continueBottom:803,footTop:817,footBottom:873})).toBe(0);
 // A short phone: the page scrolls for Continue and stops with the pill's top at the screen's edge (no sliver of it).
 expect(pinStepScroll({viewport:568,cardTop:265,continueBottom:725,footTop:731,footBottom:787})).toBe(163);
 // Never past the card's top; without a pill it is Continue with 8px under it; a pill that can't be shown stays put.
 expect(pinStepScroll({viewport:568,cardTop:58,continueBottom:725,footTop:731,footBottom:787})).toBe(50);
 expect(pinStepScroll({viewport:568,cardTop:265,continueBottom:725,footTop:null,footBottom:null})).toBe(165);
 expect(pinStepScroll({viewport:844,cardTop:20,continueBottom:803,footTop:817,footBottom:873})).toBe(0);
});

/* K3 Enter Employee ID (Phase 2, Nov 23, 2026): the Employee ID field and the PIN field are the same size and sit in the same
 * place at every kiosk size, so moving between the two steps doesn't shift the card. At 390x844 the phone rules made the ID
 * field 54px and 6px lower than the 60px PIN field. The browser capture is the evidence (tools/ui-scan,
 * NEVORA_SCAN_CLOCKER_FLOW=k3); this guard keeps the rule pairs. */
it('keeps the Employee ID field the PIN field’s height and place in every media block that sizes either',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('./clocker.module.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const base=css.indexOf('.pin { position: relative;');expect(base).toBeGreaterThan(0);
 // Media blocks after the base field rules (an earlier block is overridden by them).
 const blocks:{query:string;body:string}[]=[];const re=/@media([^{]+)\{/g;let m:RegExpExecArray|null;
 while((m=re.exec(css))){let depth=1,i=re.lastIndex;for(;i<css.length&&depth;i++){if(css[i]==='{')depth++;else if(css[i]==='}')depth--;}if(m.index>base)blocks.push({query:m[1].trim(),body:css.slice(re.lastIndex,i-1)});}
 const value=(body:string,selector:RegExp,prop:string)=>{let found:string|null=null;for(const r of body.matchAll(/([^{}]+)\{([^}]*)\}/g)){if(r[1].split(',').some(s=>selector.test(s.trim()))){const d=new RegExp(`(?:^|;)\\s*${prop}:\\s*([^;]+)`).exec(r[2]);if(d)found=d[1].trim();}}return found;};
 let checked=0;
 for(const {query,body} of blocks){
  const pinH=value(body,/^\.pin$/,'height'),idH=value(body,/^\.idEntry input$/,'height');
  const pinM=value(body,/^\.pin$/,'margin-top'),idM=value(body,/^\.idEntry$/,'margin-top');
  if(pinH||idH){expect([query,idH]).toEqual([query,pinH]);checked++;}
  if(pinM||idM){expect([query,idM]).toEqual([query,pinM]);checked++;}
 }
 expect(checked).toBeGreaterThanOrEqual(4);
});

/* K3/K4 end sweep (Phase 2, Nov 23, 2026): the Continue arrow is sized in rem so it grows at 200% text, and while a refusal
 * shows the PIN field's red border no longer hides its focus: focus is a teal outline outside the border. */
it('sizes the Continue arrow in rem and keeps the PIN field’s focus visible over the error border',async()=>{
 const {readFileSync}=await import('node:fs');
 const css=readFileSync(new URL('./clocker.module.css',import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
 const rule=(selector:string)=>css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')} \\{([^}]*)\\}`))?.[1]??'';
 expect(rule('.continue svg')).toContain('width: 1.25rem');expect(rule('.continue svg')).toContain('height: 1.25rem');
 const html=renderToStaticMarkup(<ClockerPinGate locationKey="main" initialRoster={{kind:'id'}}/>);
 expect(html).toMatch(/class="[^"]*continue[^"]*"[^>]*>(?:(?!<\/button>).)*<svg/);
 const focus=rule('.pin[data-error=true]:focus-within');
 expect(focus).toContain('outline: 3px solid var(--ck-focus)');expect(focus).toContain('outline-offset: 3px');
 // It comes after the error rule, so the error's box-shadow can't override it, and it doesn't use box-shadow itself.
 expect(css.indexOf('.pin[data-error=true]:focus-within')).toBeGreaterThan(css.indexOf('.pin[data-error=true] {'));
 expect(focus).not.toContain('box-shadow');
});
