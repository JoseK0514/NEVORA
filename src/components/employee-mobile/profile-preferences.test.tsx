import {createElement,type ComponentProps,type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
vi.mock('@/app/login/actions',()=>({logout:async()=>{}}));
vi.mock('./use-mobile',()=>({useEmployeeMobile:()=>true}));
vi.mock('../portal-signout',()=>({PortalSignout:({children}: {children:ReactNode})=><form>{children}</form>}));
import {EmployeeProfilePreferences,EmployeeProfilePage} from './profile';
it('native preferences name the actual sign-in language and device-only appearance scopes',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePreferences lang="es"/>);
 expect(html).toContain('for="em-profile-language"');expect(html).toContain('aria-describedby="em-profile-language-hint"');expect(html).toContain('value="es" selected=""');expect(html).toContain('Used on the sign-in pages. Changing it reloads this page.');
 expect(html).toContain('for="em-profile-theme"');expect(html).toContain('aria-describedby="em-profile-theme-hint"');for(const choice of ['system','light','dark'])expect(html).toContain('value="'+choice+'"');expect(html).toContain('For this device.');
 expect(html).not.toContain('Company language');expect(html).not.toContain('Workspace appearance');
});
it('mobile profile never renders the static legacy identity while its real own read is loading',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePage authority={'a'.repeat(64)} lang="en" notificationsEnabled={false} policies legacyHeader={<h1>LEGACY PRIVATE NAME</h1>} calendar={<div>Existing calendar owner</div>} passkeys={null}/>);
 expect(html).not.toContain('LEGACY PRIVATE NAME');expect(html).toContain('Checking your current work details');expect(html).toContain('Sign-in language');expect(html).toContain('Existing calendar owner');expect(html).toContain('href="/app/profile/support"');expect(html).toContain('Sign out');
 expect(html).not.toContain('Edit profile');
});
it('unpublished policy visibility keeps canonical help facts/links out of the mobile account section',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePage authority={'a'.repeat(64)} lang="en" notificationsEnabled={false} policies={false} legacyHeader={null} calendar={null} passkeys={null}/>);
 expect(html).not.toContain('href="/app/profile/privacy"');expect(html).not.toContain('href="/app/profile/support"');expect(html).not.toContain('Delete my account');expect(html).toContain('Help and policy information isn’t available right now.');expect(html).toContain('Sign out');expect(html).toContain('Sign-in language');
});
