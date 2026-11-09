import { readFile } from "node:fs/promises";
import type { Pool } from "pg";
import {
  assertEmptyDatabase,
  migrationBody,
} from "../../scripts/company-setup";
export async function installCatalog(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('nevora.commerce.catalog',0))",
    );
    await assertEmptyDatabase(client);
    await client.query(
      migrationBody(
        await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
      ),
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
