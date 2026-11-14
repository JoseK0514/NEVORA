import { CommerceStore } from "./store";
import { provisionBusiness } from "./provision";
import type { StripeBilling } from "./stripe";
import { digest } from "./security";
export type MailDelivery = (message: {
  email: string;
  url: string;
  template: string;
}) => Promise<void>;
export async function workerOnce(
  store: CommerceStore,
  billing: Pick<StripeBilling, "syncJob"> | undefined,
  sendMail: MailDelivery,
) {
  const job = await store.claimJob();
  if (!job) return { state: "idle" };
  try {
    const payload = store.openJob(job);
    if (job.kind === "mail") {
      const raw = new URL(payload.url).hash.slice("#token=".length);
      const active = await store.pool.query(
        "SELECT 1 FROM commerce.tokens WHERE hash=$1 AND used_at IS NULL AND expires_at>clock_timestamp()",
        [digest(raw)],
      );
      if (active.rowCount)
        await sendMail({
          email: payload.email,
          url: payload.url,
          template: payload.template,
        });
    } else if (job.kind === "provision"){
      if(store.provisioningMode!=="slots")throw Error("legacy_provisioning_disabled");
      await provisionBusiness(store, payload.businessId);
    }
    else if (job.kind === "stripe") {
      if (!billing) throw Error("billing_not_configured");
      await billing.syncJob(payload);
    }
    await store.finishJob(job);
    return { state: "processed", kind: job.kind };
  } catch (error) {
    const codes = [
      "capacity_unavailable",
      "installation_not_ready",
      "installation_identity_mismatch",
      "subscription_identity_mismatch",
      "invalid_subscription_price",
      "invalid_stripe_risk_job",
      "stripe_risk_identity_mismatch",
    ];
    const code =
      error instanceof Error && codes.includes(error.message)
        ? error.message
        : "retry_required";
    await store.finishJob(job, code);
    return { state: "retry_scheduled", kind: job.kind, code };
  }
}
