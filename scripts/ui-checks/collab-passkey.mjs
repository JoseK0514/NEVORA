import assert from 'node:assert/strict';
import { join } from 'node:path';

export async function checkBrowserPasskey({ url, login, employee, desktop, evidence, record }) {
  const page = await login(employee, desktop);
  const context = page.context();
  try {
    const session = await context.newCDPSession(page);
    await session.send('WebAuthn.enable');
    await session.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2', transport: 'internal', hasResidentKey: true, hasUserVerification: true,
        isUserVerified: true, automaticPresenceSimulation: true,
      },
    });
    await page.goto(url + '/app/profile/passkeys');
    await page.getByRole('heading', { name: 'Passkeys', exact: true }).waitFor();
    const registered = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/passkey/register/verify');
    await page.getByRole('button', { name: 'Add a passkey', exact: true }).click();
    assert.equal((await registered).status(), 200);
    await page.getByRole('button', { name: /^Remove / }).first().waitFor();
    await page.screenshot({ path: join(evidence, 'passkey-registered-1440.png') });

    await context.clearCookies();
    await page.goto(url + '/login');
    await page.getByRole('button', { name: 'Sign in with a passkey', exact: true }).click();
    await page.waitForURL(target => target.pathname === '/app');
    record('I5', 'Employee registered a passkey and signed in with it using Chromium’s virtual authenticator');
  } finally {
    await context.close();
  }
}
