import {readdir, readFile} from 'node:fs/promises';
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

  // B24: operators follow the runbook, so it must list the whole declared base
  // chain in order (0001–0022 as a range, then every later file by name) and
  // the phase-c README must never send anyone to filename/numeric order.
  it('keeps the deploy runbook and phase-c README in step with the declared order', async () => {
    const runbook = await readFile('docs/product/specs/codex-joint/DEPLOY-RUNBOOK.md', 'utf8');
    const line = runbook.split('\n').find(text => text.includes('**Base chain**'));
    expect(line).toBeDefined();
    const named = [...line!.matchAll(/`(\d{4}(?:_[a-z0-9_]+)?)`/g)].map(match => match[1]);
    const base = BASE_MIGRATIONS.map(file => file.replace(/\.sql$/, ''));
    const firstNamed = base.findIndex(name => name.startsWith('0023_'));
    expect(named.slice(0, 2)).toEqual([base[0].slice(0, 4), base[firstNamed - 1].slice(0, 4)]);
    expect(named.slice(2)).toEqual(base.slice(firstNamed));
    expect(runbook).toContain(`consumes \`BASE_MIGRATIONS\` through \`${base.at(-1)!.slice(0, 4)}\``);
    const phaseC = await readFile('db/phase-c/README.md', 'utf8');
    expect(phaseC).toContain('db/migrations/order.ts');
    expect(phaseC).not.toMatch(/in numeric order\./);
  });

  it('keeps the final Company Access order and the held tenant files fixed', () => {
    // 0031 before 0032, both after the company and Owner exist; 0032 adoption
    // is immutable, so this order is part of the deployed contract.
    expect([...FINAL_MIGRATIONS]).toEqual(['0031_native_payroll.sql', '0032_company_access_invitations.sql']);
    expect([...HELD_MIGRATIONS]).toEqual(['0026_tenant_ownership_expand.sql', '0027_tenant_ownership_validate.sql']);
    expect(BASE_MIGRATIONS.some(file => (HELD_MIGRATIONS as readonly string[]).includes(file))).toBe(false);
  });
});
