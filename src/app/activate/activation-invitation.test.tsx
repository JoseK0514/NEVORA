import {expect,it} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
import {takeActivationFragment,ActivationInvitationView,readActivationResult} from './activation-invitation';

const wrapped='nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(100)+'.'+'A'.repeat(22);
it.each(['#'+wrapped,'#proof='+wrapped])('scrubs and retains an isolated invitation envelope unchanged',hash=>{
 const calls:unknown[][]=[];
 expect(takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}})).toBe(wrapped);
 expect(calls).toEqual([[null,'','/activate']]);
});
it.each([wrapped+'?private=1',wrapped+'&proof=other',wrapped.replace('nw1_','nw2_'),'%6E'+wrapped.slice(1),wrapped+'\n','nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(4096)+'.'+'A'.repeat(22)])('scrubs but rejects a malformed or ambiguous isolated proof',proof=>{
 expect(takeActivationFragment({hash:'#proof='+proof,pathname:'/activate'},{replaceState:()=>{}})).toBeNull();
});

it.each(['#'+'A'.repeat(43),'#proof='+'A'.repeat(43)])('scrubs the complete URL before returning a canonical fragment proof',hash=>{
 const calls:unknown[][]=[];const proof=takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}});
 expect(calls).toEqual([[null,'','/activate']]);expect(proof).toBe('A'.repeat(43));
});
it.each(['','#bad','#proof='+'A'.repeat(43)+'&proof=other','#%41'+'A'.repeat(42),'#'+'B'.repeat(43)])('scrubs but rejects malformed or ambiguous proof input',hash=>{
 const calls:unknown[][]=[];expect(takeActivationFragment({hash,pathname:'/activate'},{replaceState:(...args:unknown[])=>{calls.push(args);}})).toBeNull();expect(calls).toEqual([[null,'','/activate']]);
});
it('never releases the proof when history scrubbing fails',()=>{expect(()=>takeActivationFragment({hash:'#'+'A'.repeat(43),pathname:'/activate'},{replaceState:()=>{throw new Error('denied');}})).toThrow('Invitation could not be opened safely.');});
it.each(['missing','invalid'] as const)('offers a normal sign-in/help route without a no-proof activation fallback (%s)',phase=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase={phase} loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('href="/login"');expect(html).not.toContain('<form');expect(html).not.toContain('name="phone"');expect(html).not.toContain('name="employeeId"');
});
it('does not offer another potentially completed activation after an uncertain outcome',()=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase="outcome_unknown" loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('href="/login"');expect(html).not.toContain('type="submit"');
});

it.each([{state:['activated']},{state:'activated',proof:'private'},{state:'other'},null])('rejects malformed/expanded public result envelopes before using them',value=>{expect(()=>readActivationResult(value)).toThrow();});
it('accepts the own login ID only in the exact confirmed-success envelope',()=>{expect(readActivationResult({state:'activated',employeeId:'OWN-FIXTURE-ID'})).toEqual({state:'activated',employeeId:'OWN-FIXTURE-ID'});});
it('accepts only recognized password rejection reasons and preserves a usable invitation form',()=>{
 expect(readActivationResult({state:'invalid',passwordReason:'breached'})).toEqual({state:'invalid',passwordReason:'breached'});
 expect(()=>readActivationResult({state:'invalid',passwordReason:'untrusted value'})).toThrow();
 const html=renderToStaticMarkup(<ActivationInvitationView phase="ready" passwordReason="breached" lang="es" loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('filtración conocida');expect(html).toContain('<form');expect(html).toContain('minLength="15"');
});
it.each([{state:'activated'},{state:'activated',employeeId:''},{state:'activated',employeeId:['OWN-FIXTURE-ID']},{state:'invalid',employeeId:'OWN-FIXTURE-ID'},{state:'unavailable',employeeId:'OWN-FIXTURE-ID'},{state:'outcome_unknown',employeeId:'OWN-FIXTURE-ID'}])('rejects missing success identity and any failure identity',value=>{expect(()=>readActivationResult(value)).toThrow();});
it('keeps a confirmed recipient ID visible until explicit normal sign-in',()=>{const html=renderToStaticMarkup(<ActivationInvitationView phase="activated" employeeId="OWN-FIXTURE-ID" loginHref="/login?activated=1" onSubmit={()=>{}}/>);expect(html).toContain('OWN-FIXTURE-ID');expect(html).toContain('Continue to sign in');expect(html).toContain('href="/login?activated=1"');});
// Inspection Nov 14, 2026.
it.each([['en','This link has expired or was already used.','Ask your Owner or manager to send a new invitation.','Already set up? Sign in'],['es','Este enlace venció o ya se usó.','Pide al dueño o a tu gerente que te envíe una invitación nueva.','¿Ya configuraste tu cuenta? Inicia sesión']] as const)('an expired, used or unreadable link has its own message and one next step, in %s (PB-007)',(lang,message,next,signIn)=>{
 const invalid=renderToStaticMarkup(<ActivationInvitationView phase="invalid" lang={lang} loginHref="/login?activated=1" onSubmit={()=>{}}/>);
 for(const text of [message,next,signIn,'href="/login"'])expect(invalid).toContain(text);
 // Premium pass FD: what happened and what to do are the line under the title, announced once; no amber banner.
 expect(invalid).toContain(`<p class="activation-invitation-state" role="status">${message} ${next}</p>`);
 // Not the "no link" screen: it never says to open the invitation link again.
 const missing=renderToStaticMarkup(<ActivationInvitationView phase="missing" lang={lang} loginHref="/login" onSubmit={()=>{}}/>);
 expect(missing).not.toContain(message);expect(invalid).not.toContain(lang==='en'?'Open the invitation link in your email.':'Abre el enlace de invitación en tu correo.');
});
it('says only what is true before the server has checked the invitation (PB-002)',()=>{
 const named=renderToStaticMarkup(<ActivationInvitationView phase="ready" workspaceName="Northside Services" loginHref="/login" onSubmit={()=>{}}/>);
 expect(named).toContain('Choose a password to join <span class="q-whole">Northside Services</span>.');
 const unnamed=renderToStaticMarkup(<ActivationInvitationView phase="ready" lang="es" loginHref="/login" onSubmit={()=>{}}/>);
 expect(unnamed).toContain('Elige una contraseña para terminar de configurar tu cuenta.');
 for(const html of [named,unnamed])expect(html).not.toMatch(/verified|verificada/i);
});
it('the success card leads with a done mark and says to save the ID (PB-003, JR-7)',()=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase="activated" employeeId="OWN-FIXTURE-ID" loginHref="/login?activated=1" onSubmit={()=>{}}/>);
 expect(html).toMatch(/<span class="q-auth__mark q-auth__mark--done" aria-hidden="true"><svg/);
 expect(html).toContain('aria-describedby="activation-employee-id-note"');
 expect(html).toContain('<p class="q-help" id="activation-employee-id-note">Save this ID. You sign in with it.</p>');
});
it('offers Owner-assisted login-ID/status recovery for an unknown outcome',()=>{const html=renderToStaticMarkup(<ActivationInvitationView phase="outcome_unknown" loginHref="/login" onSubmit={()=>{}}/>);expect(html).toContain('confirm your account status and Employee ID');expect(html).not.toContain('type="submit"');});
it('reports only the current mismatch without a stale policy message or duplicate error ID',()=>{
 const html=renderToStaticMarkup(<ActivationInvitationView phase="ready" mismatch passwordReason="breached" loginHref="/login" onSubmit={()=>{}}/>);
 const ids=[...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);expect(new Set(ids).size).toBe(ids.length);expect(html).not.toContain('known breach');
});
