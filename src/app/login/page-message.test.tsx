import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
const state=rs.hoisted(()=>({lang:'en' as 'en'|'es',keptId:null as string|null}));
rs.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>name==='nv-login-id'&&state.keptId!==null?{value:state.keptId}:undefined})}));
rs.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
rs.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>'Fictional workspace'}));
rs.mock('@/app/login/actions',()=>({login:async()=>{}}));
import LoginPage from './page';

it.each([
 ['en','Too many attempts. For your safety, sign-in is paused for 15 minutes. If you forgot your password, you can reset it now.'],
 ['es','Demasiados intentos. Por seguridad, pausamos el inicio de sesión durante 15 minutos. Si olvidaste tu contraseña, puedes restablecerla ahora.'],
] as const)('explains an admitted login budget denial in %s',async(lang,message)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'busy'})}));
 expect(html).toContain(message);
 expect(html.match(/id="login-error"/g)).toHaveLength(1);
 expect(html).toContain('role="alert"');
 expect(html.match(/<form\b/g)).toHaveLength(1);
 // Phase 5 (PB-030): a wait is amber with the hourglass, never the red of a refusal, and the way to reset is on the page.
 expect(html).toMatch(/<p class="q-error q-auth__alert q-auth__alert--wait" id="login-error" role="alert">/);
 expect(html).toContain('href="/forgot-access"');
});

it('after an error the Employee ID comes back as typed and only the password is retyped (PB-006)',async()=>{
 state.lang='en';state.keptId='emp-10482';
 try{
  const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'invalid'})}));
  expect(html).toMatch(/<input(?=[^>]*id="login-employee-id")(?=[^>]*value="emp-10482")[^>]*>/);
  expect(html).not.toMatch(/<input(?=[^>]*id="login-password")(?=[^>]*value=)[^>]*>/);
  // Without an error nothing is shown, and an unreasonable value is never echoed.
  expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({})}))).not.toContain('emp-10482');
  state.keptId='x'.repeat(129);
  expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'invalid'})}))).not.toContain('xxxxxxxx');
 }finally{state.keptId=null;}
});

it.each([
 ['en','You were signed out to keep your account safe. Sign in to pick up where you left off.','You were signed out to keep your account safe. Sign in to continue.'],
 ['es','Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar donde estabas.','Cerramos tu sesión para proteger tu cuenta. Inicia sesión para continuar.'],
] as const)('says calmly that a session ended and keeps the way back, in %s (RA-5, PB-005)',async(lang,message,plain)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({ended:'1',returnTo:'/app/requests?tab=my'})}));
 expect(html).toMatch(new RegExp(`<p class="q-auth__alert q-auth__alert--info" role="status"><svg[^>]*aria-hidden="true"[\\s\\S]*?</svg><span>${message}</span></p>`));
 expect(html).not.toContain('role="alert"');
 expect(html).toContain('<input type="hidden" name="returnTo" value="/app/requests?tab=my"/>');
 // Phase 5 (PB-005): "where you left off" is promised only when there is a vetted way back; without one, or with an
 // address the return check refuses, the note says "continue" and no return address is carried.
 for(const params of [{ended:'1'},{ended:'1',returnTo:'https://example.invalid/app'}]){
  const bare=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}));
  expect(bare).toContain(`<span>${plain}</span>`);expect(bare).not.toContain(message);expect(bare).not.toContain('name="returnTo"');
 }
 // An error or the activated notice is the one message; a bare visit shows none.
 for(const params of [{ended:'1',error:'invalid'},{ended:'1',activated:'1'},{}])expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}))).not.toContain(message);
});
