import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
import {EmployeeAccountView} from '../employee-account-panel';
import type {EmployeeProfile} from '../../lib/employee-view';
vi.mock('next/link',()=>({default:({children,...props}:ComponentProps<'a'>)=>createElement('a',props,children)}));
const own:EmployeeProfile={state:'ready',kind:'profile',observedAt:'2026-10-27T12:00:00Z',validForMs:45000,profile:{name:'Own private name',role:'Lead',workspace:'Fictional workplace',timeZone:'America/Puerto_Rico',locations:['Main Office','West Office']}};
const draw=(snapshot:EmployeeProfile|{state:'unavailable';reason:'read_failed'|'access_denied'}|null,paused=false,refreshing=false)=>renderToStaticMarkup(<EmployeeAccountView kind="profile" employeeMobile state={{snapshot,paused,refreshing}} onRetry={()=>{}} quiet/>);
it('Personal info comes from the ready own projection, read only, with no refresh footer',()=>{
 const html=draw(own);
 expect(html).toContain('Personal info');expect(html).toContain('Own private name');expect(html).toContain('Main Office · West Office');expect(html).toContain('Puerto Rico');
 expect(html).not.toContain('Refresh details');expect(html).not.toContain('Your information only');
 expect(html).not.toMatch(/<(?:input|select|textarea)\b/);expect(html).not.toContain('Edit profile');
});
it('pause/loading/failure never expose an earlier own identity or a false empty profile',()=>{
 for(const html of [draw(own,true),draw(null,false,true),draw({state:'unavailable',reason:'read_failed'})]){
  expect(html).not.toContain('Own private name');expect(html).not.toContain('Main Office');expect(html).not.toContain('No locations');expect(html).not.toContain('No profile');
  expect(html).toContain('role="status"');
 }
 expect(draw({state:'unavailable',reason:'read_failed'})).toContain('Try again');expect(draw(null,false,true)).not.toContain('Try again');
});
it('current denial offers sign in and no stale identity or editable work controls',()=>{
 const html=draw({state:'unavailable',reason:'access_denied'});
 expect(html).toContain('href="/login"');expect(html).toContain('Sign in');expect(html).not.toContain('Own private name');expect(html).not.toContain('Try again');
});
