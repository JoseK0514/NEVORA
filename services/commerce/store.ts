import { createHmac, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { CommerceError, DAY, type Signup, type PlanKey } from "./model";
import { digest, seal, unseal } from "./security";
export type Job = {
  id: string;
  kind: "mail" | "provision" | "stripe";
  payload: string;
  lease_id: string;
  attempts: number;
};
export type Business = {
  id: string;
  state: string;
  email: string;
  profile: Partial<Omit<Signup, "password">> & { email: string };
  trialEnd: number | null;
  trialStart: number | null;
  paidThrough: number | null;
  pastDueSince: number | null;
  subscriptionStatus: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  planKey: PlanKey | null;
  employeeCount: number;
  slotId: string | null;
  origin: string | null;
};
const instant = (v: unknown): number | null =>
  v ? new Date(v as string).getTime() : null;
export class CommerceStore {
  constructor(
    readonly pool: Pool,
    readonly key: Buffer,
  ) {}
  async transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const value = await fn(client);
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async withBusinessLock<T>(
    id: string,
    fn: (client: PoolClient, business: Business) => Promise<T>,
  ): Promise<T> {
    return this.transaction(async (client) => {
      const result = await client.query(
        "SELECT id FROM commerce.businesses WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!result.rowCount) throw new CommerceError("not_found", 404);
      return fn(client, await this.business(id, client));
    });
  }
  async enqueue(
    client: PoolClient,
    kind: Job["kind"],
    dedupe: string,
    payload: unknown,
  ) {
    const id = randomUUID();
    await client.query(
      "INSERT INTO commerce.jobs(id,dedupe_key,kind,payload) VALUES($1,$2,$3,$4) ON CONFLICT(dedupe_key) DO NOTHING",
      [id, dedupe, kind, seal(JSON.stringify(payload), this.key, id)],
    );
  }
  openJob(job: Pick<Job, "id" | "payload">): Record<string, string> {
    return JSON.parse(unseal(job.payload, this.key, job.id));
  }
  async signup(
    email: string,
    proof: string,
    verificationUrl: string,
    now: number,
  ) {
    return this.transaction(async (client) => {
      const id = randomUUID();
      const created = await client.query(
        "INSERT INTO commerce.accounts(id,email,profile) VALUES($1,$2,$3) ON CONFLICT(email) DO NOTHING RETURNING id",
        [id, email, { email }],
      );
      if (!created.rowCount) return;
      await client.query(
        "INSERT INTO commerce.businesses(id,employee_count) VALUES($1,1)",
        [id],
      );
      await client.query(
        "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'verify',$3)",
        [digest(proof), id, new Date(now + DAY)],
      );
      await this.enqueue(client, "mail", `verify:${digest(proof)}`, {
        email,
        url: `${verificationUrl}#token=${proof}`,
        template: "verify",
      });
    });
  }
  async submitSetup(id: string, input: Signup, passwordHash: string) {
    const fingerprint = createHmac("sha256", this.key)
      .update(`setup:${JSON.stringify(input)}`)
      .digest("hex");
    await this.transaction(async (client) => {
      const business = await client.query(
        "SELECT state FROM commerce.businesses WHERE id=$1 FOR UPDATE",
        [id],
      );
      const account = await client.query(
        "SELECT email,verified_at,setup_fingerprint FROM commerce.accounts WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (
        !business.rowCount ||
        !account.rowCount ||
        !account.rows[0].verified_at ||
        account.rows[0].email !== input.email
      )
        throw new CommerceError("unauthorized", 401);
      if (account.rows[0].setup_fingerprint) {
        if (account.rows[0].setup_fingerprint === fingerprint) return;
        throw new CommerceError("setup_already_submitted", 409);
      }
      if (business.rows[0].state !== "required")
        throw new CommerceError("setup_already_submitted", 409);
      const { password: _password, ...profile } = input;
      await client.query(
        "UPDATE commerce.accounts SET password_hash=$2,profile=$3,setup_fingerprint=$4 WHERE id=$1",
        [id, passwordHash, profile, fingerprint],
      );
      await client.query(
        "UPDATE commerce.businesses SET state='pending',employee_count=$2 WHERE id=$1",
        [id, input.employeeCount],
      );
      await this.enqueue(client, "provision", `provision:${id}`, {
        businessId: id,
      });
    });
  }
  async loginLink(email: string, proof: string, origin: string, now: number) {
    await this.transaction(async (client) => {
      const account = await client.query(
        "SELECT id,verified_at FROM commerce.accounts WHERE email=$1 FOR UPDATE",
        [email],
      );
      if (!account.rowCount) return;
      const row = account.rows[0];
      await client.query(
        "UPDATE commerce.tokens SET used_at=$2 WHERE account_id=$1 AND purpose IN ('verify','signin') AND used_at IS NULL",
        [row.id, new Date(now)],
      );
      await client.query(
        "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,$3,$4)",
        [
          digest(proof),
          row.id,
          row.verified_at ? "signin" : "verify",
          new Date(now + 30 * 60000),
        ],
      );
      await this.enqueue(client, "mail", `login:${digest(proof)}`, {
        email,
        url: `${origin}#token=${proof}`,
        template: "signin",
      });
    });
  }
  async exchange(proof: string, session: string, now: number, handoff = false) {
    return this.transaction(async (client) => {
      const result = await client.query(
        `UPDATE commerce.tokens SET used_at=$2 WHERE hash=$1 AND used_at IS NULL AND expires_at>$2 AND purpose=ANY($3::text[]) RETURNING account_id`,
        [
          digest(proof),
          new Date(now),
          handoff ? ["handoff"] : ["verify", "signin"],
        ],
      );
      if (!result.rowCount) throw new CommerceError("invalid_or_expired_link");
      const id = result.rows[0].account_id;
      await client.query(
        "UPDATE commerce.accounts SET verified_at=COALESCE(verified_at,$2) WHERE id=$1",
        [id, new Date(now)],
      );
      await client.query(
        "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'session',$3)",
        [digest(session), id, new Date(now + 8 * 3600000)],
      );
      return id as string;
    });
  }
  async session(proof: string, now: number) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(proof))
      throw new CommerceError("unauthorized", 401);
    const result = await this.pool.query(
      "SELECT account_id FROM commerce.tokens WHERE hash=$1 AND purpose='session' AND used_at IS NULL AND expires_at>$2",
      [digest(proof), new Date(now)],
    );
    if (!result.rowCount) throw new CommerceError("unauthorized", 401);
    return result.rows[0].account_id as string;
  }
  async logout(proof: string) {
    await this.pool.query(
      "UPDATE commerce.tokens SET used_at=clock_timestamp() WHERE hash=$1 AND purpose='session'",
      [digest(proof)],
    );
  }
  async business(id: string, client?: PoolClient): Promise<Business> {
    const r = await (client ?? this.pool).query(
      "SELECT b.*,a.email,a.profile,s.id slot_id,s.origin FROM commerce.businesses b JOIN commerce.accounts a ON a.id=b.id LEFT JOIN commerce.slots s ON s.business_id=b.id WHERE b.id=$1",
      [id],
    );
    if (!r.rowCount) throw new CommerceError("not_found", 404);
    const b = r.rows[0];
    return {
      id: b.id,
      state: b.state,
      email: b.email,
      profile: b.profile,
      trialEnd: instant(b.trial_ends_at),
      trialStart: instant(b.trial_started_at),
      paidThrough: instant(b.paid_through),
      pastDueSince: instant(b.past_due_since),
      subscriptionStatus: b.subscription_status,
      customerId: b.stripe_customer_id,
      subscriptionId: b.stripe_subscription_id,
      planKey: b.plan_key,
      employeeCount: b.employee_count,
      slotId: b.slot_id,
      origin: b.origin,
    };
  }
  async rate(key: string, maximum: number, seconds: number, now: number) {
    const r = await this.pool.query(
      `INSERT INTO commerce.rate_limits(key,count,expires_at) VALUES($1,1,$3) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN commerce.rate_limits.expires_at<=$2 THEN 1 ELSE commerce.rate_limits.count+1 END,expires_at=CASE WHEN commerce.rate_limits.expires_at<=$2 THEN $3 ELSE commerce.rate_limits.expires_at END RETURNING count`,
      [digest(key), new Date(now), new Date(now + seconds * 1000)],
    );
    if (r.rows[0].count > maximum) throw new CommerceError("rate_limited", 429);
  }
  async claimJob(): Promise<Job | null> {
    const r = await this.pool.query(
      `UPDATE commerce.jobs SET state='running',lease_id=$1,lease_until=clock_timestamp()+interval '5 minutes',attempts=attempts+1 WHERE id=(SELECT id FROM commerce.jobs WHERE available_at<=clock_timestamp() AND (state='pending' OR (state='running' AND lease_until<clock_timestamp())) ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
      [randomUUID()],
    );
    return r.rows[0] ?? null;
  }
  async finishJob(job: Job, error?: string) {
    await this.pool.query(
      `UPDATE commerce.jobs SET state=$3,lease_id=NULL,lease_until=NULL,last_error=$4,available_at=clock_timestamp()+make_interval(secs=>$5),payload=CASE WHEN $3='done' THEN '' ELSE payload END WHERE id=$1 AND lease_id=$2`,
      [
        job.id,
        job.lease_id,
        error ? "pending" : "done",
        error ?? null,
        Math.min(3600, 2 ** Math.min(job.attempts, 10) * 10),
      ],
    );
  }
  async installation(id: string, secret: string) {
    const result = await this.pool.query(
      "SELECT s.business_id FROM commerce.slots s JOIN commerce.businesses b ON b.id=s.business_id WHERE s.id=$1 AND s.instance_secret_hash=$2 AND b.state='ready'",
      [id, digest(secret)],
    );
    if (!result.rowCount) throw new CommerceError("unauthorized", 401);
    return this.business(result.rows[0].business_id);
  }
  async handoff(
    id: string,
    proof: string,
    now: number,
    client?: PoolClient,
    ttl = 120000,
  ) {
    await (client ?? this.pool).query(
      "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at) VALUES($1,$2,'handoff',$3) ON CONFLICT(hash) DO NOTHING",
      [digest(proof), id, new Date(now + ttl)],
    );
  }
  async webhook(id: string, subscriptionId: string) {
    await this.transaction(async (client) => {
      const r = await client.query(
        "INSERT INTO commerce.webhooks(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id",
        [id],
      );
      if (r.rowCount)
        await this.enqueue(client, "stripe", `stripe:${id}`, {
          subscriptionId,
        });
    });
  }
}
