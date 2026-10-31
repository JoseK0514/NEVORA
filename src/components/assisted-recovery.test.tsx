import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {AssistedRecovery} from './assisted-recovery';
import {AccountRecovery} from './account-recovery';
vi.stubGlobal('React',React);
const props={hydrated:true,busy:false,message:'',issued:null,onSubmit:()=>{},onStartAgain:()=>{}};

describe('Assisted recovery workflow presentation',()=>{
 it('requires the employee, bounded verification record and independent attestation',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props}/>);
  expect(html).toMatch(/<input[^>]+id="assisted-employee"[^>]+required=""[^>]+maxLength="200"[^>]+name="employeeId"/);
  // Quiet (v4): the record is one of the named checks (each over 10 characters), or written out under Something else.
  expect(html).toMatch(/<select[^>]*name="attestation"/);
  expect(html).toContain('value="Verified in person with a photo ID."');
  expect(html).toMatch(/type="checkbox" role="switch"[^>]*required=""/);
  expect(html).toContain('Check against details you already have, not a new email or phone number they give you.');
  expect(html).toContain('You don’t need documents, codes or other personal details.');
  expect(html).toContain('independently confirmed');
  expect(html).not.toContain('name="email"');
  expect(html).not.toContain('name="password"');
 });
 it('disables submission before hydration and explains no-JavaScript behavior',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER"/>);
  expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Enable JavaScript to issue a recovery code.');
  // Quiet (v4): Account recovery opens from Team, so Back returns there.
  expect(html).toMatch(/href="\/app\/employees"[^>]*>[\s\S]*?Team<\/a>/);
 });
 it('opened from an employee page, prefills their ID and returns to that page (W2)',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER" employeeId="AUDIT-E"/>);
  expect(html).toMatch(/name="employeeId" value="AUDIT-E"/);
  expect(html).toContain('href="/app/employees/AUDIT-E"');expect(html).toMatch(/href="\/app\/employees\/AUDIT-E"[^>]*>[\s\S]*?AUDIT-E<\/a>/);
  expect(html).not.toContain('view=team');
 });
 it('announces pending issuance while all mutation fields are disabled',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} busy/>);
  expect(html).toContain('aria-busy="true"');expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Issuing recovery code');expect(html).toContain('role="status"');
  expect(html).not.toContain('Recovery code ready');
 });
 it('shows the issued employee and real expiry without claiming a password reset',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} issued={{proof:'A'.repeat(43),employeeId:'QAEMPLOYEE',expiresAt:'2026-10-12T16:30:00Z'}}/>);
  expect(html).toContain('Recovery code ready');expect(html).toContain('QAEMPLOYEE');
  expect(html).toContain('dateTime="2026-10-12T16:30:00Z"');expect(html).toContain('readOnly=""');
  expect(html).toContain('works once');expect(html).toContain('href="/reset-access"');
  expect(html).toContain('hides when you leave this page');expect(html).toContain('unused earlier code');
  expect(html).not.toContain('<form');expect(html).not.toContain('Password updated');
 });
 it('gives ended-access feedback an explicit sign-in path',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} message="Your session ended. Sign in again to issue a code."/>);
  expect(html).toContain('role="alert"');expect(html).toContain('tabindex="-1"');
  expect(html).toContain('href="/login"');expect(html).not.toContain('Recovery code ready');
 });
 it('keeps request and reset field contracts available',()=>{
  const request=renderToStaticMarkup(<AccountRecovery kind="request"/>),reset=renderToStaticMarkup(<AccountRecovery kind="reset"/>);
  expect(request).toContain('name="email"');expect(request).toContain('name="employeeId"');
  expect(reset).toContain('name="proof"');expect(reset).toContain('name="password"');expect(reset).toContain('name="confirmPassword"');
  expect(request+reset).not.toContain('name="attestation"');
 });
});
