import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,expect,it,rs} from '@rstest/core';
const flags=rs.hoisted(()=>({passkeys:true}));
rs.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
rs.mock('next/navigation',()=>({useRouter:()=>({replace:()=>{}})}));
rs.mock('../../lib/passkeys/client',()=>({passkeysFlagOn:()=>flags.passkeys}));
import {EmployeeProfilePreferences,EmployeeProfilePage} from './profile';
import {onlyB,withoutB} from '../owner-b/test-support';
afterEach(()=>{flags.passkeys=true;});
const full=(policies=true)=>renderToStaticMarkup(<EmployeeProfilePage authority={'a'.repeat(64)} lang="en" policies={policies}/>);
// The corporate layout (tablets and desktop) and the phone screen (Direction B): both render, CSS shows one.
const page=(policies=true)=>withoutB(full(policies)),phone=(policies=true)=>onlyB(full(policies));
it('Display offers the account language as a segmented choice and no appearance choice (Release 1 is light only)',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePreferences lang="es"/>);
 expect(html).toContain('Display');expect(html).toContain('Language');/* Jose, Nov 26, 2026: the whole portal follows it now */expect(html).toContain('Choose your account’s language.');
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
it('Direction B phone screen: Personal info as label-over-value rows, the language switch, Security with a red Delete my account',()=>{
 const html=phone(),text=html.replace(/<[^>]+>/g,' ');
 for(const value of ['Profile and settings','Personal info','Name','Locations','Time zone','Checking your current work details','Display','Language',/* Jose, Nov 26, 2026 */'Choose your account’s language.','Security','Passkeys','Delete my account'])expect(text).toContain(value);
 expect(html).toContain('href="/app/more"');expect(html).toContain('href="/app/profile/passkeys"');expect(html).toContain('href="/app/account/delete"');expect(html).toContain('id="b-profile-account-deletion"');
 expect(html).toMatch(/lang="en" aria-pressed="true"[^>]*>English/);expect(html).toMatch(/lang="es" aria-pressed="false"[^>]*>Español/);
 expect(html).toContain('b-ico b-ico--red');expect(html.indexOf('Personal info')).toBeLessThan(html.indexOf('Display'));expect(html.indexOf('Display')).toBeLessThan(html.indexOf('Security'));
 for(const gone of ['Sign out','Edit profile','<input','<select'])expect(html).not.toContain(gone);
 flags.passkeys=false;expect(phone()).not.toContain('/app/profile/passkeys');expect(phone(false)).not.toContain('Security');
 const ids=[...full().matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);expect(new Set(ids).size).toBe(ids.length);
});
it('Personal info shows the Employee ID a person signs in with, from the page’s session, on both layouts (inspection Nov 14, BR-13)',()=>{
 const html=renderToStaticMarkup(<EmployeeProfilePage authority={'a'.repeat(64)} lang="en" policies employeeId="FICTIONAL-E1"/>);
 for(const side of [withoutB(html),onlyB(html)]){
  const text=side.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
  expect(text).toContain('Employee ID');expect(text).toContain('FICTIONAL-E1');expect(text).toContain('You sign in with this ID.');
  expect(text.indexOf('Name')).toBeLessThan(text.indexOf('Employee ID'));expect(text.indexOf('Employee ID')).toBeLessThan(text.indexOf('Locations'));
  expect(side).not.toMatch(/<input|Email|Phone/);
 }
 // Without a session id the row keeps its place and shows the same dash as the other rows.
 expect(full()).not.toContain('FICTIONAL-E1');expect(full()).toContain('You sign in with this ID.');
});
