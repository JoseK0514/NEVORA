-- UNUSED LOCAL native authority successor; installation/behavior UNEXECUTED.
-- ROOT must enroll every exact function/source/owner/OID/dependency/route, add
-- lineage to native private capsules and independently controlled reader RLS,
-- and authenticate the complete legacy producer/build/control lineage first.
-- These CREATEs confer no role/grant/policy. Existing raw observers stay unchanged.
-- Caller RC: shared catalog fence FIRST -> raising external audited APP -> root;
-- separate fresh statements/final raising APP. Definer owner is exact closed safe
-- NOLOGIN read/lock owner, never the superuser maintenance enrollment writer.
-- Source-reader access is nonrecursive and distinct from two APP business RLS
-- policies. No GUC values, supplied current=true, parser or caller source digest
-- establish a subject. Current comparison helpers alone never mint a scope frame.
-- New verified/explicit replacement lineage has a separate required producer;
-- no fictional VERIFIED history is admitted by this captured-legacy successor.
CREATE FUNCTION nevora_tenancy.derive_enrolled_portal_request_authority(p_raw pg_catalog.jsonb)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $portal_request_enrolled_authority$
DECLARE
 portal pg_catalog.jsonb; employee pg_catalog.jsonb; policy pg_catalog.jsonb;
 administrative pg_catalog.jsonb; lineage nevora_tenancy.portal_access_lineage%ROWTYPE;
 administrative_ids pg_catalog.jsonb; allowed_ids pg_catalog.jsonb;
 result pg_catalog.jsonb; snapshot pg_catalog.jsonb; native_time pg_catalog.timestamptz;
