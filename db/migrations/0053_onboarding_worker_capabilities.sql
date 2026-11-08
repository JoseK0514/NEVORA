BEGIN;

ALTER TABLE workspaces ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);
ALTER TABLE employees ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);
ALTER TABLE locations ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);
ALTER TABLE positions ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);
ALTER TABLE employee_sessions ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);
ALTER TABLE native_push_challenges ADD COLUMN onboarding_worker_lock boolean NOT NULL DEFAULT false CHECK(NOT onboarding_worker_lock);

-- Fixed allowlist, no arbitrary SQL and no data writes. Preserves the established
-- source lock protocols without granting UPDATE on employee/session authority.
CREATE FUNCTION onboarding_worker_table_lock(relation text,mode text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.onboarding_runtime_roles WHERE kind='WORKER' AND login_role=session_user)
 OR relation IS NULL OR mode IS NULL OR mode NOT IN('SHARE','SHARE ROW EXCLUSIVE') OR NOT(relation=ANY(ARRAY['availability_exceptions','availability_windows','break_entries','coverage_window_position_requirements','employee_location_eligibility','employee_positions','employee_scheduling_settings','employees','location_coverage_windows','location_staffing_settings','locations','native_payroll_document_manifests','native_payroll_ledger','native_payroll_manager_scope_revisions','native_payroll_opening_ytd_revisions','native_payroll_profile_revisions','payroll_exception_revisions','payroll_export_profile_revisions','payroll_export_receipts','payroll_grant_revisions','payroll_period_manifests','payroll_period_populations','payroll_run_revisions','payroll_runs','payroll_setting_revisions','positions','schedule_generation_exclusions','schedule_publication_revision_shifts','schedule_publication_revisions','schedule_week_settings','schedules','shift_callouts','shift_change_events','shift_change_operations','shift_change_participation','shift_exchanges','shifts','time_correction_adjustments','time_correction_events','time_correction_requests','time_entries','time_off_requests','timecard_revisions','weekly_availability_submissions','weekly_availability_windows'])) THEN
  RAISE EXCEPTION 'worker_source_lock_denied' USING ERRCODE='42501';
 END IF;
 EXECUTE format('LOCK TABLE public.%I IN %s MODE',relation,mode);
END $$;
REVOKE ALL ON FUNCTION onboarding_worker_table_lock(text,text) FROM PUBLIC;
COMMIT;
