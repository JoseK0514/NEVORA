import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
import {AUTH_COPY} from '@/lib/auth-copy';
const state=rs.hoisted(()=>({lang:'en' as 'en'|'es',session:null as string|null,to:''}));
rs.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>name==='fuel_session'&&state.session!==null?{value:state.session}:undefined})}));
rs.mock('next/navigation',()=>({redirect:(to:string)=>{state.to=to;throw new Error('redirect:'+to);}}));
rs.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
rs.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>'Fictional workspace'}));
rs.mock('@/app/login/actions',()=>({login:async()=>{}}));
import LoginPage from './page';
import Home from '../page';

/* Phase 5 (Nov 17, 2026): sign-in is the front door (review-public PB-010, PB-011, PB-012, PB-009, PB-027, PB-036, PB-037). */
const page=async(lang:'en'|'es',params:Record<string,string>={})=>{state.lang=lang;return renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}));};
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

it('the bare domain goes straight to sign-in without a session cookie and to the app with one (PB-010)',async()=>{
 state.session=null;await expect(Home()).rejects.toThrow('redirect:/login');
 state.session='';await expect(Home()).rejects.toThrow('redirect:/login');
 // Any presented cookie goes to /app, which alone decides whether that session is valid.
 state.session='opaque-token';await expect(Home()).rejects.toThrow('redirect:/app');
 state.session=null;
});

it.each(['en','es'] as const)('the two links under the card say who each is for, in %s (PB-012)',async lang=>{
 const html=await page(lang),t=AUTH_COPY[lang];
 expect(html).toMatch(new RegExp(`<nav class="q-auth__links" aria-label="${t.accountHelp}"><a href="/forgot-access">${t.forgotAccess.replace('?','\\?')}</a><a href="/activate">${t.setUpAccount.replace('?','\\?')}</a></nav>`));
 expect(t.setUpAccount).toBe(lang==='en'?'New here? Set up your account':'¿Primera vez? Configura tu cuenta');
 // The links sit under the card, never inside the form as a second button.
 expect(html.slice(html.indexOf('<form'),html.indexOf('</form>'))).not.toContain('/activate');
 // The return address rides on the set-up link as before.
 expect(await page(lang,{returnTo:'/app/requests'})).toContain('href="/activate?returnTo=%2Fapp%2Frequests"');
});

it.each(['en','es'] as const)('Employee ID has its helper at every width and the keyboard hints, in %s (PB-012, PB-037)',async lang=>{
 const html=await page(lang),t=AUTH_COPY[lang];
 expect(html).toContain(`<p class="q-auth__fieldhelp" id="login-employee-id-help">${t.employeeIdHelp}</p>`);
 const id=html.match(/<input[^>]*id="login-employee-id"[^>]*>/)![0],password=html.match(/<input[^>]*id="login-password"[^>]*>/)![0];
 for(const attribute of ['autoComplete="username"','autoCapitalize="none"','autoCorrect="off"','spellCheck="false"','enterKeyHint="next"','aria-describedby="login-employee-id-invalid login-employee-id-help"'])expect(id).toContain(attribute);
 expect(id).toContain(`placeholder="${t.quiet.idPlaceholder}"`);
 for(const attribute of ['autoComplete="current-password"','autoCapitalize="none"','autoCorrect="off"','spellCheck="false"','enterKeyHint="go"','type="password"'])expect(password).toContain(attribute);
 // PB-027: no placeholder that repeats the label.
 expect(password).not.toContain('placeholder');
});

it.each(['en','es'] as const)('no page says the app is in English after sign-in (Jose, Nov 23: removed), in %s',async lang=>{
 expect(await page(lang)).not.toContain('q-auth__langnote');
});

it.each(['en','es'] as const)('the brand panel has no eyebrow and ends with the proof rows, which are desktop only (phones keep field, field, button), in %s (PB-011)',async lang=>{
 const html=await page(lang),t=AUTH_COPY[lang],panel=html.slice(html.indexOf('<aside'),html.indexOf('</aside>'));
 expect(panel).not.toContain('q-auth__eyebrow');expect(panel).not.toContain('Powered by');expect(text(panel)).not.toContain('NEVORA Workforce');
 expect(html.match(/© 2026 VELANI LLC/g)).toHaveLength(1);
 expect(panel).toContain(`<ul class="q-auth__proof" aria-label="${t.proof.label}">`);
 expect(html).not.toContain('q-auth__proof--page');expect(html.match(/class="q-auth__proof/g)).toHaveLength(1);
 expect(panel).toContain(t.proof.security);expect(panel).toContain(t.proof.languages);
 expect(panel.match(/<svg[^>]*aria-hidden="true"/g)!.length).toBeGreaterThanOrEqual(3);
 // In the panel the address is text, so the keyboard reaches the page's own controls first.
 expect(panel).toContain(`${t.proof.helpBefore}<b>support@thevelani.com</b>${t.proof.helpAfter}`);expect(panel).not.toContain('<a ');
 // The rows promise nothing the product does not do: the app itself is not said to be in Spanish, and the reply time
 // is an aim, as on the Support page and in the policy.
 expect(t.proof.languages).toMatch(lang==='en'?/^Sign-in and account help in English and Spanish\.$/:/^Inicio de sesión y ayuda con la cuenta en inglés y español\.$/);
 expect(t.proof.helpAfter).toMatch(lang==='en'?/We aim to reply/:/Nuestra meta es responder/);
});

it.each([['en','Welcome','Welcome back'],['es','Te damos la bienvenida','Hola de nuevo']] as const)('after activation the greeting is the first welcome, in %s (PB-036)',async(lang,first,back)=>{
 const activated=await page(lang,{activated:'1'}),plain=await page(lang);
 expect(activated).toContain(`<h1 class="" data-greeting="first">${first}</h1>`);
 // A plain visit: the server's words wait (the stylesheet holds them out of sight) until the hour's greeting replaces them.
 expect(plain).toContain(`<h1 class="" data-greeting="pending">${back}</h1>`);
 // The session-ended note and an error do not change the greeting.
 expect(await page(lang,{ended:'1'})).toContain('data-greeting="pending"');
});
