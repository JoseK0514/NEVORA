import { readFile } from 'node:fs/promises';
import { Client } from 'pg';
import { describe, expect, it } from 'vitest';
import { setupCompany, readCompanyInput } from '../../../scripts/company-setup';
import { readFirstWeek } from '@/lib/activation/first-week.server';
import { readSavedLanguage, saveUserLanguage } from '@/lib/activation/language.server';
import { readTrialFunnel } from '@/lib/activation/trial-funnel.server';
import type { UserRole } from '@/lib/domain';
import { createDisposableFoundationDatabase } from './local-postgres';

type Database = Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner = 'ACTIVATION-OWNER';
const member = 'ACTIVATION-MEMBER';
const manager = 'ACTIVATION-MANAGER';
const config = {
  COMPANY_NAME: 'Activation Fixture', COMPANY_TIME_ZONE: 'America/Puerto_Rico',
  COMPANY_LOCATION_NAME: 'Harbor Test', COMPANY_LOCATION_SHORT_NAME: 'Harbor', COMPANY_LOCATION_KEY: 'harbor-activation-test',
  BOOTSTRAP_EMPLOYEE_ID: owner, BOOTSTRAP_FIRST_NAME: 'Fictional', BOOTSTRAP_LAST_NAME: 'Owner',
  BOOTSTRAP_PHONE: '2025550123', BOOTSTRAP_PASSWORD: 'Fictional-activation-only!',
};
const roleProof = (id: string, role: UserRole, letter: string, primaryLocationId: string) => ({
  sessionTokenHash: letter.repeat(64),
  employee: { id, role, firstName: 'Fictional', lastName: 'Tester', primaryLocationId },
});

async function disposable(work: (client: Client, database: Database) => Promise<void>) {
  const database = await createDisposableFoundationDatabase({ mode: 'empty' });
  const client = new Client({ connectionString: database.connectionString });
  try {
    await client.connect();
    await work(client, database);
  } finally {
    try { await client.end(); } finally { await database.dispose(); }
  }
}

