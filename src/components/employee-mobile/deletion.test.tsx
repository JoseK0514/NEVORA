import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('@/app/app/account/delete/actions',()=>({requestAccountDeletion:vi.fn()}));
vi.mock('@/app/login/actions',()=>({logout:vi.fn()}));
import {EmployeeDeletionView,receivedAt,type DeletionView} from './deletion';
import type {DeletionFormState} from '@/app/app/account/delete/actions';

const account={name:'Own Person',role:'Employee',employeeId:'FICTIONAL-E1'};
const base:DeletionView={state:{kind:'idle'},pending:false,retry:false,confirmed:false,shown:false,period:'30 calendar days after we receive the request',retention:'Fictional retention.'};
const render=(view:Partial<DeletionView>&{state?:DeletionFormState}={})=>renderToStaticMarkup(createElement(EmployeeDeletionView,{account,view:{...base,...view},action:()=>{},onPassword:()=>{},onShown:()=>{},onConfirmed:()=>{}}));
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');

describe('Employee mobile account deletion',()=>{
 it('reviews the own account and the actual consequences before the password and confirmation',()=>{
  const html=render(),plain=text(html);
  expect(html).toContain('aria-label="Show password"');expect(html).toContain('aria-pressed="false"');
  const shownHtml=render({shown:true});expect(shownHtml).toContain('aria-label="Show password"');expect(shownHtml).toContain('aria-pressed="true"');expect(shownHtml).not.toContain('Hide password');
  for(const value of ['Own Person','FICTIONAL-E1','Your access ends right away','with your password or a passkey','Calendar feed links and device alerts stop','You can’t undo it in NEVORA','Within 30 calendar days after we receive the request','you can’t cancel it in the app','Your job doesn’t change','What may be kept','Fictional retention.','Read the full details','Confirm it’s you','Confirm deletion request','Keep my account'])expect(plain).toContain(value);
  expect(plain.indexOf('Your account')).toBeLessThan(plain.indexOf('What happens'));
  expect(plain.indexOf('What happens')).toBeLessThan(plain.indexOf('Confirm it’s you'));
  expect(html).toContain('href="/app/profile#profile-account-deletion"');
  expect(html).toMatch(/<input[^>]*name="account"[^>]*value="FICTIONAL-E1"/);
  expect(html).toMatch(/<input[^>]*name="retry"[^>]*value="0"/);
  expect(html).toMatch(/<input[^>]*autoComplete="current-password"/);
  expect(html).not.toMatch(/<input[^>]*name="password"[^>]*value=/);
  // No promise this screen can't keep: no withdrawal right, no "deleted now".
  expect(plain).not.toMatch(/cancel your request|withdraw|deleted now|immediately deleted/i);
 });

 it('associates password and confirmation errors with their fields',()=>{
  const html=render({state:{kind:'wrong_password'}});
  expect(html).toMatch(/aria-describedby="deletion-password-help deletion-password-error"[^>]*aria-invalid="true"|aria-invalid="true"[^>]*aria-describedby="deletion-password-help deletion-password-error"/);
  expect(text(html)).toContain('That password isn’t right. Try again.');
 });

 it('keeps the form while sending and labels the busy action',()=>{
  const html=render({pending:true,confirmed:true});
  expect(html).toContain('aria-busy="true"');
  expect(text(html)).toContain('Sending request…');
  expect(html).toMatch(/aria-disabled="true"[^>]*tabindex="-1"|tabindex="-1"[^>]*aria-disabled="true"/i);
 });

 it('says nothing was saved only for a rolled-back request',()=>{
  const failed=text(render({state:{kind:'failed'}}));
  expect(failed).toContain('Your request wasn’t sent');
  expect(failed).toContain('Nothing was saved and you’re still signed in.');
  const unknown=text(render({state:{kind:'uncertain'},retry:true}));
  expect(unknown).toContain('We don’t know yet if your request was saved');
  expect(unknown).toContain('this sends your deletion request now');
  expect(unknown).toContain('choose Check my request to find out');
  expect(unknown).toContain('Check my request');
  // The request may already be accepted, so nothing offers to keep the account.
  expect(unknown).not.toContain('Keep my account');
  expect(unknown).not.toContain('Nothing was saved');
  expect(unknown).not.toContain('was received');
  expect(render({state:{kind:'uncertain'},retry:true})).toMatch(/<input[^>]*name="retry"[^>]*value="1"/);
 });

 it('keeps the unknown outcome visible through a mistyped password and the attempt limit',()=>{
  const wrong=text(render({state:{kind:'wrong_password'},retry:true}));
  expect(wrong).toContain('We don’t know yet if your request was saved');
  expect(wrong).toContain('That password isn’t right');
  const busy=text(render({state:{kind:'busy'},retry:true}));
  expect(busy).toContain('We still don’t know whether your request was saved.');
  expect(text(render({state:{kind:'busy'}}))).toContain('Nothing was sent.');
 });

 it('shows the confirmed reference, its consequences and support, with no way back into the app',()=>{
  const html=render({state:{kind:'received',reference:'DEL-7KQ2M9XA',confirmedAt:'2030-01-01 10:00:00+00'}}),plain=text(html);
  for(const value of ['Deletion requested','Your deletion request was received','DEL-7KQ2M9XA','Received','Copy reference','You’re signed out everywhere','We aim to finish within 30 calendar days','we’ll email you when it’s done','Your job doesn’t change','We’ll never ask for your password','Done'])expect(plain).toContain(value);
  expect(html).toContain('href="mailto:support@thevelani.com?subject=Account%20deletion%20DEL-7KQ2M9XA"');
  expect(html).not.toContain('em-request-back');
  expect(html).not.toContain('name="password"');
  expect(html).toContain('role="status"');
  expect(text(render({state:{kind:'duplicate',reference:'DEL-7KQ2M9XA',confirmedAt:'2030-01-01'}}))).toContain('A deletion request is already in progress');
 });

 it('ends the form for a changed or signed-out account without claiming a deletion',()=>{
  const out=render({state:{kind:'signed_out'}});
  expect(text(out)).toContain('nothing was deleted');
  expect(out).toContain('href="/login"');
  expect(out).not.toContain('name="password"');
  const changed=render({state:{kind:'changed'}});
  expect(text(changed)).toContain('Nothing was sent.');
  expect(changed).toContain('href="/app/profile"');
 });

 it('offers support instead of a dead button when deletion is unavailable',()=>{
  const html=render({state:{kind:'unavailable'}});
  expect(text(html)).toContain('Account deletion isn’t available right now');
  expect(html).toContain('href="mailto:support@thevelani.com"');
  expect(text(html)).not.toContain('Confirm deletion request');
  expect(text(render({period:null}))).toContain('[CONFIRM_DELETION_COMPLETION_PERIOD]');
 });

 it('reads Postgres timestamptz text in any offset and drops what it cannot read',()=>{
  expect(receivedAt('2030-01-01 10:00:00+00')).toBe(new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(Date.UTC(2030,0,1,10)));
  expect(receivedAt('2030-01-01 06:00:00.123456-04')).toBe(receivedAt('2030-01-01 10:00:00.123+00'));
  expect(receivedAt('2030-01-01 15:30:00+05:30')).toBe(receivedAt('2030-01-01 10:00:00+00'));
  expect(receivedAt('not a time')).toBeNull();
 });
});
