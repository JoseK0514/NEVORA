import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { installCatalog } from "./catalog";
import { dropTestDatabase } from "./test-database";
import { setupCompanyWithCredential } from "../../scripts/company-setup";
import { hashPassword } from "../../src/lib/auth/password";
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)("dedicated database mutation guards", () => {
  let admin: Pool;
  beforeAll(() => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (url.hostname !== "127.0.0.1" || url.search || process.env.DATABASE_URL)
      throw Error("owned cluster required");
    admin = new Pool({ connectionString: url.href });
  });
  afterAll(async () => {
    await admin?.end();
  });
  async function fixture(run: (pool: Pool) => Promise<void>) {
    const name = `commerce_test_${randomUUID().replaceAll("-", "")}`,
      url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`;
    const pool = new Pool({ connectionString: url.href });
    try {
      await pool.query(
        "CREATE SCHEMA another_app;CREATE TABLE another_app.records(value integer);INSERT INTO another_app.records VALUES(7)",
      );
      await run(pool);
    } finally {
      await pool.end();
      await dropTestDatabase(admin, name);
    }
  }
  it("does not migrate a catalog into another application private schema", () =>
    fixture(async (pool) => {
      await expect(installCatalog(pool)).rejects.toThrow("empty");
      expect(
        (await pool.query("SELECT to_regnamespace('commerce') installed"))
          .rows[0].installed,
      ).toBeNull();
      expect(
        (await pool.query("SELECT value FROM another_app.records")).rows[0]
          .value,
      ).toBe(7);
    }));
  it("rechecks non-system schemas inside company installation before mutation", () =>
    fixture(async (pool) => {
      const client = await pool.connect();
      try {
        await expect(
          setupCompanyWithCredential(
            client,
            {
              name: "Example Shop",
              timeZone: "America/Puerto_Rico",
              locationName: "Main",
              locationShortName: "Main",
              locationKey: "main",
              owner: {
                id: "OWNER",
                firstName: "Taylor",
                lastName: "Example",
                phone: "7875550101",
                email: "owner@example.test",
              },
            },
            await hashPassword("fictional-owner-pass123"),
          ),
        ).rejects.toThrow("empty");
      } finally {
        client.release();
      }
      expect(
        (await pool.query("SELECT to_regclass('public.workspaces') installed"))
          .rows[0].installed,
      ).toBeNull();
      expect(
        (await pool.query("SELECT value FROM another_app.records")).rows[0]
          .value,
      ).toBe(7);
    }));
  it("refuses a maintenance database even when its public schema is empty", async () => {
    await expect(installCatalog(admin)).rejects.toThrow("maintenance");
  });
});
