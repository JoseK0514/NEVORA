import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,rs} from '@rstest/core';
import {AccountRecovery} from './account-recovery';
import {RecoveryRequest} from './recovery-request';
import {RecoveryReset} from './recovery-reset';
import {MobileRecoveryReset} from './mobile-access/recovery-views';
rs.stubGlobal('React',React);

describe('Recovery presentation preserves its workflow boundaries',()=>{
 it('lets the mobile reset transport an isolated-company envelope without truncation',()=>{
  const html=renderToStaticMarkup(<MobileRecoveryReset hydrated busy={false} done={false} message="" onSubmit={()=>{}} proofRef={()=>{}} lang="en"/>);
  expect(html).toContain('minLength="43"');expect(html).toContain('maxLength="4096"');
 });
 it('keeps both required identity fields and the proof and sign-in paths',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="request"/>);
  expect(html).toContain('name="employeeId"');expect(html).toContain('name="email"');
  expect(html).toContain('maxLength="200"');expect(html).toContain('maxLength="254"');
  // The sign-in path is the page shell's Back (AuthShell); the form keeps the proof path.
  expect(html).toContain('href="/reset-access"');
  expect(html).not.toContain('name="password"');expect(html).toContain('Enable JavaScript');
 });
 it('shows an accepted request without asserting successful email delivery',()=>{
  const message='If these details match an active account, recovery instructions will be sent.';
  const html=renderToStaticMarkup(<RecoveryRequest hydrated busy={false} done message={message} onSubmit={()=>{}}/>);
  expect(html).toContain('Check your email');expect(html).toContain(message);expect(html).toContain('role="status"');
  expect(html).not.toContain('<form');expect(html).not.toContain('Email sent');
 });
 it('keeps reset proof validation and new-password autocomplete',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="reset"/>);
  expect(html).toContain('minLength="43"');expect(html).toContain('maxLength="4096"');
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
  // B7 wording (NV-188): no "portal sessions" jargon.
  const message='Password reset. You’re signed out on every device. Sign in with your new password.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  // Phase 5 (PB-017): the finish says it once. The outcome sentence above still decides the state; it is not shown.
  expect(html).toContain('Password updated');expect(html).toContain('For your safety, we signed you out on every device.');
  expect(html).not.toContain(message);expect(html).not.toContain('Your next step');
  expect(html).toContain('role="status"');expect(html).toMatch(/<a class="q-btn" href="\/login">Sign in<\/a>/);
  expect(html).not.toContain('<form');expect(html).not.toContain('name="proof"');
 });
 it('keeps an uncertain outcome distinct from success and points to sign-in first',()=>{
  const message='The reset outcome could not be confirmed. Try signing in with your new password before requesting another code.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('Check your sign-in first');expect(html).toContain('Try signing in');
  expect(html).toContain('role="alert"');expect(html).toContain('<form');
  expect(html).not.toContain('Password updated');
 });
 it('explains an invalid proof without claiming account or password state',()=>{
  const message='This recovery code has expired, was already used, or cannot be verified. Request a new code or contact your manager.';
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  // Phase 5 (PB-014): one word for the task, "reset". The sentence still names no account and no password state.
  expect(html).toContain('Use a new reset code');expect(html).toContain('This reset code has expired, was already used, or can’t be checked.');
  expect(html).toContain('Get a new reset link');expect(html).not.toContain('Password updated');
  // A code that came from a link is refused in the link's own words, with the code field still hidden.
  const linked=renderToStaticMarkup(<RecoveryReset linkProof hydrated busy={false} done={false} message={message} onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(linked).toContain('This link has expired or was already used. Reset links last 15 minutes.');expect(linked).toContain('href="/forgot-access"');
 });
 it('marks the confirmation field for mismatch and makes pending status explicit',()=>{
  const html=renderToStaticMarkup(<RecoveryReset hydrated busy={false} done={false} message="Passwords do not match." onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('aria-invalid="true"');expect(html).toContain('Check your passwords');
  const pending=renderToStaticMarkup(<RecoveryReset hydrated busy done={false} message="" onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(pending).toMatch(/<fieldset[^>]*disabled=""/);expect(pending).toContain('aria-busy="true"');
  expect(pending).toContain('Saving your new password…');
 });
 it('keeps assisted identity attestation rather than exposing the employee request form',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER"/>);
  expect(html).toContain('name="attestation"');expect(html).toContain('type="checkbox"');
  expect(html).toContain('independently confirmed');expect(html).toContain('href="/app/employees"');
  expect(html).not.toContain('name="email"');expect(html).not.toContain('recovery-help');
 });
});

describe('Sign-in pages in Spanish',()=>{
 it('shows the request and reset forms and their known messages in Spanish, keeping the English outcome logic',()=>{
  const request=renderToStaticMarkup(<AccountRecovery kind="request" lang="es"/>);
  // Phase 5 (PB-014, PB-029): the page is an imperative and says "restablecer", the word the email uses.
  expect(request).toContain('Restablece tu contraseña');expect(request).toContain('El correo que tiene tu lugar de trabajo.');expect(request).toContain('Enviarme el enlace');
  const reset=renderToStaticMarkup(<RecoveryReset lang="es" hydrated busy={false} done={false} message="Passwords do not match." onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(reset).toContain('aria-invalid="true"');expect(reset).toContain('Revisa tus contraseñas');expect(reset).toContain('Las contraseñas no coinciden.');
  const unknown=renderToStaticMarkup(<RecoveryReset lang="es" hydrated busy={false} done={false} message="Something new from the server." onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(unknown).toContain('Something new from the server.');
 });
});
