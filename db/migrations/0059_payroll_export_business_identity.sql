-- Existing immutable receipts are retained, including historical duplicates.
-- Identity is workspace + exact finalized canonical model and exact CSV bytes;
-- operation/actor/profile aliases do not create another business artifact.
CREATE FUNCTION nevora_payroll_export_business_key(p_payload jsonb)
RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object('model',p_payload->'model','csv',p_payload->'csv')::text,'UTF8')),'hex')
$$;
CREATE INDEX payroll_export_business_lookup ON payroll_export_receipts(workspace_id,nevora_payroll_export_business_key(payload));
-- Enforce new-write uniqueness at the table as well as the command boundary,
-- without deleting old duplicates or rewriting immutable historical receipts.
CREATE FUNCTION nevora_payroll_export_deduplicate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE business_key text;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'nevora_export_ISOLATION';END IF;
 business_key=nevora_payroll_export_business_key(NEW.payload);
 PERFORM pg_advisory_xact_lock(hashtextextended('nevora.export.business.'||NEW.workspace_id||business_key,0));
 IF EXISTS(SELECT 1 FROM payroll_export_receipts r WHERE r.workspace_id=NEW.workspace_id AND nevora_payroll_export_business_key(r.payload)=business_key) THEN RAISE EXCEPTION 'nevora_export_ALREADY_GENERATED';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payroll_export_business_unique BEFORE INSERT ON payroll_export_receipts FOR EACH ROW EXECUTE FUNCTION nevora_payroll_export_deduplicate();
CREATE OR REPLACE FUNCTION nevora_payroll_export_command(p_workspace text,p_actor text,p_operation uuid,p_hash text,p_profile uuid,p_revision integer,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior payroll_export_receipts%ROWTYPE;row_count integer;business_key text;
BEGIN
 IF p_profile IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended('nevora.export.profile.'||p_workspace||p_profile::text,0));END IF;
 SELECT * INTO prior FROM payroll_export_receipts WHERE workspace_id=p_workspace AND actor_employee_id=p_actor AND operation_id=p_operation;
 IF FOUND THEN IF prior.command_hash<>p_hash THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;RETURN prior.payload;END IF;
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'nevora_export_ISOLATION';END IF;
 business_key=nevora_payroll_export_business_key(p_payload);
 PERFORM pg_advisory_xact_lock(hashtextextended('nevora.export.business.'||p_workspace||business_key,0));
 -- Recheck same-operation replay after waiting for a concurrent creator.
 SELECT * INTO prior FROM payroll_export_receipts WHERE workspace_id=p_workspace AND actor_employee_id=p_actor AND operation_id=p_operation;
 IF FOUND THEN IF prior.command_hash<>p_hash THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;RETURN prior.payload;END IF;
 IF EXISTS(SELECT 1 FROM payroll_export_receipts r WHERE r.workspace_id=p_workspace AND nevora_payroll_export_business_key(r.payload)=business_key) THEN RAISE EXCEPTION 'nevora_export_ALREADY_GENERATED';END IF;
 IF p_profile IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nevora_payroll_profile_latest WHERE workspace_id=p_workspace AND profile_id=p_profile AND revision=p_revision) THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
 row_count=jsonb_array_length(p_payload #> '{model,rows}');
 IF row_count<1 OR row_count>100 OR (SELECT count(DISTINCT r->>'employeeId') FROM jsonb_array_elements(p_payload #> '{model,rows}') r)<>row_count OR (SELECT count(*) FROM jsonb_array_elements(p_payload #> '{model,rows}') r JOIN nevora_timecard_latest c
 ON c.workspace_id=p_workspace AND c.employee_id=r->>'employeeId' AND c.start_date=(p_payload #>> '{model,period,startDate}')::date
 AND c.end_date=(p_payload #>> '{model,period,endDate}')::date AND c.action='FINALIZE' AND c.revision=(r->>'revision')::integer
 AND c.source_hash=r->>'sourceHash' AND c.operation_id::text=r->>'finalizationOperationId')<>row_count THEN RAISE EXCEPTION 'nevora_export_CONFLICT';END IF;
 IF p_payload #>> '{profile,format}'='ADP_RUN_GENERIC_V1' AND EXISTS(SELECT 1 FROM jsonb_array_elements(p_payload #> '{model,rows}') r JOIN employees e ON e.id=r->>'employeeId' WHERE NOT e.active) THEN RAISE EXCEPTION 'nevora_export_INACTIVE';END IF;
 INSERT INTO payroll_export_receipts(workspace_id,actor_employee_id,operation_id,command_hash,payload) VALUES(p_workspace,p_actor,p_operation,p_hash,p_payload);
 RETURN p_payload;
END $$;
