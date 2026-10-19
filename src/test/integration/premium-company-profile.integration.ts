import { it, expect, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import { Client } from 'pg';
vi.mock('server-only', () => ({}));
import { createDisposableExchangeDatabase } from './local-postgres';
import { readCompanyInput, setupCompany } from '../../../scripts/company-setup';
import { fixtureProof } from './shift-change-api';
import { readManagementProfile } from '../../lib/data/management-profile.server';

it('fresh company setup installs the alert migration and the new Owner can read their own Profile', async () => {
  const db = await createDisposableExchangeDatabase({ mode: 'empty' });
  const client = new Client({ connectionString: db.connectionString });
  try {
    await client.connect();
    const input = readCompanyInput({ COMPANY_NAME: 'Fictional Cloud Release', COMPANY_TIME_ZONE: 'America/Puerto_Rico', COMPANY_LOCATION_NAME: 'Fictional Main', COMPANY_LOCATION_SHORT_NAME: 'Main', COMPANY_LOCATION_KEY: 'fictional-main', BOOTSTRAP_EMPLOYEE_ID: 'FRESH-OWNER', BOOTSTRAP_FIRST_NAME: 'Fictional', BOOTSTRAP_LAST_NAME: 'Owner', BOOTSTRAP_PHONE: '2025550199', BOOTSTRAP_PASSWORD: randomBytes(24).toString('base64url') });
    await setupCompany(client, input);
    const result = await readManagementProfile(await fixtureProof(db.executor, input.owner.id), db.executor);
    expect(result.state).toBe('ready');
    expect((await db.executor.query<{ choices: unknown }>({ text: 'SELECT management_alert_choices AS choices FROM employees WHERE id=$1', values: [input.owner.id] }))[0].choices).toEqual({});
  } finally { await client.end(); await db.dispose(); }
});
