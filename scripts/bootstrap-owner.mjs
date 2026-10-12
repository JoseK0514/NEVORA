import { Client } from 'pg';
import { bootstrapOwner, readOwnerInput, readOwnerLocations, readSetupTarget } from './company-setup.ts';

if (process.argv.includes('--help')) {
  console.log(`Create an owner in the configured single-company database.
Requires NEVORA_SETUP_ENVIRONMENT, NEVORA_SETUP_DATABASE_URL, NEVORA_SETUP_DATABASE_NAME,
BOOTSTRAP_EMPLOYEE_ID, BOOTSTRAP_FIRST_NAME, BOOTSTRAP_LAST_NAME, BOOTSTRAP_PHONE,
BOOTSTRAP_PASSWORD, BOOTSTRAP_PRIMARY_LOCATION_ID, BOOTSTRAP_ELIGIBLE_LOCATION_IDS.
Eligibility is a comma-separated list of active location IDs including the primary location.
Optional: BOOTSTRAP_EMAIL. Existing employee IDs are refused.
Usage: npm run bootstrap:owner -- --help`);
} else {
  let client;
  try {
    const connectionString = readSetupTarget(process.env);
    const owner = readOwnerInput(process.env);
    const locations = readOwnerLocations(process.env);
    client = new Client({ connectionString, connectionTimeoutMillis: 10000 });
    await client.connect();
    await bootstrapOwner(client, owner, locations);
    console.log('Owner created with the explicitly selected location access.');
  } catch (error) {
    console.error(error instanceof Error && !('code' in error) ? error.message : 'Owner setup failed; no partial owner was committed.');
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
