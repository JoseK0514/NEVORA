"use client";

/* Import pay from another payroll system: what each of the five steps shows. Presentation only: import-flow.tsx holds the
 * work and makes the requests. Every sentence comes from copy.ts, so the same views render in English and Spanish. */
import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { BButton, BButtonLink, BChip, BGlyph, BState } from "@/components/owner-b/b-kit";
import type { PayrollImportCopy } from "./copy";
import { AMOUNT_FIELDS, CSV_HEADERS, DISPOSITIONS, EXAMPLE_ROWS, centsFromInput, inputFromCents, lockedReason, searchPeople, type AmountField, type AmountReview, type Disposition, type FileProblem, type FileRow, type ImportDraft, type ImportPlan, type ImportSource, type MatchReview, type RosterPerson, type SourceChange } from "./import-model";
import { DoneCard, ErrorText, ROW_GO, StepHeading, absMoney, money, shortKey, signedMoney, type Lang } from "./flow-kit";
import type { PayrollReceiptLike, WriteState } from "./recovery";

const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/* ---------- step 1: the file ---------- */

export function AddFileStep({ copy, headingId, periodLabel, draft, problem, reading, source, sourceErrors, correction, reason, reasonError, mismatch, onFile, onSource, onReason, onStarter }: {
  copy: PayrollImportCopy; headingId: string; periodLabel: string; draft: ImportDraft | null; problem: FileProblem | null; reading?: boolean;
  source: ImportSource; sourceErrors?: { sourceName?: boolean; sourceReference?: boolean }; correction: boolean; reason: string; reasonError?: boolean; mismatch?: string | null;
  onFile: (file: File) => void; onSource: (source: ImportSource) => void; onReason: (reason: string) => void; onStarter: () => void;
}) {
  const a = copy.imp.add, input = useRef<HTMLInputElement>(null), [over, setOver] = useState(false), base = useId();
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setOver(false); const file = event.dataTransfer.files?.[0]; if (file) onFile(file); };
  const error = problem ? copy.imp.problem(problem) : mismatch ?? null;
  return <>
    <StepHeading id={headingId}>{a.heading}</StepHeading>
    <p className="pim-p">{a.lead(periodLabel)}</p>
    <section className="pim-needs" aria-labelledby={`${base}-needs`}>
      <h3 className="pim-h3" id={`${base}-needs`}>{a.needs}</h3>
      <p className="pim-p">{a.needsCsv}</p>
      <div className="pim-scroll" tabIndex={0} role="group" aria-label={a.exampleCaption}>
        <table className="pim-example">
          <caption className="c-sr">{a.exampleCaption}</caption>
          <thead><tr>{CSV_HEADERS.map(name => <th key={name} scope="col">{name}</th>)}</tr></thead>
          <tbody>{EXAMPLE_ROWS.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <ul className="pim-ul">{a.needsList.map(line => <li key={line}>{line}</li>)}</ul>
      <div className="pim-starter"><button type="button" className={ROW_GO} onClick={onStarter}>{a.starter}</button><span className="c-field__help">{a.starterHelp}</span></div>
    </section>
    <div className="c-field">
      <span className="c-field__label" id={`${base}-file-label`}>{a.fileLabel}</span>
      <div className="pim-drop" data-over={over || undefined} data-loaded={draft ? "" : undefined} data-invalid={error ? "" : undefined}
        onDragOver={event => { event.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}>
        <input ref={input} className="pim-drop__input" type="file" accept=".csv,.json,text/csv,application/json" tabIndex={-1} aria-hidden="true"
          onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; if (file) onFile(file); }} />
        {draft ? <p className="pim-drop__loaded" role="status">{a.loaded(draft.fileName, draft.rows.length)}</p> : <p className="pim-drop__hint" aria-hidden="true">{a.drop} <span>{a.or}</span></p>}
        <button type="button" className={ROW_GO} onClick={() => input.current?.click()} aria-describedby={describedBy(`${base}-file-label`, error && `${base}-file-error`)}>{reading ? a.reading : draft ? a.another : a.choose}</button>
      </div>
      {error ? <span className="c-error" id={`${base}-file-error`} role="alert" tabIndex={-1} data-pim-error=""><ErrorText>{error}</ErrorText></span> : null}
    </div>
    {draft?.kind === "json" && draft.json ? <p className="pim-p">{a.fromFile(draft.json.sourceName, draft.json.sourceReference)}</p> : null}
    {draft?.kind === "csv" ? <div className="pim-pair">
      {(["sourceName", "sourceReference"] as const).map(field => <div className="c-field" key={field}>
        <label className="c-field__label" htmlFor={`${base}-${field}`}>{a[field]}</label>
        <input className="c-in" id={`${base}-${field}`} value={source[field]} maxLength={300} autoComplete="off" onChange={event => onSource({ ...source, [field]: event.target.value })}
          aria-invalid={sourceErrors?.[field] || undefined} aria-describedby={describedBy(`${base}-${field}-help`, sourceErrors?.[field] && `${base}-${field}-error`)} />
        <span className="c-field__help" id={`${base}-${field}-help`}>{a[`${field}Help`]}</span>
        {sourceErrors?.[field] ? <span className="c-error" id={`${base}-${field}-error`}><ErrorText>{a.sourceInvalid}</ErrorText></span> : null}
      </div>)}
    </div> : null}
    {correction ? <div className="c-field">
      <label className="c-field__label" htmlFor={`${base}-reason`}>{a.reason}</label>
      <textarea className="c-in pim-area" id={`${base}-reason`} rows={3} maxLength={300} value={reason} onChange={event => onReason(event.target.value)} aria-invalid={reasonError || undefined} aria-describedby={`${base}-reason-help`} />
      <span className="c-field__help" id={`${base}-reason-help`}>{a.reasonHelp} {a.settle}</span>
    </div> : null}
  </>;
}

