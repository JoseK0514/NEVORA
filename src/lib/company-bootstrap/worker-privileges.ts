// Explicit job capabilities. Adding a business relation never grants the worker
// access automatically. Account credentials and enrollment issuance stay APP-only.
export const workerReadRelations=[
 'workspaces','locations','positions','employees','employee_location_eligibility','employee_positions','employee_scheduling_settings','location_staffing_settings','location_coverage_windows','coverage_window_position_requirements',
 'availability_windows','weekly_availability_windows','weekly_availability_submissions','availability_exceptions','time_off_requests','schedule_week_settings','schedules','shifts','shift_callouts','shift_exchanges','schedule_publication_revisions','schedule_publication_revision_shifts','schedule_generation_exclusions','shift_change_participation','shift_change_events','shift_change_operations','schedule_acknowledgements','schedule_pending_edits',
 'employee_sessions','employee_attention_receipts','company_access_adoption','operational_subject_versions','operational_scope_revisions','operational_scopes_current','notifications','push_subscriptions','push_deliveries','native_push_challenges','native_push_installations','native_push_deliveries','communications','communication_revisions','communication_recipients','communication_receipts',
 'time_entries','break_entries','time_correction_adjustments','time_correction_requests','time_correction_events','timecard_revisions','nevora_effective_time_entries','nevora_effective_break_entries','nevora_timecard_latest','payroll_export_receipts','payroll_export_profile_revisions','payroll_period_populations','payroll_period_manifests',
 'payroll_setting_revisions','payroll_exception_revisions','payroll_grant_revisions','payroll_grants_current','payroll_runs','payroll_run_revisions','payroll_runs_current','payroll_jobs','payroll_documents','payroll_publications','payroll_notice_sources','payroll_notice_receipts',
 'native_payroll_profile_revisions','native_payroll_profiles_current','native_payroll_opening_ytd_revisions','native_payroll_opening_ytd_current','native_payroll_manager_scope_revisions','native_payroll_manager_scopes_current','native_payroll_ledger','native_payroll_document_manifests',
] as const;
export const workerInsertRelations=['notifications','push_deliveries','native_push_deliveries','shift_change_events','shift_change_participation','payroll_jobs','payroll_runs','payroll_run_revisions','payroll_documents','payroll_publications','payroll_notice_sources','payroll_notice_receipts','native_payroll_document_manifests'] as const;
export const workerUpdateColumns:Record<string,readonly string[]>={
 notifications:['push_state','cancelled_at'],push_deliveries:['status','attempt_count','next_attempt_at','lease_token','lease_expires_at','accepted_at','error_class','updated_at'],
 push_subscriptions:['status','generation','encrypted_material','updated_at'],
 native_push_deliveries:['status','attempt_count','next_attempt_at','lease_token','lease_expires_at','accepted_at','error_class','updated_at'],
 native_push_installations:['status','generation','encrypted_material','token_fingerprint','updated_at'],
 payroll_jobs:['status','attempts','lease_token','lease_until','available_at','error'],
 shift_exchanges:['status','resolved_at','outcome_reason','escalated_at'],shift_callouts:['status','outcome_reason','escalated_at'],
};
