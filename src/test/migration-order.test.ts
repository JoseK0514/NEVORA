import {readdir} from 'node:fs/promises';
import {describe, expect, it} from 'vitest';
import {BASE_MIGRATIONS, FINAL_MIGRATIONS, HELD_MIGRATIONS} from '../../db/migrations/order';
import {CURRENT_MIGRATIONS} from './integration/local-postgres';

// Guards D4 (saas-tenant-diagnosis-2026-10-20): duplicate numeric prefixes and
// held Phase F files make filename order wrong, so the explicit order must stay
// the single authority and must classify every file in db/migrations.
describe('migration order authority', () => {
  it('keeps the test adapter literal identical to the authoritative base order', () => {
    expect([...CURRENT_MIGRATIONS]).toEqual([...BASE_MIGRATIONS]);
  });

  it('classifies every migration file exactly once', async () => {
    const files = (await readdir('db/migrations')).filter(name => name.endsWith('.sql')).sort();
    const classified = [...BASE_MIGRATIONS, ...FINAL_MIGRATIONS, ...HELD_MIGRATIONS];
    expect(new Set(classified).size).toBe(classified.length);
    expect([...classified].sort()).toEqual(files);
  });

  it('keeps the final Company Access order and the held tenant files fixed', () => {
    // 0031 before 0032, both after the company and Owner exist; 0032 adoption
    // is immutable, so this order is part of the deployed contract. 0042 widens
    // 0032's invitation lifetime and must follow it.
    expect([...FINAL_MIGRATIONS]).toEqual(['0031_native_payroll.sql', '0032_company_access_invitations.sql', '0042_company_invitation_lifetime.sql']);
    expect([...HELD_MIGRATIONS]).toEqual(['0026_tenant_ownership_expand.sql', '0027_tenant_ownership_validate.sql']);
    expect(BASE_MIGRATIONS.some(file => (HELD_MIGRATIONS as readonly string[]).includes(file))).toBe(false);
  });
  it('keeps both independent PR34 files before the Clocker tail and the additive Publish changes and Owner review storage without prefix sorting', () => {
    // 0043 (Publish changes held-edit history) depends only on base tables and follows the Clocker tail; 0044/0045 are additive Owner AI storage.
    expect(BASE_MIGRATIONS.slice(-10)).toEqual([
      '0037_owner_briefing_reviews.sql', '0038_read_path_indexes.sql', '0039_native_payroll_setup_records.sql',
      '0038_clocker_pin_operation_reference.sql', '0039_clocker_review_requests.sql',
      '0040_clocker_photo_policy_evidence.sql', '0041_clocker_photo_platform_cleanup.sql',
      '0043_schedule_pending_edits.sql', '0044_owner_advisor_notebook.sql', '0045_owner_coverage_actions.sql',
    ]);
  });

});