/* ---------- step 2: people ---------- */

/** Search and pick one person. The Owner types a name or an ID and chooses; nothing is suggested from the file's row. */
export function PersonPicker({ copy, id, label, roster, value, taken, invalid, describedBy: described, onChange }: {
  copy: PayrollImportCopy; id: string; label: string; roster: readonly RosterPerson[]; value: string | null; taken: ReadonlySet<string>; invalid?: boolean; describedBy?: string; onChange: (personId: string | null) => void;
}) {
  const m = copy.imp.match, chosen = roster.find(person => person.id === value) ?? null;
  const [query, setQuery] = useState(""), [open, setOpen] = useState(false), [active, setActive] = useState(0), input = useRef<HTMLInputElement>(null);
  const options = open ? searchPeople(roster, query, taken) : [];
  const pick = (person: RosterPerson) => { onChange(person.id); setOpen(false); setQuery(""); };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); if (!open) setOpen(true); else setActive(index => Math.min(index + 1, Math.max(options.length - 1, 0))); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && options[active]) { event.preventDefault(); pick(options[active]); }
    else if (event.key === "Escape" && open) { event.preventDefault(); setOpen(false); setQuery(""); }
  };
  return <div className="pim-pick" data-open={open || undefined}>
    <input ref={input} className="c-in pim-pick__in" id={id} role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-autocomplete="list" autoComplete="off" spellCheck={false}
      aria-activedescendant={open && options[active] ? `${id}-o${active}` : undefined} aria-invalid={invalid || undefined} aria-describedby={described}
      placeholder={chosen ? undefined : m.searchPlaceholder} value={open ? query : chosen?.name ?? ""}
      onFocus={() => { setOpen(true); setActive(0); }} onChange={event => { setQuery(event.target.value); setOpen(true); setActive(0); }} onKeyDown={keys} onBlur={() => { setOpen(false); setQuery(""); }} />
    {chosen && !open ? <button type="button" className="pim-pick__clear" onClick={() => { onChange(null); input.current?.focus(); }} aria-label={`${m.clear}: ${chosen.name}`}>{m.clear}</button> : null}
    <ul className="pim-pick__list" id={`${id}-list`} role="listbox" aria-label={label} hidden={!open}>
      {options.map((person, index) => <li key={person.id} id={`${id}-o${index}`} role="option" aria-selected={index === active} className="pim-pick__opt" data-active={index === active || undefined}
        onMouseDown={event => { event.preventDefault(); pick(person); }} onMouseEnter={() => setActive(index)}>
        <span className="pim-pick__name">{person.name}</span>
        <span className="pim-pick__id">{[person.id, !person.active && m.inactive, taken.has(person.id) && person.id !== value && m.taken].filter(Boolean).join(" · ")}</span>
      </li>)}
      {open && !options.length ? <li className="pim-pick__none" role="option" aria-selected="false" aria-disabled="true">{m.noResults}</li> : null}
    </ul>
  </div>;
}

