BEGIN;
-- Native records append to legacy payroll. No historic amount/document is changed.
CREATE TABLE native_payroll_profile_revisions(
 workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),
 revision integer NOT NULL CHECK(revision>0),payload jsonb NOT NULL,
 PRIMARY KEY(workspace_id,employee_id,revision));
CREATE VIEW native_payroll_profiles_current AS SELECT DISTINCT ON(workspace_id,employee_id) * FROM native_payroll_profile_revisions ORDER BY workspace_id,employee_id,revision DESC;
CREATE TABLE native_payroll_opening_ytd_revisions(
 workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),
 tax_year integer NOT NULL CHECK(tax_year>=2026 AND tax_year<=2100),revision integer NOT NULL CHECK(revision>0),payload jsonb NOT NULL,
 PRIMARY KEY(workspace_id,employee_id,tax_year,revision));
CREATE VIEW native_payroll_opening_ytd_current AS SELECT DISTINCT ON(workspace_id,employee_id,tax_year) * FROM native_payroll_opening_ytd_revisions ORDER BY workspace_id,employee_id,tax_year,revision DESC;
CREATE TABLE native_payroll_manager_scope_revisions(
 workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),revision integer NOT NULL CHECK(revision>0),
 subject_employee_version text NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(workspace_id,employee_id,revision),
 CHECK(jsonb_typeof(payload->'review')='boolean' AND jsonb_typeof(payload->'approve')='boolean' AND jsonb_typeof(payload->'locationIds')='array'),
 CHECK(NOT(payload->>'approve')::boolean OR (payload->>'review')::boolean),
 CHECK(NOT(payload->>'review')::boolean OR jsonb_array_length(payload->'locationIds')>0));
CREATE VIEW native_payroll_manager_scopes_current AS SELECT DISTINCT ON(workspace_id,employee_id) * FROM native_payroll_manager_scope_revisions ORDER BY workspace_id,employee_id,revision DESC;
CREATE TABLE native_payroll_ledger(
 workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),tax_year integer NOT NULL,
 sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 run_id uuid NOT NULL,correction_of uuid,opening_revision integer NOT NULL CHECK(opening_revision>0),
 start_date date NOT NULL,end_date date NOT NULL,payday date NOT NULL,payload jsonb NOT NULL,
 PRIMARY KEY(workspace_id,employee_id,run_id),
 FOREIGN KEY(workspace_id,run_id) REFERENCES payroll_runs(workspace_id,id),
 FOREIGN KEY(workspace_id,employee_id,correction_of) REFERENCES native_payroll_ledger(workspace_id,employee_id,run_id),
 CHECK(start_date<=end_date),CHECK(EXTRACT(YEAR FROM payday)=tax_year));
