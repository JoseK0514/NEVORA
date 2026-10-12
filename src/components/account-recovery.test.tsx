import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {AccountRecovery} from './account-recovery';
import {RecoveryRequest} from './recovery-request';
import {RecoveryReset} from './recovery-reset';
vi.stubGlobal('React',React);

describe('Recovery presentation preserves its workflow boundaries',()=>{
 it('keeps both required identity fields and the proof and sign-in paths',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="request"/>);
  expect(html).toContain('name="employeeId"');expect(html).toContain('name="email"');
  expect(html).toContain('maxLength="200"');expect(html).toContain('maxLength="254"');
  expect(html).toContain('href="/reset-access"');expect(html).toContain('href="/login"');
  expect(html).not.toContain('name="password"');expect(html).toContain('Enable JavaScript');
 });
 it('shows an accepted request without asserting successful email delivery',()=>{
  const message='If these details match an active account, recovery instructions will be sent.';
  const html=renderToStaticMarkup(<RecoveryRequest hydrated busy={false} done message={message} onSubmit={()=>{}}/>);
  expect(html).toContain('Request received');expect(html).toContain(message);expect(html).toContain('role="status"');
  expect(html).not.toContain('<form');expect(html).not.toContain('Email sent');
 });
 it('keeps reset proof validation and new-password autocomplete',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="reset"/>);
  expect(html).toContain('minLength="43"');expect(html).toContain('maxLength="43"');
  expect(html.match(/autoComplete="new-password"/g)).toHaveLength(2);
  expect(html).toContain('name="confirmPassword"');expect(html).not.toContain('recovery-help');
  expect(html.match(/minLength="8"/g)).toHaveLength(2);
  expect(html.match(/maxLength="1024"/g)).toHaveLength(2);
  expect(html).toContain('aria-controls="reset-password reset-confirm-password"');
  expect(html).toContain('aria-label="Show passwords"');
  expect(html).toContain('Enable JavaScript to reset your password');
  expect(html).toContain('href="/forgot-access"');
  expect(html).not.toContain('href="/reset-access"');
 });
 it('shows success only after confirmation and supplies the next sign-in action',()=>{
  const message='Password reset. All portal sessions have ended. Sign in with your new password.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('Password updated');expect(html).toContain(message);
  expect(html).toContain('role="status"');expect(html).toContain('Sign in with new password');
  expect(html).not.toContain('<form');expect(html).not.toContain('name="proof"');
 });
 it('keeps an uncertain outcome distinct from success and points to sign-in first',()=>{
  const message='The reset outcome could not be confirmed. Try signing in with your new password before requesting another proof.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('Check your sign-in first');expect(html).toContain('Try signing in');
  expect(html).toContain('role="alert"');expect(html).toContain('<form');
  expect(html).not.toContain('Password updated');
 });
 it('explains an invalid proof without claiming account or password state',()=>{
  const message='This recovery proof has expired, was already used, or cannot be verified. Request a new proof or contact your manager.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('Use a new recovery proof');expect(html).toContain(message);
  expect(html).toContain('Request a new recovery proof');expect(html).not.toContain('Password updated');
 });
 it('marks the confirmation field for mismatch and makes pending status explicit',()=>{
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message="Passwords do not match." onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('aria-invalid="true"');expect(html).toContain('Check your passwords');
  const pending=renderToStaticMarkup(<RecoveryReset hydrated busy done={false} message="" onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(pending).toContain('<fieldset disabled=""');expect(pending).toContain('aria-busy="true"');
  expect(pending).toContain('Resetting password. Please wait.');
 });
 it('keeps assisted identity attestation rather than exposing the employee request form',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER"/>);
  expect(html).toContain('name="attestation"');expect(html).toContain('type="checkbox"');
  expect(html).toContain('independently confirmed');expect(html).toContain('href="/app?view=team"');
  expect(html).not.toContain('name="email"');expect(html).not.toContain('recovery-help');
 });
});
