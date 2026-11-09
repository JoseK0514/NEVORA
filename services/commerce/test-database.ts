import type { Pool } from "pg";
import { setTimeout } from "node:timers/promises";
/** Owned fixture cleanup: wait for libpq disconnects before DROP rather than kill closing sockets. */
export async function dropTestDatabase(admin: Pool, name: string) {
  if (!/^(commerce|company)_test_[a-f0-9]{32}$/.test(name))
    throw Error("unowned_database");
  for (let attempt = 0; attempt < 100; attempt++) {
    const open = await admin.query(
      "SELECT 1 FROM pg_stat_activity WHERE datname=$1",
      [name],
    );
    if (!open.rowCount) {
      await admin.query(`DROP DATABASE "${name}"`);
      return;
    }
    await setTimeout(10);
  }
  throw Error("test_database_connections_did_not_close");
}
