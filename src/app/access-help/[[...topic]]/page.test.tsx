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
it('holds general Support behind the separate support-readiness gate',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 await expect(page(['support'])).rejects.toThrow('NOT_FOUND');
});
it('always offers a sole Owner a path to NEVORA support (approved October 27)',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const owner=renderToStaticMarkup(await page(['owner']));expect(owner.match(/class="ma-choice"/g)).toHaveLength(3);expect(owner).toContain('/access-help/owner-contact?from=login');
 expect(renderToStaticMarkup(await page(['owner-contact']))).toContain('href="/privacy"');
});
it('keeps assistance available without publishing the general Support route',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const html=renderToStaticMarkup(await page());expect(html.match(/class="ma-choice"/g)).toHaveLength(5);expect(html).toContain('href="/forgot-access"');
 expect(html).toContain('/access-help/left?from=login');expect(html).not.toContain('/access-help/support');
});
it('explains what happens to an account after leaving a job',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const html=renderToStaticMarkup(await page(['left']));expect(html).toContain('No longer work here?');expect(html).toContain('href="/account-deletion"');
});
it('constrains the Help return destination to a known public route',async()=>{
 vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');vi.stubEnv('NEVORA_MOBILE_ACCESS_SUPPORT_ENABLED','false');
 const html=renderToStaticMarkup(await page([],'https://untrusted.example.invalid'));
 expect(html).toContain('href="/login"');expect(html).toContain('/access-help?from=login');
});
