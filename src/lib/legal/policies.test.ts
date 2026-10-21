import { describe, expect, it } from "vitest";
import { POLICY_DOCUMENTS, POLICY_FACTS, SUPPORT_EMAIL, policiesVisible, unresolvedFacts } from "./policies";

const filled = Object.fromEntries(Object.keys(POLICY_FACTS).map(key => [key, "Confirmed by Jose"]));
const text = JSON.stringify(POLICY_DOCUMENTS);

describe("NEVORA public policies", () => {
  it("lists every fact the documents still need, effective date included", () => {
    const empty = Object.fromEntries(Object.keys(POLICY_FACTS).map(key => [key, null]));
    expect(unresolvedFacts(empty)).toEqual(expect.arrayContaining(["EFFECTIVE_DATE", "DELETION_COMPLETION_PERIOD", "RETENTION_SCHEDULE", "SUPPORT_RESPONSE_TIME", "PROCESSORS_AND_PURPOSES"]));
    // Every fact was confirmed by Jose on October 20, 2026.
    expect(unresolvedFacts()).toEqual([]);
    expect(unresolvedFacts(filled)).toEqual([]);
  });

  it("keeps unresolved drafts out of production and shows them in development and previews", () => {
    const draft = { ...POLICY_FACTS, BACKUP_EXPIRY: null };
    expect(policiesVisible({ VERCEL_ENV: "production", NODE_ENV: "production" }, draft)).toBe(false);
    expect(policiesVisible({ VERCEL_ENV: "production", NODE_ENV: "production", NEVORA_SHOW_DRAFT_POLICIES: "1" }, draft)).toBe(false);
    expect(policiesVisible({ NODE_ENV: "production" }, draft)).toBe(false);
    expect(policiesVisible({ VERCEL_ENV: "preview", NODE_ENV: "production" }, draft)).toBe(true);
    expect(policiesVisible({ NODE_ENV: "development" }, draft)).toBe(true);
    expect(policiesVisible({ VERCEL_ENV: "production", NODE_ENV: "production" }, filled)).toBe(true);
    // Today's confirmed facts publish in production.
    expect(policiesVisible({ VERCEL_ENV: "production", NODE_ENV: "production" })).toBe(true);
  });

  it("names VELANI LLC and the confirmed support address, and promises only what ships", () => {
    expect(text).toContain("VELANI LLC");
    expect(text).toContain(`mailto:${SUPPORT_EMAIL}`);
    expect(text).not.toMatch(/Report content|HIPAA|SOC 2|[Ee]nd-to-end|30 days|[Nn]ever sell/);
    expect(text).not.toMatch(/\[CONFIRM_/);
  });
});
