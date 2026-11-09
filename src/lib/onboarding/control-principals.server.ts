import 'server-only';
/** Operator-reviewed control grants. This generates no passwords, creates no
 * roles/resources and is never executed by a public handler or automatic worker. */
export function controlPrincipalGrants(appRole:string,provisionerRole:string):string[]{
 if(!/^nv_control_app_[a-f0-9]{24}$/.test(appRole)||!/^nv_control_provision_[a-f0-9]{24}$/.test(provisionerRole))throw Error('Invalid control principals');
 const tables=(...names:string[])=>names.map(n=>'nevora_onboarding.'+n).join(',');
 return [
  'REVOKE ALL ON SCHEMA nevora_onboarding FROM PUBLIC',
  'REVOKE ALL ON ALL TABLES IN SCHEMA nevora_onboarding FROM PUBLIC',
  `GRANT USAGE ON SCHEMA nevora_onboarding TO ${appRole},${provisionerRole}`,
  `GRANT SELECT,INSERT,UPDATE ON ${tables('registrations','email_subjects','admission_counters','verification_deliveries','signup_sessions')} TO ${appRole}`,
  `GRANT SELECT,INSERT ON ${tables('registration_requests','verification_claim_receipts','workspace_registry','owner_grant_requests','provisioning_operations')} TO ${appRole}`,
  `GRANT SELECT ON ${tables('workspace_secrets')} TO ${appRole}`,
  `GRANT UPDATE(state) ON nevora_onboarding.owner_grant_requests TO ${appRole}`,
  `GRANT UPDATE(not_before) ON nevora_onboarding.provisioning_operations TO ${appRole}`,
  `GRANT SELECT,UPDATE ON ${tables('registrations','workspace_registry','owner_grant_requests','provisioning_operations')} TO ${provisionerRole}`,
  `GRANT SELECT,INSERT,UPDATE ON ${tables('workspace_secrets','provisioning_attempts','provisioning_private')} TO ${provisionerRole}`,
  `GRANT SELECT ON ${tables('registration_requests','verification_deliveries','verification_claim_receipts','admission_counters')} TO ${provisionerRole}`,
  `GRANT UPDATE(payload_ciphertext,delivery_state,completed_at) ON nevora_onboarding.verification_deliveries TO ${provisionerRole}`,
  `GRANT UPDATE(session_ciphertext) ON nevora_onboarding.verification_claim_receipts TO ${provisionerRole}`,
  `GRANT DELETE ON nevora_onboarding.admission_counters TO ${provisionerRole}`,
 ];
}
