/** The single authoritative migration order. Numeric prefixes repeat
 * (0023–0027, 0031, 0032), so filename sorting is never a valid order; the
 * held Phase F files would run and fail. `src/test/migration-order.test.ts`
 * keeps this file, the directory contents and the test adapter's
 * CURRENT_MIGRATIONS literal in exact agreement, so a new migration must be
 * classified here or every suite fails. */

/** Applied first, in exactly this order, on an empty schema. */
export const BASE_MIGRATIONS = [
  '0001_initial.sql',
  '0002_schedule_health.sql',
  '0003_schedule_assistance.sql',
  '0004_assistance_layer.sql',
  '0005_time_clock.sql',
  '0006_scheduling_rule_inputs.sql',
  '0007_portal_web_push.sql',
  '0008_workspace_positions.sql',
  '0009_schedule_generation.sql',
  '0010_shift_coverage_automation.sql',
  '0011_clocker_devices.sql',
  '0012_clocker_pins.sql',
  '0013_clocker_punches.sql',
  '0014_clocker_breaks.sql',
  '0015_clocker_schedule_context.sql',
  '0016_time_corrections.sql',
  '0017_missing_time_supersession.sql',
  '0018_timecards.sql',
  '0019_payroll_export_mappings.sql',
  '0020_account_recovery.sql',
  '0021_timecard_reassignment_interlock.sql',
  '0022_timecard_reopen_revision_authority.sql',
  '0023_employee_attention_receipts.sql',
  '0024_contextual_communications.sql',
  '0025_calendar_subscriptions.sql',
  '0023_template_ownership.sql',
  '0024_schedule_copy_receipts.sql',
  '0025_company_policies.sql',
  '0026_attendance_observations.sql',
  '0027_payroll_period_custody.sql',
  '0028_configurable_payroll.sql',
  '0029_payroll_private_notices.sql',
  '0030_notification_source_kinds.sql',
  '0031_workspace_presentation.sql',
  '0032_workspace_words_modules.sql',
  '0033_management_alert_preferences.sql',
  '0034_account_deletion_requests.sql',
  '0035_passkeys.sql',
  '0036_owner_advisor.sql',
  '0037_owner_briefing_reviews.sql', '0038_read_path_indexes.sql', '0039_native_payroll_setup_records.sql', '0038_clocker_pin_operation_reference.sql', '0039_clocker_review_requests.sql', '0040_clocker_photo_policy_evidence.sql', '0041_clocker_photo_platform_cleanup.sql',
  '0043_schedule_pending_edits.sql',
  '0044_owner_advisor_notebook.sql',
  '0045_owner_coverage_actions.sql',
  '0046_owner_advisor_memory.sql',
] as const;

/** Applied last, in exactly this order, once the company and Owner exist:
 * 0032's legacy adoption captures the Managers active at that moment. */
export const FINAL_MIGRATIONS = [
  '0031_native_payroll.sql',
  '0032_company_access_invitations.sql',
  '0042_company_invitation_lifetime.sql',
] as const;

/** Held Phase F tenant preparation. Never applied to any deployed chain;
 * 0026 fails closed on the current schema (f10_expand_source_catalog_drift). */
export const HELD_MIGRATIONS = [
  '0026_tenant_ownership_expand.sql',
  '0027_tenant_ownership_validate.sql',
] as const;
