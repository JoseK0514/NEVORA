"use client";

import type { PortalLang } from "@/lib/i18n/portal-lang";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { shiftCopy } from "./shift-copy";

/** A local, transient copy of submitted fields. Never stored or sent elsewhere. */
export function shiftDraftText(data: FormData, lang: PortalLang = "en"): string {
  const labels = shiftCopy(lang).recovery.fields;
  return (["employeeId", "positionId", "date", "startTime", "endTime", "isDesignatedLead", "notes"] as const)
    .map(field => `${labels[field]}: ${String(data.get(field) ?? "")}`).join("\n");
}

export function ShiftReviewRecovery({ draft }: { draft: string }) {
  const t = shiftCopy(usePortalLang()).recovery;
  return <div className="employee-form">
    <p>{t.retained}</p>
    <details>
      <summary>{t.toCopy}</summary>
      <label>{t.submitted}<textarea readOnly value={draft} rows={8} onFocus={event => event.currentTarget.select()} /></label>
    </details>
    <button type="button" className="button secondary" onClick={() => window.location.reload()}>{t.reload}</button>
  </div>;
}
