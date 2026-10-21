import { it, expect } from 'vitest';
import { createPunchFixture } from '../../src/test/integration/clocker-punch-fixture';
import { createDisposableFoundationDatabase } from '../../src/test/integration/local-postgres';
import { ClockerPinError, pinBatch } from '../../src/lib/clocker/pin-authority.server';
import { fixtureTrace } from './sql-diagnostics.mts';

it.each([1, 2])('initializes and disposes actual Clocker/Company Access fixture, attempt %i', async attempt => {
  const f = await createPunchFixture({ companyAccess: true, breaks: true });
  try {
    expect((await f.q('SELECT count(*)::int AS n FROM employee_clocker_pins'))[0].n).toBe(2);
    const identity = await f.identity();
    expect(identity.proof).toBeTruthy();
    // A live database with the right prefix is still somebody's existing database: never force-reuse it.
    await expect(createDisposableFoundationDatabase({ mode: 'empty' })).rejects.toThrow('Refusing existing database');
    expect((await f.q('SELECT count(*)::int AS n FROM employee_clocker_pins'))[0].n).toBe(2);
    if (attempt === 1) {
      fixtureTrace.expected = true;
      try {
        // Controlled reproduction of the historical masking path: retain SQLSTATE before pinBatch maps it.
        await expect(pinBatch(f.db.executor, [
          { text: "SET LOCAL statement_timeout='1ms'", values: [] },
          { text: 'SELECT pg_sleep(0.1)', values: [] },
        ])).rejects.toMatchObject({ name: 'ClockerPinError', code: 'UNAVAILABLE' } satisfies Partial<ClockerPinError>);
      } finally { fixtureTrace.expected = false; }
      expect(fixtureTrace.failures.some(failure => failure.expected && failure.code === '57014')).toBe(true);
      // The timed-out transaction rolled back; the same real fixture remains usable.
      expect((await f.q('SELECT count(*)::int AS n FROM employee_clocker_pins'))[0].n).toBe(2);
    }
  } finally { await f.db.dispose(); }
  expect(fixtureTrace.failures.filter(failure => !failure.expected)).toEqual([]);
});
