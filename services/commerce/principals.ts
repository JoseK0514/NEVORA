/** Operator-only grant template. Creates no role, secret, database or hosted resource. */
export function commercePrincipalGrants(api:string,enrollment:string){
 if(!/^nv_commerce_api_[a-f0-9]{24}$/.test(api)||!/^nv_commerce_enroll_[a-f0-9]{24}$/.test(enrollment))throw Error('invalid_commerce_principals');
 return [
 'REVOKE ALL ON SCHEMA commerce FROM PUBLIC',
 'REVOKE ALL ON ALL TABLES IN SCHEMA commerce FROM PUBLIC',
 `GRANT USAGE ON SCHEMA commerce TO ${api},${enrollment}`,
 `GRANT SELECT ON commerce.accounts,commerce.businesses,commerce.external_installations TO ${enrollment}`,
 `GRANT INSERT ON commerce.accounts,commerce.businesses,commerce.external_installations,commerce.audit TO ${enrollment}`,
 `GRANT USAGE,SELECT ON SEQUENCE commerce.audit_id_seq TO ${enrollment}`,
 `GRANT SELECT ON commerce.accounts,commerce.businesses,commerce.external_installations TO ${api}`,
 `GRANT SELECT(id,origin,business_id,instance_secret_hash,instance_secret) ON commerce.slots TO ${api}`,
 `GRANT UPDATE(verified_at) ON commerce.accounts TO ${api}`,
 `GRANT UPDATE(stripe_customer_id,stripe_subscription_id,subscription_status,paid_through,past_due_since,plan_key,checkout_id,checkout_url,checkout_expires_at,sync_at,employee_count) ON commerce.businesses TO ${api}`,
 `GRANT SELECT,INSERT,UPDATE ON commerce.tokens,commerce.jobs,commerce.checkout_intents,commerce.rate_limits TO ${api}`,
 `GRANT SELECT,INSERT ON commerce.billing_operations,commerce.billing_operation_stages TO ${api}`,
 `GRANT UPDATE(started_at,result_secret,resolved_at) ON commerce.billing_operations TO ${api}`,
 `GRANT UPDATE(issued_at,result_secret,resolved_at) ON commerce.billing_operation_stages TO ${api}`,
 `GRANT SELECT,INSERT ON commerce.webhooks TO ${api}`,
 `GRANT INSERT ON commerce.audit TO ${api}`,
 `GRANT USAGE,SELECT ON SEQUENCE commerce.audit_id_seq TO ${api}`,
 ];
}
