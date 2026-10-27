import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('NOT_FOUND');},useRouter:()=>({refresh:()=>{}})}));
vi.mock('@/lib/auth-lang.server',()=>({readAuthLang:async()=>'en'}));
import AccessHelpPage from './page';
afterEach(()=>vi.unstubAllEnvs());
const page=(topic:string[]=[],from?:string)=>AccessHelpPage({params:Promise.resolve({topic}),searchParams:Promise.resolve({from})});
it('does not expose new public help routes before mobile rollout',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','false');await expect(page()).rejects.toThrow('NOT_FOUND');
});
it.each(['support','owner-contact'])('holds %s behind the separate support-readiness gate',async topic=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 await expect(page([topic])).rejects.toThrow('NOT_FOUND');
});
it('keeps assistance available without publishing an unapproved contact route',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const html=renderToStaticMarkup(await page());expect(html.match(/class="ma-choice"/g)).toHaveLength(4);expect(html).toContain('href="/forgot-access"');
});
it('constrains the Help return destination to a known public route',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const html=renderToStaticMarkup(await page([],'https://untrusted.example.invalid'));
 expect(html).toContain('href="/login"');expect(html).toContain('/access-help?from=login');
});
