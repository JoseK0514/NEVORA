"use client";
import { useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpField, CorpSection } from "@/components/corp/corp";
import { BCallout, BSegs } from "@/components/owner-b/b-kit";
import type { AdvisorAnswer, AdvisorCommand } from "@/lib/owner-advisor/contracts";
import { issueLabel } from "@/lib/owner-advisor/workflow-contracts";
import { CoveragePlanResults } from "./coverage-plans";
import { clockRange, dayText, periodText, stateText, whenText, type Clock } from "./format";
type Inspection = Extract<AdvisorCommand, { op: "inspect" }>["tool"];

/** A kit date field that reads "Wed, Nov 18" (the payroll date field's pattern). The native date input lies invisibly over
 * it, so it keeps its label, value, limits, validation and the system picker; only the numeric format is not shown. */
export function DateField({ id, label, value, onChange, min, required, disabled, describedBy, year }: {
  id: string; label: string; value: string; onChange: (value: string) => void; min?: string; required?: boolean; disabled?: boolean; describedBy?: string; year?: string;
}) {
  return <div className="c-field">
    <label className="c-field__label" htmlFor={id}>{label}</label>
    <span className="c-in oa-date" data-empty={value ? undefined : ""} data-disabled={disabled ? "" : undefined}>
      <span className="oa-date__v" aria-hidden="true">{value ? dayText(value, "en", year) : "Choose a date"}</span>
      <CalendarBlankIcon weight="bold" className="oa-date__ic" aria-hidden="true" />
      <input id={id} type="date" value={value} min={min} required={required} disabled={disabled} aria-describedby={describedBy}
        onChange={e => onChange(e.target.value)}
        onClick={e => { try { e.currentTarget.showPicker?.(); } catch { /* Focus is enough where a picker can't open. */ } }} />
    </span>
  </div>;
}

/* Prepare your next step: two checks that read current records and work without an AI connection. Each is its own small
 * form (the same fields, names, limits and commands as before): its fields on one line when the card is wide enough,
 * then its buttons. */
export function WorkflowControls({ date, disabled, inspect, weeklyEnabled }: { weeklyEnabled?: boolean; date: string; disabled: boolean; inspect: (tool: Inspection) => void }) {
  const [coverageDate, setCoverageDate] = useState(date);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  const [language, setLanguage] = useState<"en" | "es">("en");
  const year = date.slice(0, 4);
  return <CorpSection id="oa-workflows" label="Prepare your next step">
    <CorpCard as="div"><CorpBody>
      <p className="oa-lede">Use current records to prepare a review.</p>
      {weeklyEnabled && <p className="oa-acts oa-weekly-link"><CorpButtonLink href="/app/ai-manager/weekly" kind="secondary" size="md">Where are we short this week?</CorpButtonLink></p>}
      <div className="oa-checks">
        <form className="oa-check" aria-labelledby="oa-check-coverage" onSubmit={e => { e.preventDefault(); inspect({ name: "coverage_proposals", args: { date: coverageDate } }); }}>
          <h3 className="oa-sub" id="oa-check-coverage">Coverage on a date</h3>
          <div className="oa-fields">
            <DateField id="oa-coverage-date" label="Coverage date" value={coverageDate} required disabled={disabled} onChange={setCoverageDate} year={year} />
          </div>
          <div className="oa-acts">
            <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled}>Prepare coverage options</CorpButton>
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={e => { if (e.currentTarget.form?.reportValidity()) inspect({ name: "coverage_plan", args: { date: coverageDate } }); }}>Compare day plans</CorpButton>
          </div>
        </form>
        <form className="oa-check" aria-labelledby="oa-check-period" onSubmit={e => { e.preventDefault(); inspect({ name: "attendance_payroll_review", args: { startDate, endDate, language } }); }}>
          <h3 className="oa-sub" id="oa-check-period">Attendance and payroll period</h3>
          <div className="oa-fields">
            <DateField id="oa-period-start" label="Period start" value={startDate} required disabled={disabled} onChange={setStartDate} year={year} />
            <DateField id="oa-period-end" label="Period end" value={endDate} min={startDate} required disabled={disabled} onChange={setEndDate} describedBy="oa-period-limit" year={year} />
            <CorpField label="Review language" htmlFor="oa-review-language">
              <select className="c-in" id="oa-review-language" name="reviewLanguage" value={language} disabled={disabled} onChange={e => setLanguage(e.target.value === "es" ? "es" : "en")}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </CorpField>
          </div>
          <p id="oa-period-limit" className="c-field__help oa-help">Choose 1 to 31 days. Recorded time and payroll readiness are separate reviews.</p>
          <div className="oa-acts">
            <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled}>Review attendance and payroll</CorpButton>
          </div>
        </form>
      </div>
    </CorpBody></CorpCard>
  </CorpSection>;
}

/* What a check found, inside the answer. Words, figures and links are the server's; dates, times and zones read as people
 * say them. The Spanish period review keeps its own language throughout. */