CREATE UNIQUE INDEX native_payroll_single_successor ON native_payroll_ledger(workspace_id,employee_id,correction_of) WHERE correction_of IS NOT NULL;
CREATE VIEW native_payroll_ledger_heads AS SELECT l.* FROM native_payroll_ledger l WHERE NOT EXISTS(SELECT 1 FROM native_payroll_ledger next WHERE next.workspace_id=l.workspace_id AND next.employee_id=l.employee_id AND next.correction_of=l.run_id);
CREATE FUNCTION native_payroll_guard_ledger() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM id FROM workspaces WHERE id=NEW.workspace_id FOR NO KEY UPDATE;
 PERFORM id FROM employees WHERE id=NEW.employee_id FOR UPDATE;
 IF NEW.payload->'result'->>'state' IS DISTINCT FROM 'ready' OR NEW.payload->'result'->>'employeeId' IS DISTINCT FROM NEW.employee_id THEN RAISE EXCEPTION 'INVALID_NATIVE_LEDGER'; END IF;
 IF NOT EXISTS(SELECT 1 FROM payroll_runs_current r WHERE r.workspace_id=NEW.workspace_id AND r.run_id=NEW.run_id AND r.payload->>'status'='APPROVED' AND r.payload->>'sourceAuthority'='NATIVE_RECORDED_TIME') THEN RAISE EXCEPTION 'NATIVE_APPROVAL_REQUIRED'; END IF;
 IF NOT EXISTS(SELECT 1 FROM payroll_runs_current r WHERE r.workspace_id=NEW.workspace_id AND r.run_id=NEW.run_id AND r.payload#>>'{nativeCalculation,state}'='ready'
 AND r.payload#>>'{period,startDate}'=NEW.start_date::text AND r.payload#>>'{period,endDate}'=NEW.end_date::text AND r.payload->>'payday'=NEW.payday::text AND (r.payload->>'correctionOf') IS NOT DISTINCT FROM NEW.correction_of::text
 AND (SELECT count(*) FROM jsonb_array_elements(r.payload#>'{nativeCalculation,employees}') item WHERE item->>'employeeId'=NEW.employee_id)=1
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(r.payload#>'{nativeCalculation,employees}') item WHERE item=NEW.payload->'result' AND item#>>'{breakdown,taxYear}'=NEW.tax_year::text)) THEN RAISE EXCEPTION 'NATIVE_LEDGER_SNAPSHOT_CONFLICT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM native_payroll_opening_ytd_current y WHERE y.workspace_id=NEW.workspace_id AND y.employee_id=NEW.employee_id AND y.tax_year=NEW.tax_year AND y.revision=NEW.opening_revision) THEN RAISE EXCEPTION 'YTD_SOURCE_CONFLICT'; END IF;
 IF NEW.correction_of IS NULL AND EXISTS(SELECT 1 FROM native_payroll_ledger_heads h WHERE h.workspace_id=NEW.workspace_id AND h.employee_id=NEW.employee_id AND h.start_date<=NEW.end_date AND h.end_date>=NEW.start_date) THEN RAISE EXCEPTION 'OVERLAPPING_NATIVE_PAYROLL'; END IF;
 IF NEW.correction_of IS NOT NULL AND NOT EXISTS(SELECT 1 FROM native_payroll_ledger_heads h WHERE h.workspace_id=NEW.workspace_id AND h.employee_id=NEW.employee_id AND h.run_id=NEW.correction_of AND h.tax_year=NEW.tax_year AND h.start_date=NEW.start_date AND h.end_date=NEW.end_date AND h.payday=NEW.payday) THEN RAISE EXCEPTION 'CORRECTION_LINEAGE_CONFLICT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER native_payroll_ledger_guard BEFORE INSERT ON native_payroll_ledger FOR EACH ROW EXECUTE FUNCTION native_payroll_guard_ledger();
CREATE FUNCTION native_payroll_guard_opening() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM id FROM workspaces WHERE id=NEW.workspace_id FOR NO KEY UPDATE; PERFORM id FROM employees WHERE id=NEW.employee_id FOR UPDATE; IF EXISTS(SELECT 1 FROM native_payroll_ledger WHERE workspace_id=NEW.workspace_id AND employee_id=NEW.employee_id AND tax_year=NEW.tax_year) THEN RAISE EXCEPTION 'APPROVED_YTD_OPENING_FROZEN'; END IF;RETURN NEW;END $$;
CREATE TRIGGER native_payroll_opening_guard BEFORE INSERT ON native_payroll_opening_ytd_revisions FOR EACH ROW EXECUTE FUNCTION native_payroll_guard_opening();
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['native_payroll_profile_revisions','native_payroll_opening_ytd_revisions','native_payroll_manager_scope_revisions','native_payroll_ledger'] LOOP
 EXECUTE format('CREATE TRIGGER native_payroll_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger()',t);
 EXECUTE format('CREATE TRIGGER native_payroll_immutable_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger()',t);
END LOOP;END $$;
CREATE TABLE native_payroll_document_manifests(workspace_id text NOT NULL,run_id uuid NOT NULL,payload jsonb NOT NULL,PRIMARY KEY(workspace_id,run_id),FOREIGN KEY(workspace_id,run_id) REFERENCES payroll_runs(workspace_id,id));
CREATE TRIGGER native_payroll_document_manifest_immutable BEFORE UPDATE OR DELETE ON native_payroll_document_manifests FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER native_payroll_document_manifest_no_truncate BEFORE TRUNCATE ON native_payroll_document_manifests FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
