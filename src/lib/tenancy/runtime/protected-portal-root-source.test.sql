-- PREPARED UNUSED SOURCE. This is one complete native digest/locator-derived
-- Portal row-capture root, NOT the complete PortalProof facts issuer.
-- Current resolve.server.ts parsePortal expects authorityCurrent/PORTAL facts;
-- it MUST NOT accept this distinct observation format as those facts.
-- Root alone may adopt a fresh installer and exact safe NOLOGIN owner/ACL/RLS/
-- native group enrollment after review. No role/grant/seed/ALTER/RLS here.
-- Default CREATE ownership is NOT trusted-owner installation. The original
-- LOGIN gate inside remains closed until exact declared-root owner/source/ACL
-- dependency capsules are installed. Source/body hashes alone grant nothing.
-- Owning caller must already hold shared catalog fence, use ReadCommitted and
-- maintain original/final audited runtime role checks. No own BEGIN/replay.
CREATE FUNCTION nevora_tenancy.resolve_portal(
  p_locator pg_catalog.text,
  p_session_token_hash pg_catalog.text
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
VOLATILE
PARALLEL UNSAFE
SECURITY DEFINER
SET search_path = pg_catalog
AS $protected_portal_source_resolver$
DECLARE
  selected_workspace_id pg_catalog.text;
  selected_employee_id pg_catalog.text;
  selected_source pg_catalog.jsonb;
  selected_observed_at pg_catalog.timestamptz;
BEGIN
IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN
  RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_root_isolation_required';
END IF;
IF nevora_tenancy.require_original_runtime_login_kind() COLLATE pg_catalog."C" IS DISTINCT FROM 'APP' THEN
  RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='portal_root_login_denied';
END IF;
-- Match existing normalizeWorkspaceLocator's canonical OUTPUT. No SQL lower,
-- trim, source-ID normalization or truncation. Validate before a bpchar cast.
IF p_locator IS NULL OR p_locator COLLATE pg_catalog."C" !~ '^[a-z0-9-]{8,32}$'
  OR p_locator COLLATE pg_catalog."C" ~ '[^a-z0-9-]'
  OR p_session_token_hash IS NULL
  OR pg_catalog.octet_length(p_session_token_hash) <> 64
  OR p_session_token_hash COLLATE pg_catalog."C" !~ '^[a-f0-9]{64}$' THEN
  RETURN NULL::pg_catalog.jsonb;
END IF;

-- Unlocked discovery identifies the exact original source subject only. It is
-- not the snapshot used for permission or a session lock before parent locks.
-- Source PK/immutable ownership + fresh final equality are required, not LIMIT1.
BEGIN
SELECT employee.workspace_id,employee.id
  INTO STRICT selected_workspace_id,selected_employee_id
  FROM public.employee_sessions AS session
  JOIN public.employees AS employee
    ON employee.id OPERATOR(pg_catalog.=) session.employee_id
      AND pg_catalog.convert_to(employee.id,'UTF8') = pg_catalog.convert_to(session.employee_id,'UTF8')
  JOIN nevora_tenancy.workspace_locator AS locator
    ON locator.workspace_id OPERATOR(pg_catalog.=) employee.workspace_id
      AND pg_catalog.convert_to(locator.workspace_id,'UTF8') = pg_catalog.convert_to(employee.workspace_id,'UTF8')
  WHERE session.token_hash OPERATOR(pg_catalog.=) p_session_token_hash::pg_catalog.bpchar
    AND locator.locator_code OPERATOR(pg_catalog.=) p_locator
    AND pg_catalog.convert_to(locator.locator_code,'UTF8') = pg_catalog.convert_to(p_locator,'UTF8');
EXCEPTION
  WHEN NO_DATA_FOUND THEN RETURN NULL::pg_catalog.jsonb;
  WHEN TOO_MANY_ROWS THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_root_subject_ambiguous';
END;

-- Exactly one combined observer; not a before/after wrapper around the complete
-- old kernel. Its joint prefix locks workspace -> employee -> credential ->
-- counter -> immutable policy definition -> head -> Portal/session/LIVE/admin.
-- Complete-group native admission and installer acceptance are separate pinned
-- integration gates; this unused source does not install or authenticate them.
selected_source := nevora_tenancy.read_portal_policy_source_rows(
  selected_workspace_id,selected_employee_id,p_session_token_hash::pg_catalog.bpchar);

-- Fresh statement after all waited locks. Exact native bpchar source comparison
-- is retained; no new hex CHECK is placed on source employee_sessions. The root
-- input is canonical digest text. Locator identities are immutable under their
-- accepted guard; matching catalog/source/writer adoption is still mandatory.
PERFORM 1 FROM public.employee_sessions AS session
  JOIN public.employees AS employee
    ON employee.id OPERATOR(pg_catalog.=) session.employee_id
      AND pg_catalog.convert_to(employee.id,'UTF8') = pg_catalog.convert_to(session.employee_id,'UTF8')
  JOIN nevora_tenancy.workspace_locator AS locator
    ON locator.workspace_id OPERATOR(pg_catalog.=) employee.workspace_id
      AND pg_catalog.convert_to(locator.workspace_id,'UTF8') = pg_catalog.convert_to(employee.workspace_id,'UTF8')
  WHERE session.token_hash OPERATOR(pg_catalog.=) p_session_token_hash::pg_catalog.bpchar
    AND employee.id OPERATOR(pg_catalog.=) selected_employee_id
    AND pg_catalog.convert_to(employee.id,'UTF8') = pg_catalog.convert_to(selected_employee_id,'UTF8')
    AND employee.workspace_id OPERATOR(pg_catalog.=) selected_workspace_id
    AND pg_catalog.convert_to(employee.workspace_id,'UTF8') = pg_catalog.convert_to(selected_workspace_id,'UTF8')
    AND locator.locator_code OPERATOR(pg_catalog.=) p_locator
    AND pg_catalog.convert_to(locator.locator_code,'UTF8') = pg_catalog.convert_to(p_locator,'UTF8');
IF NOT FOUND THEN
  RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_root_presented_source_drift';
END IF;
selected_observed_at := pg_catalog.clock_timestamp();

-- Preserve raw active/state/provenance/must-change/session/versions. The
-- accepted real pure source adapter decides coherence/ineligibility and only
-- computes a canonical ceiling. No VERIFIED-only condition or default grants.
RETURN pg_catalog.jsonb_build_object(
  'kind','PRESENTED_PORTAL_ROOT_SOURCE_OBSERVATION_V1',
  'selection',pg_catalog.jsonb_build_object(
    'locator',p_locator,'sessionTokenHash',p_session_token_hash,
    'workspaceId',selected_workspace_id,'employeeId',selected_employee_id,
    'databaseObservedAt',selected_observed_at::pg_catalog.text),
  'sources',selected_source,
  'verification','PROTECTED_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_CURRENT_GRANT');
END;
$protected_portal_source_resolver$;
REVOKE ALL ON FUNCTION nevora_tenancy.resolve_portal(pg_catalog.text,pg_catalog.text) FROM PUBLIC;
-- Exact fresh-only own installer must reject all overloads/preexisting root;
-- native named/default ACLs, owner profile, graph/capsules, RLS subjects and
-- actual executing-source build custody before any runtime EXECUTE enrollment.
-- This source performs no such enrollment and is not an operative installer.
