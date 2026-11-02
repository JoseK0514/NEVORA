"use client";
import { useState } from "react";
import { SelectField } from "@/components/select-field";
import type { AdvisorCommand } from "@/lib/owner-advisor/contracts";
import type { LegalResearch } from "@/lib/owner-advisor/legal-research";
import type { LegalJurisdiction, LegalTopic } from "@/lib/owner-advisor/legal-sources";
export function LegalControls({ disabled, inspect }: { disabled: boolean; inspect: (tool: Extract<AdvisorCommand, { op: "inspect" }>["tool"]) => void }) {
  const [jurisdiction, setJurisdiction] = useState<LegalJurisdiction | "">("");
  const [topic, setTopic] = useState<LegalTopic>("source_status");
  return <section className="oa-section" aria-labelledby="oa-legal-heading">
    <h2 id="oa-legal-heading">Primary legal sources</h2>
    <p>Inspect public sources without an AI connection. No company or employee facts are sent to these sites. Source retrieval does not establish legal applicability.</p>
    <form onSubmit={e => { e.preventDefault(); if (jurisdiction) inspect({ name: "legal_research", args: { jurisdiction, topic } }); }}>
      <SelectField id="oa-legal-jurisdiction" name="legalJurisdiction" label="Jurisdiction" value={jurisdiction} disabled={disabled} options={[{ value: "", label: "Choose jurisdiction" }, { value: "PR_US", label: "Puerto Rico (with relevant federal sources)" }, { value: "US_FEDERAL", label: "U.S. federal" }]} onChange={e => setJurisdiction(e.target.value as LegalJurisdiction | "")} />
      <SelectField id="oa-legal-topic" name="legalTopic" label="Research topic" value={topic} disabled={disabled} options={[{ value: "source_status", label: "Source status" }, { value: "working_time", label: "Working time" }, { value: "overtime_classification", label: "Overtime classification" }]} onChange={e => setTopic(e.target.value as LegalTopic)} />
      <button className="nv-btn" data-kind="secondary" disabled={disabled || !jurisdiction}>Inspect legal sources</button>
    </form>
  </section>;
}
export function LegalResults({ research }: { research: LegalResearch }) {
  return <section aria-label="Legal source status">
    <h3>Applicability unverified · {research.jurisdiction === "PR_US" ? "Puerto Rico" : "U.S. federal"}</h3>
    <p className="oa-notice">No qualified review is configured. Source availability, company rule approval and Owner assertions do not establish current law or financial readiness. A qualified reviewer must check the exact source version, dates and actual facts.</p>
    <p>Research topic: {research.topic.replaceAll("_", " ")} · Observed <time dateTime={research.observedAt}>{research.observedAt}</time></p>
    <p>Missing confirmed applicability facts: {research.missingFacts.map(f => f.replaceAll("_", " ")).join(", ") || "Qualified review must define the required facts."}</p>
    {research.sources.map(s => <article className="oa-priority-item" key={s.id}>
      <h4><a href={s.url} target="_blank" rel="noreferrer noopener">{s.label}</a></h4>
      <p>Source: {s.id} · {s.jurisdiction} · Version: {s.version}</p>
      <p>Document status: {s.sourceStatus}. Reported subject status: {s.subjectStatus}. Review: {s.reviewState}.</p>
      <p>Fetched: <time dateTime={s.fetchedAt}>{s.fetchedAt}</time> · Effective interval: unknown.</p>
      {s.projection && <p>Selected scope: 541.600 and published 541.601 amendments · May 15, 2026 publication. {s.projection.state === "complete_selected_passages" ? "Complete selected passages; other provisions and later developments are not supplied." : "Topic text unavailable; status and byte identity only."}</p>}
      {s.retrieval === "unavailable" ? <p role="status">Source unavailable ({s.failure?.replaceAll("_", " ")}). No text or verified hash is available. Retry inspection or open the official source.</p> : <p>Text: {s.textAvailability === "status_only" ? "Topic text unavailable — status only" : s.textAvailability === "metadata_only" ? "PDF unread — metadata only" : s.projection ? "Complete selected passages" : s.truncated ? "Truncated extract" : "Lossy HTML extract"}. Retrieval alone is not verification.</p>}
      <ul>{s.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <details><summary>Inspect source identity and extract</summary>
        <p className="oa-plain">SHA-256: {s.hash ?? "unavailable"}</p>
        {s.text !== null && <blockquote className="oa-plain">{s.text}</blockquote>}
      </details>
    </article>)}
    <p>Inspect U.S. federal classification separately when relevant. Nothing here updates scheduling or payroll rules.</p>
  </section>;
}
