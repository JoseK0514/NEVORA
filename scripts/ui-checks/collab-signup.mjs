import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function checkSignup({ origin, page, evidence, record }) {
  const heading = name => page.getByRole('heading', { name, exact: true });
  const screenshot = name => page.screenshot({ path: join(evidence, 'signup-' + name + '-390.png') });
  await page.goto(origin + '/onboarding');
  await heading('Set up your business').waitFor();
  await page.locator('#signup-email').fill('qa-signup@example.invalid');
  await page.locator('#signup-agree').check();
  await screenshot('form');
  await page.getByRole('button', { name: 'Send confirmation link', exact: true }).click();
  await heading('Check your email').waitFor();
  await screenshot('check-email');
  record('A8', 'Private signup form sent a confirmation to the fictional SMTP inbox');

  // Nodemailer may transfer-encode an equals sign and fold the proof link.
  const mail = (await readFile(join(evidence, 'fictional-signup.eml'), 'utf8'))
    .replace(/=\r?\n/g, '').replace(/=3D/g, '=');
  const verify = mail.match(/https?:\/\/[a-z0-9.:-]+\/onboarding\/verify\?lang=en#proof=[A-Za-z0-9_-]+/)?.[0];
  assert.ok(verify && new URL(verify).origin === origin, 'No confirmation link in the fictional inbox');
  await page.goto(verify);
  await page.getByLabel('Business name', { exact: true }).waitFor();
  assert.equal(new URL(page.url()).hash, '');
  await screenshot('verified');
  record('A9', 'The local confirmation link opened the verified business setup form');

  // Activation needs a provisioned workspace. This fixture exercises the form
  // with a fictional link shape, and the isolated onboarding tests cover writes.
  const proof = Buffer.alloc(32, 71).toString('base64url');
  await page.goto(origin + '/onboarding/activate#proof=' + proof);
  await heading('Set your Owner password').waitFor();
  await page.locator('input[name="confirmPassword"]').waitFor();
  assert.equal(new URL(page.url()).hash, '');
  await screenshot('owner-activation');
  record('A10', 'Owner activation password form with a synthetic link; no activation submitted');
}