export function MatchStep({ copy, lang, headingId, review, roster, onMatch, onDisposition, onStarter }: {
  copy: PayrollImportCopy; lang: Lang; headingId: string; review: MatchReview; roster: readonly RosterPerson[];
  onMatch: (row: FileRow, personId: string | null) => void; onDisposition: (personId: string, disposition: Disposition) => void; onStarter: () => void;
}) {
  const m = copy.imp.match, base = useId(), names = new Map(roster.map(person => [person.id, person.name]));
  const taken = new Set(review.rows.map(row => row.personId).filter((id): id is string => !!id));
  return <>
    <StepHeading id={headingId}>{m.heading}</StepHeading>
    <p className="pim-p">{m.lead}</p>
    {review.matched === 0 && review.rows.length ? <BState kind="paused" title={m.nobodyTitle} line={m.nobodyLine}><button type="button" className={ROW_GO} onClick={onStarter}>{copy.imp.add.starter}</button></BState> : null}
    <section className="pim-sec" aria-labelledby={`${base}-rows`}>
      <div className="pim-sec__h"><h3 className="pim-h3" id={`${base}-rows`}>{m.rowsTitle}</h3>
        <span className="pim-meta">{m.summary(review.matched, review.rows.length)}</span>
        {review.unmatched ? <BChip tone="amber">{m.toMatch(review.unmatched)}</BChip> : null}{review.twice ? <BChip tone="red">{m.twice(review.twice)}</BChip> : null}</div>
      <ul className="pim-rows">{review.rows.map(row => {
        const id = `${base}-r${row.index}`, state = row.twice ? "twice" : row.personId === null ? "open" : "ok";
        return <li key={row.index} className="pim-match" data-state={state}>
          <div className="pim-match__file">
            <span className="pim-match__t">{m.row(row.index + 1, row.fileId)}</span>
            <span className="pim-match__s">{m.amounts(money(row.row.grossMinor, lang), money(row.row.netMinor, lang))}</span>
          </div>
          <div className="pim-match__who">
            <PersonPicker copy={copy} id={id} label={m.personFor(row.index + 1)} roster={roster} value={row.personId} taken={taken} invalid={row.twice} describedBy={`${id}-state`} onChange={personId => onMatch(row, personId)} />
            <span className="pim-match__state" id={`${id}-state`} data-state={state}>{row.twice ? m.twiceLine(names.get(row.personId!) ?? "") : row.personId === null ? m.notMatched : row.exact ? m.byId : m.byYou}</span>
          </div>
        </li>;
      })}</ul>
    </section>
    <section className="pim-sec" aria-labelledby={`${base}-missing`}>
      <div className="pim-sec__h"><h3 className="pim-h3" id={`${base}-missing`}>{m.missingTitle}</h3>{review.undecided ? <BChip tone="amber">{m.undecided(review.undecided)}</BChip> : null}</div>
      {review.missing.length ? <>
        <p className="pim-p">{m.missingLead}</p>
        <ul className="pim-rows">{review.missing.map(person => <li key={person.id} className="pim-miss" data-state={person.disposition ? "ok" : "open"}>
          <fieldset className="pim-choice">
            <legend className="pim-choice__l"><span className="pim-match__t">{person.name}</span><span className="pim-match__s">{[`ID ${person.id}`, !person.active && m.inactive].filter(Boolean).join(" · ")}</span><span className="c-sr">{m.choiceFor(person.name)}</span></legend>
            <div className="pim-choice__opts">{DISPOSITIONS.map(option => <label key={option} className="pim-opt">
              <input type="radio" name={`${base}-d-${person.id}`} checked={person.disposition === option} onChange={() => onDisposition(person.id, option)} /><span>{m.disposition[option]}</span>
            </label>)}</div>
          </fieldset>
        </li>)}</ul>
      </> : <p className="pim-p">{m.missingNone}</p>}
    </section>
  </>;
}

