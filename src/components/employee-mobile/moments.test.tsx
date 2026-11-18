// Phase 7 (moments): the Employee's results follow the server's reply. "Sent" is not "approved"; a closed request, a
// refusal and an unknown result never borrow the success mark.
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ href, children, prefetch: _prefetch, scroll: _scroll, ...rest }: { href: string; children: React.ReactNode; prefetch?: boolean; scroll?: boolean }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("next/navigation", () => ({ usePathname: () => "/app/exchange", useRouter: () => ({ refresh() {}, push() {}, replace() {} }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/app/app/exchange/actions", () => ({ shiftChangeAction: async () => ({ status: "unavailable" }), reconcileShiftChangeAction: async () => null }));

import { Pickup } from "./requests";
import { CreationView } from "./creation-view";
import type { PickupOperation } from "./pickup-operation";
import type { EmployeeCreationOperation } from "./creation-operation";
import type { ShiftChangeResult } from "@/lib/shift-changes/types";
import type { CreationMode, EmployeeCreationSnapshot } from "@/lib/employee-creation";

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const settled = (status: "completed" | "pending" | "closed"): ShiftChangeResult => ({ status, operationId: "op-1", requestId: "req-1", revision: 2 });
const operation = (result: ShiftChangeResult | null, uncertain = false) => ({ subscribe: () => () => {}, snapshot: () => 0, state: { result, pending: false, uncertain }, requestId: "shift-1", revision: 1 });

describe("pick up an open shift", () => {
  const draw = (result: ShiftChangeResult | null, uncertain = false) => renderToStaticMarkup(<Pickup look="b" part="status" effects={false} operation={operation(result, uncertain) as unknown as PickupOperation} onRefresh={() => {}} />);
  it("completed: the shift is the person's, with the mark and one step to the schedule", () => {
    const html = draw(settled("completed"));
    expect(html).toContain('data-kind="done" data-size="inline"');
    expect(text(html)).toBe("Shift picked up It is on your schedule now. View my schedule");
    expect(html.match(/class="b-btn/g)).toHaveLength(1);
  });
  it("pending: requested, not picked up", () => {
    const html = draw(settled("pending"));
    expect(html).toContain("b-donemark");
    expect(text(html)).toBe("Pickup requested A manager reviews it before the shift is yours. View my requests");
    expect(text(html)).not.toMatch(/picked up|approved|on your schedule/i);
  });
  it.each([
    ["closed", settled("closed")], ["refused", { status: "blocked", issues: [] } as ShiftChangeResult], ["changed", { status: "conflict" } as ShiftChangeResult],
    ["not available", { status: "unavailable" } as ShiftChangeResult], ["not confirmed", { status: "outcome-unknown", operationId: "op-1" } as ShiftChangeResult],
  ])("%s: no success mark", (_name, result) => {
    const html = draw(result, result.status === "outcome-unknown");
    expect(html).not.toContain("b-donemark");
    expect(html).not.toContain('data-kind="done"');
  });
  it("an unknown result keeps its one check and says it is uncertain", () => {
    const html = draw({ status: "outcome-unknown", operationId: "op-1" }, true);
    expect(html).toContain('role="alert"');
    expect(text(html)).toContain("Check pickup status");
  });
});

describe("swap, cover and can't work: the result that replaces the form", () => {
  const read = (mode: CreationMode): EmployeeCreationSnapshot => ({ state: "ready", kind: "creation", authority: "a", observedAt: "2026-11-17T12:00:00Z", validForMs: 60000, timeZone: "America/Puerto_Rico", enabled: true, mode, selection: "s1", source: null, targets: null, partial: false, check: { allowed: true, notice: null }, coverage: { allowed: true, notice: null } } as unknown as EmployeeCreationSnapshot);
  const draw = (mode: CreationMode, result: ShiftChangeResult | null) => renderToStaticMarkup(<CreationView state={{ snapshot: read(mode), refreshing: false, paused: false }} authority="a" mode={mode} sourceId="s1" draft={{ sourceKey: null, targetKey: null, reason: "", note: "" }}
    operation={operation(result) as unknown as EmployeeCreationOperation} onDraft={() => {}} onReview={() => {}} onRefresh={() => {}} onSubmit={() => {}} onRetry={() => {}} />);
  const receipt = (html: string) => text(html.slice(html.indexOf('aria-label="Submission result"'), html.lastIndexOf("</section>")).replace(/^[^>]*>/, ""));
  it.each([
    ["callout", "Report sent Your manager has it. You keep the shift until they decide. View my request Back to my schedule"],
    ["swap", "Swap request sent Your teammate says yes first, then your manager may need to approve. View my request Back to my schedule"],
    ["cover", "Cover offer sent The shift stays yours until someone picks it up and any review is done. View my request Back to my schedule"],
  ] as const)("%s, pending: sent, with who decides next", (mode, words) => {
    const html = draw(mode, settled("pending"));
    expect(receipt(html)).toBe(words);
    expect(html).toContain("b-donemark");
    // The heading takes focus, so the card has no live region of its own.
    expect(html).toMatch(/<div class="b-statecard" data-kind="done" data-size="inline"><span/);
    expect(html).toContain('<h2 class="b-statecard__t" tabindex="-1">');
  });
  it("completed: says the change is made, not that a request was sent", () => {
    const html = draw("swap", settled("completed"));
    expect(receipt(html)).toBe("Shift change made Your schedule shows it now. View my request Back to my schedule");
  });
  it("closed: not a success, amber, no mark", () => {
    const html = draw("cover", settled("closed"));
    expect(html).not.toContain("b-donemark");
    expect(html).toContain('data-kind="paused"');
    expect(receipt(html)).toBe("Request closed Nothing changed on your schedule. Open the request to see why. View my request");
  });
});
