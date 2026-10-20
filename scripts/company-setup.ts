import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Client } from 'pg';
import { hashPassword } from '../src/lib/auth/password';
import { normalizePhoneNumber } from '../src/lib/phone';
import { validateWorkspaceProfile } from '../src/lib/workspace/validation';

type Environment = Record<string, string | undefined>;
export type OwnerInput = {
  id: string; firstName: string; lastName: string; phone: string;
  email: string | null; password: string;
};
export type CompanyInput = {
  name: string; timeZone: string; locationName: string;
  locationShortName: string; locationKey: string; owner: OwnerInput;
};

function text(env: Environment, key: string, maximum: number): string {
  const value = env[key]?.trim() ?? '';
  if (!value || [...value].length > maximum || /[\p{Cc}\p{Cf}]/u.test(value)) {
    throw new Error(`${key} is required and must contain at most ${maximum} readable characters.`);
  }
  return value;
}

export function readOwnerInput(env: Environment): OwnerInput {
  const id = text(env, 'BOOTSTRAP_EMPLOYEE_ID', 128).toUpperCase();
  if ([...id].length > 128) throw new Error('BOOTSTRAP_EMPLOYEE_ID is too long.');
  const firstName = text(env, 'BOOTSTRAP_FIRST_NAME', 160);
  const lastName = text(env, 'BOOTSTRAP_LAST_NAME', 160);
  const phone = normalizePhoneNumber(text(env, 'BOOTSTRAP_PHONE', 32));
  if (!phone) throw new Error('BOOTSTRAP_PHONE must be a valid ten-digit phone number.');
  const email = env.BOOTSTRAP_EMAIL?.trim() || null;
  if (email && (email.length > 254 || /[\s\p{Cc}\p{Cf}]/u.test(email) || !/^[^@]+@[^@]+$/.test(email))) {
    throw new Error('BOOTSTRAP_EMAIL must be a valid email address.');
  }
  const password = env.BOOTSTRAP_PASSWORD ?? '';
  if (password.length < 8) throw new Error('BOOTSTRAP_PASSWORD must contain at least 8 characters.');
  return { id, firstName, lastName, phone, email, password };
}

export function readCompanyInput(env: Environment): CompanyInput {
  const profile = validateWorkspaceProfile({
    name: text(env, 'COMPANY_NAME', 160),
    timeZone: text(env, 'COMPANY_TIME_ZONE', 100),
  });
  const locationKey = text(env, 'COMPANY_LOCATION_KEY', 64);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(locationKey)) {
    throw new Error('COMPANY_LOCATION_KEY must be lowercase URL-safe text.');
  }
  return {
    ...profile,
    locationName: text(env, 'COMPANY_LOCATION_NAME', 160),
    locationShortName: text(env, 'COMPANY_LOCATION_SHORT_NAME', 48),
    locationKey,
    owner: readOwnerInput(env),
  };
}

export function readOwnerLocations(env: Environment) {
  const primaryLocationId = text(env, 'BOOTSTRAP_PRIMARY_LOCATION_ID', 128);
  const eligibleLocationIds = [...new Set(text(env, 'BOOTSTRAP_ELIGIBLE_LOCATION_IDS', 16000)
    .split(',').map(value => value.trim()).filter(Boolean))];
  if (!eligibleLocationIds.includes(primaryLocationId)) {
    throw new Error('BOOTSTRAP_ELIGIBLE_LOCATION_IDS must include the primary location.');
  }
  return { primaryLocationId, eligibleLocationIds };
}

export function readSetupTarget(env: Environment): string {
  if (!['development', 'production'].includes(env.NEVORA_SETUP_ENVIRONMENT ?? '')) {
    throw new Error('Select NEVORA_SETUP_ENVIRONMENT=development or production explicitly.');
  }
  const value = env.NEVORA_SETUP_DATABASE_URL;
  if (!value) throw new Error('NEVORA_SETUP_DATABASE_URL is required; DATABASE_URL is never used for setup.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid setup database URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.hash) {
    throw new Error('Invalid setup database URL.');
  }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!name || name !== env.NEVORA_SETUP_DATABASE_NAME || ['postgres', 'template0', 'template1'].includes(name)) {
    throw new Error('NEVORA_SETUP_DATABASE_NAME must match the selected application database.');
  }
  if (env.NEVORA_SETUP_ENVIRONMENT === 'production' && url.searchParams.get('sslmode') !== 'verify-full') {
    throw new Error('Production setup requires sslmode=verify-full.');
  }
  return value;
}

