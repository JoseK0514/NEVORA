"use client";

/** A local, transient copy of submitted fields. Never stored or sent elsewhere. */
export function shiftDraftText(data: FormData): string {
  return [
    ["Employee", "employeeId"], ["Position", "positionId"], ["Date", "date"],
    ["Start", "startTime"], ["End", "endTime"], ["Shift lead", "isDesignatedLead"], ["Notes", "notes"],
  ].map(([label, field]) => `${label}: ${String(data.get(field) ?? "")}`).join("\n");
}

export function ShiftReviewRecovery({ draft }: { draft: string }) {
  return <div className="employee-form">
    <p>Your unsaved changes are retained below. Copy any values you need before reloading to review the current shift. Reloading replaces this draft.</p>
    <details>
      <summary>Unsaved changes to copy</summary>
      <label>Submitted shift changes<textarea readOnly value={draft} rows={8} onFocus={event => event.currentTarget.select()} /></label>
    </details>
    <button type="button" className="button secondary" onClick={() => window.location.reload()}>Reload current shift</button>
  </div>;
}
