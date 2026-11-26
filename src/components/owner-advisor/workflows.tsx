"use client";
import { useState } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpField, CorpSection } from "@/components/corp/corp";
import { BCallout, BSegs } from "@/components/owner-b/b-kit";
import type { AdvisorAnswer, AdvisorCommand } from "@/lib/owner-advisor/contracts";
import { CoveragePlanResults } from "./coverage-plans";
import { clockRange, dayText, periodText, whenText, type Clock, type Lang } from "./format";
import { useAdvisorLang } from "./lang";
import { ADVISOR_COPY } from "./advisor-messages";
type Inspection = Extract<AdvisorCommand, { op: "inspect" }>["tool"];

/** A kit date field that reads "Wed, Nov 18" (the payroll date field's pattern). The native date input lies invisibly over
 * it, so it keeps its label, value, limits, validation and the system picker; only the numeric format is not shown. */
export function DateField({ id, label, value, onChange, min, required, disabled, describedBy, year, lang: langProp }: {
  id: string; label: string; value: string; onChange: (value: string) => void; min?: string; required?: boolean; disabled?: boolean; describedBy?: string; year?: string; lang?: Lang;
}) {
  const hookLang = useAdvisorLang();
  const lang = langProp ?? hookLang;
  return <div className="c-field">
    <label className="c-field__label" htmlFor={id}>{label}</label>
    <span className="c-in oa-date" data-empty={value ? undefined : ""} data-disabled={disabled ? "" : undefined}>
      <span className="oa-date__v" aria-hidden="true">{value ? dayText(value, lang, year) : ADVISOR_COPY[lang].workflows.chooseDate}</span>
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
export function WorkflowControls({ date, disabled, inspect, weeklyEnabled, lang: langProp }: { weeklyEnabled?: boolean; date: string; disabled: boolean; inspect: (tool: Inspection) => void; lang?: Lang }) {
  const hookLang = useAdvisorLang();
  const lang = langProp ?? hookLang;
  const t = ADVISOR_COPY[lang].workflows;
  const [coverageDate, setCoverageDate] = useState(date);
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState(date);
  // The review's own language starts as the person's; they can still choose the other.
  const [language, setLanguage] = useState<"en" | "es">(lang);
  const year = date.slice(0, 4);
  return <CorpSection id="oa-workflows" label={t.label}>
    <CorpCard as="div"><CorpBody>
      <p className="oa-lede">{t.lede}</p>
      {weeklyEnabled && <p className="oa-acts oa-weekly-link"><CorpButtonLink href="/app/ai-manager/weekly" kind="secondary" size="md">{t.weekly}</CorpButtonLink></p>}
      <div className="oa-checks">
        <form className="oa-check" aria-labelledby="oa-check-coverage" onSubmit={e => { e.preventDefault(); inspect({ name: "coverage_proposals", args: { date: coverageDate } }); }}>
          <h3 className="oa-sub" id="oa-check-coverage">{t.coverageTitle}</h3>
          <div className="oa-fields">
            <DateField id="oa-coverage-date" label={t.coverageDate} value={coverageDate} required disabled={disabled} onChange={setCoverageDate} year={year} lang={lang} />
          </div>
          <div className="oa-acts">
            <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled}>{t.prepareOptions}</CorpButton>
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={e => { if (e.currentTarget.form?.reportValidity()) inspect({ name: "coverage_plan", args: { date: coverageDate } }); }}>{t.compare}</CorpButton>
          </div>
        </form>
        <form className="oa-check" aria-labelledby="oa-check-period" onSubmit={e => { e.preventDefault(); inspect({ name: "attendance_payroll_review", args: { startDate, endDate, language } }); }}>
          <h3 className="oa-sub" id="oa-check-period">{t.periodTitle}</h3>
          <div className="oa-fields">
            <DateField id="oa-period-start" label={t.periodStart} value={startDate} required disabled={disabled} onChange={setStartDate} year={year} lang={lang} />
            <DateField id="oa-period-end" label={t.periodEnd} value={endDate} min={startDate} required disabled={disabled} onChange={setEndDate} describedBy="oa-period-limit" year={year} lang={lang} />
            <CorpField label={t.reviewLanguage} htmlFor="oa-review-language">
              <select className="c-in" id="oa-review-language" name="reviewLanguage" value={language} disabled={disabled} onChange={e => setLanguage(e.target.value === "es" ? "es" : "en")}>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </CorpField>
          </div>
          <p id="oa-period-limit" className="c-field__help oa-help">{t.periodHelp}</p>
          <div className="oa-acts">
            <CorpButton type="submit" kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled}>{t.reviewPeriod}</CorpButton>
          </div>
        </form>
      </div>
    </CorpBody></CorpCard>
  </CorpSection>;
}

