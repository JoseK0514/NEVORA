import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({lang:'en' as 'en'|'es',keptId:null as string|null}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>name==='nv-login-id'&&state.keptId!==null?{value:state.keptId}:undefined})}));
vi.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>'Fictional workspace'}));
vi.mock('@/app/login/actions',()=>({login:async()=>{}}));
import LoginPage from './page';

it.each([
 ['en','Too many sign-in attempts. Wait 15 minutes, then try again.'],
 ['es','Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo de nuevo.'],
] as const)('explains an admitted login budget denial in %s',async(lang,message)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'busy'})}));
 expect(html).toContain(message);
 expect(html.match(/id="login-error"/g)).toHaveLength(1);
 expect(html).toContain('role="alert"');
 expect(html.match(/<form\b/g)).toHaveLength(1);
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
 ['en','Your session ended. Sign in to continue.'],
 ['es','Tu sesión terminó. Inicia sesión para continuar.'],
] as const)('says calmly that a session ended and keeps the way back, in %s (RA-5)',async(lang,message)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({ended:'1',returnTo:'/app/requests?tab=my'})}));
 expect(html).toMatch(new RegExp(`<p class="q-auth__alert q-auth__alert--info" role="status"><svg[^>]*aria-hidden="true"[\\s\\S]*?</svg><span>${message}</span></p>`));
 expect(html).not.toContain('role="alert"');
 expect(html).toContain('<input type="hidden" name="returnTo" value="/app/requests?tab=my"/>');
 // An error or the activated notice is the one message; a bare visit shows none.
 for(const params of [{ended:'1',error:'invalid'},{ended:'1',activated:'1'},{}])expect(renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}))).not.toContain(message);
});
