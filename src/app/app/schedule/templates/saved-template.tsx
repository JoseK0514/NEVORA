"use client";

import { cloneElement, useId, useRef, useState, type FormEvent, type ReactElement } from "react";
import { CorpBody, CorpCard } from "@/components/corp/corp";
import { BButton } from "@/components/owner-b/b-kit";
import { scheduleCopy } from "@/components/schedule-copy";
import { timeChoices } from "@/lib/scheduling/shift-time-choices";
import type { SavedShift, TemplateDetail, TemplateEditResult } from "@/lib/data/schedule-templates";
import { scheduleWords, type ScheduleLang } from "../schedule-copy";

const copy = {
  en: {
    scope: "Changes apply the next time you use this template.", rename: "Rename", shifts: "Template shifts",
    day: "Day", all: "All days", open: "Open shift", empty: "No shifts for this day.", emptyWeek: "This template has no shifts yet.",
    remove: "Remove shift", confirm: "Remove this shift from the template?", removing: "Removing…",
    next: "Next day", midnight: "Midnight at end of day", inactive: "Inactive",
    invalid: "Check the fields and choose different start and end times.", duplicate: "Choose a different template name.",
    stale: "The template or its choices changed. Cancel and reopen the edit to use the latest version.",
    failed: "Couldn’t confirm the change. Check the template and try again.", saved: "Template updated.",
  },
  es: {
    scope: "Los cambios se aplicarán la próxima vez que uses esta plantilla.", rename: "Cambiar nombre", shifts: "Turnos de la plantilla",
    day: "Día", all: "Todos los días", open: "Turno disponible", empty: "No hay turnos para este día.", emptyWeek: "Esta plantilla aún no tiene turnos.",
    remove: "Quitar turno", confirm: "¿Quitar este turno de la plantilla?", removing: "Quitando…",
    next: "Día siguiente", midnight: "Medianoche al final del día", inactive: "Inactivo",
    invalid: "Revisa los campos y elige horas distintas para el inicio y el fin.", duplicate: "Elige otro nombre para la plantilla.",
    stale: "La plantilla o sus opciones cambiaron. Cancela y vuelve a editar para usar la versión más reciente.",
    failed: "No pudimos confirmar el cambio. Revisa la plantilla e inténtalo de nuevo.", saved: "Plantilla actualizada.",
  },
};

type Editor = { kind: "add" | "edit" | "rename"; revision: string; shift?: SavedShift };
type Action = (id: string, revision: string, form: FormData) => Promise<TemplateEditResult>;
const dayNames = (lang: ScheduleLang) => {
  const [sunday, ...rest] = scheduleWords(lang).rules.dayNames;
  return [...rest, sunday];
};

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return <div className="c-field"><label className="c-field__label" htmlFor={id}>{label}</label>{cloneElement(children, { id })}</div>;
}

function EditorForm({ editor, template, lang, day, action, close }: {
  editor: Editor; template: TemplateDetail; lang: ScheduleLang; day: number; action: Action; close: (saved: boolean) => void;
}) {
  const t = copy[lang], { shiftForm: f, time } = scheduleCopy(lang);
  const row = editor.shift;
  const [employee, setEmployee] = useState(row?.employee ?? "");
  const [lead, setLead] = useState(row?.lead ?? false);
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const canLead = template.employees.some(person => person.id === employee && person.canLead) ||
    Boolean(row?.lead && (row.employee ?? "") === employee);
  const options = (choices: TemplateDetail["positions"], current?: string | null) => choices
    .filter(choice => choice.active || choice.id === current)
    .map(choice => <option key={choice.id} value={choice.id}>{choice.name}{choice.active ? "" : ` (${t.inactive})`}</option>);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = new FormData(event.currentTarget);
    form.set("kind", confirm ? "remove" : editor.kind);
    if (row) form.set("shiftId", row.id);
    if (!confirm && editor.kind !== "rename" && form.get("start") === form.get("end")) {
      setError(t.invalid); return;
    }
    saving.current = true;
    setPending(true); setError("");
    try {
      const result = await action(template.id, editor.revision, form);
      if (result === "saved") close(true);
      else setError(t[result]);
    } catch { setError(t.failed); }
    finally { saving.current = false; setPending(false); }
  }
  return <form className="tpl-editor" onSubmit={submit}>
    <fieldset className="tpl-fields" disabled={pending} hidden={confirm}>
      <legend>{editor.kind === "rename" ? t.rename : editor.kind === "add" ? f.addShift : f.editShift}</legend>
      {editor.kind === "rename" ? <Field label={scheduleWords(lang).templates.name}><input autoFocus className="c-in" name="name" defaultValue={template.name} minLength={3} maxLength={50} required /></Field>
        : <>
          <Field label={f.person}><select autoFocus className="c-in" name="employee" value={employee} onChange={e => {setEmployee(e.target.value); setLead(false);}}>
            <option value="">{t.open}</option>{options(template.employees, row?.employee)}</select></Field>
          <Field label={f.location}><select className="c-in" name="location" defaultValue={row?.location ?? ""} required>
            <option value="" disabled>{f.choose}</option>{options(template.locations, row?.location)}</select></Field>
          <Field label={f.position}><select className="c-in" name="position" defaultValue={row?.position ?? ""}>
            <option value="">{f.none}</option>{options(template.positions, row?.position)}</select></Field>
          <Field label={t.day}><select className="c-in" name="day" defaultValue={row?.day ?? day}>
            {dayNames(lang).map((name, i) => <option value={i} key={name}>{name}</option>)}</select></Field>
          {(["start", "end"] as const).map(key => <Field label={f[key]} key={key}>
            <select className="c-in" name={key} defaultValue={row?.[key] ?? (key === "start" ? "09:00" : "17:00")}>
              {timeChoices(row?.[key] ?? "", time).filter(option => option.value !== "24:00").map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
              {key === "end" && <option value="24:00">{t.midnight}</option>}
            </select></Field>)}
          <label className="tpl-lead"><input type="checkbox" name="lead" checked={lead} disabled={!canLead} onChange={e => setLead(e.target.checked)} /> {f.shiftLead}</label>
          <Field label={f.note}><textarea className="c-in" name="notes" defaultValue={row?.notes ?? ""} /></Field>
        </>}
    </fieldset>
    {error && <p role="alert" className="form-error">{error}</p>}
    {confirm && <p role="alert">{t.confirm}</p>}
    <div className="tpl-buttons">
      {editor.kind === "edit" && !confirm && <BButton kind="quiet" disabled={pending} onClick={() => {setConfirm(true); setError("");}}>{t.remove}</BButton>}
      <BButton kind="ghost" disabled={pending} onClick={() => confirm ? setConfirm(false) : close(false)}>{f.cancel}</BButton>
      <button className={confirm ? "b-btn b-btn--danger" : "c-btn"} type="submit" formNoValidate={confirm} aria-busy={pending} disabled={pending}>
        {pending ? (confirm ? t.removing : f.saving) : confirm ? t.remove : f.saveChanges}
      </button>
    </div>
  </form>;
}

