import { Client } from 'pg';
import { readCompanyInput, readSetupTarget, setupCompany } from './company-setup';

if (process.argv.includes('--help')) {
  console.log(`Set up one company in a new, empty database.

Required environment:
  NEVORA_SETUP_ENVIRONMENT       development or production
  NEVORA_SETUP_DATABASE_URL      explicit PostgreSQL target (never DATABASE_URL)
  NEVORA_SETUP_DATABASE_NAME     exact target database name
  COMPANY_NAME                  company display name
  COMPANY_TIME_ZONE             named IANA timezone
  COMPANY_LOCATION_NAME         initial location display name
  COMPANY_LOCATION_SHORT_NAME   initial location short name
  COMPANY_LOCATION_KEY          stable lowercase URL key
  BOOTSTRAP_EMPLOYEE_ID, BOOTSTRAP_FIRST_NAME, BOOTSTRAP_LAST_NAME
  BOOTSTRAP_PHONE, BOOTSTRAP_PASSWORD (at least 8 characters)
Optional: BOOTSTRAP_EMAIL

Usage: npm run setup:company -- --help
Load private configuration through your environment or Node --env-file.
Production setup requires sslmode=verify-full and separate owner authorization.
The whole install rolls back on failure. A second run refuses the existing schema.`);
} else {
  let client: Client | undefined;
  try {
    const connectionString = readSetupTarget(process.env);
    const input = readCompanyInput(process.env);
    client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    await client.connect();
    const result = await setupCompany(client, input);
    console.log(`Company setup complete. Workspace ID: ${result.workspaceId}. Initial location ID: ${result.locationId}.`);
  } catch (error) {
    console.error(error instanceof Error && !('code' in error) ? error.message : 'Company setup failed; no partial installation was committed.');
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
