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
  expect(html).toContain('name="attestation" required="" minLength="10" maxLength="500"');
  expect(html).toContain('type="checkbox" required=""');
  expect(html).toContain('Do not substitute a newly supplied email or phone number.');
  expect(html).toContain('Omit sensitive documents, codes and personal details.');
  expect(html).toContain('independently confirmed');
  expect(html).not.toContain('name="email"');
  expect(html).not.toContain('name="password"');
 });
 it('disables submission before hydration and explains no-JavaScript behavior',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER"/>);
  expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Enable JavaScript to issue a recovery proof.');
  expect(html).toContain('href="/app?view=team"');
 });
 it('announces pending issuance while all mutation fields are disabled',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} busy/>);
  expect(html).toContain('aria-busy="true"');expect(html).toContain('<fieldset disabled=""');
  expect(html).toContain('Issuing recovery proof');expect(html).toContain('role="status"');
  expect(html).not.toContain('Recovery proof ready');
 });
 it('shows the issued employee and real expiry without claiming a password reset',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} issued={{proof:'A'.repeat(43),employeeId:'QAEMPLOYEE',expiresAt:'2026-10-12T16:30:00Z'}}/>);
  expect(html).toContain('Recovery proof ready');expect(html).toContain('QAEMPLOYEE');
  expect(html).toContain('dateTime="2026-10-12T16:30:00Z"');expect(html).toContain('readOnly=""');
  expect(html).toContain('Single use');expect(html).toContain('href="/reset-access"');
  expect(html).toContain('switch apps');expect(html).toContain('unused earlier proof');
  expect(html).not.toContain('<form');expect(html).not.toContain('Password updated');
 });
 it('gives ended-access feedback an explicit sign-in path',()=>{
  const html=renderToStaticMarkup(<AssistedRecovery {...props} message="Your access ended. Sign in again."/>);
  expect(html).toContain('role="alert"');expect(html).toContain('tabindex="-1"');
  expect(html).toContain('href="/login"');expect(html).not.toContain('Recovery proof ready');
 });
 it('keeps request and reset field contracts available',()=>{
  const request=renderToStaticMarkup(<AccountRecovery kind="request"/>),reset=renderToStaticMarkup(<AccountRecovery kind="reset"/>);
  expect(request).toContain('name="email"');expect(request).toContain('name="employeeId"');
  expect(reset).toContain('name="proof"');expect(reset).toContain('name="password"');expect(reset).toContain('name="confirmPassword"');
  expect(request+reset).not.toContain('name="attestation"');
 });
});