/* ---------- step 3: amounts ---------- */

function AmountCell({ copy, lang, row, field, fileRow, editing, onEdit, onCorrect }: {
  copy: PayrollImportCopy; lang: Lang; row: AmountReview["rows"][number]; field: AmountField; fileRow: FileRow; editing: boolean;
  onEdit: (cell: { index: number; field: AmountField } | null) => void; onCorrect: (row: FileRow, field: AmountField, minor: string | null) => void;
}) {
  const r = copy.imp.review, label = r.columns[field], id = `pim-a-${row.index}-${field}`, changed = row.changed.includes(field), locked = lockedReason(fileRow.row, field);
  const [text, setText] = useState(""), [bad, setBad] = useState(false), input = useRef<HTMLInputElement>(null), button = useRef<HTMLButtonElement>(null), wasEditing = useRef(false);
  useEffect(() => {
    if (editing) { input.current?.focus(); input.current?.select(); }
    else if (wasEditing.current) button.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  const open = () => { setText(inputFromCents(row.amounts[field])); setBad(false); onEdit({ index: row.index, field }); };
  const commit = () => {
    const minor = centsFromInput(text);
    if (minor === null) { setBad(true); input.current?.focus(); return false; }
    onCorrect(fileRow, field, minor); onEdit(null); return true;
  };
  return <td className="pim-amt" data-changed={changed || undefined} data-label={label}>
    <span className="pim-cap" aria-hidden="true">{label}</span>
    {editing ? <span className="pim-amt__edit">
      <input ref={input} className="c-in pim-amt__in" id={id} inputMode="decimal" autoComplete="off" value={text} aria-label={r.amountFor(label, row.name)} aria-invalid={bad || undefined} aria-describedby={bad ? `${id}-error` : undefined}
        onChange={event => { setText(event.target.value); setBad(false); }} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); commit(); } else if (event.key === "Escape") { event.preventDefault(); onEdit(null); } }}
        onBlur={() => { if (centsFromInput(text) !== null) commit(); }} />
      {bad ? <span className="c-error" id={`${id}-error`} role="alert"><ErrorText>{r.invalid}</ErrorText></span> : null}
    </span> : locked ? <span className="pim-amt__v" title={r.locked[locked]}>{money(row.amounts[field], lang)}<span className="c-sr"> {r.locked[locked]}</span></span>
      : <button ref={button} type="button" className="pim-amt__btn" id={id} onClick={open} aria-label={`${r.edit(label, row.name)}: ${money(row.amounts[field], lang)}`}>{money(row.amounts[field], lang)}</button>}
    {changed && !editing ? <span className="pim-amt__was"><span>{r.was(money(row.original[field], lang))}</span>
      <button type="button" className="pim-textbtn" onClick={() => { onCorrect(fileRow, field, null); button.current?.focus(); }} aria-label={r.undoFor(label, row.name)}>{r.undo}</button></span> : null}
  </td>;
}

