import { LEGAL_SOURCES, legalSourceIds, type LegalJurisdiction, type LegalTopic, type LegalStatus } from "./legal-sources";
export type LegalArgs = { jurisdiction: LegalJurisdiction; topic: LegalTopic };
export type QualifiedLegalReview = { sourceId: string; sourceVersion: string; hash: string; interpretationVersion: string; jurisdiction: LegalJurisdiction; topic: LegalTopic; reviewer: string; qualification: string; reviewedAt: string; expiresAt: string; effectiveFrom: string; effectiveThrough: string; testVectors: string[]; requirements: { fact: string; value: string }[] };
export type LegalFact = { fact: string; value: string; confirmed: boolean; evidence: string };
export type LegalApplicabilityInput = LegalArgs & { sourceId: string; sourceVersion: string; sourceStatus: LegalStatus; retrieval: "available" | "unavailable"; textAvailability: "extracted" | "metadata_only" | "unavailable" | "status_only"; hash: string | null; interpretationVersion: string; asOf: string; facts: LegalFact[] };
export function legalApplicability(input: LegalApplicabilityInput, reviews: readonly QualifiedLegalReview[]) {
  const review = reviews.find(r => r.sourceId === input.sourceId && r.sourceVersion === input.sourceVersion && r.hash === input.hash && r.interpretationVersion === input.interpretationVersion && r.jurisdiction === input.jurisdiction && r.topic === input.topic);
  const requirements = review?.requirements ?? (LEGAL_SOURCES.find(s => s.id === input.sourceId)?.requiredFacts ?? []).map(fact => ({ fact, value: "" }));
  const missingFacts = requirements.filter(r => { const facts = input.facts.filter(f => f.fact === r.fact); return facts.length !== 1 || !facts.every(f => f.value === r.value && f.confirmed && f.evidence.trim()); }).map(r => r.fact);
  const day = (s: string) => /^20\d\d-\d\d-\d\d$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  const matches = !!review && input.sourceStatus === "unreviewed" && input.retrieval === "available" && input.textAvailability === "extracted" &&
    /^[a-f0-9]{64}$/.test(review.hash) && !!review.reviewer.trim() && !!review.qualification.trim() && review.testVectors.length > 0 && review.requirements.length > 0 &&
    [input.asOf, review.reviewedAt, review.expiresAt, review.effectiveFrom, review.effectiveThrough].every(day) &&
    review.reviewedAt <= input.asOf && input.asOf <= review.expiresAt && review.effectiveFrom <= input.asOf && input.asOf <= review.effectiveThrough && !missingFacts.length;
  return { state: matches ? "reviewed_match" as const : "unverified" as const, financialClearance: false as const, missingFacts, reviewer: review?.reviewer ?? null };
}
/** Grammar check for the fixed publication's selected passages. This validates
 * projection structure, not source authenticity or legal interpretation. */
