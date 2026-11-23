"use client";

/* Owner roster import: what each step shows. Presentation only; roster-import.tsx holds the state and makes the
 * requests. Direction B kit parts (BState, BChip, BButton, BList, BRow) inside the Add employee sheet frame. */
import "./roster-import.css";
import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { FieldError } from "@/lib/onboarding/contracts";
import type { RosterRow } from "@/lib/onboarding/roster";
import { CorpFormFooter } from "@/components/corp/corp";
import { BButton, BButtonLink, BChip, BList, BRow, BState } from "@/components/owner-b/b-kit";
import type { RosterImportCopy } from "./copy";
import { headcountsAfter, rowReady, summarizePreview, type Headcounts, type PreviewReady } from "./contract";
import { describeRow, editorField, rowProblemText, rowProblems, type EditorField, type ImportLocation, type Notice, type NoticeAction, type RemovedRow } from "./messages";
import type { RosterField } from "./table";

export type StepAction = { label: string; onClick?: () => void; href?: string; disabled?: boolean };

const TEAM_HREF = "/app/employees";
const describedBy = (...ids: (string | false | null | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/** A labelled field: the help and the error are tied to the control by the ids the caller puts in aria-describedby. */
function Field({ id, label, help, error, children }: { id: string; label: string; help?: ReactNode; error?: string | null; children: ReactNode }) {
  return <div className="c-field">
    <label className="c-field__label" htmlFor={id}>{label}</label>
    {children}
    {help ? <span className="c-field__help" id={`${id}-help`}>{help}</span> : null}
    {error ? <span className="c-error" id={`${id}-error`}>{error}</span> : null}
  </div>;
}

/** The step's buttons, once for phones (full-width pills at the end of the card) and once for tablets and desktop (the
 * card's footer, as Add employee has it). CSS shows one set per width. */
export function StepActions({ primary, secondary }: { primary?: StepAction; secondary?: StepAction }) {
  if (!primary && !secondary) return null;
  return <>
    <div className="rimp-actions">
      {primary ? primary.href ? <BButtonLink href={primary.href} full>{primary.label}</BButtonLink>
        : <BButton full onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</BButton> : null}
      {secondary ? secondary.href ? <BButtonLink href={secondary.href} kind="quiet" full>{secondary.label}</BButtonLink>
        : <BButton kind="quiet" full onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</BButton> : null}
    </div>
    <CorpFormFooter>
      {secondary ? secondary.href ? <Link className="c-btn c-btn--secondary" href={secondary.href}>{secondary.label}</Link>
        : <button type="button" className="c-btn c-btn--secondary" onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</button> : null}
      {primary ? primary.href ? <Link className="c-btn" href={primary.href}>{primary.label}</Link>
        : <button type="button" className="c-btn" onClick={primary.onClick} disabled={primary.disabled}>{primary.label}</button> : null}
    </CorpFormFooter>
  </>;
}

/** A refusal or a lost connection: what happened, one line, one way forward. Announced when it appears. */
export function NoticeCard({ copy, notice, busy, onAction }: { copy: RosterImportCopy; notice: Notice; busy?: boolean; onAction: (action: NoticeAction) => void }) {
  const action = notice.action, label = notice.actionLabel;
  return <BState kind={notice.kind} title={notice.title} line={notice.line} alert>
    {action && label ? action === "signin" ? <BButtonLink href="/login">{label}</BButtonLink>
      : action === "team" ? <BButtonLink href={TEAM_HREF}>{label}</BButtonLink>
      : <BButton onClick={() => onAction(action)} disabled={busy}>{label}</BButton> : null}
    {notice.billing ? <BButtonLink href={notice.billing} kind="ghost">{copy.refused.employeeLimit.billing}</BButtonLink> : null}
  </BState>;
}

/** Step 1: paste the list or choose a file, and say where these people work. */
export function AddListStep({ copy, text, fileNote, listError, locations, locationId, locationError, busy, onText, onFile, onLocation }: {
  copy: RosterImportCopy; text: string; fileNote: string | null; listError: string | null;
  locations: ImportLocation[]; locationId: string; locationError: string | null; busy: boolean;
  onText: (text: string) => void; onFile: (file: File) => void; onLocation: (id: string) => void;
}) {
  const a = copy.add, file = useRef<HTMLInputElement>(null);
  const template = `data:text/csv;charset=utf-8,${encodeURIComponent(`﻿${a.templateText}`)}`;
  return <>
    {/* Package X: the intro paragraph went; it repeated the list field's help and the step names. */}
    <h2 className="rimp-h">{copy.stepNames[0]}</h2>
    <section className="rimp-needs" aria-labelledby="rimp-needs-title">
      <h3 className="rimp-h3" id="rimp-needs-title">{a.needsTitle}</h3>
      <p className="rimp-p">{a.needsLead}</p>
      <ul className="rimp-ul">{a.required.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="rimp-p">{a.optional}</p>
      <p className="rimp-p rimp-p--strong">{a.noEmail}</p>
      <p className="rimp-p">{a.headers} {a.limit}</p>
      {/* Package X: the example scrolls sideways on a phone, so the keyboard can reach and scroll it too (axe). */}
      <div className="rimp-scroll" tabIndex={0} role="region" aria-label={a.exampleLabel}>
        <table className="rimp-example">
          <caption>{a.exampleLabel}</caption>
          <thead><tr>{a.example.head.map(cell => <th key={cell} scope="col">{cell}</th>)}</tr></thead>
          <tbody>{a.example.rows.map(row => <tr key={row[0]}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <a className="c-link c-link--l rimp-template" href={template} download={a.templateFile}>{a.template}</a>
    </section>
    <Field id="rimp-list" label={a.listLabel} help={a.listHelp} error={listError}>
      <textarea id="rimp-list" className="c-in rimp-list" value={text} onChange={event => onText(event.target.value)} rows={8} wrap="off"
        spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" disabled={busy}
        aria-invalid={listError ? true : undefined} aria-describedby={describedBy("rimp-list-help", listError && "rimp-list-error", fileNote && "rimp-file-note")} />
    </Field>
    <div className="rimp-file">
      <input ref={file} type="file" hidden accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" tabIndex={-1}
        onChange={event => { const chosen = event.target.files?.[0]; event.target.value = ""; if (chosen) onFile(chosen); }} />
      <BButton kind="ghost" onClick={() => file.current?.click()} disabled={busy}>{a.upload}</BButton>
      <span className="c-field__help" id="rimp-file-note" role="status">{fileNote}</span>
    </div>
    {locations.length ? <Field id="rimp-location" label={a.locationLabel} help={a.locationHelp} error={locationError}>
      <select id="rimp-location" className="c-in" value={locationId} onChange={event => onLocation(event.target.value)} disabled={busy}
        aria-invalid={locationError ? true : undefined} aria-describedby={describedBy("rimp-location-help", locationError && "rimp-location-error")}>
        <option value="">{a.choose}</option>
        {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
      </select>
    </Field> : <p className="c-note" role="status"><span>{a.noLocations}{" "}<Link className="c-link c-link--l" href="/app/settings/locations">{a.locationsLink}</Link></span></p>}
  </>;
}

const ROLES = ["EMPLOYEE", "LEAD", "MANAGER"] as const;

/** Fix one row where it is. Saving writes the cells back to the list and asks for the check again; nothing is saved to
 * the company from here. */
/** Package X: whether the Owner has changed a field in the row editor since it opened; its error is then hidden. */
export function fieldEdited<F extends string>(values: Record<F, string>, start: Record<F, string>, field: NoInfer<F>): boolean {
  return values[field] !== start[field];
}

export function RowEditor({ copy, row, locations, errors, busy, onSave, onCancel, onRemove }: {
  copy: RosterImportCopy; row: RosterRow; locations: ImportLocation[]; errors: FieldError[]; busy: boolean;
  onSave: (changes: Partial<Record<RosterField, string>>) => void; onCancel: () => void; onRemove: () => void;
}) {
  const e = copy.review.editor, v = row.values, base = `rimp-r${row.rowNumber}`;
  const givenRole = (v.role ?? "").toUpperCase();
  const start: Record<EditorField, string> = {
    id: v.id ?? "", firstName: v.firstName ?? "", lastName: v.lastName ?? "", phone: v.phone ?? "", email: v.email ?? "",
    // No role means Employee; a role the import doesn't know stays unchosen until the Owner picks one.
    role: !givenRole ? "EMPLOYEE" : (ROLES as readonly string[]).includes(givenRole) ? givenRole : "",
    location: locations.some(location => location.id === v.primaryLocationId) ? v.primaryLocationId ?? "" : "",
  };
  const [values, setValues] = useState(start);
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  const set = (field: EditorField) => (event: { target: { value: string } }) => setValues(current => ({ ...current, [field]: event.target.value }));
  // Package X (live import, Nov 23): a field's error stays until its value changes; once the Owner types a fix, the red line
  // goes (it stayed until "Save and check again"). The check after Save says whether the new value is right.
  const problem = (field: EditorField) => { if (fieldEdited(values, start, field)) return null; const found = errors.find(error => editorField(error) === field); return found ? rowProblemText(copy, found, v) : null; };
  function save() {
    const changes: Partial<Record<RosterField, string>> = {};
    for (const field of ["id", "firstName", "lastName", "phone", "email"] as const) if (values[field].trim() !== start[field]) changes[field] = values[field];
    if (values.role && values.role !== start.role) changes.role = values.role;
    // "Same as the list" clears a location this row had; it adds no column when the row had none.
    if (values.location !== start.location || (v.primaryLocationId && !values.location)) changes.primaryLocationId = values.location;
    onSave(changes);
  }
  const input = (field: "id" | "firstName" | "lastName" | "phone" | "email", label: string, extra: { type?: string; inputMode?: "tel" | "email"; maxLength: number }) => {
    const id = `${base}-${field}`, error = problem(field);
    return <Field key={field} id={id} label={label} error={error}>
      <input ref={field === "id" ? first : undefined} id={id} className="c-in" value={values[field]} onChange={set(field)} disabled={busy} autoComplete="off" autoCorrect="off" spellCheck={false}
        autoCapitalize={field === "firstName" || field === "lastName" ? "words" : "none"} {...extra}
        onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); save(); } }}
        aria-invalid={error ? true : undefined} aria-describedby={describedBy(error && `${id}-error`)} />
    </Field>;
  };
  const roleError = problem("role"), locationError = problem("location");
  return <div className="rimp-editor" id={`${base}-editor`} role="group" aria-label={e.title(row.rowNumber)}>
    <div className="rimp-editor__fields">
      {input("id", e.id, { maxLength: 128 })}
      {input("firstName", e.firstName, { maxLength: 160 })}
      {input("lastName", e.lastName, { maxLength: 160 })}
      {input("phone", e.phone, { type: "tel", inputMode: "tel", maxLength: 20 })}
      {input("email", e.email, { type: "email", inputMode: "email", maxLength: 254 })}
      <Field id={`${base}-role`} label={e.role} error={roleError}>
        <select id={`${base}-role`} className="c-in" value={values.role} onChange={set("role")} disabled={busy}
          aria-invalid={roleError ? true : undefined} aria-describedby={describedBy(roleError && `${base}-role-error`)}>
          {values.role ? null : <option value="">{copy.add.choose}</option>}
          {ROLES.map(role => <option key={role} value={role}>{copy.review.roles[role]}</option>)}
        </select>
      </Field>
      <Field id={`${base}-location`} label={e.location} error={locationError}>
        <select id={`${base}-location`} className="c-in" value={values.location} onChange={set("location")} disabled={busy}
          aria-invalid={locationError ? true : undefined} aria-describedby={describedBy(locationError && `${base}-location-error`)}>
          <option value="">{e.sameLocation}</option>
          {locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}
        </select>
      </Field>
    </div>
    <div className="rimp-editor__acts">
      <BButton onClick={save} disabled={busy}>{e.save}</BButton>
      <BButton kind="quiet" onClick={onCancel} disabled={busy}>{e.cancel}</BButton>
      <button type="button" className="rimp-remove" onClick={onRemove} disabled={busy}>{e.remove}</button>
    </div>
  </div>;
}

/** Step 2: every person the list holds, what each resolved to, and what needs a fix, before anything is saved. */
export function ReviewStep({ copy, preview, locations, defaultLocationId, headcounts, removedCount, rowErrors, editing, busy, scopeChoice, onEdit, onSaveRow, onRemoveRow, onScope }: {
  copy: RosterImportCopy; preview: PreviewReady; locations: ImportLocation[]; defaultLocationId: string; headcounts: Headcounts;
  removedCount: number; rowErrors: Map<number, FieldError[]>; editing: number | null; busy: boolean; scopeChoice: string;
  onEdit: (rowNumber: number | null) => void; onSaveRow: (rowNumber: number, changes: Partial<Record<RosterField, string>>) => void;
  onRemoveRow: (rowNumber: number) => void; onScope: (choice: string) => void;
}) {
  const r = copy.review, summary = summarizePreview(preview);
  const ok = (row: RosterRow) => rowReady(row) && !rowErrors.has(row.rowNumber);
  const ready = preview.rows.filter(ok).length, needFix = preview.rows.length - ready;
  const after = headcountsAfter(headcounts, preview);
  const counts = [
    { text: copy.counts.active, now: headcounts.activePeople, after: after.activePeople },
    { text: copy.counts.eligible, now: headcounts.availabilityEligible, after: after.availabilityEligible },
    { text: copy.counts.plan, now: headcounts.planCount, after: after.planCount },
  ];
  return <>
    <h2 className="rimp-h">{copy.stepNames[1]}</h2>
    <div className="rimp-summary" id="rimp-summary" tabIndex={-1}>
      <p className="rimp-summary__n">{r.summary(ready, needFix)}</p>
      <p className="rimp-p">{needFix ? r.blocked(needFix) : r.allReady(ready)}</p>
    </div>
    {preview.ignoredColumns.length ? <p className="c-note rimp-note"><span>{r.ignored(preview.ignoredColumns)}</span></p> : null}
    {removedCount ? <p className="c-note rimp-note"><span>{r.removed(removedCount)}</span></p> : null}
    {summary.managers ? <section className="rimp-manager" aria-labelledby="rimp-manager-title">
      <h3 className="rimp-h3" id="rimp-manager-title">{r.manager.title}</h3>
      {/* Package X: no red border before anyone has chosen; the Manager row's own line says what is missing, and Import
        waits for the choice. */}
      <p className="rimp-p" id="rimp-scope-help">{r.manager.line}</p>
      <div className="c-field">
        <label className="c-field__label" htmlFor="rimp-scope">{r.manager.label}</label>
        <select id="rimp-scope" className="c-in" value={scopeChoice} onChange={event => onScope(event.target.value)} disabled={busy}
          aria-describedby="rimp-scope-help" aria-required={summary.needsManagerScope || undefined}>
          <option value="">{r.manager.choose}</option>
          <option value="COMPANY">{r.manager.company}</option>
          {locations.map(location => <option key={location.id} value={`LOCATION:${location.id}`}>{r.manager.only(location.name)}</option>)}
        </select>
      </div>
    </section> : null}
    {/* A table on desktop; under 1024px each row is a stacked card (roster-import.css). The roles keep it a table for
        screen readers when CSS changes how it is laid out. */}
    <table className="rimp-table" role="table" aria-label={r.tableLabel} aria-busy={busy || undefined}>
      <thead role="rowgroup"><tr role="row">
        <th role="columnheader" scope="col">{r.columns.row}</th><th role="columnheader" scope="col">{r.columns.person}</th>
        <th role="columnheader" scope="col">{r.columns.role}</th><th role="columnheader" scope="col">{r.columns.contact}</th>
        <th role="columnheader" scope="col">{r.columns.status}</th><th role="columnheader" scope="col"><span className="c-sr">{r.columns.change}</span></th>
      </tr></thead>
      <tbody role="rowgroup">{preview.rows.map(row => {
        const fromImport = rowErrors.get(row.rowNumber) ?? [], good = ok(row), open = editing === row.rowNumber;
        const shown = describeRow(copy, row, locations, defaultLocationId), problems = rowProblems(copy, row, fromImport);
        const action = good ? r.edit : r.fix, base = `rimp-r${row.rowNumber}`;
        return <Fragment key={row.rowNumber}>
          <tr role="row" className="rimp-row" data-state={good ? "ready" : "fix"}>
            <td role="cell" className="rimp-row__n"><span className="rimp-cap">{r.columns.row} </span>{row.rowNumber}</td>
            <th role="rowheader" scope="row" className="rimp-row__who"><span className="rimp-row__name">{shown.name}</span><span className="rimp-row__sub">{shown.id}</span></th>
            <td role="cell"><span className="rimp-row__main">{shown.role}</span><span className="rimp-row__sub">{shown.location}</span></td>
            <td role="cell"><span className="rimp-row__main">{shown.phone}</span><span className="rimp-row__sub">{shown.email ?? r.noEmail}</span></td>
            <td role="cell" className="rimp-row__status">
              <BChip tone={good ? "green" : "red"}>{good ? r.ready : r.needsFix}</BChip>
              {problems.length ? <ul className="rimp-problems" id={`${base}-problems`}>{problems.map(problem => <li key={problem}>{problem}</li>)}</ul> : null}
            </td>
            <td role="cell" className="rimp-row__act">
              <button type="button" className="rimp-change" id={`${base}-change`} aria-expanded={open} aria-controls={open ? `${base}-editor` : undefined}
                aria-label={r.changeLabel(action, row.rowNumber, shown.name)} aria-describedby={problems.length ? `${base}-problems` : undefined}
                onClick={() => onEdit(open ? null : row.rowNumber)} disabled={busy}>{action}</button>
            </td>
          </tr>
          {open ? <tr role="row" className="rimp-editrow"><td role="cell" colSpan={6}>
            <RowEditor copy={copy} row={row} locations={locations} errors={[...row.fieldErrors, ...fromImport]} busy={busy}
              onSave={changes => onSaveRow(row.rowNumber, changes)} onCancel={() => onEdit(null)} onRemove={() => onRemoveRow(row.rowNumber)} />
          </td></tr> : null}
        </Fragment>;
      })}</tbody>
    </table>
    <section className="rimp-counts" aria-labelledby="rimp-counts-title">
      <h3 className="rimp-h3" id="rimp-counts-title">{copy.counts.title}</h3>
      <p className="rimp-p">{copy.counts.lead}</p>
      <BList>{counts.map(count => <BRow key={count.text.label} title={count.text.label} sub={count.text.help}
        end={<><b>{copy.counts.now(count.now)}</b>{count.after !== count.now ? <span>{copy.counts.after(count.after)}</span> : null}</>} />)}</BList>
    </section>
  </>;
}

/** Step 3 while the request is out. */
export function ImportingStep({ copy, count }: { copy: RosterImportCopy; count: number }) {
  return <>
    <h2 className="rimp-h">{copy.stepNames[2]}</h2>
    <BState kind="loading" title={copy.importing.title(count)} line={copy.importing.line} />
  </>;
}

/** The answer didn't arrive. The same command goes again; nothing here lets the Owner start a different one. */
export function UnknownStep({ copy, offline, busy, note, onRetry }: { copy: RosterImportCopy; offline: boolean; busy: boolean; note?: string | null; onRetry: () => void }) {
  const u = copy.unknown;
  return <>
    <h2 className="rimp-h">{copy.stepNames[2]}</h2>
    <BState kind={offline ? "offline" : "paused"} title={offline ? copy.offline.title : u.title} line={offline ? copy.offline.lineUnknown : u.line} alert>
      {note ? <p className="b-statecard__s">{note}</p> : null}
      <p className="b-statecard__s">{u.stay}</p>
      <BButton onClick={onRetry} disabled={busy}>{busy ? u.busy : u.action}</BButton>
    </BState>
  </>;
}

/** The import is saved: how many people, who was left out and why, and where to go next. */
export function DoneStep({ copy, added, withoutEmail, removed, onAnother }: { copy: RosterImportCopy; added: number; withoutEmail: number; removed: RemovedRow[]; onAnother: () => void }) {
  const d = copy.done;
  return <>
    <h2 className="rimp-h">{copy.stepNames[2]}</h2>
    <div className="rimp-done" id="rimp-done" tabIndex={-1}>
      <p className="rimp-summary__n">{d.title(added)}</p>
      <p className="rimp-p">{d.line}</p>
      {removed.length ? <>
        <p className="rimp-p">{d.skipped(removed.length)}</p>
        <ul className="rimp-ul">{removed.map(row => <li key={row.rowNumber}>{d.skippedRow(row.rowNumber, row.name, row.why)}</li>)}</ul>
      </> : <p className="rimp-p">{d.noneSkipped}</p>}
      {withoutEmail ? <p className="rimp-p rimp-p--strong">{d.noEmail(withoutEmail)}</p> : null}
    </div>
    <section className="rimp-next" aria-labelledby="rimp-next-title">
      <h3 className="rimp-h3" id="rimp-next-title">{d.next}</h3>
      <BList>
        <BRow title={d.invite} sub={d.inviteLine} href={TEAM_HREF} />
        <BRow title={d.schedule} sub={d.scheduleLine} href="/app/schedule" />
      </BList>
    </section>
    <StepActions secondary={{ label: d.another, onClick: onAnother }} />
  </>;
}
