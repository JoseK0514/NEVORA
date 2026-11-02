import { gpoAmendmentFixture } from "@/test/fixtures/legal-gpo";
import { expect, it } from "vitest";
import { investigate } from "./loop.server";
import { fetchLegalSource } from "./legal-research.server";
import { parseAnswer } from "@/components/owner-advisor/public-response";
it("preserves typed legal cards through the bounded tool loop without expanding generic citations", async () => {
  const source = await fetchLegalSource("us-gpo-2026-09839", new AbortController().signal, async () => new Response(gpoAmendmentFixture(), { headers: { "Content-Type": "text/html" } }));
  const research = { jurisdiction: "US_FEDERAL" as const, topic: "source_status" as const, observedAt: source.fetchedAt, readiness: "unverified" as const, financialClearance: false as const, sources: [source], missingFacts: source.missingFacts };
  let round = 0;
  const answer = await investigate({ endpoint: "https://provider.invalid/responses", model: "fictional", key: "fictional", dailyLimit: 1 }, [], "", "Inspect federal source status", {
    signal: new AbortController().signal, check: async () => {},
    fetch: async (_url, init) => {
      const body = JSON.parse(String(init.body)); const schema = body.tools.find((t: any) => t.name === "legal_research");
      expect(schema.parameters).toMatchObject({ additionalProperties: false, required: ["jurisdiction", "topic"] });
      if (round++) { expect(JSON.stringify(body.input)).toContain("Fictional territorial wording"); return Response.json({ output: [{ type: "message", content: [{ type: "output_text", text: "Source available; applicability unverified." }] }] }); }
      return Response.json({ output: [{ type: "function_call", call_id: "legal1", name: "legal_research", arguments: '{"jurisdiction":"US_FEDERAL","topic":"source_status"}' }] });
    },
    tool: async call => ({ observedAt: source.fetchedAt, partial: true, sources: [], data: null, ...(call.name === "legal_research" ? { legalResearch: research } : {}) }),
  });
  expect(answer.legalResearch).toEqual(research); expect(answer.sources).toEqual([]);
  expect(parseAnswer({ state: "answered", answer, authority: "fixture", observedAt: source.fetchedAt, validForMs: 15000 }).answer.legalResearch).toEqual(research);
});