BEGIN
 IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='portal_request_isolation_required'; END IF;
 IF nevora_tenancy.require_original_runtime_login_kind() COLLATE pg_catalog."C" IS DISTINCT FROM 'APP' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_original_login_required'; END IF;
 IF p_raw IS NULL OR p_raw->>'kind' IS DISTINCT FROM 'PRESENTED_PORTAL_ROOT_CURRENT_SOURCE_OBSERVATION_V2' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_native_source_required'; END IF;
 portal:=p_raw#>'{sources,portalSource,portal}';employee:=p_raw#>'{sources,portalSource,employee}';
 policy:=p_raw#>'{sources,installedPolicy,installation}';administrative:=p_raw#>'{sources,portalSource,administrative}';
 -- All preceding source locks come from capture_portal_request_current_sources.
 -- This immutable same-generation row is last; cooperative replacement locks
 -- persistent Portal first and cannot insert a new selected generation phantom.
 SELECT l.* INTO STRICT lineage FROM nevora_tenancy.portal_access_lineage l
 WHERE pg_catalog.convert_to(l.workspace_id,'UTF8')=pg_catalog.convert_to(p_raw#>>'{selection,workspaceId}','UTF8')
  AND pg_catalog.convert_to(l.employee_id,'UTF8')=pg_catalog.convert_to(p_raw#>>'{selection,employeeId}','UTF8')
  AND l.workspace_incarnation=(p_raw#>>'{sources,portalSource,incarnation,version}')::pg_catalog.int8
  AND l.authorization_version=(portal->>'authorizationVersion')::pg_catalog.int8
  AND l.portal_access_version=(portal->>'portalAccessVersion')::pg_catalog.int8
 ORDER BY l.workspace_incarnation,l.authorization_version,l.portal_access_version FOR SHARE;
 -- Only privately written original complete capture + deliberate current grant
 -- command is eligible. A legacy label alone and pure canonical ceiling are not.
 IF lineage.lineage_kind IS DISTINCT FROM 'CAPTURED_LEGACY_EXISTING_ACCESS'
  OR lineage.capture_source->>'format' IS DISTINCT FROM 'CONTROLLED_CAPTURED_LEGACY_PORTAL_LINEAGE_V1'
  OR lineage.capture_source->>'legacyAccess' IS DISTINCT FROM 'PRESERVED'
  OR lineage.capture_source->'credential' IS NULL OR lineage.capture_source->'credential'='null'::pg_catalog.jsonb
  OR lineage.capture_source#>>'{employee,role}' IS DISTINCT FROM employee->>'role'
  OR portal->>'state' IS DISTINCT FROM 'ENABLED'
  OR portal->>'proofProvenance' IS DISTINCT FROM 'LEGACY_UNVERIFIED'
  OR lineage.provenance_reference IS DISTINCT FROM portal->>'provenanceReference'
  OR lineage.policy_id IS DISTINCT FROM policy->>'policyId'
  OR lineage.policy_revision::pg_catalog.text IS DISTINCT FROM policy->>'policyRevision'
  OR lineage.installation_epoch::pg_catalog.text IS DISTINCT FROM policy->>'installationEpoch'
  OR lineage.effective_grants->>'format' IS DISTINCT FROM 'CONTROLLED_CAPTURED_LEGACY_EFFECTIVE_GRANTS_V1'
  OR lineage.effective_grants->>'role' IS DISTINCT FROM employee->>'role'
  OR pg_catalog.jsonb_typeof(lineage.effective_grants->'capabilities') IS DISTINCT FROM 'array'
  OR pg_catalog.jsonb_typeof(lineage.effective_grants->'administrativeCapabilities') IS DISTINCT FROM 'array'
  OR lineage.capture_source->'sourceBindings' IS DISTINCT FROM '{"src/lib/auth/session.ts":"f1cc1cd4714f1580f27ca00f038a7ecf597813dee23ffac3ed1725e303908fc0","src/lib/auth/permissions.ts":"33cd895853312b1d7ace7910a44e373fa4f037da856d97c0c807af9344598920","src/lib/capabilities/policy.ts":"2c8b81fdbb5a790f778f6de18062e788e312bf38bc873171c23fee8150940df8","src/lib/capabilities/types.ts":"1a58a71719cc656ffa2830a0ffcc075668d1d10593f9556bb3dc03dd8cca0444","src/lib/tenancy/identity.ts":"223d023e27452dd1b751ecef412e8db0c0bbb19da93e594d4eef5fef681a584b","src/lib/tenancy/migrations/employee-number-enrollment.ts":"251a4c7b579a59ac9854b58480163d4ded8433048c9658c907b1c6db33f2e7f2","src/lib/tenancy/migrations/employee-number-enrollment-binding.server.ts":"dcf84aff0babe18f3d3af85c7f18612661275351680daa0eee8c5c33c347cae9","src/lib/tenancy/migrations/key-comparator-recheck.server.ts":"b9ab8c3f190ed576e0bf1845b982ee3a285f5f6a5ebb22b8a1ec50522c1e78c3","src/lib/tenancy/migrations/typed-guarded-backfill.server.ts":"f0b33f2a17fe464d56e29ca608f445ec4d2f86724187ea6c46ea5e245077988c","src/lib/tenancy/migrations/typed-backfill.ts":"5d6de8bd06df045f05745e4ed2978f03869ae64f46f67902b86467562e24c29e","src/lib/tenancy/migrations/typed-wire.ts":"8e352202761344afb449d4dbf565603b77965264aea20a8ede01832acc670957","src/lib/tenancy/runtime/portal-authority-storage.sql":"e8afeff01d13775eeecd462e7a6e2bb662e1279ce44fd3ded2b383e34821a094","src/lib/tenancy/runtime/portal-administrative-authority-storage.sql":"06d78b8e7e6118109312d07d48d56231266b38853bcdd8792e1e298836af42a4","src/lib/tenancy/runtime/portal-session-issuance-storage.sql":"4625ff35db3c4c3b63ef9e575468af75f4e4935c8af9934ec5b99e3cf346397e","src/lib/tenancy/runtime/workspace-incarnation-storage.sql":"b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9","src/lib/tenancy/runtime/capability-policy-definition-storage.sql":"75e8f70dbd5e2381cdde2c425aa634fafe0fe420392b07ab858cf9900382a386","src/lib/tenancy/runtime/employee-login-identity-storage.sql":"4bfb8494d4ee7407a34da9a38bebcc268a3f2ca7ba5a9309d3d441873af6a330","NEW:src/lib/tenancy/runtime/portal-access-lineage-storage.sql":"3907e6be68c41647a3a0696d0d6e6e2fe98463735565753cbb724bfafaabfcf8","src/lib/tenancy/runtime/portal-source-image.generated.ts":"9433a47dd4b796e85b094119bff8a2fa564853499f69e64d8430e997e49ad2f8"}'::pg_catalog.jsonb
  OR lineage.source_manifest_sha256 IS DISTINCT FROM '286342717d646c8602d6c354ccdce6c6d7299887c57c538e3db29391b5ef8805'
  OR p_raw#>>'{sources,installedPolicy,definition,canonicalPolicySource,sha256}' IS DISTINCT FROM '2c8b81fdbb5a790f778f6de18062e788e312bf38bc873171c23fee8150940df8'
  OR p_raw#>>'{sources,installedPolicy,definition,vocabularySource,sha256}' IS DISTINCT FROM '1a58a71719cc656ffa2830a0ffcc075668d1d10593f9556bb3dc03dd8cca0444'
  OR p_raw#>>'{sources,installedPolicy,definition,approvedPRDSource,sha256}' IS DISTINCT FROM '35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_enrollment_mismatch'; END IF;
 -- Independent registered source/body/build/control enrollment authenticates
 -- the writer and fixed full preimages, never this equality alone. The captured
 -- raw observer retains all native full policy byte wires for current comparison.
 IF employee->>'role' IN('OWNER','MANAGER') THEN
  IF administrative IS NULL OR administrative='null'::pg_catalog.jsonb
   OR administrative->>'scopeKind' IS DISTINCT FROM 'ALL_TENANT'
   OR administrative->>'scopeOrigin' IS DISTINCT FROM 'LEGACY_COMPATIBILITY'
   OR administrative->>'provenanceReference' IS DISTINCT FROM lineage.provenance_reference
   OR administrative->>'capabilityPolicyRevision' IS DISTINCT FROM lineage.policy_revision::pg_catalog.text
   OR administrative->'capabilities' IS DISTINCT FROM lineage.effective_grants->'administrativeCapabilities'
   OR administrative->'locationIds' IS DISTINCT FROM '[]'::pg_catalog.jsonb
   OR lineage.effective_grants->'administrativeScope' IS DISTINCT FROM '{"kind":"ALL_TENANT"}'::pg_catalog.jsonb THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_grant_mismatch'; END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(location->'id' ORDER BY pg_catalog.convert_to(location->>'id','UTF8')),'[]'::pg_catalog.jsonb)
    INTO administrative_ids FROM pg_catalog.jsonb_array_elements(p_raw#>'{locationSource,locations}') AS rows(location);
 ELSE
  IF employee->>'role' NOT IN('LEAD','EMPLOYEE') OR administrative IS DISTINCT FROM 'null'::pg_catalog.jsonb
   OR lineage.effective_grants->'administrativeCapabilities' IS DISTINCT FROM '[]'::pg_catalog.jsonb
   OR lineage.effective_grants->'administrativeScope' IS DISTINCT FROM 'null'::pg_catalog.jsonb THEN
   RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_grant_mismatch'; END IF;
  administrative_ids:='[]'::pg_catalog.jsonb;
 END IF;
 -- Allowed union is primary+actual same-tenant eligibility+authenticated admin
 -- scope. Do not infer M from scheduling eligibility or exclude historical L.
 SELECT COALESCE(pg_catalog.jsonb_agg(id ORDER BY pg_catalog.convert_to(id,'UTF8')),'[]'::pg_catalog.jsonb) INTO allowed_ids FROM (
  SELECT p_raw#>>'{locationSource,primaryLocationId}' AS id
  UNION SELECT row->>'locationId' FROM pg_catalog.jsonb_array_elements(p_raw#>'{locationSource,eligibility}') AS r(row)
  UNION SELECT id FROM pg_catalog.jsonb_array_elements_text(administrative_ids) AS a(id)
 ) permitted;
 native_time:=(p_raw#>>'{selection,databaseObservedAt}')::pg_catalog.timestamptz;
 IF native_time>= (p_raw#>>'{sources,portalSource,session,expiresAt}')::pg_catalog.timestamptz THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_session_expired'; END IF;
 -- Original session expiry supplies the bound; no new proof/session TTL/default.
 snapshot:=pg_catalog.jsonb_build_object('format','PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1',
  'locator',p_raw#>>'{selection,locator}','sessionTokenHash',p_raw#>>'{selection,sessionTokenHash}',
  'workspaceId',p_raw#>>'{selection,workspaceId}','employeeId',p_raw#>>'{selection,employeeId}',
  'sources',p_raw->'sources','locationSource',p_raw->'locationSource','resolvedAt',native_time::pg_catalog.text,
  'expiresAt',p_raw#>>'{sources,portalSource,session,expiresAt}');
 result:=pg_catalog.jsonb_build_object('format','PORTAL_REQUEST_AUTHORITY_V1','kind','PORTAL','authorityCurrent',true,
  'workspaceId',p_raw#>>'{selection,workspaceId}','workspaceVersion',p_raw#>>'{sources,portalSource,workspace,version}',
  'workspaceIncarnation',p_raw#>>'{sources,portalSource,incarnation,version}','resolvedAt',snapshot->>'resolvedAt','expiresAt',snapshot->>'expiresAt',
  'locator',snapshot->>'locator','employeeId',snapshot->>'employeeId','employeeVersion',employee->>'version',
  'authorizationVersion',portal->>'authorizationVersion','portalAccessVersion',portal->>'portalAccessVersion',
  'sessionTokenHash',snapshot->>'sessionTokenHash','sessionExpiresAt',snapshot->>'expiresAt','role',employee->>'role',
  'capabilityPolicyRevision',portal->>'capabilityPolicyRevision','capabilities',lineage.effective_grants->'capabilities',
  'allowedLocationIds',allowed_ids,'administrativeLocationIds',administrative_ids,
  'administrativeScope',CASE WHEN employee->>'role' IN('OWNER','MANAGER') THEN '{"kind":"ALL_TENANT","origin":"LEGACY_COMPATIBILITY"}'::pg_catalog.jsonb ELSE 'null'::pg_catalog.jsonb END,
  'nativeCurrentSource',snapshot);
 RETURN result;
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN
 RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_enrollment_missing';
END;
$portal_request_enrolled_authority$;
REVOKE ALL ON FUNCTION nevora_tenancy.derive_enrolled_portal_request_authority(pg_catalog.jsonb) FROM PUBLIC;
CREATE FUNCTION nevora_tenancy.resolve_portal_request(p_locator pg_catalog.text,p_session_token_hash pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER SET search_path=pg_catalog
AS $portal_request_authority_root$
DECLARE raw_source pg_catalog.jsonb;
BEGIN
 -- Input derives subject exclusively through actual locator/digest/session; no
 -- employee/workspace selector, caller proof, GUC or current=true enters root.
 raw_source:=nevora_tenancy.capture_portal_request_current_sources(p_locator,p_session_token_hash);
 IF raw_source IS NULL THEN RETURN NULL::pg_catalog.jsonb; END IF;
 RETURN nevora_tenancy.derive_enrolled_portal_request_authority(raw_source);
END;
$portal_request_authority_root$;
REVOKE ALL ON FUNCTION nevora_tenancy.resolve_portal_request(pg_catalog.text,pg_catalog.text) FROM PUBLIC;
CREATE FUNCTION nevora_tenancy.require_locked_portal_request_authority(p_facts pg_catalog.jsonb)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog
AS $portal_request_current_authority$
DECLARE actual pg_catalog.jsonb;
BEGIN
 -- Accepted final/lock guard SECDEF wrappers call this INVOKER dependency;
 -- it is never granted to APP directly or registered as generic/direct root.
 IF pg_catalog.jsonb_typeof(p_facts) IS DISTINCT FROM 'object'
  OR p_facts->>'format' IS DISTINCT FROM 'PORTAL_REQUEST_CURRENT_PROOF_PAYLOAD_V1'
  OR (SELECT pg_catalog.array_agg(k ORDER BY k COLLATE pg_catalog."C") FROM pg_catalog.jsonb_object_keys(p_facts) AS names(k))
   IS DISTINCT FROM ARRAY['administrativeLocationIds','administrativeScope','allowedLocationIds','authorizationVersion',
   'capabilities','capabilityPolicyRevision','employeeId','employeeVersion','expiresAt','format','kind','locator','nativeCurrentSource',
   'portalAccessVersion','resolvedAt','role','sessionExpiresAt','sessionTokenHash','workspaceId','workspaceIncarnation','workspaceVersion']::pg_catalog.text[]
  OR p_facts->>'kind' IS DISTINCT FROM 'PORTAL' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_complete_private_capsule_required'; END IF;
 -- Source equality includes full native policy bytes and current location sets;
 -- the independent lineage/current effective-grant check below remains required.
 IF nevora_tenancy.lock_and_compare_portal_request_sources(p_facts->'nativeCurrentSource') IS DISTINCT FROM true THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_source_mismatch'; END IF;
 actual:=nevora_tenancy.resolve_portal_request(p_facts->>'locator',p_facts->>'sessionTokenHash');
 IF actual IS NULL OR actual->>'format' IS DISTINCT FROM 'PORTAL_REQUEST_AUTHORITY_V1'
  OR actual->'authorityCurrent' IS DISTINCT FROM 'true'::pg_catalog.jsonb
  OR actual - ARRAY['format','authorityCurrent','resolvedAt','expiresAt','nativeCurrentSource']::pg_catalog.text[]
   IS DISTINCT FROM p_facts - ARRAY['format','resolvedAt','expiresAt','nativeCurrentSource']::pg_catalog.text[]
  OR p_facts->>'resolvedAt' IS DISTINCT FROM p_facts#>>'{nativeCurrentSource,resolvedAt}'
  OR p_facts->>'expiresAt' IS DISTINCT FROM p_facts#>>'{nativeCurrentSource,expiresAt}' THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_request_current_authority_mismatch'; END IF;
 -- Only after this real whole native authority validation may the separately
 -- enrolled guard mint the backend/database/original-role/assigned-xid frame.
 -- Final guard repeats this and clears its own frame; this function mints none.
 RETURN actual||pg_catalog.jsonb_build_object('resolvedAt',p_facts->>'resolvedAt','expiresAt',p_facts->>'expiresAt','nativeCurrentSource',p_facts->'nativeCurrentSource');
END;
$portal_request_current_authority$;
REVOKE ALL ON FUNCTION nevora_tenancy.require_locked_portal_request_authority(pg_catalog.jsonb) FROM PUBLIC;
