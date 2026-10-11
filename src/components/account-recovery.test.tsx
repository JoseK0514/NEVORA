import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {AccountRecovery} from './account-recovery';
import {RecoveryRequest} from './recovery-request';
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
 });
 it('keeps assisted identity attestation rather than exposing the employee request form',()=>{
  const html=renderToStaticMarkup(<AccountRecovery kind="assisted" actorId="QAOWNER"/>);
  expect(html).toContain('name="attestation"');expect(html).toContain('type="checkbox"');
  expect(html).toContain('independently confirmed');expect(html).toContain('href="/app?view=team"');
  expect(html).not.toContain('name="email"');expect(html).not.toContain('recovery-help');
 });
});
