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