export function WorkflowResults({ answer, reviewCoverage, lastSavedAt, clock = {} }: { answer: AdvisorAnswer; lastSavedAt?: string | null; reviewCoverage?: (plans: NonNullable<AdvisorAnswer["coveragePlans"]>, index: number) => void; clock?: Clock }) {
  const p = answer.periodReview, es = p?.language === "es", lang = es ? "es" : "en";
  const year = clock.today?.slice(0, 4);
  return <>
    {answer.coveragePlans && <CoveragePlanResults plans={answer.coveragePlans} lastSavedAt={lastSavedAt} review={reviewCoverage ? index => reviewCoverage(answer.coveragePlans!, index) : undefined} />}
    {answer.proposals && <section className="oa-result" aria-label="Coverage proposals">
      <h3 className="oa-sub">Coverage proposals</h3>
      <p className="oa-para">These add one assignment. Existing assignments stay in place; other staffing or position requirements may remain open. Eligibility is checked again on opening and saving. Confirm availability with the person when needed.</p>
      {!answer.proposals.length && <p className="oa-para">No eligible proposal is available from this review. Open the schedule to check requirements and missing inputs.</p>}
      {answer.proposals.map((c, i) => <article key={i} className="oa-block">
        <h4 className="oa-block__t"><BSegs parts={[c.employeeName, c.locationName]} /></h4>
        <p className="oa-facts"><BSegs parts={[dayText(c.date, "en", year), clockRange(c.startTime, c.endTime), c.positionName ?? "Staffing", c.isDesignatedLead ? "Shift lead" : null]} /></p>
        <p className="oa-para">Eligible under current scheduling rules. Scheduled hours: {c.scheduledHours}; target: {c.targetHours ?? "not set"}.</p>
        <p className="oa-para">{c.publication === "DRAFT" ? "Draft assignment. Publication and employee notifications require a later publishing decision." : "Published schedule. A separate publication and notification consent is required before saving."}</p>
        <div className="oa-acts"><CorpButtonLink native href={`/app/schedule/new?review=${encodeURIComponent(c.review)}`} kind="secondary" size="md" className="b-rowact b-rowact--go">Review exact replacement</CorpButtonLink></div>
      </article>)}
    </section>}
    {p && <section lang={p.language} className="oa-result" aria-label={es ? "Excepciones del período" : "Period exceptions"}>
      <h3 className="oa-sub"><BSegs parts={[es ? "Excepciones del período" : "Period exceptions", periodText(p.startDate, p.endDate, lang, year)]} /></h3>
      <BCallout tone="amber">{es ? "Preparación de nómina sin verificar. Las reglas financieras actuales y los datos deben revisarse en Nómina; una lista sin excepciones no confirma que el pago sea correcto." : "Payroll readiness is unverified. Current financial rules and inputs must be reviewed in Payroll; an empty exception list does not establish correct pay."}</BCallout>
      <p className="oa-facts">{es ? "Observado" : "Observed"} <time dateTime={p.observedAt}>{whenText(p.observedAt, clock.timeZone, clock.today, lang)}</time></p>
      {p.partial && <p className="oa-para">{es ? "La revisión está incompleta o una fuente está desactivada/no disponible." : "This review is incomplete or a source is disabled/unavailable."}</p>}
      <h4 className="oa-sub oa-sub--minor">{es ? "Tiempo registrado" : "Recorded time"}</h4>
      {p.attendance.state !== "ready" ? <p className="oa-para">{es ? "Tarjetas de tiempo no disponibles." : "Timecards are unavailable."}</p> : <>
        <p className="oa-para">{es ? "Personas en la fuente" : "People in the source"}: {p.attendance.total}</p>
        {p.attendance.employees.map((c, i) => <article key={i} className="oa-block"><h4 className="oa-block__t">{c.name}</h4>
          <p className="oa-facts"><BSegs parts={[c.locations.join(", ") || (es ? "Sin ubicación registrada en el período" : "No recorded location in the period"), stateText(c.state, lang), `${es ? "revisión" : "revision"} ${c.revision}`]} /></p>
          {c.historical && <p className="oa-para">{es ? "Instantánea finalizada e histórica; no confirma que los datos actuales estén completos." : "Historical finalized snapshot; this does not prove current records are complete."}</p>}
          <ul className="oa-bullets">{c.issues.map(code => <li key={code}>{issueLabel(code, p.language)}</li>)}</ul>
        </article>)}
      </>}
      <h4 className="oa-sub oa-sub--minor">{es ? "Corridas de nómina registradas" : "Recorded payroll runs"}</h4>
      {p.payroll.state !== "ready" ? <p className="oa-para">{es ? `Nómina ${p.payroll.state === "disabled" ? "desactivada" : "no disponible"}.` : `Payroll is ${p.payroll.state === "disabled" ? "disabled" : "unavailable"}.`}</p> : !p.payroll.runs.length ? <p className="oa-para">{es ? "No hay una corrida registrada para este período. La preparación sigue sin verificar." : "No recorded run overlaps this period. Readiness remains unverified."}</p> : p.payroll.runs.map(r => <article key={r.id} className="oa-block">
        <p className="oa-facts"><BSegs parts={[periodText(r.startDate, r.endDate, lang, year), `${es ? "Estado registrado" : "Recorded status"}: ${stateText(r.status, lang)}`, `${es ? "revisión" : "revision"} ${r.revision}`]} /></p>
        <p className="oa-para">{es ? "Revisión de reglas registrada" : "Recorded rule revision"}: {r.ruleRevision ?? (es ? "no disponible" : "unavailable")}</p>
        {r.superseded && <p className="oa-para">{es ? "Existe una corrida de corrección posterior." : "A subsequent correction run exists."}</p>}
        {!r.coverageComplete && <p className="oa-para">{issueLabel("LOCATION_COVERAGE_REQUIRED", p.language)}</p>}
        <ul className="oa-bullets">{r.codes.map(code => <li key={code}>{issueLabel(code, p.language)}</li>)}</ul>
      </article>)}
      <p className="oa-para oa-para--quiet">{es ? "Revise las correcciones y la población en Tarjetas de tiempo; las reglas y los bloqueos financieros en Nómina. No se infieren marcajes ni tiempo compensado." : "Review corrections and population in Timecards, and financial rules and blockers in Payroll. No punches or compensated time are inferred."}</p>
    </section>}
  </>;
}
