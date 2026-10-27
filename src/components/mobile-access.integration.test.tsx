import {EmployeeHomeQuietView} from './employee-home-quiet';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {QuietAuthShell} from './auth-premium/auth-shell';
import {RecoveryRequest} from './recovery-request';
import {RecoveryReset} from './recovery-reset';
import {ActivationInvitationView} from '@/app/activate/activation-invitation';
import {AUTH_COPY} from '@/lib/auth-copy';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{},push:()=>{}})}));
afterEach(()=>vi.unstubAllEnvs());

describe('Frozen mobile access integration',()=>{
 it('keeps the rollout off by default and exposes real Help only after explicit enablement',()=>{
  vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','false');
  expect(renderToStaticMarkup(<QuietAuthShell lang="en" t={AUTH_COPY.en}>Content</QuietAuthShell>)).not.toContain('data-mobile-access="true"');
  vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');
  const html=renderToStaticMarkup(<QuietAuthShell lang="es" t={AUTH_COPY.es}>Content</QuietAuthShell>);
  expect(html).toContain('data-mobile-access="true"');
  expect(html).toContain('/access-help');
  expect(html).toContain('Ayuda');
  expect(html).not.toContain('screen=');
 });
 it('offers Employee ID assistance at recovery without adding an account lookup or changing inputs',()=>{
  const html=renderToStaticMarkup(<RecoveryRequest mobileAccess hydrated busy={false} done={false} message="" onSubmit={()=>{}} lang="es"/>);
  expect(html).toContain('recovery-id-help');
  expect(html).toContain('name="employeeId"');expect(html).toContain('name="email"');
  expect(html).not.toContain('name="phone"');expect(html).not.toContain('Email sent');
 });
 it('preserves the current43-character reset contract and password bounds in the mobile form',()=>{
  const html=renderToStaticMarkup(<RecoveryReset mobileAccess hydrated busy={false} done={false} message="" onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('minLength="43"');expect(html).toContain('maxLength="43"');
  expect(html.match(/maxLength="1024"/g)).toHaveLength(2);
  expect(html).not.toContain('10 letters');expect(html).not.toContain('K7M4P');
 });
 it('localizes activation without calling a syntactically valid invitation verified',()=>{
  const html=renderToStaticMarkup(<ActivationInvitationView mobileAccess lang="es" phase="ready" workspaceName="Actual configured workplace" loginHref="/login?activated=1" onSubmit={()=>{}}/>);
  expect(html).toContain('Crear contraseña');expect(html).toContain('Actual configured workplace');
  expect(html).not.toMatch(/Invitation verified|invitación verificada/i);
  expect(html.match(/maxLength="1024"/g)).toHaveLength(2);
  expect(html).not.toContain('activation-employee-id');
 });
 it('shows only the server-confirmed ID in the localized receipt and keeps ordinary sign-in',()=>{
  const html=renderToStaticMarkup(<ActivationInvitationView mobileAccess lang="es" phase="activated" employeeId="CONFIRMED-FIXTURE-ID" loginHref="/login?activated=1" onSubmit={()=>{}}/>);
  expect(html).toContain('ID de empleado');expect(html).toContain('CONFIRMED-FIXTURE-ID');
  expect(html).toContain('href="/login?activated=1"');expect(html).not.toContain('10482');
 });
});

it('places optional onboarding below the real Home heading without replacing the data view',()=>{
 const html=renderToStaticMarkup(<EmployeeHomeQuietView home={null} status="loading" refreshing={false} onRetry={()=>{}} ownTimeSlot={null} intro={<p>Optional onboarding fixture</p>}/>);
 expect(html).toContain('Optional onboarding fixture');
 expect(html.indexOf('Optional onboarding fixture')).toBeGreaterThan(html.indexOf('<h1>Home</h1>'));
 expect(html).toContain('data-home-state="loading"');
});