export function isCompleteGpoSelection(text: string): boolean {
  const markers = ["8. Revise Sec. 541.600 to read as follows:", "Sec. 541.600 Amount of salary required.", "0 9. Amend Sec. 541.601 by revising paragraphs (a) and (b)(1) and (b)(2) to read as follows:", "Sec. 541.601 Highly compensated employees."];
  const at = markers.map(m => text.indexOf(m));
  if (at[0] !== 0 || markers.some((m, i) => at[i] < 0 || text.indexOf(m, at[i] + m.length) !== -1 || i > 0 && at[i] <= at[i - 1]) || !text.endsWith("* * * * *") || text.length > 8000) return false;
  const salary = text.slice(at[1], at[2]), highly = text.slice(at[3]);
  const paragraphs = ["(a)", "(b)", "(c)", "(d)", "(e)"].map(m => salary.indexOf(m));
  return paragraphs.every((p, i) => p >= 0 && (i === 0 || p > paragraphs[i - 1])) && highly.includes("(a)(1)") && highly.includes("(b)(1)") && highly.split("(2)").length === 3;
}
export type LegalProjection = { kind: "gpo_amendment_sections"; publicationDate: "2026-05-15"; sections: ["541.600", "541.601"]; state: "complete_selected_passages" | "status_only"; failure: "boundaries_missing" | "section_limit" | null };
export type LegalSourceResult = {
  id: string; url: string; label: string; jurisdiction: LegalJurisdiction; version: string; sourceStatus: LegalStatus; subjectStatus: LegalStatus;
  fetchedAt: string; hash: string | null; retrieval: "available" | "unavailable"; failure: "timeout" | "byte_limit" | "transport_or_type" | null;
  textAvailability: "extracted" | "metadata_only" | "unavailable" | "status_only"; text: string | null; truncated: boolean; projection: LegalProjection | null;
  effectiveFrom: string | null; effectiveThrough: string | null; reviewState: "unreviewed" | "hash_changed"; reviewer: string | null; limitations: string[]; missingFacts: string[];
};
export type LegalResearch = LegalArgs & { observedAt: string; readiness: "unverified"; financialClearance: false; sources: LegalSourceResult[]; missingFacts: string[] };
export function parseLegalArgs(value: unknown): LegalArgs {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("invalid");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "jurisdiction,topic" || !["PR_US", "US_FEDERAL"].includes(String(v.jurisdiction)) || !["working_time", "overtime_classification", "source_status"].includes(String(v.topic))) throw Error("invalid");
  return v as LegalArgs;
}
/** Validate every link against the exact registered identity, never generic hrefs. */
export function parseLegalResearch(value: unknown): LegalResearch {
  const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
  const strings = (v: unknown, max: number) => Array.isArray(v) && v.length <= max && v.every(x => typeof x === "string" && x.length <= 500);
  const stamp = (v: unknown) => typeof v === "string" && Number.isFinite(Date.parse(v));
  const fail = () => { throw Error("Invalid legal research"); };
  if (!record(value) || Object.keys(value).sort().join(",") !== "financialClearance,jurisdiction,missingFacts,observedAt,readiness,sources,topic") return fail();
  const args = parseLegalArgs({ jurisdiction: value.jurisdiction, topic: value.topic });
  if (!stamp(value.observedAt) || value.readiness !== "unverified" || value.financialClearance !== false || !strings(value.missingFacts, 20) || !Array.isArray(value.sources) || value.sources.length > 3 || !value.sources.length || JSON.stringify(value).length > 24000) return fail();
  const allowed = legalSourceIds(args.jurisdiction, args.topic);
  if (new Set(value.sources.map(s => record(s) ? s.id : null)).size !== value.sources.length) return fail();
  for (const s of value.sources) {
    if (!record(s) || Object.keys(s).sort().join(",") !== "effectiveFrom,effectiveThrough,failure,fetchedAt,hash,id,jurisdiction,label,limitations,missingFacts,projection,retrieval,reviewState,reviewer,sourceStatus,subjectStatus,text,textAvailability,truncated,url,version") return fail();
    const registered = LEGAL_SOURCES.find(r => r.id === s.id);
    if (!registered || !allowed.includes(registered.id) || s.url !== registered.url || s.label !== registered.label || s.jurisdiction !== registered.jurisdiction || s.version !== registered.version || s.sourceStatus !== registered.status || s.subjectStatus !== registered.subjectStatus ||
      !stamp(s.fetchedAt) || !(s.hash === null || typeof s.hash === "string" && /^[a-f0-9]{64}$/.test(s.hash)) || !["available", "unavailable"].includes(String(s.retrieval)) || ![null, "timeout", "byte_limit", "transport_or_type"].includes(s.failure as null) ||
      !["extracted", "metadata_only", "unavailable", "status_only"].includes(String(s.textAvailability)) || !(s.text === null || typeof s.text === "string" && s.text.length <= (s.id === "us-gpo-2026-09839" ? 8000 : 4000)) || typeof s.truncated !== "boolean" || s.effectiveFrom !== null || s.effectiveThrough !== null || !["unreviewed", "hash_changed"].includes(String(s.reviewState)) || s.reviewer !== null || !strings(s.limitations, 8) || !strings(s.missingFacts, 20) || JSON.stringify(s.missingFacts) !== JSON.stringify(registered.requiredFacts)) return fail();
    const gpoAvailable = s.id === "us-gpo-2026-09839" && s.retrieval === "available";
    if (gpoAvailable) {
      const p = s.projection;
      if (!record(p) || Object.keys(p).sort().join(",") !== "failure,kind,publicationDate,sections,state" || p.kind !== "gpo_amendment_sections" || p.publicationDate !== "2026-05-15" || JSON.stringify(p.sections) !== '["541.600","541.601"]' || s.truncated !== false) return fail();
      if (p.state === "complete_selected_passages") {
        if (p.failure !== null || s.textAvailability !== "extracted" || typeof s.text !== "string" || !isCompleteGpoSelection(s.text)) return fail();
      } else if (p.state === "status_only") {
        if (!["boundaries_missing", "section_limit"].includes(String(p.failure)) || s.textAvailability !== "status_only" || s.text !== null) return fail();
      } else return fail();
    } else if (s.projection !== null) return fail();
    if (s.retrieval === "unavailable") {
      if (s.hash !== null || s.text !== null || s.textAvailability !== "unavailable" || s.failure === null) return fail();
    } else {
      if (s.hash === null || s.failure !== null) return fail();
      if (!gpoAvailable && (registered.format === "pdf" ? s.textAvailability !== "metadata_only" || s.text !== null : s.textAvailability !== "extracted" || typeof s.text !== "string")) return fail();
    }
  }
  if (JSON.stringify(value.missingFacts) !== JSON.stringify([...new Set(value.sources.flatMap(s => s.missingFacts))])) return fail();
  return value as LegalResearch;
}
