import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,vi} from 'vitest';
const flags=vi.hoisted(()=>({passkeys:true}));
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{}})}));
vi.mock('../../lib/passkeys/client',()=>({passkeysFlagOn:()=>flags.passkeys}));
import {EmployeeProfilePreferences,EmployeeProfilePage} from './profile';
afterEach(()=>{flags.passkeys=true;});
const page=(policies=true)=>renderToStaticMarkup(<EmployeeProfilePage authority={'a'.repeat(64)} lang="en" policies={policies}/>);
it('Display offers the sign-in language as a segmented choice and no appearance choice (Release 1 is light only)',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePreferences lang="es"/>);
 expect(html).toContain('Display');expect(html).toContain('Language');expect(html).toContain('For the sign-in pages');
 expect(html).toMatch(/lang="es" aria-pressed="true"[^>]*>Español/);expect(html).toMatch(/lang="en" aria-pressed="false"[^>]*>English/);
 expect(html).not.toContain('Appearance');expect(html).not.toContain('<select');
});
it('board E-Profile: Personal info, Display and Security under "More · Profile and settings", nothing else',()=>{
 const html=page();
 expect(html).toContain('Profile and settings');expect(html).toContain('href="/app/more"');expect(html).toContain('Personal info');expect(html).toContain('Checking your current work details');
 expect(html.indexOf('Personal info')).toBeLessThan(html.indexOf('Display'));expect(html.indexOf('Display')).toBeLessThan(html.indexOf('Security'));
 expect(html).toContain('href="/app/profile/passkeys"');expect(html).toContain('href="/app/account/delete"');expect(html).toContain('Delete my account');
 for(const gone of ['Sign out','Refresh details','Your information only','Add shifts to your calendar','Create private link','Alerts on this device','Privacy Policy','Terms of Use','Edit profile'])expect(html).not.toContain(gone);
});
it('Security shows only what exists: no passkey row when passkeys are off, no delete row when policies are unpublished',()=>{
 flags.passkeys=false;expect(page()).not.toContain('/app/profile/passkeys');expect(page()).toContain('Delete my account');
 expect(page(false)).not.toContain('Security');expect(page(false)).not.toContain('Delete my account');
});
