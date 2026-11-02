"use client";
import { useState } from "react";
import { SelectField } from "@/components/select-field";
import type { AdvisorAnswer, AdvisorCommand } from "@/lib/owner-advisor/contracts";
import { issueLabel } from "@/lib/owner-advisor/workflow-contracts";
import { LegalResults } from "./legal-panel";
import { CoveragePlanResults } from "./coverage-plans";
type Inspection = Extract<AdvisorCommand, { op: "inspect" }>["tool"];
export function WorkflowControls({ date, disabled, inspect }: { date: string; disabled: boolean; inspect: (tool: Inspection) => void }) {
  const [coverageDate, setCoverageDate] = useState(date);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [language, setLanguage] = useState<"en" | "es">("en");
  return <section className="oa-section" aria-labelledby="oa-workflows">
    <h2 id="oa-workflows">Prepare your next step</h2>
    <p>Use current records to prepare a review. These checks work without an AI connection and do not save business changes.</p>
    <div className="oa-columns">
      <form onSubmit={e => { e.preventDefault(); inspect({ name: "coverage_proposals", args: { date: coverageDate } }); }}>
        <label htmlFor="oa-coverage-date">Coverage date</label>
        <input id="oa-coverage-date" type="date" value={coverageDate} required disabled={disabled} onChange={e => setCoverageDate(e.target.value)} />
        <button className="nv-btn" data-kind="secondary" disabled={disabled}>Prepare coverage options</button>
        <button className="nv-btn" data-kind="secondary" type="button" disabled={disabled} onClick={e => { if (e.currentTarget.form?.reportValidity()) inspect({ name: "coverage_plan", args: { date: coverageDate } }); }}>Compare day plans</button>
      </form>
      <form onSubmit={e => { e.preventDefault(); inspect({ name: "attendance_payroll_review", args: { startDate, endDate, language } }); }}>
        <label htmlFor="oa-period-start">Period start</label><input id="oa-period-start" type="date" value={startDate} required disabled={disabled} onChange={e => setStartDate(e.target.value)} />
        <label htmlFor="oa-period-end">Period end</label><input id="oa-period-end" type="date" value={endDate} min={startDate} required disabled={disabled} onChange={e => setEndDate(e.target.value)} aria-describedby="oa-period-limit" />
        <p id="oa-period-limit" className="oa-muted">Choose 1 to 31 days. Recorded time and payroll readiness are separate reviews.</p>
        <SelectField id="oa-review-language" name="reviewLanguage" label="Review language" options={[{ value: "en", label: "English" }, { value: "es", label: "Español" }]} value={language} disabled={disabled} onChange={e => setLanguage(e.target.value === "es" ? "es" : "en")} />
        <button className="nv-btn" data-kind="secondary" disabled={disabled}>Review attendance and payroll</button>
      </form>
    </div>
  </section>;
}
export function WorkflowResults({ answer, reviewCoverage, lastSavedAt }: { answer: AdvisorAnswer; lastSavedAt?: string | null; reviewCoverage?: (plans: NonNullable<AdvisorAnswer["coveragePlans"]>, index: number) => void }) {
  const p = answer.periodReview, es = p?.language === "es";
  return <>
    {answer.legalResearch && <LegalResults research={answer.legalResearch} />}
    {answer.coveragePlans && <CoveragePlanResults plans={answer.coveragePlans} lastSavedAt={lastSavedAt} review={reviewCoverage ? index => reviewCoverage(answer.coveragePlans!, index) : undefined} />}
    {answer.proposals && <section aria-label="Coverage proposals">
      <h3>Coverage proposals</h3>
      <p>These add one assignment. Existing assignments stay in place; other staffing or position requirements may remain open. Eligibility is checked again on opening and saving. Confirm availability with the person when needed.</p>
      {!answer.proposals.length && <p>No eligible proposal is available from this review. Open the schedule to check requirements and missing inputs.</p>}
      {answer.proposals.map((c, i) => <article key={i} className="oa-priority-item">
        <h4>{c.employeeName} · {c.locationName}</h4>
        <p>{c.date} · {c.startTime}–{c.endTime} · {c.positionName ?? "Staffing"}{c.isDesignatedLead ? " · Designated lead" : ""}</p>
        <p>Eligible under current scheduling rules. Scheduled hours: {c.scheduledHours}; target: {c.targetHours ?? "not set"}.</p>
        <p>{c.publication === "DRAFT" ? "Draft assignment. Publication and employee notifications require a later publishing decision." : "Published schedule. A separate publication and notification consent is required before saving."}</p>
        <a className="nv-btn" data-kind="secondary" href={`/app/schedule/new?review=${encodeURIComponent(c.review)}`}>Review exact replacement</a>
      </article>)}
    </section>}
    {p && <section lang={p.language} aria-label={es ? "Excepciones del período" : "Period exceptions"}>
      <h3>{es ? "Excepciones del período" : "Period exceptions"} · {p.startDate}–{p.endDate}</h3>
      <p className="oa-notice">{es ? "Preparación de nómina sin verificar. Las reglas financieras actuales y los datos deben revisarse en Nómina; una lista sin excepciones no confirma que el pago sea correcto." : "Payroll readiness is unverified. Current financial rules and inputs must be reviewed in Payroll; an empty exception list does not establish correct pay."}</p>
      <p>{es ? "Observado" : "Observed"}: <time dateTime={p.observedAt}>{new Date(p.observedAt).toLocaleString()}</time></p>
      {p.partial && <p>{es ? "La revisión está incompleta o una fuente está desactivada/no disponible." : "This review is incomplete or a source is disabled/unavailable."}</p>}
      <h4>{es ? "Tiempo registrado" : "Recorded time"}</h4>
      {p.attendance.state !== "ready" ? <p>{es ? "Tarjetas de tiempo no disponibles." : "Timecards are unavailable."}</p> : <>
        <p>{es ? "Personas en la fuente" : "People in the source"}: {p.attendance.total}</p>
        {p.attendance.employees.map((c, i) => <article key={i} className="oa-priority-item"><h4>{c.name}</h4>
          <p>{c.locations.join(", ") || (es ? "Sin ubicación registrada en el período" : "No recorded location in the period")} · {c.state} · {es ? "revisión" : "revision"} {c.revision}</p>
          {c.historical && <p>{es ? "Instantánea finalizada e histórica; no confirma que los datos actuales estén completos." : "Historical finalized snapshot; this does not prove current records are complete."}</p>}
          <ul>{c.issues.map(code => <li key={code}>{issueLabel(code, p.language)}</li>)}</ul>
        </article>)}
      </>}
      <h4>{es ? "Corridas de nómina registradas" : "Recorded payroll runs"}</h4>
      {p.payroll.state !== "ready" ? <p>{es ? `Nómina ${p.payroll.state === "disabled" ? "desactivada" : "no disponible"}.` : `Payroll is ${p.payroll.state === "disabled" ? "disabled" : "unavailable"}.`}</p> : !p.payroll.runs.length ? <p>{es ? "No hay una corrida registrada para este período. La preparación sigue sin verificar." : "No recorded run overlaps this period. Readiness remains unverified."}</p> : p.payroll.runs.map(r => <article key={r.id} className="oa-priority-item">
        <p>{r.startDate}–{r.endDate} · {es ? "Estado registrado" : "Recorded status"}: {r.status} · {es ? "revisión" : "revision"} {r.revision}</p>
        <p>{es ? "Revisión de reglas registrada" : "Recorded rule revision"}: {r.ruleRevision ?? (es ? "no disponible" : "unavailable")}</p>
        {r.superseded && <p>{es ? "Existe una corrida de corrección posterior." : "A subsequent correction run exists."}</p>}
        {!r.coverageComplete && <p>{issueLabel("LOCATION_COVERAGE_REQUIRED", p.language)}</p>}
        <ul>{r.codes.map(code => <li key={code}>{issueLabel(code, p.language)}</li>)}</ul>
      </article>)}
      <p>{es ? "Revise las correcciones y la población en Tarjetas de tiempo; las reglas y los bloqueos financieros en Nómina. No se infieren marcajes ni tiempo compensado." : "Review corrections and population in Timecards, and financial rules and blockers in Payroll. No punches or compensated time are inferred."}</p>
    </section>}
  </>;
}