export function ReviewStep({ copy, lang, headingId, review, rows, editing, onEdit, onCorrect }: {
  copy: PayrollImportCopy; lang: Lang; headingId: string; review: AmountReview; rows: readonly FileRow[]; editing: { index: number; field: AmountField } | null;
  onEdit: (cell: { index: number; field: AmountField } | null) => void; onCorrect: (row: FileRow, field: AmountField, minor: string | null) => void;
}) {
  const r = copy.imp.review, byIndex = new Map(rows.map(row => [row.index, row])), differs = AMOUNT_FIELDS.some(field => review.difference[field] !== "0");
  const totalRow = (label: string, amounts: Record<AmountField, string>, kind: string, format: (minor: string) => string) => <tr className="pim-total" data-kind={kind}>
    <th scope="row">{label}</th>{AMOUNT_FIELDS.map(field => <td key={field} className="pim-amt" data-label={r.columns[field]} data-changed={kind === "diff" && amounts[field] !== "0" || undefined}><span className="pim-cap" aria-hidden="true">{r.columns[field]}</span><span className="pim-amt__v">{format(amounts[field])}</span></td>)}
  </tr>;
  return <>
    <StepHeading id={headingId}>{r.heading}</StepHeading>
    <p className="pim-p">{r.lead}</p>
    <table className="pim-table">
      <caption className="c-sr">{r.heading}</caption>
      <thead><tr><th scope="col">{r.columns.person}</th>{AMOUNT_FIELDS.map(field => <th key={field} scope="col" className="pim-num">{r.columns[field]}</th>)}</tr></thead>
      <tbody>{review.rows.map(row => {
        const fileRow = byIndex.get(row.index)!, off = row.gap !== "0";
        return <tr key={row.index} className="pim-row" data-off={off || undefined} data-changed={row.changed.length ? "" : undefined}>
          <th scope="row" className="pim-row__who"><span className="pim-row__name">{row.name}</span>
            {row.changed.length ? <BChip tone="amber">{r.changedRow}</BChip> : null}
            {off ? <span className="pim-row__gap" role="note">{r.gap(absMoney(row.gap, lang))}</span> : null}</th>
          {AMOUNT_FIELDS.map(field => <AmountCell key={field} copy={copy} lang={lang} row={row} field={field} fileRow={fileRow} editing={editing?.index === row.index && editing.field === field} onEdit={onEdit} onCorrect={onCorrect} />)}
        </tr>;
      })}</tbody>
      <tfoot>
        {totalRow(r.fromFile, review.file, "file", minor => money(minor, lang))}
        {differs ? totalRow(r.afterChanges, review.reviewed, "after", minor => money(minor, lang)) : null}
        {differs ? totalRow(r.difference, review.difference, "diff", minor => signedMoney(minor, lang)) : null}
      </tfoot>
    </table>
    <p className="pim-recon" data-differs={differs || undefined} role="status">{differs ? r.differs(review.corrected) : r.reconciles}</p>
    {review.zero.length ? <section className="pim-sec" aria-label={r.zeroTitle}>
      <h3 className="pim-h3">{r.zeroTitle}</h3>
      <ul className="pim-ul pim-ul--plain">{review.zero.map(person => <li key={person.personId}>{r.zeroLine(person.name, copy.imp.match.disposition[person.disposition])}</li>)}</ul>
    </section> : null}
  </>;
}

/* ---------- step 4: confirm ---------- */

