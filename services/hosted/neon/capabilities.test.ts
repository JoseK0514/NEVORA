import {describe,it,expect} from 'vitest';
import {approvedCapabilityNames,roleCapabilitiesAllowed,provisionerEnvironment} from './capabilities';
import {readCommerceConfig} from '../../commerce/config';
const worker='nv_control_provision_'+'a'.repeat(24),app='nv_control_app_'+'b'.repeat(24);
const env={NEVORA_PROVISIONER_CONTROL_DATABASE_URL:`postgresql://${worker}:fictional@ep-fixture.us-east-1.aws.neon.tech/control?sslmode=verify-full`,NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL:app};
describe('hosted provisioning control credentials',()=>{
 it('accepts the complete keyless receiver runtime configuration without granting Stripe API access',()=>{
  const receiver={NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_COMMERCE_DATABASE_URL:'postgresql://nv_commerce_api_aaaaaaaaaaaaaaaaaaaaaaaa:fictional@ep-fixture.us-east-1.aws.neon.tech/catalog?sslmode=verify-full',NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,7).toString('base64'),NEVORA_COMMERCE_ORIGIN:'https://signup-staging.example.invalid',NEVORA_COMMERCE_UI_ORIGIN:'https://signup-staging.example.invalid',STRIPE_WEBHOOK_SECRET:'whsec_fictional'};
  expect(readCommerceConfig(receiver).environment).toBe('staging');expect(roleCapabilitiesAllowed('stripewebhook',receiver)).toBe(true);expect(roleCapabilitiesAllowed('stripewebhook',{...receiver,STRIPE_SECRET_KEY:'rk_test_fictional'})).toBe(false);
 });
 it('opens the exact worker target without receiving a usable application password',()=>{const prepared=provisionerEnvironment(env),identity=new URL(prepared.NEVORA_CONTROL_DATABASE_URL!);expect(identity.username).toBe(app);expect(identity.password).toBe('');expect(prepared.NEVORA_PROVISIONER_CONTROL_DATABASE_URL).toBe(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL);expect(roleCapabilitiesAllowed('provisioner',env)).toBe(true);});
 it.each([
  env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL.replace(worker,'neondb_owner'),
  env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL.replace('verify-full','require'),
  env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL+'&host=foreign.invalid',
  env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL+'&user=neondb_owner',
  env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL.replace('ep-fixture.us-east-1.aws.neon.tech','foreign.invalid'),
 ])('refuses owner, unverified transport or redirected effective control DSNs',url=>{expect(()=>provisionerEnvironment({...env,NEVORA_PROVISIONER_CONTROL_DATABASE_URL:url})).toThrow();expect(roleCapabilitiesAllowed('provisioner',{...env,NEVORA_PROVISIONER_CONTROL_DATABASE_URL:url})).toBe(false);});
 it('requires an explicitly named app identity and refuses app passwords in function custody',()=>{expect(()=>provisionerEnvironment({...env,NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL:undefined})).toThrow();expect(roleCapabilitiesAllowed('provisioner',{...env,NEVORA_CONTROL_DATABASE_URL:'postgresql://fictional:password@foreign.invalid/control'})).toBe(false);});
 it('publishes distinct name-only policies for deployment preflight',()=>{expect([...approvedCapabilityNames('commercequeue')]).not.toContain('STRIPE_WEBHOOK_SECRET');expect([...approvedCapabilityNames('commercereconcile')]).not.toContain('NEVORA_COMMERCE_SMTP_PASSWORD');expect([...approvedCapabilityNames('provisioner')]).not.toContain('STRIPE_SECRET_KEY');});
 it.each([{STRIPE_SECRET_KEY:'sk_test_fictional'},{STRIPE_SECRET_KEY:'rk_live_fictional'},{NEVORA_COMMERCE_TAX_ENABLED:'true'},{NEVORA_COMMERCE_PROVISIONING_MODE:'slots'}])('refuses an unapproved hosting capability choice %j',patch=>{expect(roleCapabilitiesAllowed('commercequeue',patch)).toBe(false);});
});
