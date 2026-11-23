"use client";

import { useEffect, useRef, type ChangeEvent } from "react";
import { CorpField } from "@/components/corp/corp";
import { EARLIEST_EMPLOYMENT_DATE, type EmploymentDates } from "@/lib/employment-dates";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { EMPLOYMENT_DATES_COPY } from "./employment-date-fields-copy";

/** The order rule, said at the field (the shared field error: no closing period). The server says the same. */
export const TERMINATION_BEFORE_HIRE = EMPLOYMENT_DATES_COPY.en.terminationBeforeHire;

/** Optional hire, termination and birth dates inside Add employee and Edit employee (management only). Uncontrolled
 * inputs: the form's command builder reads them (employmentDatesFromForm) and the server applies the date rules.
 * The termination date is a record only; the Access and sign-in page keeps Deactivate.
 * Review 30 (D03): a refusal is the field's own error, in the one field-error look. The order rule is checked here as
 * the dates change, so Next or Save stops at the termination date with its message (the shared form validation shows
 * it and moves focus there); a refusal the server sends back is set on its field by the form and cleared here when the
 * field changes. D38: the hire date's line names the Christmas bonus report only where that report exists. */
export function EmploymentDateFields({ idPrefix, value, bonusApplies = true, focusHire = false }: { idPrefix: string; value?: EmploymentDates;
  /** The workspace is in Puerto Rico, where Christmas bonus hours read the hire date. */
  bonusApplies?: boolean;
  /** Review 30 (D21): opened from the Christmas bonus report to add a hire date, so the hire date takes focus. */
  focusHire?: boolean }) {
  const id = (name: string) => `${idPrefix}-${name}`;
  // Signed-in Spanish (es-rest): the labels, help lines and the two field errors follow the person's language.
  // The 1900 floor, in words a person reads (the browser's own range message showed "Use 1900-01-01 or more").
  const t = EMPLOYMENT_DATES_COPY[usePortalLang()], FLOOR = t.floor;
  const hire = useRef<HTMLInputElement>(null), termination = useRef<HTMLInputElement>(null);
  const order = () => {
    const from = hire.current?.value ?? "", to = termination.current?.value ?? "";
    termination.current?.setCustomValidity(from && to && to < from ? t.terminationBeforeHire : "");
  };
  // A change clears a refusal the server set on this field, then the order rule is checked again.
  // Final polish (Nov 20, 2026): an empty date shows its format in grey, like a placeholder (data-empty; b-foundation.css).
  const changed = (event: ChangeEvent<HTMLInputElement>) => { event.currentTarget.toggleAttribute("data-empty", !event.currentTarget.value); event.currentTarget.setCustomValidity(""); order(); };
  useEffect(() => {
    if (!focusHire || !hire.current) return;
    hire.current.focus({ preventScroll: true });
    hire.current.scrollIntoView({ block: "center" });
  }, [focusHire]);
  // Full width, one under another: a half-width "Termination date (optional)" label wraps on phones and misaligns its input.
  return <>
    <CorpField label={t.hire} htmlFor={id("hire")} help={<span id={id("hire-help")}>{bonusApplies ? t.hireBonus : t.hireRecords}</span>}>
      <input ref={hire} id={id("hire")} className="c-in c-in--date" type="date" name="hireDate" defaultValue={value?.hireDate ?? ""} data-empty={value?.hireDate ? undefined : ""} min={EARLIEST_EMPLOYMENT_DATE} data-underflow={FLOOR} aria-describedby={id("hire-help")} onChange={changed} />
    </CorpField>
    <CorpField label={t.termination} htmlFor={id("termination")} help={<span id={id("termination-help")}>{t.terminationHelp}</span>}>
      <input ref={termination} id={id("termination")} className="c-in c-in--date" type="date" name="terminationDate" defaultValue={value?.terminationDate ?? ""} data-empty={value?.terminationDate ? undefined : ""} min={EARLIEST_EMPLOYMENT_DATE} data-underflow={FLOOR} aria-describedby={id("termination-help")} onChange={changed} />
    </CorpField>
    <CorpField label={t.birth} htmlFor={id("birth")} help={<span id={id("birth-help")}>{t.birthHelp}</span>}>
      <input id={id("birth")} className="c-in c-in--date" type="date" name="birthDate" defaultValue={value?.birthDate ?? ""} data-empty={value?.birthDate ? undefined : ""} min={EARLIEST_EMPLOYMENT_DATE} data-underflow={FLOOR} autoComplete="off" aria-describedby={id("birth-help")} onChange={changed} />
    </CorpField>
  </>;
}
