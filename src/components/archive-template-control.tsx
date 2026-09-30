"use client";

import { useState } from "react";
import { archiveTemplateAction } from "@/app/app/schedule/templates/actions";

export function ArchiveTemplateControl({ templateId, templateName, weekStart }: { templateId: string; templateName: string; weekStart: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return <button className="button ghost" type="button" onClick={() => setConfirming(true)} aria-label={`Archive ${templateName}`}>Archive</button>;
  }

  return (
    <form action={archiveTemplateAction} className="template-archive-confirm">
      <input type="hidden" name="weekStart" value={weekStart} />
      <input type="hidden" name="templateId" value={templateId} />
      <span>Archive {templateName}?</span>
      <button className="button ghost" type="button" onClick={() => setConfirming(false)}>Cancel</button>
      <button className="button danger" type="submit">Confirm Archive</button>
    </form>
  );
}
