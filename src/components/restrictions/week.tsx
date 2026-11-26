"use client";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/ssr/CopySimple";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { BChip, BFilters } from "@/components/owner-b/b-kit";
import { DAY_MINUTES, DAY_ORDER, carriedInto, nextDay, previousDay, rangeOccupancy, type DayPlan, type PlanProblem, type Span, type WeekPlan } from "@/lib/scheduling/restrictions-week";
import { clockText, spanText, type RestrictionsCopy } from "./copy";

/* Scheduling restrictions (U02): the agreement as a week, and the editor for it. Presentation only. Both show the times a
 * person can work, Monday first; an overnight range is drawn on the two days it occupies. */

const percent = (minutes: number) => `${(minutes / DAY_MINUTES) * 100}%`;
const fullDay = (spans: Span[]) => spans.length === 1 && spans[0].start === 0 && spans[0].end === DAY_MINUTES;

/** Seven rows: the day, its times in words, and the same times on a 24-hour track (decoration; the words carry it). */
/** `before`: the agreement this is compared with; a changed day then says what it is now. `only`: just the changed days. */
export function WeekView({ allowed, changed, t, label, before: baseline, only }: { allowed: Span[][]; changed?: readonly number[]; t: RestrictionsCopy; label: string; before?: Span[][]; only?: boolean }) {
  const words = (spans: Span[]) => fullDay(spans) ? t.anyTime : spans.length === 0 ? t.notThisDay : spans.map(span => spanText(span, t)).join(", ");
  return <ul className="rs-week" aria-label={label}>{DAY_ORDER.filter(day => !only || changed?.includes(day)).map(day => {
    const spans = allowed[day] ?? [], any = fullDay(spans), none = spans.length === 0;
    const after = allowed[nextDay(day)] ?? [], before = allowed[previousDay(day)] ?? [];
    const into = (span: Span) => span.end === DAY_MINUTES && span.start > 0 && after[0]?.start === 0 && after[0].end < DAY_MINUTES;
    const from = (span: Span) => span.start === 0 && span.end < DAY_MINUTES && before.at(-1)?.end === DAY_MINUTES && (before.at(-1)?.start ?? 0) > 0;
    return <li key={day} className="rs-week__d" data-state={any ? "any" : none ? "none" : "set"}>
      <span className="rs-week__n">{t.days[day]}</span>
      <span className="rs-week__tx">
        {changed?.includes(day) ? <BChip tone="teal">{t.changed}</BChip> : null}
        <span className="rs-week__sps">
          {any ? <span className="rs-week__any">{t.anyTime}</span> : none ? <span className="rs-week__none">{t.notThisDay}</span>
            : spans.map((span, index) => <span key={index} className="rs-week__sp">{spanText(span, t)}{into(span) ? <small>{t.intoNext(t.days[nextDay(day)])}</small> : from(span) ? <small>{t.fromPrevious(t.days[previousDay(day)])}</small> : null}</span>)}
          {baseline && changed?.includes(day) ? <small className="rs-week__was">{t.nowIs(words(baseline[day] ?? []))}</small> : null}
        </span>
      </span>
      <span className="rs-bar" aria-hidden="true">{spans.map((span, index) => <i key={index} style={{ left: percent(span.start), width: percent(span.end - span.start) } as CSSProperties} />)}</span>
    </li>;
  })}</ul>;
}

const DEFAULT_RANGE = { start: "09:00", end: "17:00" };
const minutesOf = (clock: string) => { const [h, m] = clock.split(":").map(Number); return h * 60 + m; };

/** The week editor: each day is All day, Set times or Not this day; Set times holds one or more ranges, and a range that
 * ends at or before its start ends the next day. A day can be copied to others. `problems` are shown under their range. */
