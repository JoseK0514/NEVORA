"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { DecisionAsk } from "./owner-b/decision-parts";
import { TIME_COPY } from "./time-copy";
import { usePortalLang } from "@/lib/i18n/portal-lang";

export function LeaveDeclineAsk(props: Omit<ComponentProps<typeof DecisionAsk>, "goValue" | "busyLabel" | "children">) {
  const portal = usePortalLang();
  const t = TIME_COPY[props.lang === "es" || props.lang === "en" ? props.lang : portal];
  const { pending } = useFormStatus();
  return <DecisionAsk {...props} goValue="DENIED" busyLabel={pending ? t.declining : undefined}>
    <label className="tod-note-field"><span>{t.noteToEmployee}</span>
      <textarea name="declineNote" className="c-in" rows={2} maxLength={500} readOnly={pending} />
    </label>
  </DecisionAsk>;
}
