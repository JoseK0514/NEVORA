import type { CoverageMinutes, MinuteObligation } from "@/lib/scheduling/coverage-minutes";
import { minutesText } from "@/lib/time-off-staffing/present";
import { percentText } from "./coverage-minutes/coverage-minutes";
import { reviewCopy } from "./review-details/copy";
import { Explain } from "./review-details/explain";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleCopy } from "./schedule-copy";

/* The Schedule grid's coverage, as one line in the grid card's head (review OW-006, Phase 3): "Covered this week",
 * "Staffing 58%", a small bar and "193 h 30 min of 336 h", beside the legend. The same figures as CoverageFigures (the
 * phone band and Home keep that component); an obligation nobody set up is left out instead of a second line. The bar
 * repeats the percentage beside it, so it is hidden from assistive technology. */
export function ScheduleCoverageLine({ coverage, label }: { coverage: CoverageMinutes; label: string }) {
  // Phase 4 (U09): the figure says what it measures (the explanation opens beside it), and with no staffing needs there
  // is no percentage: "No staffing needs set", never 0% or 100%.
  const lang = usePortalLang(), t = reviewCopy(lang), w = scheduleCopy(lang).coverage;
  const explain = <Explain text={t.staffingExplain} label={t.explain} compact />;
  if (coverage.state === "not_configured" || coverage.staffing.percent === null) return <div className="sb-cov" role="group" aria-label={label}>
    <span className="sb-cov__k">{label}</span><span className="sb-cov__none">{t.noNeeds}</span>{explain}
  </div>;
  const rows: [string, MinuteObligation][] = [[w.staffing, coverage.staffing], ...([[w.positions, coverage.positions], [w.lead, coverage.lead]] as [string, MinuteObligation][]).filter(([, value]) => value.required !== 0)];
  return <div className="sb-cov" role="group" aria-label={label}>
    <span className="sb-cov__k">{label}</span>
    {rows.map(([name, value], index) => <span className="sb-cov__i" key={name} data-short={value.percent !== null && value.percent < 100 || undefined}>
      <span className="sb-cov__n">{name} <b className="c-num">{percentText(value)}</b></span>
      {index === 0 && value.percent !== null ? <span className="sb-cov__bar" aria-hidden="true"><i style={{ inlineSize: `${Math.max(0, Math.min(100, value.percent))}%` }} /></span> : null}
      {index === 0 ? <span className="sb-cov__d c-num">{value.required === 0 ? w.nothingRequired : w.of(minutesText(value.covered), minutesText(value.required))}</span> : null}
    </span>)}
    {explain}
  </div>;
}
