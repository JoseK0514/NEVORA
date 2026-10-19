import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createDisposableExchangeDatabase } from './local-postgres';

it('reapplies 0033 without losing choices and rehearses the guarded schema downgrade on an owned database', async () => {
  const db = await createDisposableExchangeDatabase({ mode: 'current-runtime' });
  const q = (text: string) => db.executor.query({ text, values: [] });
  try {
    await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,management_alert_choices)
      VALUES('ROLLBACK-OWNER','Fictional','Owner','555-0199','OWNER','loc-1','{"time-off":false}')`);
    await q(await readFile('db/migrations/0033_management_alert_preferences.sql', 'utf8'));
    expect(await q("SELECT management_alert_choices AS choices FROM employees WHERE id='ROLLBACK-OWNER'" )).toEqual([{ choices: { 'time-off': false } }]);
    const downgrade = `DROP TRIGGER management_alert_preference ON notifications;
      DROP FUNCTION apply_management_alert_preference();
      DROP FUNCTION management_alert_on(text,text);
      DROP FUNCTION management_alert_topic(text,text);
      ALTER TABLE notifications DROP COLUMN management_alert_suppressed;
      ALTER TABLE employees DROP COLUMN management_alert_choices;`;
    // Roll back a trial downgrade first: schema and preferences must survive.
    await expect(db.executor.transaction([{ text: downgrade, values: [] }, { text: 'SELECT 1/0', values: [] }])).rejects.toMatchObject({ code: '22012' });
    expect(await q("SELECT management_alert_choices AS choices FROM employees WHERE id='ROLLBACK-OWNER'")).toEqual([{ choices: { 'time-off': false } }]);
    await db.executor.transaction([{ text: downgrade, values: [] }]);
    expect(await q("SELECT id FROM employees WHERE id='ROLLBACK-OWNER'")).toEqual([{ id: 'ROLLBACK-OWNER' }]);
    await expect(q('SELECT management_alert_choices FROM employees')).rejects.toMatchObject({ code: '42703' });
    await q(await readFile('db/migrations/0033_management_alert_preferences.sql', 'utf8'));
    // This explicitly proves why dropping 0033 is NOT the normal app rollback:
    // reapplying restores the schema, but cannot recover discarded opt-outs.
    expect(await q("SELECT management_alert_choices AS choices FROM employees WHERE id='ROLLBACK-OWNER'")).toEqual([{ choices: {} }]);
  } finally { await db.dispose(); }
});
