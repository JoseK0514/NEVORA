import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({lang:'en' as 'en'|'es',keptId:null as string|null}));
vi.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>name==='nv-login-id'&&state.keptId!==null?{value:state.keptId}:undefined})}));
vi.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
vi.mock('@/lib/data/workspaces',()=>({getPublicWorkspaceName:async()=>'Fictional workspace'}));
vi.mock('@/app/login/actions',()=>({login:async()=>{}}));
import LoginPage from './page';
import {BGlyph} from '@/components/owner-b/b-kit';

// Phase 9 (Nov 18, 2026): every note at the top of the form is the kit's callout; the message's first sentence is its
// title and the rest its body, word for word.
const note=(tone:string,role:string,id?:string)=>new RegExp(`<div class="b-callout" data-tone="${tone}"${id?` id="${id}"`:''} role="${role}"><span class="b-callout__ic" aria-hidden="true"><svg`);
const parts=(title:string,body:string)=>`<p class="b-callout__t">${title}</p><div class="b-callout__b">${body}</div></div>`;

it.each([
 ['en','Too many attempts','For your safety, sign-in is paused for 15 minutes. If you forgot your password, you can reset it now.'],
 ['es','Demasiados intentos','Por seguridad, pausamos el inicio de sesión durante 15 minutos. Si olvidaste tu contraseña, puedes restablecerla ahora.'],
] as const)('explains an admitted login budget denial in %s',async(lang,title,body)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'busy'})}));
 expect(html).toContain(parts(title,body));
 expect(html.match(/id="login-error"/g)).toHaveLength(1);
 expect(html).toContain('role="alert"');
 expect(html.match(/<form\b/g)).toHaveLength(1);
 // Phase 5 (PB-030): a wait is amber with the hourglass, never the red of a refusal, and the way to reset is on the page.
 expect(html).toMatch(note('amber','alert','login-error'));
 expect(html).toContain(renderToStaticMarkup(<BGlyph meaning="wait"/>));
 expect(html).toContain('href="/forgot-access"');
});

it.each([
 ['en','Employee ID or password is incorrect'],
 ['es','El ID de empleado o la contraseña no son correctos'],
] as const)('a wrong ID or password is a red note whose one sentence is its body, in %s (Phase 9, premium pass FD)',async(lang,title)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'invalid'})}));
 expect(html).toMatch(note('red','alert','login-error'));
 // A message of one sentence is all body (noteParts): no bold title, no added words, its own period; the fields under
 // the note are marked invalid.
 expect(html).toContain(`</span><div class="b-callout__b">${title}.</div></div>`);
 expect(html).not.toContain('b-callout__t');
 // Red's one glyph is the circle, the same as the field errors under it.
 expect(html).toContain(renderToStaticMarkup(<BGlyph meaning="stop"/>));
 expect(html).not.toContain(renderToStaticMarkup(<BGlyph meaning="check"/>));
 expect(html).toMatch(/<input(?=[^>]*id="login-employee-id")(?=[^>]*aria-invalid="true")[^>]*>/);
});

// The support address in the body is the note's one link, which wraps only after "@" (BEmail).
const mail='<a href="mailto:support@thevelani.com">support@<wbr/>thevelani.com</a>';
it.each([
 ['en','replace','We couldn’t start setting your new password','Try again in a minute.'],
 ['es','replace','No pudimos empezar a crear tu nueva contraseña','Inténtalo de nuevo en un minuto.'],
] as const)('splits the %s "%s" refusal into its title and body without changing a word',async(lang,error,title,body)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error})}));
 expect(html).toMatch(note('red','alert','login-error'));
 expect(html).toContain(parts(title,body));
 expect(html).not.toContain('aria-invalid="true"');
});

// Premium pass FD (Nov 18, 2026): a first sentence too long for a two-line title stays in the body, so the note is its
// plain text, word for word.
it.each([
 ['en',`This account is being deleted, so it can’t be used to sign in. Email ${mail} with your deletion reference if you have questions.`],
 ['es',`Esta cuenta se está eliminando, así que no se puede usar para iniciar sesión. Si tienes preguntas, escribe a ${mail} con tu referencia de eliminación.`],
] as const)('the %s deletion refusal is all body text',async(lang,body)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({error:'deleting'})}));
 expect(html).toMatch(note('red','alert','login-error'));
 expect(html).toContain(`</span><div class="b-callout__b">${body}</div></div>`);
 expect(html).not.toContain('b-callout__t');
 expect(html).not.toContain('aria-invalid="true"');
});

it.each([
 ['en','Your account is set up','Sign in to continue.'],
 ['es','Tu cuenta está configurada','Inicia sesión para continuar.'],
] as const)('a finished setup is a green note in %s (Phase 9)',async(lang,title,body)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({activated:'1'})}));
 expect(html).toMatch(note('green','status'));
 expect(html).toContain(parts(title,body));
 expect(html).toContain(renderToStaticMarkup(<BGlyph meaning="done"/>));
 expect(html).not.toContain('role="alert"');
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
 ['en','You were signed out to keep your account safe','Sign in to pick up where you left off.','Sign in to continue.'],
 ['es','Cerramos tu sesión para proteger tu cuenta','Inicia sesión para continuar donde estabas.','Inicia sesión para continuar.'],
] as const)('says calmly that a session ended and keeps the way back, in %s (RA-5, PB-005)',async(lang,title,body,plain)=>{
 state.lang=lang;
 const html=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve({ended:'1',returnTo:'/app/requests?tab=my'})}));
 expect(html).toMatch(note('teal','status'));
 expect(html).toContain(parts(title,body));
 expect(html).not.toContain('role="alert"');
 expect(html).toContain('<input type="hidden" name="returnTo" value="/app/requests?tab=my"/>');
 // Phase 5 (PB-005): "where you left off" is promised only when there is a vetted way back; without one, or with an
 // address the return check refuses, the note says "continue" and no return address is carried.
 for(const params of [{ended:'1'},{ended:'1',returnTo:'https://example.invalid/app'}]){
  const bare=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}));
  expect(bare).toContain(parts(title,plain));expect(bare).not.toContain(body);expect(bare).not.toContain('name="returnTo"');
 }
 // An error or the activated notice is the one message; a bare visit shows none.
 for(const params of [{ended:'1',error:'invalid'},{ended:'1',activated:'1'},{}]){
  const other=renderToStaticMarkup(await LoginPage({searchParams:Promise.resolve(params)}));
  expect(other).not.toContain(title);expect(other.match(/class="b-callout"/g)?.length??0).toBeLessThanOrEqual(1);
 }
});
