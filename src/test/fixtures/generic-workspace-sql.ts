import { readFile } from 'node:fs/promises';
import { createDisposableFoundationDatabase } from '../integration/local-postgres';

/** Test-only replacement of migration seed configuration in a NEW owned database.
 * Never a customer bootstrap: this runs before any operational records exist. */
export async function createGenericWorkspaceDatabase() {
  const original = process.env.FUEL_TEST_DATABASE_URL;
  const url = new URL(original!);
  url.pathname += '_generic';
  process.env.FUEL_TEST_DATABASE_URL = url.href;
  let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
  try { db = await createDisposableFoundationDatabase({ mode: 'upgrade' }); }
  finally { process.env.FUEL_TEST_DATABASE_URL = original; }
  try {
    await db.executor.query({ text: await readFile('db/migrations/0008_workspace_positions.sql', 'utf8'), values: [] });
    await db.executor.transaction([
      { text: 'DELETE FROM location_staffing_settings', values: [] },
      { text: 'DELETE FROM locations', values: [] },
      { text: 'DELETE FROM workspaces', values: [] },
      { text: "INSERT INTO workspaces(id,name,time_zone) VALUES('cooperative-cedar','Cedar Atelier – Fictional','America/New_York')", values: [] },
      // One explicit starting location/owner is fixture configuration, not inferred setup.
      { text: "INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('cedar-harbor','cooperative-cedar','harbor-atelier','Atelier – Quai Étoile','Quai')", values: [] },
      { text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('cedar-owner','Cedar','Owner','5550000000','OWNER','cedar-harbor')", values: [] },
    ]);
    return db;
  } catch (error) { await db.dispose(); throw error; }
}
