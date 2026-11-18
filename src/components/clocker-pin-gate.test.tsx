import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,rs} from '@rstest/core';
import {ClockerPresentation} from './clocker-language';
import {ClockerPinGate,PinRequestError,requestPin} from './clocker-pin-gate';

afterEach(()=>{ rs.unstubAllGlobals(); });
const reply=(status:number,body:object)=>rs.fn(async()=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}}));
const failure=async(status:number,body:object)=>{
 rs.stubGlobal('fetch',reply(status,body));
 return requestPin('main',{action:'verify',employeeId:'AB12',pin:'2468'}).then(()=>{throw Error('expected a failure');},(error:unknown)=>error as PinRequestError);
};

// Jose's approved sign-in (Nov 11, 2026): the Employee ID first, on the tablet's keyboard with capitals, then the PIN.
it('starts at the Employee ID with the tablet keyboard, capitals on and corrections off',()=>{
 const html=renderToStaticMarkup(<ClockerPinGate locationKey="main"/>);
 expect(html).toContain('data-clocker-step="id"');expect(html).toContain('Enter your Employee ID');
 const field=html.match(/<input[^>]*name="employeeId"[^>]*>/)?.[0]??'';
 expect(field).toContain('type="text"');expect(field).toContain('inputMode="text"');expect(field).toMatch(/autoCapitalize="characters"/i);
 expect(field).toMatch(/autoCorrect="off"/i);expect(field).toMatch(/spellCheck="false"/i);expect(field).toMatch(/autoComplete="off"/i);
 expect(html).not.toContain('name="pin"');expect(html).not.toContain('data-clocker-keypad');
 expect(html).toContain('Don’t know your Employee ID? Ask your manager.');
});
it('asks for the Employee ID in Spanish on a Spanish tablet',()=>{
 const html=renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerPinGate locationKey="main"/></ClockerPresentation>);
 expect(html).toContain('Ingresa tu ID de empleado');expect(html).toContain('¿No sabes tu ID de empleado? Pregúntale a tu gerente.');expect(html).not.toContain('Employee ID');
});
it('sends the Employee ID with the PIN and uses the verify reply without a status request',async()=>{
 const fetch=reply(200,{state:'verified',firstName:'Ana',expiresAt:'2026-11-14T12:00:00.000Z'});rs.stubGlobal('fetch',fetch);
 await expect(requestPin('main office',{action:'verify',employeeId:'AB12',pin:'2468'})).resolves.toEqual({state:'verified',firstName:'Ana',expiresAt:'2026-11-14T12:00:00.000Z'});
 expect(fetch).toHaveBeenCalledTimes(1);
 const [url,init]=fetch.mock.calls[0] as unknown as [string,RequestInit];
 expect(url).toBe('/api/clocker/main%20office/pin');expect(JSON.parse(String(init.body))).toEqual({action:'verify',employeeId:'AB12',pin:'2468'});
 const source=await (await import('node:fs/promises')).readFile(new URL('./clocker-pin-gate.tsx',import.meta.url),'utf8');
 expect(source).toContain("{action:'verify',employeeId:id,pin}");expect(source).not.toContain("action:'status'");
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
 expect(device.recover).toBe(true);expect(device.message).toBe('This tablet is no longer set up for this location.');
 // Phase 6: a code the kiosk has never seen gets the kiosk's general sentence, never the server's words.
 const unknown=await failure(400,{code:'FUTURE_CODE',error:'A message the kiosk has never seen.'});
 expect(unknown.message).toBe('We couldn’t check your PIN. Try again, or ask a manager to record your time.');expect(unknown.recover).toBe(false);
});
// Phase 6 (item 1): every refusal reads by its stable code; the server's English sentence never reaches the screen.
it.each([
 [401,{state:'denied',code:'PIN_DENIED',error:'Server words A.'},'Employee ID or PIN not recognized. Check both, or ask your manager.'],
 [503,{state:'unavailable',code:'PIN_UNAVAILABLE',error:'Server words B.'},'We couldn’t reach NEVORA, so your PIN was not checked. Nothing was recorded.'],
 [403,{code:'ORIGIN_REJECTED',error:'Server words C.'},'This tablet did not open the Clocker from its own link. Ask a manager to open it again.'],
 [400,{code:'LOCATION_INVALID',error:'Server words D.'},'This tablet’s link is not valid. Ask a manager to set up this tablet again.'],
 [400,{code:'PIN_INPUT_INVALID',error:'Server words E.'},'Enter exactly four PIN digits.'],
 // An older server that sends no code: the status decides.
 [401,{state:'device_required',error:'Server words F.'},'This tablet is no longer set up for this location.'],
 [401,{error:'Server words G.'},'Employee ID or PIN not recognized. Check both, or ask your manager.'],
 [503,{error:'Server words H.'},'We couldn’t reach NEVORA, so your PIN was not checked. Nothing was recorded.'],
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
