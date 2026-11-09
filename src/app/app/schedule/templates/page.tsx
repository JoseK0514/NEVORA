import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { randomUUID } from "node:crypto";
import { requireSessionMutationProof } from "@/lib/auth/session";
import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { TemplateFeedback } from "@/components/schedule-template-controls";
import { ActionForm } from "@/components/wave-b-forms";
import { QuietHeader, QuietNav, QuietPage, weekLabel as compactWeek } from "@/components/quiet/quiet";
import "../../settings/settings-corp.css";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { formatWeekRange, isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { listScheduleTemplates } from "@/lib/data/schedule-templates";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/app/schedule/templates/actions";

export default async function ScheduleTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{
    week?: string;
    error?: string;
    saved?: string;
    applied?: string;
    skipped?: string;
    warnings?: string;
    archived?: string;
  }>;
}) {
  const session=await requireRoles(MANAGER_ROLES);
  const workspace = await getWorkspace();
  const params = await searchParams;
  const currentWeek = weekStartFor(businessDate(new Date(), workspace.timeZone));
  const weekStart = params.week && isValidWeekStart(params.week) ? params.week : currentWeek;
  const weekLabel = formatWeekRange(weekStart);
  const proof=await requireSessionMutationProof();
  const source=await withOperationalCompany(proof,()=>listScheduleTemplates(proof));
  if(source.state==='unavailable')return <OperationalUnavailable title="Schedule templates unavailable" reason={source.reason}/>;
  const templates=source.data;
  const hasFeedback = Boolean(params.error || params.saved || params.archived || params.applied !== undefined);

  // Release 1 (board O-Templates): "‹ Schedule  Week templates", how many weeks are saved, then a card per template (its
  // name, how many shifts, Archive and Apply to this week), then Save this week. The first Apply is the page's one primary.
  const shortWeek = compactWeek(weekStart);
  return (<ScopedReadFrame observation={source}>
    <QuietPage className="q-templates">
      <QuietNav back={{ href: `/app/schedule?week=${weekStart}`, label: "Schedule" }} title="Week templates" />
      <QuietHeader title="Week templates" />

      {hasFeedback ? <TemplateFeedback key={JSON.stringify(params)}>
        {params.error ? <p className="q-error q-first form-error" role="alert">{params.error === "save"
          ? "Couldn’t save that template. The name may already be in use."
          : params.error === "unavailable" ? "That template is no longer available. Choose an active template." : "Enter a valid template name and schedule week."}</p> : null}
        {params.saved ? <p className="q-help q-first form-success" role="status">Template saved.</p> : null}
        {params.archived ? <p className="q-help q-first form-success" role="status">Template archived.</p> : null}
        {params.applied !== undefined ? <p role="status" className={`q-help q-first ${Number(params.skipped ?? 0) || Number(params.warnings ?? 0) ? "form-warning" : "form-success"}`}>
          {`Applied ${params.applied} shift${params.applied === "1" ? "" : "s"}.`}
          {Number(params.skipped ?? 0) ? ` ${params.skipped} skipped because of current conflicts or unavailable employees.` : ""}
          {Number(params.warnings ?? 0) ? ` ${params.warnings} added with a warning to review.` : ""}
          {" "}<Link className="q-link" href={`/app/schedule?week=${weekStart}`}>Review schedule</Link></p> : null}
      </TemplateFeedback> : null}

      <p className="wc-intro" id="st-library">{templates.length ? `${templates.length} saved ${templates.length === 1 ? "week" : "weeks"}` : "No saved weeks yet"}</p>
      {templates.length ? <ul className="wc-cards" aria-labelledby="st-library">
        {templates.map((template, index) => <li className="q-list wc-tcard" key={template.id}>
          <div className="wc-cardhead"><span>{template.name}</span></div>
          <div className="wc-tcard__body"><b className="wc-tcard__big">{`${template.shiftCount} shift${template.shiftCount === 1 ? "" : "s"}`}</b></div>
          <div className="wc-tcard__foot">
            <ActionForm action={archiveTemplateAction} className="q-acts__form" failure="Template not archived. Check your connection and try again." confirm={{ prompt: `Archive ${template.name}? Shifts already in your schedule stay.`, keepLabel: "Keep" }} submit={{ label: "Archive", pendingLabel: "Archiving…", ariaLabel: `Archive ${template.name}`, className: "wc-textbtn" }}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <input type="hidden" name="templateId" value={template.id} />
            </ActionForm>
            <ScheduleCopyForm actorId={session.id} label={`Use for ${shortWeek}`} ariaLabel={`Apply ${template.name} to ${weekLabel}`} className={index === 0 ? "wc-btn" : "wc-btn wc-btn--sec"} command={{operationId:randomUUID(),kind:"TEMPLATE",weekStart,templateId:template.id}} />
          </div>
        </li>)}
      </ul> : null}

      <section className="q-list wc-tcard" aria-labelledby="st-save-title" id="st-save">
        <div className="wc-cardhead"><h2 id="st-save-title">Save this week</h2><span className="wc-meta" aria-label={`Week of ${keepWhole(`${weekLabel}, ${weekStart.slice(0, 4)}`)}`}>{shortWeek}</span></div>
        <ActionForm action={saveTemplateAction} className="q-template-form wc-tcard__body" failure="Template not saved. Check your connection and try again; your name is kept." submit={{ label: "Save this week", pendingLabel: "Saving…", className: "wc-btn wc-btn--sec wc-btn--full" }}>
          <input type="hidden" name="weekStart" value={weekStart} />
          <div className="q-fl">
            <label htmlFor="st-template-name">Name</label>
            <input id="st-template-name" className="q-in" name="name" placeholder="e.g. Regular week" minLength={3} maxLength={50} required />
          </div>
        </ActionForm>
      </section>
    </QuietPage>
  </ScopedReadFrame>);
}