export function WeekEditor({ plan, onChange, t, problems }: { plan: WeekPlan; onChange: (plan: WeekPlan) => void; t: RestrictionsCopy; problems: PlanProblem[] }) {
  const base = useId().replace(/:/g, "");
  const [copying, setCopying] = useState<{ day: number; to: number[] } | null>(null);
  const [said, setSaid] = useState("");
  // Where focus goes after the next render: a new range's first field, a day's "Add" after a removal, a copy button.
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    if (!focusNext.current) return;
    document.getElementById(focusNext.current)?.focus();
    focusNext.current = null;
  });
  const setDay = (day: number, entry: DayPlan) => onChange({ ...plan, [day]: entry });
  const setMode = (day: number, mode: DayPlan["mode"]) => {
    const current = plan[day];
    if (mode === "ranges") setDay(day, { mode, ranges: current?.mode === "ranges" && current.ranges.length ? current.ranges : [{ ...DEFAULT_RANGE }] });
    else setDay(day, { mode });
  };
  return <div className="rs-ed">
    {DAY_ORDER.map(day => {
      const entry = plan[day] ?? { mode: "any" as const }, name = t.days[day], carried = carriedInto(plan, day);
      const dayProblems = problems.filter(problem => problem.day === day);
      return <div key={day} className="rs-ed__d" role="group" aria-labelledby={`${base}-n-${day}`}>
        <span className="rs-ed__n" id={`${base}-n-${day}`}>{name}</span>
        <BFilters label={t.modeLabel(name)} items={[
          { key: "any", label: t.modeAny, current: entry.mode === "any", onSelect: () => setMode(day, "any") },
          { key: "ranges", label: t.modeRanges, current: entry.mode === "ranges", onSelect: () => setMode(day, "ranges") },
          { key: "none", label: t.modeNone, current: entry.mode === "none", onSelect: () => setMode(day, "none") },
        ]} />
        {carried && entry.mode !== "any" ? <p className="rs-ed__carried">{t.carried(t.days[previousDay(day)], clockText(carried.end, t))}</p> : null}
        {entry.mode === "ranges" ? <div className="rs-ed__ranges">
          {entry.ranges.map((range, index) => {
            const problem = dayProblems.find(item => item.index === index), errorId = `${base}-e-${day}-${index}`;
            const next = rangeOccupancy(range)?.next ?? null;
            const update = (patch: Partial<typeof range>) => setDay(day, { mode: "ranges", ranges: entry.ranges.map((item, at) => at === index ? { ...item, ...patch } : item) });
            return <div key={index} className="rs-ed__r">
              <div className="rs-ed__row">
                <label className="rs-ed__f"><span>{t.from}</span>
                  <input id={`${base}-s-${day}-${index}`} className="c-in rs-in" type="time" step={300} value={range.start} aria-label={t.fromLabel(name, index + 1)} aria-invalid={problem ? true : undefined} aria-describedby={problem ? errorId : undefined}
                    onChange={event => update({ start: event.target.value })} /></label>
                <label className="rs-ed__f"><span>{t.to}</span>
                  <input className="c-in rs-in" type="time" step={300} value={range.end} aria-label={t.toLabel(name, index + 1)} aria-invalid={problem ? true : undefined} aria-describedby={problem ? errorId : undefined}
                    onChange={event => update({ end: event.target.value })} /></label>
                <button type="button" className="rs-ed__x" aria-label={t.removeLabel(name, index + 1)} onClick={() => {
                  const ranges = entry.ranges.filter((_, at) => at !== index);
                  focusNext.current = `${base}-add-${day}`;
                  setDay(day, { mode: "ranges", ranges });
                }}><XIcon size={18} weight="bold" aria-hidden="true" /></button>
              </div>
              {problem ? <p className="rs-err" id={errorId} role="alert"><WarningCircleIcon size={16} weight="bold" aria-hidden="true" />{problem.kind === "missing" ? t.problemMissing : t.problemSame}</p>
                : next ? <p className="rs-ed__hint">{t.endsNext(t.days[nextDay(day)], clockText(next.end, t))}</p> : null}
            </div>;
          })}
        </div> : null}
        {copying?.day === day ? null : <div className="rs-ed__tools">
          {entry.mode === "ranges" ? <button type="button" id={`${base}-add-${day}`} className="rs-link" aria-label={t.addRangeLabel(name)} onClick={() => {
              const ranges = entry.mode === "ranges" ? entry.ranges : [];
              const last = ranges.at(-1), start = last && /^\d\d:\d\d$/.test(last.end) && minutesOf(last.end) > minutesOf(last.start) && minutesOf(last.end) < DAY_MINUTES - 60 ? last.end : "18:00";
              const end = `${String(Math.min(23, Math.floor(minutesOf(start) / 60) + 2)).padStart(2, "0")}:${start.slice(3)}`;
              focusNext.current = `${base}-s-${day}-${ranges.length}`;
              setDay(day, { mode: "ranges", ranges: [...ranges, { start, end }] });
            }}><PlusIcon size={16} weight="bold" aria-hidden="true" />{t.addRange}</button> : null}
          <button type="button" id={`${base}-copy-${day}`} className="rs-link rs-link--quiet" aria-label={t.locale === "es-PR" ? undefined : t.copyLabel(name)}
            aria-labelledby={t.locale === "es-PR" ? `${base}-copy-${day} ${base}-n-${day}` : undefined} aria-expanded="false" onClick={() => { focusNext.current = `${base}-copyfirst-${day}`; setCopying({ day, to: [] }); }}>
            <CopySimpleIcon size={16} weight="bold" aria-hidden="true" />{t.copy}</button>
        </div>}
        {copying?.day === day ? <div className="rs-ed__copy" role="group" aria-labelledby={`${base}-copyt-${day}`}>
          <p className="rs-ed__copyt" id={`${base}-copyt-${day}`}>{t.copyTitle(name)}</p>
          <div className="rs-ed__days">{DAY_ORDER.filter(other => other !== day).map((other, index) => <label key={other} className="rs-check">
            <input id={index === 0 ? `${base}-copyfirst-${day}` : undefined} type="checkbox" checked={copying.to.includes(other)} onChange={event => setCopying({ day, to: event.target.checked ? [...copying.to, other] : copying.to.filter(item => item !== other) })} />
            <span>{t.days[other]}</span></label>)}</div>
          <div className="rs-ed__copyacts">
            <button type="button" className="b-btn b-btn--quiet b-rowact b-rowact--quiet" onClick={() => { focusNext.current = `${base}-copy-${day}`; setCopying(null); }}>{t.cancel}</button>
            <button type="button" className="b-btn b-btn--ghost" disabled={!copying.to.length} onClick={() => {
              const source: DayPlan = entry.mode === "ranges" ? { mode: "ranges", ranges: entry.ranges.map(range => ({ ...range })) } : { mode: entry.mode };
              onChange({ ...plan, ...Object.fromEntries(copying.to.map(other => [other, source.mode === "ranges" ? { mode: "ranges", ranges: source.ranges.map(range => ({ ...range })) } : { ...source }])) });
              setSaid(t.copied(name, copying.to.length));
              focusNext.current = `${base}-copy-${day}`;
              setCopying(null);
            }}>{t.copyApply}</button>
          </div>
        </div> : null}
      </div>;
    })}
    <p className="rs-sr" role="status">{said}</p>
  </div>;
}