async function insertOwner(client: Client, owner: OwnerInput, passwordHash: string, primaryLocationId: string, eligibleLocationIds: string[]) {
  await client.query(`INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id)
    VALUES($1,$2,$3,$4,$5,'OWNER',$6)`, [owner.id, owner.firstName, owner.lastName, owner.phone, owner.email, primaryLocationId]);
  await client.query(`INSERT INTO employee_location_eligibility(employee_id,location_id)
    SELECT $1, unnest($2::text[])`, [owner.id, eligibleLocationIds]);
  await client.query(`INSERT INTO employee_credentials(employee_id,password_hash,must_change_password)
    VALUES($1,$2,false)`, [owner.id, passwordHash]);
}

export async function bootstrapOwner(client: Client, owner: OwnerInput, locations: ReturnType<typeof readOwnerLocations>) {
  const passwordHash = await hashPassword(owner.password);
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nevora.company.setup',0))");
    const workspace = await client.query('SELECT id FROM workspaces WHERE singleton=true AND active=true FOR SHARE');
    if (workspace.rowCount !== 1) throw new Error('One active configured company is required.');
    const activeLocations = await client.query(`SELECT id FROM locations
      WHERE id=ANY($1::text[]) AND workspace_id=$2 AND active=true ORDER BY id FOR SHARE`,
    [locations.eligibleLocationIds, workspace.rows[0].id]);
    if (activeLocations.rowCount !== locations.eligibleLocationIds.length) {
      throw new Error('Every selected location must be active and belong to the configured company.');
    }
    const existing = await client.query('SELECT id FROM employees WHERE upper(id)=upper($1)', [owner.id]);
    if (existing.rowCount) throw new Error('The owner employee ID already exists.');
    await insertOwner(client, owner, passwordHash, locations.primaryLocationId, locations.eligibleLocationIds);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

/** Historical migrations remain the schema authority. Strip only their outer
 * transaction markers so the entire fresh install has one atomic boundary. */
export function migrationBody(source: string): string {
  const begins = [...source.matchAll(/^BEGIN;\s*$/gm)];
  const commits = [...source.matchAll(/^COMMIT;\s*$/gm)];
  if (begins.length !== commits.length || begins.length > 1) throw new Error('Unexpected migration transaction boundaries.');
  return source.replace(/^BEGIN;\s*$/m, '').replace(/^COMMIT;\s*$/m, '');
}

export async function setupCompany(client: Client, input: CompanyInput) {
  const migrations = await Promise.all([
    '0001_initial', '0002_schedule_health', '0003_schedule_assistance', '0004_assistance_layer',
    '0005_time_clock', '0006_scheduling_rule_inputs', '0007_portal_web_push', '0008_workspace_positions',
    '0009_schedule_generation', '0010_shift_coverage_automation', '0011_clocker_devices', '0012_clocker_pins',
    '0013_clocker_punches', '0014_clocker_breaks', '0015_clocker_schedule_context', '0016_time_corrections',
    '0017_missing_time_supersession', '0018_timecards', '0019_payroll_export_mappings', '0020_account_recovery',
    '0021_timecard_reassignment_interlock', '0022_timecard_reopen_revision_authority',
    '0023_employee_attention_receipts', '0024_contextual_communications', '0025_calendar_subscriptions',
    '0023_template_ownership', '0024_schedule_copy_receipts', '0025_company_policies',
    '0026_attendance_observations', '0027_payroll_period_custody', '0028_configurable_payroll', '0029_payroll_private_notices',
    '0030_notification_source_kinds', '0031_workspace_presentation', '0032_workspace_words_modules',
    '0033_management_alert_preferences', '0034_account_deletion_requests',
  ].map(async name => migrationBody(await readFile(new URL(`../db/migrations/${name}.sql`, import.meta.url), 'utf8'))));
  const passwordHash = await hashPassword(input.owner.password);
  const workspaceId = randomUUID(), locationId = randomUUID();
  await client.query('BEGIN');
  try {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nevora.company.setup',0))");
    const existing = await client.query(`SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' UNION ALL SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' UNION ALL SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' LIMIT 1`);
    if (existing.rowCount) throw new Error('Company setup requires an empty public schema; existing databases are never reset.');
    await client.query('SET LOCAL search_path TO public, pg_catalog');
    for (const migration of migrations) await client.query(migration);
    // These rows were created by the historical migrations in THIS transaction
    // on a proven empty schema. No existing customer configuration is touched.
    await client.query('DELETE FROM location_staffing_settings');
    await client.query('DELETE FROM locations');
    await client.query('DELETE FROM workspaces');
    await client.query('INSERT INTO workspaces(id,name,time_zone) VALUES($1,$2,$3)', [workspaceId, input.name, input.timeZone]);
    await client.query(`INSERT INTO locations(id,workspace_id,clocker_key,name,short_name)
      VALUES($1,$2,$3,$4,$5)`, [locationId, workspaceId, input.locationKey, input.locationName, input.locationShortName]);
    await insertOwner(client, input.owner, passwordHash, locationId, [locationId]);
    await client.query('COMMIT');
    return { workspaceId, locationId };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}
