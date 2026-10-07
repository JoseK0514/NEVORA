-- Additive mapping profiles and immutable generation receipts; no payroll writes.
CREATE TABLE payroll_export_profile_revisions (
 workspace_id text NOT NULL REFERENCES workspaces(id),profile_id uuid NOT NULL,revision integer NOT NULL CHECK(revision>0),
 operation_id uuid NOT NULL,actor_employee_id text NOT NULL REFERENCES employees(id),command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object' AND octet_length(profile::text)<=65536),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,profile_id,revision),UNIQUE(workspace_id,operation_id)
);
CREATE TABLE payroll_export_receipts (
 workspace_id text NOT NULL REFERENCES workspaces(id),operation_id uuid NOT NULL,actor_employee_id text NOT NULL REFERENCES employees(id),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=1048576),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
CREATE FUNCTION nevora_export_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'nevora_export_history_is_append_only';END $$;
CREATE TRIGGER payroll_profile_append_only BEFORE UPDATE OR DELETE ON payroll_export_profile_revisions FOR EACH ROW EXECUTE FUNCTION nevora_export_immutable();
CREATE TRIGGER payroll_receipt_append_only BEFORE UPDATE OR DELETE ON payroll_export_receipts FOR EACH ROW EXECUTE FUNCTION nevora_export_immutable();
CREATE VIEW nevora_payroll_profile_latest AS SELECT DISTINCT ON(workspace_id,profile_id) * FROM payroll_export_profile_revisions ORDER BY workspace_id,profile_id,revision DESC;
CREATE FUNCTION nevora_payroll_profile_command(p_workspace text,p_actor text,p_operation uuid,p_profile uuid,p_expected integer,p_hash text,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior payroll_export_profile_revisions%ROWTYPE;current_revision integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('nevora.export.profile.'||p_workspace||p_profile::text,0));
 SELECT * INTO prior FROM payroll_export_profile_revisions WHERE workspace_id=p_workspace AND operation_id=p_operation;
 IF FOUND THEN
  IF prior.actor_employee_id<>p_actor OR prior.command_hash<>p_hash THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
  RETURN jsonb_build_object('id',prior.profile_id,'revision',prior.revision,'profile',prior.profile);
 END IF;
 SELECT revision INTO current_revision FROM nevora_payroll_profile_latest WHERE workspace_id=p_workspace AND profile_id=p_profile;
 IF current_revision IS NULL AND (SELECT count(*) FROM nevora_payroll_profile_latest WHERE workspace_id=p_workspace)>=100 THEN RAISE EXCEPTION 'nevora_export_PROFILE_LIMIT';END IF;
 IF COALESCE(current_revision,0)<>p_expected THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
 IF (SELECT count(DISTINCT m->>'employeeId') FROM jsonb_array_elements(p_config->'employeeMappings') m JOIN employees e ON e.id=m->>'employeeId' JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=p_workspace)<>jsonb_array_length(p_config->'employeeMappings') THEN RAISE EXCEPTION 'nevora_export_SCOPE';END IF;
 INSERT INTO payroll_export_profile_revisions(workspace_id,profile_id,revision,operation_id,actor_employee_id,command_hash,profile)
 VALUES(p_workspace,p_profile,p_expected+1,p_operation,p_actor,p_hash,p_config);
 RETURN jsonb_build_object('id',p_profile,'revision',p_expected+1,'profile',p_config);
END $$;
CREATE FUNCTION nevora_payroll_export_command(p_workspace text,p_actor text,p_operation uuid,p_hash text,p_profile uuid,p_revision integer,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior payroll_export_receipts%ROWTYPE;row_count integer;
BEGIN
 IF p_profile IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('nevora.export.profile.'||p_workspace||p_profile::text,0));END IF;
 SELECT * INTO prior FROM payroll_export_receipts WHERE workspace_id=p_workspace AND actor_employee_id=p_actor AND operation_id=p_operation;
 IF FOUND THEN IF prior.command_hash<>p_hash THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;RETURN prior.payload;END IF;
 IF p_profile IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nevora_payroll_profile_latest WHERE workspace_id=p_workspace AND profile_id=p_profile AND revision=p_revision) THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
 row_count=jsonb_array_length(p_payload #> '{model,rows}');
 IF row_count<1 OR row_count>100 OR (SELECT count(*) FROM jsonb_array_elements(p_payload #> '{model,rows}') r JOIN nevora_timecard_latest c
 ON c.workspace_id=p_workspace AND c.employee_id=r->>'employeeId' AND c.start_date=(p_payload #>> '{model,period,startDate}')::date
 AND c.end_date=(p_payload #>> '{model,period,endDate}')::date AND c.action='FINALIZE' AND c.revision=(r->>'revision')::integer
 AND c.source_hash=r->>'sourceHash' AND c.operation_id::text=r->>'finalizationOperationId')<>row_count THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
 IF p_payload #>> '{profile,format}'='ADP_RUN_GENERIC_V1' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload #> '{model,rows}') r JOIN employees e ON e.id=r->>'employeeId' WHERE NOT e.active) THEN RAISE EXCEPTION 'nevora_export_INACTIVE';END IF;
 INSERT INTO payroll_export_receipts(workspace_id,actor_employee_id,operation_id,command_hash,payload) VALUES(p_workspace,p_actor,p_operation,p_hash,p_payload);
 RETURN p_payload;
END $$;
