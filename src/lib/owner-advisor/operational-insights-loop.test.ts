import { expect, it } from "vitest";
import { investigate } from "./loop.server";
import { deriveOperationalInsights } from "./operational-insights";
it("exposes strict date-only history reads within the same tool/citation budget and supplies observed data", async () => {
  const insights = deriveOperationalInsights({ shifts: [], entries: [], cards: [], totals: { publishedShiftRecords: 0, effectiveEntryRecords: 0, timecardPeriodRecords: 0 } }, { startDate: "2026-10-05", endDate: "2026-11-01" }, "2026-11-01T12:00:00Z", "America/Puerto_Rico", "a".repeat(64));
  let round = 0;
  const answer = await investigate({ endpoint: "https://provider.invalid/responses", model: "fictional", key: "fictional", dailyLimit: 1 }, [], "", "Investigate history", {
    signal: new AbortController().signal, check: async () => {},
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body));
      const schema = body.tools.find((t: { name: string }) => t.name === "operational_insights");
      expect(schema).toMatchObject({ strict: true, parameters: { additionalProperties: false, required: ["startDate", "endDate"] } });
      expect(Object.keys(schema.parameters.properties).sort()).toEqual(["endDate", "startDate"]);
      if (round++) { expect(JSON.stringify(body.input)).toContain('retainedEffectiveEntryRecords'); return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "No recorded history was found." }] }] }); }
      return Response.json({ output: [{ type: "function_call", call_id: "history", name: "operational_insights", arguments: '{"startDate":"2026-10-05","endDate":"2026-11-01"}' }] });
    },
    tool: async call => ({ observedAt: insights.observedAt, partial: false, sources: call.name === "operational_insights" ? [{ label: "Recorded history", href: "/app/timecards?start=2026-10-05&end=2026-11-01", observedAt: insights.observedAt }] : [], data: call.name === "operational_insights" ? insights : null }),
  });
  expect(answer.sources).toHaveLength(1); expect(round).toBe(2);
});
