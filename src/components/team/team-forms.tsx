"use client";
import { AllLocationsCheckbox } from "@/components/team/all-locations-checkbox";
import "./team-forms.css";
import Link from "next/link";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { TEAM_COPY } from "@/components/team-copy";
import { useId, useState, type ReactNode } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { phoneTyping } from "./phone";
import { normalizePhoneNumber } from "@/lib/phone";

/* Team forms on the corporate kit (boards O-AddEmployee, O-AddEmployeePay, O-EditEmployee). Presentation only: every
 * control keeps the field name and constraints its form's command reads. */

/** A sheet's header: Cancel (or ‹ Back) left, the title with an optional step under it, Save / Next / Add right. */
export function FormHead({ left, title, step, right, titleId, back }: { left: ReactNode; title: ReactNode; step?: ReactNode; right?: ReactNode; titleId?: string;
  /** Closing F1 (NV-257): on tablets and desktop (where the bar's own links leave the band) a "‹ Team" back link over the title. */
  back?: { href: string; label: string } }) {
  return <div className="c-nav c-formhead">
    <span className="c-formhead__l">{left}</span>
    <span className="c-formhead__t">{back ? <Link className="c-formhead__up" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{back.label}</Link> : null}<h1 className="c-nav__title" id={titleId} tabIndex={-1}>{title}</h1>{step ? <span className="c-formhead__step">{step}</span> : null}</span>
    <span className="c-nav__right">{right ?? null}</span>
  </div>;
}

export function FormHeadLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="c-formhead__link" href={href}>{children}</Link>;
}

export function FormHeadBack({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return <button type="button" className="c-formhead__link c-formhead__back" onClick={onClick}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{children}</button>;
}

/** The mobile phone field: "(787) 555-0142" while typed; the form's command saves it as 787-555-0142. */
export function PhoneField({ id, name, defaultValue = "", required, autoComplete, enterKeyHint, missing, preserveLegacy = false }: { id: string; name: string; defaultValue?: string; required?: boolean; autoComplete?: string; enterKeyHint?: "next" | "done";
  /** The sentence shown when it is left empty (form-validation.tsx reads data-missing). */
  missing?: string; preserveLegacy?: boolean }) {
  // An empty field is never a legacy value: it stays required (dev integration B3, Nov 23).
  const t = TEAM_COPY[usePortalLang()];
  const [legacy] = useState(() => preserveLegacy && defaultValue.trim() !== "" && normalizePhoneNumber(defaultValue) === null ? defaultValue : null);
  const [value, setValue] = useState(() => legacy ?? phoneTyping(defaultValue));
  const unchangedLegacy = legacy !== null && value === legacy;
  return <input id={id} className="c-in" name={name} type="tel" inputMode="tel" autoComplete={autoComplete} enterKeyHint={enterKeyHint} value={value} required={required && !unchangedLegacy}
    placeholder="(787) 555-0123" maxLength={14} pattern={unchangedLegacy ? undefined : String.raw`\(\d{3}\) \d{3}-\d{4}`} title={t.phoneTitle} data-missing={missing}
    onChange={event => {
      const next = event.target.value;
      const digits = (text: string) => text.replace(/\D/g, "");
      // Deleting a bracket, space or dash removes the digit before it, so Backspace never sticks.
      const deleted = next.length < value.length && digits(next) === digits(value);
      const typed = deleted ? digits(next).slice(0, -1) : next;
      const formatted = phoneTyping(typed);
      const restoredLegacy = legacy !== null && formatted !== "" && formatted === phoneTyping(legacy);
      setValue(restoredLegacy ? legacy : formatted);
    }} />;
}

export type Choice = { value: string; label: string; help?: string; checked?: boolean; disabled?: boolean };

/** A field that opens a checklist ("Positions › Cashier, Barista"). The checkboxes stay in the form while it's closed. */
/** `listed`: the checklist is the page (its own sheet), so it shows without the picker button. */
export function ChoiceField({ label, name, choices, empty, none: noneWord, listed = false, allLocations = false }: { label: string; name: string; choices: Choice[]; empty?: string; none?: string; listed?: boolean; allLocations?: boolean }) {
  const id = useId().replace(/:/g, "");
  const lang = usePortalLang();
  const none = noneWord ?? TEAM_COPY[lang].none;
  const [open, setOpen] = useState(listed);
  const [chosen, setChosen] = useState(() => new Set(choices.filter(choice => choice.checked).map(choice => choice.value)));
  const names = choices.filter(choice => chosen.has(choice.value)).map(choice => choice.label);
  if (!choices.length) return <div className="c-field"><span className="c-field__label">{label}</span><span className="c-in c-in--static">{empty ?? none}</span></div>;
  return <div className="c-field">
    <span className="c-field__label" id={`${id}-label`}>{label}</span>
    {listed ? null : <button type="button" className="c-in c-pick" aria-expanded={open} aria-controls={`${id}-list`} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen(value => !value)}>
      <span id={`${id}-value`} className={names.length ? "c-pick__value" : "c-pick__value c-pick__value--none"}>{names.length ? names.join(", ") : none}</span>
      <CaretDownIcon className="c-ic c-ic--s c-pick__caret" weight="bold" aria-hidden="true" />
    </button>}
    <fieldset className="c-checks" id={`${id}-list`} hidden={!open} aria-labelledby={`${id}-label`}>
      {allLocations && <AllLocationsCheckbox lang={lang} ids={choices.filter(choice => !choice.disabled || chosen.has(choice.value)).map(choice => choice.value)}
        selected={[...chosen]} className="c-check" inputClassName="c-check__box" disabled={choices.every(choice => choice.disabled)}
        onToggle={all => setChosen(new Set(choices.filter(choice => choice.disabled ? chosen.has(choice.value) : all).map(choice => choice.value)))} />}
      {choices.map(choice => <label key={choice.value} className="c-check">
        <input type="checkbox" className="c-check__box" name={name} value={choice.value} {...(allLocations ? { checked: chosen.has(choice.value) } : { defaultChecked: choice.checked })} disabled={choice.disabled}
          onChange={event => {
            const checked = event.currentTarget.checked;
            setChosen(current => { const next = new Set(current); if (checked) next.add(choice.value); else next.delete(choice.value); return next; });
          }} />
        <span className="c-check__text"><span>{choice.label}</span>{choice.help ? <small>{choice.help}</small> : null}</span>
      </label>)}
    </fieldset>
  </div>;
}

/** Marks the page as a sheet, so the shell covers the tab bar as the boards do. */
export function SheetMarker() {
  return <span className="q-page" data-q-sheet="" hidden />;
}
