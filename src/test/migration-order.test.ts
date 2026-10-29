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
});