/* What a check found, inside the answer. Words, figures and links are the server's; dates, times and zones read as people
 * say them. The Spanish period review keeps its own language throughout. */
export function WorkflowResults({ answer, reviewCoverage, lastSavedAt, clock = {}, lang: langProp }: { answer: AdvisorAnswer; lastSavedAt?: string | null; reviewCoverage?: (plans: NonNullable<AdvisorAnswer["coveragePlans"]>, index: number) => void; clock?: Clock; lang?: Lang }) {
  const hookLang = useAdvisorLang();
  const personLang = langProp ?? hookLang, t = ADVISOR_COPY[personLang].workflows;
  // The period review speaks its own language (chosen in "Review language"), whatever the person's.
  const p = answer.periodReview, lang: Lang = p?.language === "es" ? "es" : "en", r = ADVISOR_COPY[lang].period;
  const year = clock.today?.slice(0, 4);
  return <>
    {answer.coveragePlans && <CoveragePlanResults plans={answer.coveragePlans} lastSavedAt={lastSavedAt} review={reviewCoverage ? index => reviewCoverage(answer.coveragePlans!, index) : undefined} />}
    {answer.proposals && <section className="oa-result" aria-label={t.proposals}>
      <h3 className="oa-sub">{t.proposals}</h3>
      <p className="oa-para">{t.proposalsIntro}</p>
      {!answer.proposals.length && <p className="oa-para">{t.noProposal}</p>}
      {answer.proposals.map((c, i) => <article key={i} className="oa-block">
        <h4 className="oa-block__t"><BSegs parts={[c.employeeName, c.locationName]} /></h4>
        <p className="oa-facts"><BSegs parts={[dayText(c.date, personLang, year), clockRange(c.startTime, c.endTime, personLang), c.positionName ?? t.staffing, c.isDesignatedLead ? t.shiftLead : null]} /></p>
        <p className="oa-para">{t.eligible(c.scheduledHours, c.targetHours)}</p>
        <p className="oa-para">{c.publication === "DRAFT" ? t.draft : t.published}</p>
        <div className="oa-acts"><CorpButtonLink native href={`/app/schedule/new?review=${encodeURIComponent(c.review)}`} kind="secondary" size="md" className="b-rowact b-rowact--go">{t.reviewReplacement}</CorpButtonLink></div>
      </article>)}
    </section>}
    {p && <section lang={p.language} className="oa-result" aria-label={r.title}>
      <h3 className="oa-sub"><BSegs parts={[r.title, periodText(p.startDate, p.endDate, lang, year)]} /></h3>
      <BCallout tone="amber">{r.unverified}</BCallout>
      <p className="oa-facts">{r.observed} <time dateTime={p.observedAt}>{whenText(p.observedAt, clock.timeZone, clock.today, lang)}</time></p>
      {p.partial && <p className="oa-para">{r.partial}</p>}
      <h4 className="oa-sub oa-sub--minor">{r.recordedTime}</h4>
      {p.attendance.state !== "ready" ? <p className="oa-para">{r.timecardsUnavailable}</p> : <>
        <p className="oa-para">{r.people}: {p.attendance.total}</p>
        {p.attendance.employees.map((c, i) => <article key={i} className="oa-block"><h4 className="oa-block__t">{c.name}</h4>
          <p className="oa-facts"><BSegs parts={[c.locations.join(", ") || r.noLocation, r.state(c.state), `${r.revision} ${c.revision}`]} /></p>
          {c.historical && <p className="oa-para">{r.historical}</p>}
          <ul className="oa-bullets">{c.issues.map(code => <li key={code}>{r.issue(code)}</li>)}</ul>
        </article>)}
      </>}
      <h4 className="oa-sub oa-sub--minor">{r.runs}</h4>
      {p.payroll.state !== "ready" ? <p className="oa-para">{r.payrollState(p.payroll.state === "disabled")}</p> : !p.payroll.runs.length ? <p className="oa-para">{r.noRun}</p> : p.payroll.runs.map(run => <article key={run.id} className="oa-block">
        <p className="oa-facts"><BSegs parts={[periodText(run.startDate, run.endDate, lang, year), `${r.status}: ${r.state(run.status)}`, `${r.revision} ${run.revision}`]} /></p>
        <p className="oa-para">{r.ruleRevision}: {run.ruleRevision ?? r.unavailable}</p>
        {run.superseded && <p className="oa-para">{r.superseded}</p>}
        {!run.coverageComplete && <p className="oa-para">{r.issue("LOCATION_COVERAGE_REQUIRED")}</p>}
        <ul className="oa-bullets">{run.codes.map(code => <li key={code}>{r.issue(code)}</li>)}</ul>
      </article>)}
      <p className="oa-para oa-para--quiet">{r.footer}</p>
    </section>}
  </>;
}
