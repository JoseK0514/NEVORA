import { readBillingOwnerBinding } from "../../src/lib/commerce/owner-binding";
import { dropTestDatabase } from "./test-database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CommerceStore } from "./store";
import { provisionBusiness, registerSlot } from "./provision";
import { hashPassword, verifyPassword } from "../../src/lib/auth/password";
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)("isolated company provisioning", () => {
  let admin: Pool, catalog: Pool, target: Pool, store: CommerceStore;
  let catalogUrl: string, targetUrl: string;
  const suffix = randomUUID().replaceAll("-", ""),
    catalogName = `commerce_test_${suffix}`,
    targetName = `company_test_${suffix}`;
  let businessId: string;
  const key = Buffer.alloc(32, 7),
    secret = "a".repeat(43);
  beforeAll(async () => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (url.hostname !== "127.0.0.1" || process.env.DATABASE_URL)
      throw Error("owned cluster required");
    admin = new Pool({ connectionString: url.href });
    for (const name of [catalogName, targetName])
      await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${catalogName}`;
    catalogUrl = url.href;
    catalog = new Pool({ connectionString: catalogUrl });
    url.pathname = `/${targetName}`;
    targetUrl = url.href;
    target = new Pool({ connectionString: targetUrl });
    await catalog.query(
      await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
    );
    store = new CommerceStore(catalog, key);
    await store.signup(
      "owner@example.test",
      "v".repeat(43),
      "https://accounts.example.test/pages/nevora-verify",
      Date.now(),
    );
    await store.exchange("v".repeat(43), "s".repeat(43), Date.now());
    businessId = (await catalog.query("SELECT id FROM commerce.businesses"))
      .rows[0].id;
    await store.submitSetup(
      businessId,
      {
        email: "owner@example.test",
        password: "fictional-owner-pass123",
        firstName: "Taylor",
        lastName: "Example",
        phone: "7875550101",
        businessName: "Example Shop",
        timeZone: "America/Puerto_Rico",
        locationName: "Main",
        employeeCount: 10,
      },
      await hashPassword("fictional-owner-pass123"),
    );
  });
  afterAll(async () => {
    await catalog?.end();
    await target?.end();
    if (admin) {
      for (const name of [catalogName, targetName])
        await dropTestDatabase(admin, name);
      await admin.end();
    }
  });
  it("refuses to use the commerce catalog itself as company capacity", async () => {
    await expect(
      registerSlot(
        store,
        {
          id: "catalog-slot",
          origin: "https://catalog-slot.example.test",
          databaseUrl: catalogUrl,
          instanceSecret: "c".repeat(43),
        },
        "development",
      ),
    ).rejects.toThrow("empty_installation_required");
  });
  it("keeps a verified signup pending when approved capacity is unavailable", async () => {
    await expect(provisionBusiness(store, businessId)).rejects.toThrow(
      "capacity_unavailable",
    );
    expect((await store.business(businessId)).trialEnd).toBeNull();
  });
  it("installs one isolated company and starts exactly one 30-day trial under concurrent retries", async () => {
    await registerSlot(
      store,
      {
        id: "slot-a",
        origin: "https://company-a.example.test",
        databaseUrl: targetUrl,
        instanceSecret: secret,
      },
      "development",
    );
    await expect(
      provisionBusiness(store, businessId, {
        probe: async () => {
          throw Error("installation_not_ready");
        },
      }),
    ).rejects.toThrow("installation_not_ready");
    expect((await store.business(businessId)).trialEnd).toBeNull();
    await expect(store.installation("slot-a", secret)).rejects.toThrow(
      "unauthorized",
    );
    const probe = async () => {
      expect(
        (
          await target.query(
            "SELECT business_id FROM nevora_commerce_installation",
          )
        ).rows[0].business_id,
      ).toBe(businessId);
    };
    await Promise.all([
      provisionBusiness(store, businessId, { probe }),
      provisionBusiness(store, businessId, { probe }),
    ]);
    const b = await store.business(businessId);
    expect(b.state).toBe("ready");
    expect(b.trialEnd! - b.trialStart!).toBe(30 * 86400000);
    const accounts = await target.query(
      "SELECT e.id,e.role,c.password_hash FROM employees e JOIN employee_credentials c ON c.employee_id=e.id",
    );
    expect(accounts.rows).toHaveLength(1);
    expect(accounts.rows[0].role).toBe("OWNER");
    expect(
      await verifyPassword(
        "fictional-owner-pass123",
        accounts.rows[0].password_hash,
      ),
    ).toBe(true);
    expect(
      (await target.query("SELECT count(*)::int n FROM workspaces")).rows[0].n,
    ).toBe(1);
    expect(
      (await catalog.query("SELECT password_hash FROM commerce.accounts"))
        .rows[0].password_hash,
    ).toBeNull();
    await provisionBusiness(store, businessId, { probe });
    expect((await store.business(businessId)).trialEnd).toBe(b.trialEnd);
    await expect(store.installation("slot-a", "wrong-secret")).rejects.toThrow(
      "unauthorized",
    );
  }, 120000);
  it("binds a real Owner session to its installation before exposing billing", async () => {
    await target.query(
      "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'OWNER',$2)",
      ["f".repeat(64), new Date(Date.now() + 86400000)],
    );
    const proof = {
        sessionTokenHash: "f".repeat(64),
        employee: { id: "OWNER" },
      },
      query = async (text: string, values: unknown[]) =>
        (await target.query(text, values)).rows;
    expect(
      (
        await readBillingOwnerBinding(
          proof,
          { installationId: "slot-a", secret },
          query,
        )
      )?.business_id,
    ).toBe(businessId);
    expect(
      await readBillingOwnerBinding(
        proof,
        { installationId: "other-slot", secret: "z".repeat(43) },
        query,
      ),
    ).toBeNull();
  });
  it("enforces employee capacity in the company database without disabling existing employees", async () => {
    await target.query(
      "UPDATE nevora_commerce_installation SET employee_limit=15",
    );
    const location = (await target.query("SELECT id FROM locations LIMIT 1"))
      .rows[0].id;
    for (let n = 1; n <= 15; n++)
      await target.query(
        "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Staff','7875550101','EMPLOYEE',$2)",
        [`STAFF-${n}`, location],
      );
    await expect(
      target.query(
        "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('STAFF-16','Fictional','Staff','7875550101','EMPLOYEE',$1)",
        [location],
      ),
    ).rejects.toThrow("commerce_employee_limit");
    await target.query(
      "UPDATE employees SET first_name='Updated' WHERE id='STAFF-1'",
    );
    expect(
      (
        await target.query(
          "SELECT count(*)::int n FROM employees WHERE active AND role<>'OWNER'",
        )
      ).rows[0].n,
    ).toBe(15);
  });
  it("refuses to enroll a nonempty or already enrolled database for another slot", async () => {
    await expect(
      registerSlot(
        store,
        {
          id: "slot-b",
          origin: "https://company-b.example.test",
          databaseUrl: targetUrl,
          instanceSecret: "b".repeat(43),
        },
        "development",
      ),
    ).rejects.toThrow();
  });
});
