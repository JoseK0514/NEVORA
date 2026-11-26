"use client";

/* Paid time and export by batch: what each of the four steps shows. Presentation only: export-flow.tsx holds the work and
 * makes the requests. Every sentence comes from copy.ts. */
import { memo, useId, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { BButton, BButtonLink, BCallout, BChip, BGlyph, BState, type BTone } from "@/components/owner-b/b-kit";
import type { PayrollImportCopy } from "./copy";
import { TREATMENTS, batchStatus, type BatchState, type BatchView, type BreakGate, type Decisions, type Finish, type PersonBreaks, type RunStatus, type Treatment } from "./export-model";
import { DoneCard, ErrorText, ROW_GO, StepHeading, breakWhen, shortKey } from "./flow-kit";
import type { ExportRefusal, WriteState } from "./recovery";

/* ---------- step 1: every recorded break ---------- */

/** Up to this many breaks in the period, every person's list starts open. */
const OPEN_ALL_UP_TO = 40;

export function BreaksStep({ copy, headingId, people, decisions, gate, timeZone, locked, onDecide }: {
  copy: PayrollImportCopy; headingId: string; people: readonly PersonBreaks[]; decisions: Decisions; gate: BreakGate; timeZone: string; locked?: boolean;
  onDecide: (key: string, treatment: Treatment) => void;
}) {
  const b = copy.exp.breaks, base = useId();
  // A short period shows everyone's breaks at once. A long one opens the first person who still has a break to decide;
  // the rest are one press away, each with its own count, so the page stays a list of people rather than a wall.
  const [opened] = useState(() => { const all = people.reduce((total, person) => total + person.breaks.length, 0), first = people.find(person => person.breaks.some(item => !decisions[item.key])) ?? people[0];
    return new Set(all <= OPEN_ALL_UP_TO ? people.map(person => person.employeeId) : first ? [first.employeeId] : []); });
  return <>
    <StepHeading id={headingId}>{b.heading}</StepHeading>
    <p className="pim-p">{b.lead}</p>
    {!people.length ? <BState kind="empty" title={b.nobodyTitle} line={b.nobodyLine} />
      : !gate.total ? <BState kind="empty" title={b.noneTitle} line={b.noneLine} />
      : <>
        {/* Phase 9: the statement a choice makes is the kit's information note (teal, Info glyph, a hairline edge). */}
        <BCallout tone="teal">
          <p>{b.attest}</p>
          <p id={`${base}-worked`}>{b.workedThrough}</p>
          <p>{b.partialWork}</p>
        </BCallout>
        <div className="pim-sec__h pim-progress" role="status"><span className="pim-meta">{b.progress(gate.decided, gate.total)}</span>{gate.undecided ? <BChip tone="amber">{b.undecided(gate.undecided)}</BChip> : null}</div>
        {locked ? <p className="pim-p">{b.lockedLine}</p> : null}
        {people.map(person => <PersonSection key={person.employeeId} copy={copy} base={base} person={person} open={opened.has(person.employeeId)} locked={!!locked} timeZone={timeZone} onDecide={onDecide}
          chosen={person.breaks.map(item => decisions[item.key] ?? "").join(",")} />)}
      </>}
    {gate.overLimit ? <p className="c-error" role="alert"><ErrorText>{b.overLimit}</ErrorText></p> : null}
  </>;
}

/** One person's breaks. Drawn again only when one of that person's own choices changes, so a choice in a long period
 * does not redraw everyone else's list. `chosen` is that person's choices in break order. */
const PersonSection = memo(function PersonSection({ copy, base, person, open, locked, timeZone, chosen, onDecide }: {
  copy: PayrollImportCopy; base: string; person: PersonBreaks; open: boolean; locked: boolean; timeZone: string; chosen: string; onDecide: (key: string, treatment: Treatment) => void;
}) {
  const b = copy.exp.breaks, choices = chosen.split(","), left = person.breaks.filter((_, index) => !choices[index]).length;
  return <details className="pim-sec pim-person" open={open || undefined} data-state={left ? "open" : "ok"}>
    <summary className="pim-person__sum"><span className="pim-h3">{person.name}</span>
      <span className="pim-meta">{person.breaks.length ? b.personBreaks(person.breaks.length) : b.personNone}</span>
      {left ? <BChip tone="amber">{b.undecided(left)}</BChip> : person.breaks.length ? <span className="pim-meta pim-person__done">{b.personDone}</span> : null}
      <CaretDownIcon className="pim-person__caret" weight="bold" aria-hidden="true" /></summary>
    {person.breaks.length ? <>
      <div className="pim-break-action">
        <BButtonLink href={`/app/timecards/corrections/new/${encodeURIComponent(person.employeeId)}`} kind="ghost" label={b.correctionFor(person.name)}>{b.correction}</BButtonLink>
      </div>
      <ul className="pim-rows">{person.breaks.map((item, index) => {
        const at = breakWhen(item.startAt, item.endAt, timeZone, copy.locale), choice = choices[index];
        const original = item.original && breakWhen(item.original.startAt, item.original.endAt, timeZone, copy.locale);
        return <li key={item.key} className="pim-break" data-state={choice ? "ok" : "open"}>
          <fieldset className="pim-choice" disabled={locked}>
            <legend className="pim-choice__l">
              <span className="pim-match__t">{at.when}</span>
              <span className="pim-match__s">{at.length} · {b.recordedAs(item.label, item.place)}</span>
              {original ? <span className="pim-match__s">{item.original?.endAt ? b.originalPunch(original.when) : b.originalOpenPunch(original.when)}</span> : null}
              <span className="c-sr">{b.choiceFor(person.name, at.day)}</span>
            </legend>
            <div className="pim-choice__opts">{TREATMENTS.map(option => <label key={option} className="pim-opt">
              <input type="radio" name={`${base}-${item.key}`} value={option} checked={choice === option} aria-describedby={option === "PAID_AS_WORKED" ? `${base}-worked` : undefined}
                onChange={() => onDecide(item.key, option)} /><span>{b.treatment[option]}</span>
            </label>)}</div>
          </fieldset>
        </li>;
      })}</ul>
    </> : null}
  </details>;
}, (before, after) => before.person === after.person && before.chosen === after.chosen && before.open === after.open && before.locked === after.locked && before.copy === after.copy && before.timeZone === after.timeZone);

/* ---------- step 2: the plan ---------- */

const kb = (bytes: number) => (Math.ceil(bytes / 102.4) / 10).toFixed(1);

export function PlanStep({ copy, headingId, batches, problem, covered, exportsHref }: {
  copy: PayrollImportCopy; headingId: string; batches: readonly BatchView[] | null; problem: "tooBig" | "coverage" | null; covered: { included: number; zero: number; excluded: number }; exportsHref: string;
}) {
  const p = copy.exp.plan;
  return <>
    <StepHeading id={headingId}>{p.heading}</StepHeading>
    <p className="pim-p">{p.lead}</p>
    {problem ? <BState kind="failed" alert title={problem === "tooBig" ? p.tooBigTitle : p.coverageTitle} line={problem === "tooBig" ? p.tooBigLine : p.coverageLine}><BButtonLink href={exportsHref} kind="ghost">{copy.exp.finish.openExports}</BButtonLink></BState>
      : !batches ? <BState kind="loading" title={p.planning} />
      : <>
        <p className="pim-meta">{p.covered(covered.included, covered.zero, covered.excluded)}</p>
        {batches.length ? <ul className="pim-rows">{batches.map(batch => <li key={batch.key} className="pim-batch">
          <span className="pim-batch__n" aria-hidden="true">{batch.index}</span>
          <span className="pim-batch__tx"><span className="pim-match__t">{p.batch(batch.index, batch.total, batch.count)}</span><span className="pim-match__s">{p.detail(p.names(batch.people), batch.breaks, kb(batch.bytes))}</span></span>
        </li>)}</ul> : <BState kind="empty" title={copy.exp.breaks.nobodyTitle} line={p.noBatches} />}
        {batches.length ? <p className="pim-p pim-p--quiet">{p.fixedNote}</p> : null}
      </>}
  </>;
}

/* ---------- step 3: sending ---------- */

const STATUS_TONE: Record<RunStatus, BTone> = { waiting: "grey", sending: "teal", saved: "green", unknown: "amber", refused: "red", blocked: "red" };

/** The sentence under a batch that is not saved: what happened, then what to do. */
export function batchLine(copy: PayrollImportCopy, state: BatchState | undefined): string | null {
  const r = copy.exp.run;
  if (!state) return null;
  if (state.phase === "unknown") return r.unknownLine;
  if (state.phase === "refused") return r.refusal[(state.reason in r.refusal ? state.reason : "INVALID") as ExportRefusal];
  if (state.phase === "blocked") return state.reason === "duplicate" ? r.duplicateLine : state.reason === "denied" ? copy.common.deniedLine : state.reason === "signed_out" ? copy.common.signedOutLine : r.conflictLine;
  return null;
}

export function RunStep({ copy, headingId, batches, states, onCheck, onDownload }: {
  copy: PayrollImportCopy; headingId: string; batches: readonly BatchView[]; states: Readonly<Record<string, BatchState | undefined>>;
  onCheck: (key: string) => void; onDownload: (key: string) => void;
}) {
  const r = copy.exp.run, saved = batches.filter(batch => batchStatus(states[batch.key]) === "saved").length;
  return <>
    <StepHeading id={headingId}>{r.heading}</StepHeading>
    <p className="pim-p">{r.lead}</p>
    <p className="pim-meta" role="status">{r.progress(saved, batches.length)}</p>
    <ul className="pim-rows">{batches.map(batch => {
      const state = states[batch.key], status = batchStatus(state), line = batchLine(copy, state);
      return <li key={batch.key} className="pim-batch" data-status={status}>
        <span className="pim-batch__n" aria-hidden="true">{batch.index}</span>
        <span className="pim-batch__tx">
          <span className="pim-match__t">{copy.exp.plan.batch(batch.index, batch.total, batch.count)}</span>
          <span className="pim-batch__st">{status === "waiting" ? <span className="pim-match__s">{r.status.waiting}</span> : <BChip tone={STATUS_TONE[status]}>{r.status[status]}</BChip>}
            {status === "saved" ? <span className="pim-receipt"><span>{copy.common.receipt}</span> <code title={batch.key}>{shortKey(batch.key)}</code></span> : null}</span>
          {line ? <span className="pim-batch__line" role={status === "unknown" ? "status" : "alert"} tabIndex={-1} data-pim-error="">{line}</span> : null}
        </span>
        {status === "unknown" ? <span className="pim-batch__act"><button type="button" className={ROW_GO} onClick={() => onCheck(batch.key)} aria-label={r.checkBatchFor(batch.index)}>{r.checkBatch}</button></span>
          : status === "saved" ? <span className="pim-batch__act"><button type="button" className={ROW_GO} onClick={() => onDownload(batch.key)} aria-label={r.downloadFor(batch.index)}>{r.download}</button></span> : null}
      </li>;
    })}</ul>
    {saved === batches.length && batches.length ? <p className="pim-recon" role="status">{r.allSaved}</p> : null}
  </>;
}

/* ---------- step 4: finish ---------- */

export function FinishStep({ copy, headingId, finish, record, periodLabel, exportsHref, onBackToRun }: {
  copy: PayrollImportCopy; headingId: string; finish: Finish; record: WriteState<unknown>; periodLabel: string; exportsHref: string; onBackToRun: () => void;
}) {
  const f = copy.exp.finish, batchesOpen = finish.missing.some(item => item.kind === "batch");
  if (finish.complete) return <>
    <StepHeading id={headingId}>{f.heading}</StepHeading>
    <DoneCard title={f.completeTitle} line={f.completeLine(finish.people, finish.batches, periodLabel)}>
      <p className="b-statecard__s">{f.scope}</p>
      {"custody" in record ? <p className="pim-receipt"><span>{copy.common.receipt}</span> <code title={record.custody.key}>{shortKey(record.custody.key)}</code></p> : null}
      <BButtonLink href={exportsHref}>{f.openExports}</BButtonLink>
    </DoneCard>
  </>;
  const stopped = record.phase === "refused" || record.phase === "blocked";
  return <>
    <StepHeading id={headingId}>{f.heading}</StepHeading>
    {/* Phase 9 (spec 2.5): while the manifest's result is not known, the card draws the Question glyph ("not confirmed"). */}
    <BState kind={stopped ? "failed" : "paused"} icon={!stopped && (record.phase === "unknown" || record.phase === "checking") ? <BGlyph meaning="unknown" /> : undefined} alert={stopped || record.phase === "unknown"} title={f.incompleteTitle}>
      <ul className="pim-ul" data-pim-error="" tabIndex={-1}>{finish.missing.map((item, index) => <li key={index}>{f.missing(item, finish.batches)}</li>)}</ul>
      {batchesOpen ? null : record.phase === "unknown" || record.phase === "checking" ? <p className="b-statecard__s">{f.unknownLine} {copy.common.stay}</p>
        : record.phase === "blocked" && (record.reason === "denied" || record.reason === "signed_out") ? <p className="b-statecard__s">{record.reason === "denied" ? copy.common.deniedLine : copy.common.signedOutLine}</p>
        : stopped ? <p className="b-statecard__s">{f.refusedLine}</p> : <p className="b-statecard__s">{f.confirmLead}</p>}
      {batchesOpen ? <BButton kind="ghost" onClick={onBackToRun}>{f.backToRun}</BButton> : stopped ? <BButtonLink href={exportsHref} kind="ghost">{f.openExports}</BButtonLink> : null}
    </BState>
  </>;
}

/** The timecards or the people changed before anything was sent: said once, with what was kept. */
export function ExportChangedNotice({ copy, dropped, onDismiss }: { copy: PayrollImportCopy; dropped: number; onDismiss: () => void }) {
  const c = copy.exp.changed;
  return <BState kind="paused" alert title={c.title} line={c.line(dropped)}><BButton kind="ghost" onClick={onDismiss}>{c.dismiss}</BButton></BState>;
}