export function SavedTemplate({ template, lang, action }: { template: TemplateDetail; lang: ScheduleLang; action: Action }) {
  const t = copy[lang], { shiftForm: f, time } = scheduleCopy(lang);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [day, setDay] = useState("all");
  const [saved, setSaved] = useState(false);
  const trigger = useRef<HTMLElement | null>(null), filter = useRef<HTMLSelectElement>(null);
  const begin = (kind: Editor["kind"], shift?: SavedShift) => {
    trigger.current = document.activeElement as HTMLElement;
    setEditor({ kind, shift, revision: template.revision }); setSaved(false);
  };
  const close = (didSave: boolean) => {
    setEditor(null); setSaved(didSave);
    requestAnimationFrame(() => (trigger.current?.isConnected ? trigger.current : filter.current)?.focus({ preventScroll: true }));
  };
  const form = editor && <EditorForm editor={editor} template={template} lang={lang} action={action} day={day === "all" ? 0 : Number(day)} close={close} />;
  const labels = (options: TemplateDetail["positions"]) => new Map(options.map(o => [o.id, o.name]));
  const people = labels(template.employees), places = labels(template.locations), positions = labels(template.positions);
  const days = dayNames(lang);
  const inlineEditor = editor?.shift && template.shifts.some(row =>
    row.id === editor.shift?.id && (day === "all" || row.day === Number(day)));
  return <>
    <CorpCard label={t.shifts} count={template.shifts.length} id="template-details"><CorpBody>
      <p className="tpl-scope">{t.scope}</p>
      <div className="tpl-tools">
        <Field label={t.day}><select ref={filter} className="c-in" value={day} disabled={!!editor} onChange={e => setDay(e.target.value)}>
          <option value="all">{t.all}</option>{days.map((name, i) => <option key={name} value={i}>{name}</option>)}</select></Field>
        <div className="tpl-buttons"><BButton kind="ghost" disabled={!!editor} onClick={() => begin("rename")}>{t.rename}</BButton>
          <BButton disabled={!!editor} onClick={() => begin("add")}>{f.addShift}</BButton></div>
      </div>
      {!inlineEditor && form}
      {saved && <p role="status">{t.saved}</p>}
      {!template.shifts.length && <p>{t.emptyWeek}</p>}
    </CorpBody></CorpCard>
    {days.map((name, index) => {
      if (day !== "all" && Number(day) !== index) return null;
      const rows = template.shifts.filter(row => row.day === index);
      if (!rows.length && (day === "all" || !template.shifts.length)) return null;
      return <CorpCard key={name} label={name} count={rows.length} id={`template-day-${index}`}>
        {rows.length ? <ul className="c-rows c-tpl__list">{rows.map(row => {
          const person = row.employee ? people.get(row.employee) : t.open;
          const range = `${time(row.start)} – ${time(row.end)}`;
          return <li className="tpl-row" key={row.id}>
            <div className="tpl-line"><div><strong>{person}</strong><p>{range}{(row.end < row.start || row.end === "24:00") && ` · ${t.next}`}</p>
              <p>{[places.get(row.location), row.position && positions.get(row.position), row.lead && f.shiftLead].filter(Boolean).join(" · ")}</p>
              {row.notes && <p className="tpl-note">{row.notes}</p>}</div>
              <BButton kind="quiet" disabled={!!editor} label={`${f.editShift} · ${person} · ${name} · ${range}`} onClick={() => begin("edit", row)}>{f.editShift}</BButton>
            </div>{editor?.shift?.id === row.id && form}
          </li>;
        })}</ul> : <CorpBody>{t.empty}</CorpBody>}
      </CorpCard>;
    })}
  </>;
}
