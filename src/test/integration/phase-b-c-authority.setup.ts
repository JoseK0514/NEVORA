import { readFile } from 'node:fs/promises';
import { vi } from 'vitest';

/** Opt-in integrated-schema replay of the ORIGINAL Phase B expiry regressions.
 * Only the owned disposable fixture is extended; authorization and SQL are real.
 * Not loaded by the ordinary foundation or Clocker suite. Never uses DATABASE_URL.
 */
vi.mock('./local-postgres', async load => {
  const actual = await load<typeof import('./local-postgres')>();
  return {
    ...actual,
    createDisposableFoundationDatabase: async (options: Parameters<typeof actual.createDisposableFoundationDatabase>[0]) => {
      const db = await actual.createDisposableFoundationDatabase(options);
      try {
        if (options.mode !== 'current-runtime') throw Error('Integrated authority replay requires the current numbered schema.');
        for (const file of ['clocker-devices.sql', 'clocker-pins.sql', 'clocker-punches.sql', 'clocker-breaks.sql', 'clocker-schedule-context.sql']) {
          await db.executor.query({text: await readFile(`db/phase-c/${file}`, 'utf8'), values: []});
        }
        const [schema] = await db.executor.query<{ready: boolean}>({
          text: "SELECT to_regclass('clocker_devices') IS NOT NULL AND to_regclass('employee_clocker_pins') IS NOT NULL AND to_regclass('clocker_command_ledger') IS NOT NULL AND to_regclass('clocker_break_types') IS NOT NULL AS ready", values: [],
        });
        if (!schema?.ready) throw Error('Phase C schema was not applied; refusing partial-schema acceptance.');
        return db;
      } catch (error) { await db.dispose(); throw error; }
    },
  };
});
