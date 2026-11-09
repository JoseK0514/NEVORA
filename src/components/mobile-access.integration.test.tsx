import {MobileRecoveryRequest,MobileRecoveryReset} from './mobile-access/recovery-views';
import {MobileActivationView} from './mobile-access/activation-view';
import {AccessHelpView} from './mobile-access/help-view';
import {EmployeeHomeQuietView} from './employee-home-quiet';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {QuietAuthShell} from './auth-premium/auth-shell';


import {ActivationInvitationView} from '@/app/activate/activation-invitation';
import {AUTH_COPY} from '@/lib/auth-copy';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:()=>{},push:()=>{}})}));
afterEach(()=>vi.unstubAllEnvs());

describe('Frozen mobile access integration',()=>{
 it('keeps the rollout off by default and exposes real Help only after explicit enablement',()=>{
  vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED',undefined);
  expect(renderToStaticMarkup(<QuietAuthShell lang="en" t={AUTH_COPY.en}>Content</QuietAuthShell>)).not.toContain('data-mobile-access="true"');
  vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','false');
  expect(renderToStaticMarkup(<QuietAuthShell lang="en" t={AUTH_COPY.en}>Content</QuietAuthShell>)).not.toContain('data-mobile-access="true"');
  vi.stubEnv('NEVORA_MOBILE_ACCESS_ENABLED','true');
  const html=renderToStaticMarkup(<QuietAuthShell lang="es" t={AUTH_COPY.es}>Content</QuietAuthShell>);
  expect(html).toContain('data-mobile-access="true"');
  expect(html).toContain('/access-help');
  expect(html).toContain('Ayuda');
  expect(html).toContain('href="/access-help?from=login"');
 });
 it('offers Employee ID assistance at recovery without adding an account lookup or changing inputs',()=>{
  const html=renderToStaticMarkup(<MobileRecoveryRequest hydrated busy={false} done={false} message="" onSubmit={()=>{}} lang="es"/>);
  expect(html).toContain('recovery-id-help');
  expect(html).toContain('name="employeeId"');expect(html).toContain('name="email"');
  expect(html.match(/<form\b/g)).toHaveLength(1);
 });
 it('preserves the current43-character reset contract and password bounds in the mobile form',()=>{
  const html=renderToStaticMarkup(<MobileRecoveryReset lang="en" hydrated busy={false} done={false} message="" onSubmit={()=>{}} proofRef={()=>{}}/>);
  expect(html).toContain('minLength="43"');expect(html).toContain('maxLength="43"');
  expect(html.match(/maxLength="1024"/g)).toHaveLength(2);

 });
 it('localizes activation without calling a syntactically valid invitation verified',()=>{
  const html=renderToStaticMarkup(<MobileActivationView lang="es" phase="ready" workspaceName="Actual configured workplace" loginHref="/login?activated=1" onSubmit={()=>{}}/>);
  expect(html).toContain('Crear contraseña');expect(html).toContain('Actual configured workplace');
  expect(html).not.toMatch(/Invitation verified|invitación verificada/i);
  expect(html.match(/maxLength="1024"/g)).toHaveLength(2);
  expect(html).not.toContain('activation-employee-id');
 });
 it('renders the confirmed-success receipt ID with the ordinary sign-in destination',()=>{
  const html=renderToStaticMarkup(<MobileActivationView lang="es" phase="activated" employeeId="CONFIRMED-FIXTURE-ID" loginHref="/login?activated=1" onSubmit={()=>{}}/>);
  expect(html).toContain('ID de empleado');expect(html).toContain('CONFIRMED-FIXTURE-ID');
  expect(html).toContain('href="/login?activated=1"');expect(html).toContain('readOnly=""');
 });
});

it('places optional onboarding below the real Home heading without replacing the data view',()=>{
 const html=renderToStaticMarkup(<EmployeeHomeQuietView home={null} status="loading" refreshing={false} onRetry={()=>{}} ownTimeSlot={null} intro={<p>Optional onboarding fixture</p>}/>);
 expect(html).toContain('Optional onboarding fixture');
 expect(html.indexOf('Optional onboarding fixture')).toBeGreaterThan(html.indexOf('<h1>Home</h1>'));
 expect(html).toContain('data-home-state="loading"');
});

it('keeps the desktop activation presentation during server rendering even with mobile rollout enabled',()=>{
 const html=renderToStaticMarkup(<ActivationInvitationView mobileAccess phase="ready" workspaceName="Configured workplace" loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).toContain('<h1>Activate account</h1>');
 expect(html).toContain('class="q-auth__rules"');
});

it('offers receipt review as an in-place action instead of navigating to the same completed page',()=>{
 const html=renderToStaticMarkup(<MobileRecoveryRequest hydrated busy={false} done message="" onSubmit={()=>{}} lang="en" onReview={()=>{}}/>);
 expect(html).toMatch(/<button[^>]*type="button"[^>]*>Review your details<\/button>/);
});

it('does not allow a private Owner inquiry to submit natively before hydration',()=>{
 const html=renderToStaticMarkup(<AccessHelpView topic="owner-contact" lang="en" from="login" supportEmail="support@example.invalid" ownerEmail="support@example.invalid"/>);
 expect(html).toMatch(/<fieldset[^>]*disabled=""/);
 expect(html).toMatch(/<button[^>]*type="submit"[^>]*disabled=""/);
});

it.each(['invalid','unavailable','outcome_unknown'] as const)('never displays a success ID in the unconfirmed mobile %s phase',phase=>{
 const html=renderToStaticMarkup(<MobileActivationView lang="en" phase={phase} loginHref="/login" onSubmit={()=>{}}/>);
 expect(html).not.toContain('activation-employee-id');if(phase!=='unavailable')expect(html).not.toContain('<form');
 expect(html).toContain('href="/login"');
});
