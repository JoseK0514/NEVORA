/** Setup-only SQL capability: never imported by a request handler. */
export async function configureCommerceControlReader(admin:{query(text:string):Promise<unknown>},role:string){
 if(!/^nv_control_commerce_[a-f0-9]{24}$/.test(role))throw Error('commerce_reader_role_required');
 await admin.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO "${role}"`);
 await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.commerce_app_workspace_secrets WITH (security_barrier=true) AS
 SELECT s.id,s.workspace_id,s.environment,s.incarnation,s.role_kind,s.login_role,s.ciphertext,s.active
 FROM nevora_onboarding.workspace_secrets s JOIN nevora_onboarding.workspace_registry w
 ON w.id=s.workspace_id AND w.environment=s.environment AND w.incarnation=s.incarnation AND w.app_secret_ref=s.id
 WHERE s.role_kind='APP' AND s.environment='test' AND s.active AND w.lifecycle='ACTIVE'`);
 await admin.query('REVOKE ALL ON nevora_onboarding.commerce_app_workspace_secrets FROM PUBLIC');
 await admin.query(`REVOKE ALL ON nevora_onboarding.workspace_secrets FROM "${role}"`);
 await admin.query(`GRANT SELECT ON nevora_onboarding.workspace_registry,nevora_onboarding.commerce_app_workspace_secrets TO "${role}"`);
}
