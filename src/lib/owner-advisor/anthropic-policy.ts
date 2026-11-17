// This rollout is limited to the grant actually observed on November 15.
// A renewed grant requires a new verified window and reviewed candidate.
export const ANTHROPIC_CREDIT_GRANT_END = "2026-11-18T00:00:00Z";
export function anthropicCreditActive(value: string | undefined, now = Date.now()): boolean {
  if (!value) return false;
  const expires = Date.parse(value);
  return Number.isFinite(expires) && expires > now && expires <= Date.parse(ANTHROPIC_CREDIT_GRANT_END) &&
    new Date(expires).toISOString().replace(".000Z", "Z") === value.replace(".000Z", "Z");
}