export function ConfirmStep({ copy, lang, headingId, plan, review, draft, source, periodLabel, paydayLabel, correction, reason, tooBig }: {
  copy: PayrollImportCopy; lang: Lang; headingId: string; plan: ImportPlan; review: AmountReview; draft: ImportDraft; source: ImportSource; periodLabel: string; paydayLabel: string; correction: boolean; reason: string; tooBig?: boolean;
}) {
  const c = copy.imp.confirm, facts: [string, string][] = [
    [c.people, c.peopleValue(plan.people, review.rows.length, plan.added)], [c.net, money(review.reviewed.net, lang)], [c.gross, money(review.reviewed.gross, lang)],
    [c.period, periodLabel], [c.payday, paydayLabel], [c.source, `${source.sourceName} · ${source.sourceReference}`],
    [c.file, plan.asUploaded ? c.asUploaded(draft.fileName) : c.asReviewed(draft.fileName, plan.corrected, plan.rematched, plan.added)],
    ...(correction ? [[c.reason, reason.trim()] as [string, string]] : []),
  ];
  return <>
    <StepHeading id={headingId}>{correction ? c.headingCorrection : c.heading}</StepHeading>
    <dl className="pim-facts">{facts.map(([term, value]) => <div key={term}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>
    <div className="pim-two">
      <section aria-label={c.nextTitle}><h3 className="pim-h3">{c.nextTitle}</h3><ul className="pim-ul">{(correction ? c.nextCorrection : c.next).map(line => <li key={line}>{line}</li>)}</ul></section>
      <section aria-label={c.notTitle}><h3 className="pim-h3">{c.notTitle}</h3><ul className="pim-ul">{c.not.map(line => <li key={line}>{line}</li>)}{correction ? <li>{copy.imp.add.settle}</li> : null}</ul></section>
    </div>
    {tooBig ? <p className="c-error" role="alert"><ErrorText>{c.tooBig}</ErrorText></p> : null}
  </>;
}

/* ---------- step 5: result ---------- */

export type RefusalFix = "amounts" | "match" | "file" | "included" | "timecards" | "settings" | "payroll";
/** Where a refusal is fixed. */
export function refusalFix(code: string, issues: string[]): RefusalFix {
  if (code === "INVALID_PAYROLL_INPUT") return issues[0] === "rows.population" || /employeeId$/.test(issues[0] ?? "") ? "match" : issues[0] === "source" ? "file" : "amounts";
  if (code === "IMPORT_PERIOD_CONFLICT") return "file";
  if (code === "POPULATION_REVIEW_REQUIRED" || code === "POPULATION_SOURCE_CONFLICT") return "included";
  if (code === "FINALIZED_TIME_REQUIRED") return "timecards";
  if (code === "SETTINGS_REQUIRED") return "settings";
  if (code === "RUN_UNAVAILABLE" || code === "RUN_STATE_CONFLICT" || code === "NATIVE_AMOUNT_INPUT_FORBIDDEN") return "payroll";
  return "amounts";
}

export function ResultStep({ copy, headingId, write, correction, people, periodLabel, offline, links, onCheck, onResend, onFix }: {
  copy: PayrollImportCopy; headingId: string; write: WriteState<PayrollReceiptLike>; correction: boolean; people: number; periodLabel: string; offline: boolean;
  links: { review: (runId?: string) => string; included: string; timecards: string; settings: string; payroll: string };
  onCheck: () => void; onResend: () => void; onFix: (step: "amounts" | "match" | "file") => void;
}) {
  const r = copy.imp.result, title = copy.imp.steps[4];
  if (write.phase === "saved") return <>
    <StepHeading id={headingId}>{title}</StepHeading>
    <DoneCard title={correction ? r.savedCorrectionTitle : r.savedTitle} line={correction ? r.savedCorrectionLine(periodLabel) : r.savedLine(people, periodLabel)}>
      <p className="pim-receipt"><span>{copy.common.receipt}</span> <code title={write.receipt.operationId}>{shortKey(write.receipt.operationId)}</code></p>
      <BButtonLink href={links.review(write.receipt.runId)}>{r.review}</BButtonLink>
    </DoneCard>
  </>;
  if (write.phase === "refused" && (write.reason === "DENIED" || write.reason === "SIGNED_OUT")) return <>
    <StepHeading id={headingId}>{title}</StepHeading>
    <BState kind="locked" alert title={write.reason === "DENIED" ? copy.common.deniedTitle : copy.common.signedOutTitle} line={write.reason === "DENIED" ? copy.common.deniedLine : copy.common.signedOutLine}>
      {write.reason === "SIGNED_OUT" ? <BButtonLink href="/login">{copy.common.signIn}</BButtonLink> : <BButtonLink href={links.payroll}>{r.fix.payroll}</BButtonLink>}
    </BState>
  </>;
  if (write.phase === "refused") {
    const issues = write.detail ? write.detail.split(" ") : [], fix = refusalFix(write.reason, issues);
    const href = fix === "included" ? links.included : fix === "timecards" ? links.timecards : fix === "settings" ? links.settings : fix === "payroll" ? links.payroll : null;
    return <>
      <StepHeading id={headingId}>{title}</StepHeading>
      <BState kind="failed" alert title={r.refusedTitle} line={r.reason(write.reason, issues)}>
        <p className="b-statecard__s">{r.refusedNothing}</p>
        {href ? <BButtonLink href={href}>{r.fix[fix]}</BButtonLink> : <BButton onClick={() => onFix(fix as "amounts" | "match" | "file")}>{r.fix[fix]}</BButton>}
      </BState>
    </>;
  }
  if (write.phase === "blocked") return <>
    <StepHeading id={headingId}>{title}</StepHeading>
    <BState kind="paused" alert title={r.blockedTitle} line={r.blockedLine}>
      <p className="pim-receipt"><span>{copy.common.receipt}</span> <code title={write.custody.key}>{shortKey(write.custody.key)}</code></p>
      <BButtonLink href={links.review()}>{r.review}</BButtonLink>
    </BState>
  </>;
  if (write.phase === "unknown" || write.phase === "checking") {
    const checking = write.phase === "checking", seen = write.phase === "unknown" ? write.seen : "nothing";
    return <>
      <StepHeading id={headingId}>{title}</StepHeading>
      {/* Phase 9 (spec 2.5): a result that is not known yet draws the Question glyph (amber), the one "not confirmed" mark. */}
      <BState kind={offline ? "offline" : "paused"} icon={offline ? undefined : <BGlyph meaning="unknown" />} alert title={r.unknownTitle} line={r.unknownLine}>
        {seen === "no_receipt" ? <p className="b-statecard__s">{r.noReceipt}</p> : seen === "check_failed" ? <p className="b-statecard__s">{r.checkFailed}</p> : null}
        <p className="b-statecard__s">{r.neverChanged} {copy.common.stay}</p>
        <p className="pim-receipt"><span>{copy.common.receipt}</span> <code title={write.custody.key}>{shortKey(write.custody.key)}</code></p>
        <div className="pim-acts">
          <BButton onClick={onCheck} disabled={checking}>{checking ? r.checking : r.check}</BButton>
          {seen === "no_receipt" ? <BButton kind="ghost" onClick={onResend}>{r.resend}</BButton> : null}
        </div>
      </BState>
    </>;
  }
  return <>
    <StepHeading id={headingId}>{title}</StepHeading>
    <BState kind="loading" title={r.sendingTitle} line={r.sendingLine} />
  </>;
}

/* ---------- notices ---------- */

/** The team or the payroll changed while the Owner worked: what changed, and that their work is kept. */
export function ChangedNotice({ copy, changes, onDismiss }: { copy: PayrollImportCopy; changes: SourceChange[]; onDismiss: () => void }) {
  const c = copy.imp.changed;
  return <BState kind="paused" alert title={c.title}>
    <ul className="pim-ul">{changes.map((change, index) => <li key={index}>{c.line(change)}</li>)}</ul>
    <p className="b-statecard__s">{c.kept}</p>
    <BButton kind="ghost" onClick={onDismiss}>{c.dismiss}</BButton>
  </BState>;
}
