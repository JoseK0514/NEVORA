"use client";

import { useEffect, useRef } from "react";
import { CorpField } from "@/components/corp/corp";
import type { EmploymentDates } from "@/lib/employment-dates";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { EMPLOYMENT_DATES_COPY } from "./employment-date-fields-phase3-copy";
import { EmploymentDatePicker } from "./employment-date-picker";

export const TERMINATION_BEFORE_HIRE = EMPLOYMENT_DATES_COPY.en.terminationBeforeHire;

export function EmploymentDateFields({ idPrefix, value, bonusApplies = true, focusHire = false }: {
  idPrefix: string; value?: EmploymentDates; bonusApplies?: boolean; focusHire?: boolean;
}) {
  const t = EMPLOYMENT_DATES_COPY[usePortalLang()];
  const hire = useRef<HTMLInputElement>(null), termination = useRef<HTMLInputElement>(null), birth = useRef<HTMLInputElement>(null);
  const order = () => {
    const from = hire.current?.value ?? "", to = termination.current?.value ?? "";
    termination.current?.setCustomValidity(from && to && to < from ? t.terminationBeforeHire : "");
  };
  useEffect(() => {
    if (!focusHire) return;
    const button = document.getElementById(idPrefix + "-hire-button");
    button?.focus({ preventScroll: true });
    button?.scrollIntoView({ block: "center" });
  }, [focusHire, idPrefix]);
  const fields = [
    { key: "hireDate", id: "hire", ref: hire, label: t.hire, help: bonusApplies ? t.hireBonus : t.hireRecords },
    { key: "terminationDate", id: "termination", ref: termination, label: t.termination, help: t.terminationHelp },
    { key: "birthDate", id: "birth", ref: birth, label: t.birth, help: t.birthHelp },
  ] as const;
  return <>{fields.map(field => {
    const id = idPrefix + "-" + field.id;
    return <CorpField key={id} label={<span id={id + "-label"}>{field.label}</span>} htmlFor={id + "-button"} help={<span id={id + "-help"}>{field.help}</span>}>
      <EmploymentDatePicker id={id} label={field.label} name={field.key} inputRef={field.ref} initial={value?.[field.key] ?? ""} checkOrder={order} />
    </CorpField>;
  })}</>;
}
