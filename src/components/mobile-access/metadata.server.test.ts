import {expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({enabled:false,lang:'en' as 'en'|'es'}));
vi.mock('./config.server',()=>({mobileAccessEnabled:()=>state.enabled}));
vi.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>state.lang}));
import {mobileAccessMetadata} from './metadata.server';
it('names each accessible auth route when Mobile Access is off, in the selected language',async()=>{
 state.enabled=false;state.lang='en';
 for(const [page,title] of [['signin','Sign in'],['recover','Forgot access'],['reset','Set a new password'],['activate','Activate account']] as const)
  expect(await mobileAccessMetadata(page)).toEqual({title:{absolute:`${title} · NEVORA`}});
 state.lang='es';expect(await mobileAccessMetadata('signin')).toEqual({title:{absolute:'Iniciar sesión · NEVORA'}});
 expect(await mobileAccessMetadata('welcome')).toEqual({});
});
it('keeps the enabled Mobile Access title vocabulary',async()=>{
 state.enabled=true;state.lang='en';
 expect(await mobileAccessMetadata('signin')).toEqual({title:{absolute:'Sign in · NEVORA'}});
});
