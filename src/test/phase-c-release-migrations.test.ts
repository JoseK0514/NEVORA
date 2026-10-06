import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const releaseMigrations = [
  '0011_clocker_devices.sql',
  '0012_clocker_pins.sql',
  '0013_clocker_punches.sql',
  '0014_clocker_breaks.sql',
  '0015_clocker_schedule_context.sql',
] as const;

describe('Phase C release migration chain', () => {
  it('promotes every Phase C schema slice into the numbered production chain', async () => {
    const files = (await readdir('db/migrations')).filter(name => /^\d{4}_.*\.sql$/.test(name)).sort();
    expect(files.slice(-5)).toEqual(releaseMigrations);
    for (const file of releaseMigrations) expect(existsSync(`db/migrations/${file}`)).toBe(true);
  });

  it('keeps the numbered migration order explicit and transactional', async () => {
    for (const file of releaseMigrations) {
      const sql = await readFile(`db/migrations/${file}`, 'utf8');
      expect(sql.trimStart().startsWith('BEGIN;')).toBe(true);
      expect(sql.trimEnd().endsWith('COMMIT;')).toBe(true);
    }
  });

  it('has one release schema authority instead of test-only Phase C SQL copies', async () => {
    const drafts = (await readdir('db/phase-c')).filter(name => name.endsWith('.sql')).sort();
    expect(drafts).toEqual([]);
  });
});
