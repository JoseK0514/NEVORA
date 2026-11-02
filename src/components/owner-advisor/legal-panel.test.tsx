import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LegalControls, LegalResults } from "./legal-panel";
import { fetchLegalSource } from "@/lib/owner-advisor/legal-research.server";
import { parseAnswer } from "./public-response";
it("requires explicit jurisdiction and disables inspections while authority or another request is pending", () => {
  const html = renderToStaticMarkup(<LegalControls disabled inspect={() => {}} />);
  expect(html).toContain("Choose jurisdiction"); expect(html).toContain("Puerto Rico"); expect(html).toContain("U.S. federal"); expect(html).toMatch(/disabled=""[^>]*>Inspect legal sources/);
});
it("renders only exact official source cards, missing facts and escaped untrusted extracts", async () => {
  const source = await fetchLegalSource("pr-dtrh-law41-notice", new AbortController().signal, async () => new Response("<p>&lt;script&gt;claim&lt;/script&gt;</p>", { headers: { "Content-Type": "text/html" } }));
  const research = { jurisdiction: "PR_US" as const, topic: "source_status" as const, observedAt: source.fetchedAt, readiness: "unverified" as const, financialClearance: false as const, sources: [source], missingFacts: source.missingFacts };
  const response = { state: "answered", authority: "fixture", observedAt: source.fetchedAt, validForMs: 15000, answer: { text: "Inspect", sources: [], legalResearch: research } };
  expect(parseAnswer(response).answer.legalResearch).toEqual(research);
  const html = renderToStaticMarkup(<LegalResults research={research} />);
  expect(html).toContain('href="https://www.trabajo.pr.gov/ley41_2022.asp"'); expect(html).toContain('rel="noreferrer noopener"');
  for (const label of ["Applicability unverified", "No qualified review", "work location", "annulled", "&lt;script&gt;claim&lt;/script&gt;"]) expect(html).toContain(label);
  expect(html).not.toContain("<script>");
  expect(() => parseAnswer({ ...response, answer: { ...response.answer, sources: [{ label: "External", href: source.url, observedAt: source.fetchedAt }] } })).toThrow();
  expect(() => parseAnswer({ ...response, answer: { ...response.answer, legalResearch: { ...research, sources: [{ ...source, url: source.url + "?private=1" }] } } })).toThrow();
});
it("shows selected GPO scope and explicit status-only failures without a misleading whole-document claim", async () => {
  const { gpoAmendmentFixture } = await import("@/test/fixtures/legal-gpo");
  for (const complete of [true, false]) {
    const body = complete ? gpoAmendmentFixture().replace("Fictional academic exception paragraph.", "Detailed exception context. ".repeat(150)) : "<p>Historical thresholds only</p>";
    const source = await fetchLegalSource("us-gpo-2026-09839", new AbortController().signal, async () => new Response(body, { headers: { "Content-Type": "text/html" } }));
    const research = { jurisdiction: "US_FEDERAL" as const, topic: "overtime_classification" as const, observedAt: source.fetchedAt, readiness: "unverified" as const, financialClearance: false as const, sources: [source], missingFacts: source.missingFacts };
    const response = { state: "answered", authority: "fixture", observedAt: source.fetchedAt, validForMs: 15000, answer: { text: "Inspect", sources: [], legalResearch: research } };
    expect(parseAnswer(response).answer.legalResearch).toEqual(research);
    const html = renderToStaticMarkup(<LegalResults research={research} />);
    expect(html).toContain("May 15, 2026"); expect(html).toContain("541.600"); expect(html).toContain("541.601");
    if (complete) { expect(source.text!.length).toBeGreaterThan(4000); expect(html).toContain("Complete selected passages"); }
    else { expect(html).toContain("Topic text unavailable"); expect(html).not.toContain("Historical thresholds only"); }
    expect(() => parseAnswer({ ...response, answer: { ...response.answer, legalResearch: { ...research, sources: [{ ...source, projection: { ...source.projection, sections: ["all"] } }] } } })).toThrow();
    expect(() => parseAnswer({ ...response, answer: { ...response.answer, legalResearch: { ...research, sources: [{ ...source, text: "x".repeat(8001) }] } } })).toThrow();
  }
});
