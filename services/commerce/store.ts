import {parseBillingOwner,type BillingOwner,type OwnerAuthorityCheck} from "./owner-authority";
import {enrollmentIdentity,type WorkspaceEnrollment} from "./workspace-enrollment";
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
  profile: Partial<Omit<Signup, "password">> & { email: string; ownerEmployeeId?:string };
  trialEnd: number | null;
  trialStart: number | null;
  paidThrough: number | null;
  pastDueSince: number | null;
  subscriptionStatus: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  planKey: PlanKey | null;
  employeeCount: number;
  enrollmentSource:"slots"|"onboarding";
  incarnation:string|null;
  slotId: string | null;
  origin: string | null;
};
const instant = (v: unknown): number | null =>
  v ? new Date(v as string).getTime() : null;
export class CommerceStore {
  constructor(
    readonly pool: Pool,
    readonly key: Buffer,
    readonly provisioningMode:"onboarding"|"slots"="slots",
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
  /** Private provisioner capability. No public handler calls this method. */
  async enrollWorkspace(input:WorkspaceEnrollment) {
    const identity=enrollmentIdentity(input,this.key);
    return this.transaction(async client=>{
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['commerce-enrollment:'+input.workspaceId]);
      const old=await client.query('SELECT identity_hash FROM commerce.external_installations WHERE business_id=$1',[input.workspaceId]);
      if(old.rowCount){if(old.rowCount!==1||old.rows[0].identity_hash!==identity)throw new CommerceError('enrollment_identity_mismatch',503);return;}
      if((await client.query('SELECT id FROM commerce.accounts WHERE id=$1',[input.workspaceId])).rowCount)throw new CommerceError('enrollment_identity_mismatch',503);
      await client.query("INSERT INTO commerce.accounts(id,email,profile,verified_at,enrollment_source) VALUES($1,$2,$3,$4,'onboarding')",[input.workspaceId,input.verifiedEmail,{email:input.verifiedEmail,businessName:input.businessName,ownerEmployeeId:input.ownerEmployeeId},input.provisionedAt]);
      await client.query("INSERT INTO commerce.businesses(id,state,employee_count,trial_started_at,trial_ends_at) VALUES($1,'ready',1,$2::timestamptz,$2::timestamptz+interval '30 days')",[input.workspaceId,input.provisionedAt]);
      await client.query('INSERT INTO commerce.external_installations(business_id,id,origin,environment,incarnation,provider_project_id,manifest_hash,identity_hash,instance_secret_hash,instance_secret,worker_secret_hash) VALUES($1::uuid,$1::text,$2,$3,$4::bigint,$5,$6,$7,$8,$9,$10)',[input.workspaceId,input.origin,input.environment,input.incarnation,input.providerProjectId,input.manifestHash,identity,digest(input.instanceSecret),seal(input.instanceSecret,this.key,'instance:'+input.workspaceId),digest(input.workerSecret)]);
      await client.query("INSERT INTO commerce.audit(business_id,event) VALUES($1,'onboarding_enrolled')",[input.workspaceId]);
    });
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
        "INSERT INTO commerce.accounts(id,email,profile) VALUES($1,$2,$3) ON CONFLICT(email) WHERE enrollment_source='slots' DO NOTHING RETURNING id",
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
  async loginLink(email: string, proof: string, origin: string, now: number, businessId?:string) {
    await this.transaction(async (client) => {
      const account = await client.query(
        "SELECT id,verified_at FROM commerce.accounts WHERE email=$1 AND enrollment_source='slots' AND ($2::uuid IS NULL OR id=$2) FOR UPDATE",
        [email,businessId??null],
      );
      if (account.rowCount!==1) return;
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
  async exchange(proof: string, session: string, now: number, handoff = false,checkOwner?:OwnerAuthorityCheck) {
    return this.transaction(async (client) => {
      const result = await client.query(
        `UPDATE commerce.tokens SET used_at=$2 WHERE hash=$1 AND used_at IS NULL AND expires_at>$2 AND purpose=ANY($3::text[]) RETURNING account_id,owner_binding`,
        [
          digest(proof),
          new Date(now),
          handoff ? ["handoff"] : ["verify", "signin"],
        ],
      );
      if (!result.rowCount) throw new CommerceError("invalid_or_expired_link");
      const id = result.rows[0].account_id,business=await this.business(id,client),owner=this.openOwner(result.rows[0].owner_binding,digest(proof));
      if(business.enrollmentSource==='onboarding'&&(!handoff||!owner||!checkOwner||!await checkOwner(business,owner,client)))throw new CommerceError('invalid_or_expired_link');
      await client.query(
        "UPDATE commerce.accounts SET verified_at=COALESCE(verified_at,$2) WHERE id=$1",
        [id, new Date(now)],
      );
      await client.query(
        "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at,owner_binding) VALUES($1,$2,'session',$3,$4)",
        [digest(session), id, new Date(now + 8 * 3600000),owner?seal(JSON.stringify(owner),this.key,'billing-owner:'+digest(session)):null],
      );
      return id as string;
    });
  }
  async session(proof: string, now: number,checkOwner?:OwnerAuthorityCheck,client?:PoolClient) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(proof))
      throw new CommerceError("unauthorized", 401);
    const result = await (client??this.pool).query(
      "SELECT account_id,owner_binding FROM commerce.tokens WHERE hash=$1 AND purpose='session' AND used_at IS NULL AND expires_at>$2",
      [digest(proof), new Date(now)],
    );
    if (!result.rowCount) throw new CommerceError("unauthorized", 401);
    const id=result.rows[0].account_id,business=await this.business(id,client),owner=this.openOwner(result.rows[0].owner_binding,digest(proof));
    if(business.enrollmentSource==='onboarding'&&(!owner||!checkOwner||!await checkOwner(business,owner,client)))throw new CommerceError('unauthorized',401);
    return id as string;
  }
  private openOwner(value:unknown,hash:string){
    if(typeof value!=='string')return null;try{return parseBillingOwner(JSON.parse(unseal(value,this.key,'billing-owner:'+hash)));}catch{return null;}
  }
  async tokenOwner(proof:string):Promise<BillingOwner|null>{
    const r=await this.pool.query("SELECT owner_binding FROM commerce.tokens WHERE hash=$1 AND used_at IS NULL AND expires_at>clock_timestamp()",[digest(proof)]);return r.rowCount===1?this.openOwner(r.rows[0].owner_binding,digest(proof)):null;
  }
  async logout(proof: string) {
    await this.pool.query(
      "UPDATE commerce.tokens SET used_at=clock_timestamp() WHERE hash=$1 AND purpose='session'",
      [digest(proof)],
    );
  }
  async business(id: string, client?: PoolClient): Promise<Business> {
    const r = await (client ?? this.pool).query(
      "SELECT b.*,a.email,a.profile,a.enrollment_source,x.incarnation::text installation_incarnation,COALESCE(x.id,s.id) slot_id,COALESCE(x.origin,s.origin) origin FROM commerce.businesses b JOIN commerce.accounts a ON a.id=b.id LEFT JOIN commerce.slots s ON s.business_id=b.id LEFT JOIN commerce.external_installations x ON x.business_id=b.id WHERE b.id=$1",
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
      enrollmentSource:b.enrollment_source,
      incarnation:b.installation_incarnation,
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
  async installation(id: string, secret: string,readOnly=false) {
    const result = await this.pool.query(
      "SELECT s.business_id FROM (SELECT id,business_id,instance_secret_hash,NULL::text worker_secret_hash FROM commerce.slots UNION ALL SELECT id,business_id,instance_secret_hash,worker_secret_hash FROM commerce.external_installations) s JOIN commerce.businesses b ON b.id=s.business_id WHERE s.id=$1 AND (s.instance_secret_hash=$2 OR ($3::boolean AND s.worker_secret_hash=$2)) AND b.state='ready'",
      [id, digest(secret),readOnly],
    );
    if (result.rowCount!==1) throw new CommerceError("unauthorized", 401);
    return this.business(result.rows[0].business_id);
  }
  async handoff(
    id: string,
    proof: string,
    now: number,
    client?: PoolClient,
    ttl = 120000,
    owner?:BillingOwner|null,
  ) {
    const business=await this.business(id,client);
    if(business.enrollmentSource==='onboarding'&&(!owner||owner.businessId!==id||owner.installationId!==business.slotId||owner.incarnation!==business.incarnation))throw new CommerceError('owner_required',403);
    await (client ?? this.pool).query(
      "INSERT INTO commerce.tokens(hash,account_id,purpose,expires_at,owner_binding) VALUES($1,$2,'handoff',$3,$4) ON CONFLICT(hash) DO NOTHING",
      [digest(proof), id, new Date(now + ttl),owner?seal(JSON.stringify(owner),this.key,'billing-owner:'+digest(proof)):null],
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