describe('activation contracts against the canonical PostgreSQL schema', () => {
  it('tracks the five milestones and isolates language preferences by current session', () => disposable(async (client, { executor }) => {
    const { locationId, workspaceId } = await setupCompany(client, readCompanyInput(config));
    const ownerProof = roleProof(owner, 'OWNER', 'a', locationId);
    const ownerSecondDevice = roleProof(owner, 'OWNER', 'd', locationId);
    await client.query("UPDATE employee_credentials SET must_change_password=false WHERE employee_id=$1", [owner]);
    const session = async ({ employee, sessionTokenHash }: typeof ownerProof) => {
      await client.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,now()+interval '1 hour')",
        [sessionTokenHash, employee.id]);
    };
    await session(ownerProof);
    await session(ownerSecondDevice);

    const pending = await readFirstWeek(ownerProof, executor);
    expect(pending.steps.map(step => step.status)).toEqual(Array(5).fill('pending'));
    expect(pending.nextStep).toBe('ROSTER');

    await client.query(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active)
      VALUES($1,'Fictional','Employee','2025550124','EMPLOYEE',$3,false),
            ($2,'Fictional','Manager','2025550125','MANAGER',$3,false)`, [member, manager, locationId]);
    expect((await readFirstWeek(ownerProof, executor)).completedCount).toBe(0);
    await client.query('UPDATE employees SET active=true WHERE id IN($1,$2)', [member, manager]);
    const employeeProof = roleProof(member, 'EMPLOYEE', 'b', locationId);
    const managerProof = roleProof(manager, 'MANAGER', 'c', locationId);
    await session(employeeProof);
    await session(managerProof);
    await expect(readFirstWeek(managerProof, executor)).rejects.toThrow('management_authorization');

    expect(await readSavedLanguage(ownerProof, executor)).toBeNull();
    const revision = async () => (await client.query('SELECT updated_at::text FROM employees WHERE id=$1', [owner])).rows[0];
    const before = await revision();
    await saveUserLanguage(ownerProof, 'es', executor);
    await saveUserLanguage(ownerProof, 'es', executor);
    expect(await readSavedLanguage(ownerSecondDevice, executor)).toBe('es');
    expect(await revision()).toEqual(before);
    expect(await readSavedLanguage(employeeProof, executor)).toBeNull();
    await saveUserLanguage(employeeProof, 'en', executor);
    await saveUserLanguage(managerProof, 'es', executor);
    expect(await readSavedLanguage(employeeProof, executor)).toBe('en');
    await expect(client.query("UPDATE user_language_preferences SET language='fr'")).rejects.toMatchObject({ code: '23514' });
    await client.query('DELETE FROM employee_sessions WHERE token_hash=$1', [employeeProof.sessionTokenHash]);
    await expect(saveUserLanguage(employeeProof, 'es', executor)).rejects.toThrow('management_authorization');

    await client.query("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('first-draft',$1,'2025-01-06',$2)", [locationId, owner]);
    await client.query("INSERT INTO clocker_devices(id,location_id,name) VALUES('first-tablet',$1,'Fixture Tablet')", [locationId]);
    await client.query("INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift) VALUES($1,1)", [locationId]);
    expect(await readFirstWeek(ownerProof, executor)).toMatchObject({ completedCount: 1, nextStep: 'LOCATION_AND_RULES' });

    await client.query(`INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time)
      VALUES('first-window',$1,1,'09:00','17:00')`, [locationId]);
    await client.query(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by,affected_location_id)
      VALUES('first-publication','2025-01-06',1,'PUBLISH',$1,$2)`, [owner, locationId]);
    await client.query(`UPDATE clocker_devices SET enrolled_at=now(),credential_hash=repeat('a',64),credential_version=1
      WHERE id='first-tablet'`);

    const approval = async (revision: number, entries: unknown[]) => {
      await client.query(`INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,source_hash,snapshot,command_hash)
        VALUES(gen_random_uuid(),$1,$2,'2025-01-06','2025-01-12',$3,'APPROVE',$4,repeat('a',32),$5::jsonb,repeat('a',64))`,
      [workspaceId, member, revision, owner, JSON.stringify({ entries })]);
    };
    await approval(1, []);
    expect(await readFirstWeek(ownerProof, executor)).toMatchObject({ completedCount: 4, nextStep: 'FIRST_TIMECARD_REVIEW' });
    await approval(2, [{ id: 'fictional-time-entry' }]);
    expect(await readFirstWeek(ownerProof, executor)).toMatchObject({ completedCount: 5, nextStep: null });
    await client.query("UPDATE clocker_devices SET active=false,revoked_at=now(),credential_hash=NULL WHERE id='first-tablet'");
    expect(await readFirstWeek(ownerProof, executor)).toMatchObject({ completedCount: 4, nextStep: 'TABLET_SETUP' });
  }));

  it('reads existing control and Commerce stages inside a read-only transaction', () => disposable(async client => {
    for (const file of ['0001_owner_onboarding.sql', '0002_workspace_registry.sql', '0003_workspace_provisioning.sql']) {
      await client.query(await readFile('db/control-migrations/' + file, 'utf8'));
    }
    await client.query(await readFile('services/commerce/schema.sql', 'utf8'));
    await client.query(`
      INSERT INTO nevora_onboarding.registrations(id,environment,email_digest,email_ciphertext,locale,state,terms_version,
        privacy_version,verification_expires_at,expires_at,created_at,verified_at)
      SELECT ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,
        CASE WHEN n=21 THEN 'production' ELSE 'test' END,encode(sha256(convert_to(n::text,'UTF8')),'hex'), 'fictional', 'en', 'EMAIL_PENDING',
        'terms','privacy','2025-01-08','2025-01-15',CASE WHEN n=22 THEN '2025-01-13'::timestamptz ELSE '2025-01-06'::timestamptz END,
        CASE WHEN n<=10 THEN '2025-01-07'::timestamptz END
      FROM generate_series(1,22) n`);
    await client.query(`
      INSERT INTO nevora_onboarding.workspace_registry(id,registration_id,canonical_origin,environment,incarnation,lifecycle)
      SELECT id,id,'https://fixture-'||id::text||'.example.invalid','test',1,'PROVISIONING'
      FROM nevora_onboarding.registrations WHERE verified_at IS NOT NULL;
      INSERT INTO commerce.accounts(id,email,profile,enrollment_source)
      SELECT id,'fixture-'||id::text||'@example.invalid','{}','onboarding' FROM nevora_onboarding.workspace_registry;
      INSERT INTO commerce.businesses(id,employee_count,trial_started_at,trial_ends_at,paid_through)
      SELECT id,1,'2025-01-07','2025-02-06','2025-03-01' FROM commerce.accounts;
      INSERT INTO commerce.external_installations(business_id,id,origin,environment,incarnation,
        provider_project_id,manifest_hash,identity_hash,instance_secret_hash,instance_secret)
      SELECT id,id::text,canonical_origin,'test',1,'project',repeat('a',64),repeat('b',64),'hash-'||id::text,'fictional'
      FROM nevora_onboarding.workspace_registry;
      INSERT INTO commerce.checkout_intents(business_id,operation,params_secret,employee_count,plan_key,expires_at,session_id)
      SELECT id,'fixture-operation-'||n,'fixture',1,'small','2025-01-18','fixture-session-'||id::text||'-'||n
      FROM commerce.businesses CROSS JOIN generate_series(1,2) n`);
    await client.query('BEGIN READ ONLY');
    try {
      expect(await readTrialFunnel(client, client, 'test', '2025-01-06')).toMatchObject({
        state: 'ready', counts: { requested: 20, verified: 10, workspaceReserved: 10, trialStarted: 10, checkoutCreated: 10, paid: 10 },
        requestToPaidRate: 0.5, trialToPaidRate: 1,
      });
    } finally { await client.query('ROLLBACK'); }
  }));
});
