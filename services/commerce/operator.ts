import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { readCommerceConfig } from "./config";
import { CommerceStore } from "./store";
import { registerSlot } from "./provision";
async function main() {
  const config = readCommerceConfig(process.env);
  if (
    config.environment === "production" &&
    process.env.NEVORA_COMMERCE_OPERATOR_APPROVED !== "true"
  )
    throw Error("explicit_production_operator_approval_required");
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 2,
    connectionTimeoutMillis: 10000,
  });
  try {
    if (process.argv[2] === "migrate") {
      const rows = await pool.query(
        "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') LIMIT 1",
      );
      if (rows.rowCount) throw Error("dedicated_empty_catalog_required");
      await pool.query(
        await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
      );
      console.log("Commerce catalog installed.");
    } else if (process.argv[2] === "register-slot") {
      await registerSlot(
        new CommerceStore(pool, config.key),
        {
          id: process.env.NEVORA_SLOT_ID ?? "",
          origin: process.env.NEVORA_SLOT_ORIGIN ?? "",
          databaseUrl: process.env.NEVORA_SLOT_DATABASE_URL ?? "",
          instanceSecret: process.env.NEVORA_SLOT_INSTANCE_SECRET ?? "",
        },
        config.environment,
      );
      console.log("Approved installation capacity registered.");
    } else throw Error("usage: operator migrate|register-slot");
  } finally {
    await pool.end();
  }
}
main().catch(() => {
  console.error(
    "Commerce operator command failed. Verify the explicit target and private configuration.",
  );
  process.exitCode = 1;
});
