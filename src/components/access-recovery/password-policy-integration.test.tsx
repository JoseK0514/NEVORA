import { describe, expect, it } from '@rstest/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { PasswordPair } from './password-pair';
import { ActivationInvitationView } from '@/app/activate/activation-invitation';
import { MobileActivationView } from '@/components/mobile-access/activation-view';
import { passwordRejectionMessage, type PasswordRejection } from '@/lib/auth/password-requirements';

describe('password policy on the current access screens', () => {
  it.each(['en', 'es'] as const)('keeps the shared %s fields at fifteen characters without truncating long Unicode phrases', lang => {
    const html = renderToStaticMarkup(<PasswordPair prefix="reset" lang={lang} newLabel="New" confirmLabel="Confirm" />);
    const inputs = html.match(/<input[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input).toContain('minLength="15"');
      expect(input).not.toContain('maxLength=');
    }
    expect(html).toContain(lang === 'en' ? 'At least 15 characters' : 'Al menos 15 caracteres');
  });

  it.each(['en', 'es'] as const)('shows each server policy refusal in %s without retiring the invitation', lang => {
    for (const passwordReason of ['too_short', 'too_long', 'common', 'breached', 'employee_id', 'company_name', 'temporary_password'] as PasswordRejection[]) {
      const props = { phase: 'ready' as const, lang, loginHref: '/login', onSubmit: () => {}, passwordReason };
      for (const html of [renderToStaticMarkup(<ActivationInvitationView {...props} />), renderToStaticMarkup(<MobileActivationView {...props} />)]) {
        expect(html).toContain(passwordRejectionMessage(lang, passwordReason));
        expect(html).toContain('name="password"');
        expect(html).toContain('role="alert"');
      }
    }
  });
});
