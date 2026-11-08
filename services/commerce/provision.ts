import { Client } from "pg";
import { setupCompanyWithCredential } from "../../scripts/company-setup";
import { CommerceStore } from "./store";
import { databaseTarget, safeOrigin } from "./config";
import { DAY } from "./model";
import { digest, seal, unseal } from "./security";
export type SlotInput = {
  id: string;
  origin: string;
  databaseUrl: string;
  instanceSecret: string;
};
export async function registerSlot(
  store: CommerceStore,
  input: SlotInput,
  environment: string,
) {
  if (
    !["development", "production"].includes(environment) ||
    !/^[a-zA-Z0-9_-]{1,80}$/.test(input.id) ||
    !/^[A-Za-z0-9_-]{43}$/.test(input.instanceSecret)
  )
    throw Error("invalid_installation");
  safeOrigin(input.origin, environment === "development");
  databaseTarget(input.databaseUrl, environment);
  const url = new URL(input.databaseUrl);
  if (["postgres", "template0", "template1"].includes(url.pathname.slice(1)))
    throw Error("application_database_required");
  const client = new Client({
    connectionString: input.databaseUrl,
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  try {
    const found = await client.query(
      "SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' LIMIT 1",
    );
    if (found.rowCount) throw Error("empty_installation_required");
  } finally {
    await client.end();
  }
  const fingerprint = digest(
    `${url.hostname}:${url.port || "5432"}${url.pathname}`,
  );
  await store.pool.query(
    "INSERT INTO commerce.slots(id,origin,database_fingerprint,database_secret,instance_secret_hash,instance_secret) VALUES($1,$2,$3,$4,$5,$6)",
    [
      input.id,
      input.origin,
      fingerprint,
      seal(input.databaseUrl, store.key, `database:${input.id}`),
      digest(input.instanceSecret),
      seal(input.instanceSecret, store.key, `instance:${input.id}`),
    ],
  );
}
type ProbeInput = {
  origin: string;
  businessId: string;
  slotId: string;
  secret: string;
};
async function probeInstallation(input: ProbeInput) {
  const response = await fetch(`${input.origin}/api/commerce/facts`, {
    headers: { authorization: `Bearer ${input.secret}` },
    signal: AbortSignal.timeout(5000),
    redirect: "error",
    cache: "no-store",
  });
  if (!response.ok) throw Error("installation_not_ready");
  const result = await response.json();
  if (
    result.ready !== true ||
    result.businessId !== input.businessId ||
    result.installationId !== input.slotId
  )
    throw Error("installation_identity_mismatch");
}
export async function provisionBusiness(
  store: CommerceStore,
  businessId: string,
  options: { probe?: (input: ProbeInput) => Promise<void> } = {},
) {
  const slot = await store.transaction(async (client) => {
    const b = await client.query(
      "SELECT state FROM commerce.businesses WHERE id=$1 FOR UPDATE",
      [businessId],
    );
    if (!b.rowCount) throw Error("business_not_found");
    if (b.rows[0].state === "ready") return null;
    let selected = await client.query(
      "SELECT * FROM commerce.slots WHERE business_id=$1",
      [businessId],
    );
    if (!selected.rowCount)
      selected = await client.query(
        `UPDATE commerce.slots SET business_id=$1 WHERE id=(SELECT id FROM commerce.slots WHERE business_id IS NULL ORDER BY approved_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        [businessId],
      );
    if (!selected.rowCount) throw Error("capacity_unavailable");
    await client.query(
      "UPDATE commerce.businesses SET state='provisioning' WHERE id=$1",
      [businessId],
    );
    return selected.rows[0];
  });
  if (!slot) return;
  const databaseUrl = unseal(
    slot.database_secret,
    store.key,
    `database:${slot.id}`,
  );
  const target = new Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
    statement_timeout: 120000,
  });
  await target.connect();
  try {
    await target.query(
      "SELECT pg_advisory_lock(hashtextextended('nevora.commerce.provision',0))",
    );
    const exists = await target.query(
      "SELECT to_regclass('public.nevora_commerce_installation') binding",
    );
    if (exists.rows[0].binding) {
      const binding = await target.query(
        "SELECT business_id,installation_id,instance_secret_hash FROM nevora_commerce_installation WHERE singleton",
      );
      if (
        binding.rowCount !== 1 ||
        binding.rows[0].business_id !== businessId ||
        binding.rows[0].installation_id !== slot.id ||
        binding.rows[0].instance_secret_hash !== slot.instance_secret_hash
      )
        throw Error("installation_identity_mismatch");
    } else {
      const account = await store.pool.query(
        "SELECT profile,password_hash FROM commerce.accounts WHERE id=$1 AND verified_at IS NOT NULL",
        [businessId],
      );
      if (!account.rowCount || !account.rows[0].password_hash)
        throw Error("verified_owner_required");
      const p = account.rows[0].profile;
      await setupCompanyWithCredential(
        target,
        {
          name: p.businessName,
          timeZone: p.timeZone,
          locationName: p.locationName,
          locationShortName: p.locationName,
          locationKey: "main",
          owner: {
            id: "OWNER",
            firstName: p.firstName,
            lastName: p.lastName,
            phone: p.phone,
            email: p.email,
          },
        },
        account.rows[0].password_hash,
        async (client) => {
          await client.query(
            `CREATE TABLE public.nevora_commerce_installation(singleton boolean PRIMARY KEY CHECK(singleton),business_id uuid NOT NULL UNIQUE,installation_id text NOT NULL UNIQUE,instance_secret_hash text NOT NULL,employee_limit integer NOT NULL DEFAULT 30 CHECK(employee_limit IN (15,30)))`,
          );
          await client.query(
            "INSERT INTO public.nevora_commerce_installation(singleton,business_id,installation_id,instance_secret_hash) VALUES(true,$1,$2,$3)",
            [businessId, slot.id, slot.instance_secret_hash],
          );
          await client.query(`CREATE FUNCTION public.nevora_commerce_employee_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
          DECLARE capacity integer; existing integer;
          BEGIN
            IF NOT NEW.active OR NEW.role='OWNER' THEN RETURN NEW; END IF;
            IF TG_OP='UPDATE' THEN IF OLD.active AND OLD.role<>'OWNER' THEN RETURN NEW; END IF; END IF;
            SELECT employee_limit INTO capacity FROM public.nevora_commerce_installation WHERE singleton FOR UPDATE;
            IF capacity IS NULL THEN RAISE EXCEPTION 'commerce_capacity_unavailable'; END IF;
            SELECT count(*) INTO existing FROM public.employees WHERE active AND role<>'OWNER';
            IF existing>=capacity THEN RAISE EXCEPTION 'commerce_employee_limit' USING ERRCODE='23514'; END IF;
            RETURN NEW;
          END $$;
          CREATE TRIGGER nevora_commerce_employee_capacity BEFORE INSERT OR UPDATE OF active,role ON public.employees FOR EACH ROW EXECUTE FUNCTION public.nevora_commerce_employee_capacity();`);
        },
      );
    }
    const secret = unseal(
      slot.instance_secret,
      store.key,
      `instance:${slot.id}`,
    );
    await (options.probe ?? probeInstallation)({
      origin: slot.origin,
      businessId,
      slotId: slot.id,
      secret,
    });
    await store.transaction(async (client) => {
      const now = Date.now();
      await client.query(
        "UPDATE commerce.businesses SET state='ready',trial_started_at=COALESCE(trial_started_at,$2),trial_ends_at=COALESCE(trial_ends_at,$3) WHERE id=$1",
        [businessId, new Date(now), new Date(now + 30 * DAY)],
      );
      await client.query(
        "UPDATE commerce.accounts SET password_hash=NULL WHERE id=$1",
        [businessId],
      );
      await client.query(
        "INSERT INTO commerce.audit(business_id,event) VALUES($1,'installation_ready')",
        [businessId],
      );
    });
  } finally {
    await target
      .query(
        "SELECT pg_advisory_unlock(hashtextextended('nevora.commerce.provision',0))",
      )
      .catch(() => {});
    await target.end();
  }
}
