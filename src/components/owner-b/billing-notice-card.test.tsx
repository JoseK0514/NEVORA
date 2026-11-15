import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => <a href={href} {...props}>{children}</a> }));
vi.mock("./owner-b.css", () => ({}));
import type { BillingSnapshot } from "@/lib/commerce/billing-snapshot";
import type { CommerceStatus } from "@/lib/commerce/status";
import { BillingNoticeView } from "./billing-notice-card";

// Backend contract (Nov 15, 2026): the Owner status read's `notice` (trial windows, failed renewal/grace, restricted).
const status = (over: Partial<CommerceStatus>): CommerceStatus => ({ state: "trial", operational: true, trialEndsAt: null, paidThrough: null, graceEndsAt: null, plan: null, employeeLimit: 15, activeEmployees: 4, reason: null, billing: true, export: true, ...over });
const snap = (s: CommerceStatus, notice: NonNullable<Extract<BillingSnapshot, { state: "ready" }>["notice"]> | null): BillingSnapshot => ({ state: "ready", observedAt: "2026-11-15T12:00:00.000Z", validForMs: 15000, status: s, notice });
const html = (snapshot: BillingSnapshot | null, zone?: string) => renderToStaticMarkup(<BillingNoticeView snapshot={snapshot} timeZone={zone} />).replace(/ /g, " ");

describe("Owner Home: plan and billing notice", () => {
  it("names the trial’s last day in the workplace zone and links to Plan and billing", () => {
    const out = html(snap(status({ trialEndsAt: "2026-11-20T03:00:00Z", timeZone: "America/Puerto_Rico" }), { id: "trial:x:7", kind: "TRIAL_ENDING", dueAt: "2026-11-20T03:00:00Z", daysRemaining: 5, href: "/app/billing" }));
    expect(out).toContain("Your free trial ends Thu, Nov 19");
    expect(out).toContain("5 days left. Choose a plan to keep using NEVORA.");
    expect(out).toContain('href="/app/billing"');
  });
  it("a failed renewal says what to do and until when access continues, never that anything was paid", () => {
    const out = html(snap(status({ state: "grace", reason: "payment_failed", graceEndsAt: "2026-11-22T12:00:00Z" }), { id: "payment:x", kind: "PAYMENT_FAILED", dueAt: "2026-11-22T12:00:00Z", daysRemaining: 7, href: "/app/billing" }), "UTC");
    expect(out).toContain("We couldn’t charge your card");
    expect(out).toContain("Update your payment method. Access continues until Sun, Nov 22.");
    expect(out).not.toMatch(/paid|payment (went|was) (through|received)|thank you/i);
  });
  it("restricted access is red and gives the reason’s own words", () => {
    const out = html(snap(status({ state: "restricted", operational: false, reason: "trial_ended" }), { id: "restricted:trial_ended", kind: "ACCESS_RESTRICTED", dueAt: null, daysRemaining: null, href: "/app/billing" }));
    expect(out).toContain("b-ico b-ico--red");
    expect(out).toContain("Access is paused");
    expect(out).toContain("Your free trial ended. Choose a plan to keep using NEVORA.");
  });
  it("shows nothing without a notice, before the read, or when the read is unavailable", () => {
    expect(html(snap(status({ state: "paid", plan: "small" }), null))).toBe("");
    expect(html(null)).toBe("");
    expect(html({ state: "unavailable", reason: "read_failed" })).toBe("");
  });
});
