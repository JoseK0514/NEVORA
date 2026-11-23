// Phase 7 (moments): payroll results use the shared done state with no flourish, in the hook's existing words, and a
// queued action never borrows the success mark.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, rs } from '@rstest/core';

rs.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));
rs.mock("@/components/toaster", () => ({ toast: () => {} }));
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { Feedback } from "./payroll-feedback";
import { confirmedTitle } from "./use-payroll";
import { decideCelebration } from "@/lib/celebrations";

const idle = { error: "", message: "", pending: null, busy: false, resuming: false, retryAvailable: false, resumeAvailable: false, check: async () => {}, retry: async () => {}, resume: () => {}, pauseResume: () => {} };
const saved = "Saved. Check the status below.";

describe("payroll action feedback", () => {
  it("a receipt-confirmed approval is the done state: the mark, the existing words, nothing more", () => {
    const html = renderToStaticMarkup(<Feedback operation={{ ...idle, message: saved, confirmed: "Payroll approved" }} />);
    expect(html).toContain('data-kind="done" data-size="inline"');
    expect(html).toContain("b-donemark");
    expect(html).toContain('<p class="b-statecard__t" tabindex="-1">Payroll approved</p><p class="b-statecard__s">Check the status below.</p>');
    // Money stays calm: no celebration, no button, and one live region (the feedback block's own).
    expect(html).not.toContain("nevora-celebration");
    expect(html).not.toContain("b-btn");
    expect(html.match(/aria-live|role="status"|role="alert"/g)).toHaveLength(1);
    // Said once: the title takes focus, so the block around it is not a live region for this result.
    expect(html).toContain('<div class="c-pay__feedback" aria-live="off">');
  });
  it("sharing statements only queues them, so its receipt keeps the plain line and no mark", () => {
    expect(confirmedTitle({ action: "PUBLISH" })).toBeNull();
    const html = renderToStaticMarkup(<Feedback operation={{ ...idle, message: saved, confirmed: confirmedTitle({ action: "PUBLISH" }) }} />);
    expect(html).toContain(`<p class="c-callout c-callout--teal">${saved}</p>`);
    expect(html).not.toContain("b-donemark");
  });
  it("names what each receipt confirms in the existing words", () => {
    expect(confirmedTitle({ action: "APPROVE" })).toBe("Payroll approved");
    expect(confirmedTitle({ action: "PAYMENT_EXPORT" })).toBe("Payment file ready");
    expect(confirmedTitle({ action: "SAVE_SETTINGS" })).toBe("Saved");
  });
  it("an unconfirmed reference, an error or a neutral message never shows the mark", () => {
    for (const operation of [
      { ...idle, message: "No receipt is available yet. Check this same reference again; the action has not been confirmed.", confirmed: null },
      { ...idle, error: "The action response was interrupted. Check its reference.", pending: "op-1" },
      { ...idle, message: "This reference remains unconfirmed.", confirmed: "Payroll approved" },
    ]) expect(renderToStaticMarkup(<Feedback operation={operation} />)).not.toContain("b-donemark");
  });
  it("no toast repeats a result the screen draws inline; a screen without the card keeps its toast", () => {
    const hook = readFileSync(join(__dirname, "use-payroll.ts"), "utf8");
    expect(hook).toContain("if (!inlineResult) toast(confirmedMessage(next, lang));");
    expect(hook).not.toContain("Pay statements shared");
    expect(hook).toContain("if (!inlineResult) toast(t.saved);");
    expect(hook.match(/toast\(/g)).toHaveLength(2);
    // The native pay setup has no Feedback card, so it keeps the toast.
    expect(readFileSync(join(__dirname, "native-payroll-config.tsx"), "utf8")).toContain(":native-profiles`,false)");
    expect(readFileSync(join(__dirname, "native-payroll-config.tsx"), "utf8")).not.toContain("<Feedback");
  });
  it("the celebration gate still refuses payroll actions", () => {
    const memory = { sessionUsed: false, seenKeys: new Set<string>() };
    expect(decideCelebration({ kind: "PAYROLL_APPROVED", key: "run-1", serverConfirmed: true }, memory)).toEqual({ celebrate: false, reason: "not_allowed" });
    expect(decideCelebration({ kind: "SCHEDULE_PUBLISHED", key: "run-1", serverConfirmed: true, area: "payroll-action" }, memory)).toEqual({ celebrate: false, reason: "excluded_area" });
  });
});
