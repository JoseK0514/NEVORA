import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({lang:'en' as 'en'|'es'}));
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
