import { expect, it } from "vitest";
import { investigate } from "./loop.server";
import { parseAnswer } from "@/components/owner-advisor/public-response";
import type { ToolCall } from "./contracts";

const observedAt = "2026-10-23T12:00:00Z";
it.each([4, 7])("renders every citation from %i valid period reads within the investigation budget", async reads => {
  let round = 0;
  const answer = await investigate({ endpoint: "https://provider.invalid/responses", model: "fictional", key: "fictional", dailyLimit: 1 }, [], "", "Compare recorded period exceptions", {
    signal: new AbortController().signal,
    check: async () => {},
    fetch: async () => Response.json({ output: round++ === 0 ? Array.from({ length: reads }, (_, i) => ({ type: "function_call", name: "attendance_payroll_review", call_id: `period-${i}`, arguments: JSON.stringify({ startDate: `2026-10-0${i + 1}`, endDate: `2026-10-0${i + 1}`, language: "en" }) })) : [{ type: "message", content: [{ type: "output_text", text: "Review the recorded exceptions; financial readiness remains unverified." }] }] }),
    tool: async (call: ToolCall) => ({ observedAt, partial: false, data: {}, sources: call.name === "attendance_payroll_review" ? [
      { label: "Timecards", href: `/app/timecards?start=${call.args.startDate}&end=${call.args.endDate}`, observedAt },
      { label: "Payroll", href: "/app/payroll", observedAt: `2026-10-23T12:0${call.args.startDate.slice(-1)}:00Z` },
    ] : [{ label: "Today", href: "/app", observedAt }] }),
  });
  expect(answer.sources).toHaveLength(1 + reads * 2);
  expect(parseAnswer({ state: "answered", answer, authority: "owner", observedAt, validForMs: 15000 }).answer.sources).toEqual(answer.sources);
});

it("rejects more citations than the bounded investigation can produce", () => {
  const sources = Array.from({ length: 16 }, (_, i) => ({ label: `Source ${i}`, href: "/app", observedAt }));
  expect(() => parseAnswer({ state: "answered", answer: { text: "Review", sources }, authority: "owner", observedAt, validForMs: 15000 })).toThrow();
});
