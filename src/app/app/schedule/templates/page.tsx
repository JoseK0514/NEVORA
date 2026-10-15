import {ScopedReadFrame} from '@/components/company-access/scoped-read-frame';
import {withOperationalCompany} from '@/lib/company-access/operational-scope.server';
import {OperationalUnavailable} from '@/components/company-access/operational-unavailable';
import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { randomUUID } from "node:crypto";
import { requireSessionMutationProof } from "@/lib/auth/session";
import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { StackIcon } from "@phosphor-icons/react/dist/ssr/Stack";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/ssr/CopySimple";
import { ArchiveIcon } from "@phosphor-icons/react/dist/ssr/Archive";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { PageHeader } from "@/components/page-header";
import { TemplateSubmit, TemplateFeedback, TemplateMotion, TemplateNameLink } from "@/components/schedule-template-controls";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { addDays, formatWeekRange, isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { listScheduleTemplates } from "@/lib/data/schedule-templates";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/app/schedule/templates/actions";
import "./templates.css";

function templateUrl(week: string) {
  return `/app/schedule/templates?week=${encodeURIComponent(week)}`;
}

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

  return (<ScopedReadFrame observation={source}>
    <div className="schedule-templates-page">
      <PageHeader
        title="Schedule templates"
        description="Keep the weeks that work. Reuse them when you plan your next schedule."
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${weekStart}`}>
            <ArrowLeftIcon size={18} aria-hidden="true" /> Back to schedule
          </Link>
        }
      />

      <section className="st-week-bar" aria-label="Selected schedule week">
        <div className="st-week-context">
          <CalendarBlankIcon size={22} aria-hidden="true" />
          <div><span>Selected week</span><strong>{weekLabel}, {weekStart.slice(0, 4)}</strong></div>
        </div>
        <p>Save from or apply to this week.</p>
        <nav className="st-week-navigation" aria-label="Choose schedule week">
          <Link className="st-week-arrow" href={templateUrl(addDays(weekStart, -7))} aria-label="Previous week">
            <CaretLeftIcon size={18} aria-hidden="true" />
          </Link>
          <Link className="st-current-week" href={templateUrl(currentWeek)} aria-current={weekStart === currentWeek ? "date" : undefined}>This week</Link>
          <Link className="st-week-arrow" href={templateUrl(addDays(weekStart, 7))} aria-label="Next week">
            <CaretRightIcon size={18} aria-hidden="true" />
          </Link>
        </nav>
      </section>

      {hasFeedback ? <TemplateFeedback key={JSON.stringify(params)}>
      {params.error ? (
        <p className="form-error" role="alert">
          {params.error === "save"
            ? "That template could not be saved. The name may already be in use."
            : params.error === "unavailable"
              ? "That template is no longer available. Choose an active template."
              : "Enter a valid template name and schedule week."}
        </p>
      ) : null}
      {params.saved ? <p className="form-success" role="status">Template saved.</p> : null}
      {params.archived ? <p className="form-success" role="status">Template archived.</p> : null}
      {params.applied !== undefined ? (
        <p role="status" className={Number(params.skipped ?? 0) || Number(params.warnings ?? 0) ? "form-warning" : "form-success"}>
          Applied {params.applied} shift{params.applied === "1" ? "" : "s"}.
          {Number(params.skipped ?? 0)
            ? ` ${params.skipped} skipped because of current conflicts or unavailable employees.`
            : ""}
          {Number(params.warnings ?? 0)
            ? ` ${params.warnings} applied with manager warnings.`
            : ""}
          {" "}<Link href={`/app/schedule?week=${weekStart}`}>Review schedule</Link>
        </p>
      ) : null}
      </TemplateFeedback> : null}

      <TemplateMotion>
      <section className="st-layout">
        <article className="panel st-save-panel" aria-labelledby="st-save-title" data-template-entrance>
          <div className="st-panel-icon"><CopySimpleIcon size={24} weight="duotone" aria-hidden="true" /></div>
          <h2 id="st-save-title">Save this week</h2>
          <p className="st-panel-description">Turn the selected week into a reusable schedule pattern.</p>

          <form action={saveTemplateAction} className="st-save-form">
            <input type="hidden" name="weekStart" value={weekStart} />
            <label htmlFor="st-template-name">Template name</label>
              <input
                id="st-template-name"
                name="name"
                placeholder="e.g. Regular working week"
                minLength={3}
                maxLength={50}
                required
                aria-describedby="st-name-hint"
              />
            <span id="st-name-hint" className="st-field-hint">Use 3–50 characters.</span>
            <TemplateSubmit label="Save template" pendingLabel="Saving template…" className="button primary">
              <CopySimpleIcon size={18} aria-hidden="true" />
            </TemplateSubmit>
          </form>
          <div className="st-included"><strong>What gets saved</strong><p>Employee assignments, locations, shift times, notes, and designated leads.</p></div>
        </article>

        <article className="panel st-library-panel" aria-labelledby="st-library-title" data-template-entrance>
          <div className="st-library-heading">
            <div><h2 id="st-library-title">Saved templates</h2><p className="st-panel-description">Choose a pattern for {weekLabel}.</p></div>
            <span className="st-library-count" aria-label={`${templates.length} saved templates`}>{templates.length}</span>
          </div>

          {templates.length ? <>
            <ul className="st-template-list">
              {templates.map((template) => (
                <li className="st-template-row" key={template.id}>
                  <div className="st-template-identity">
                    <div className="st-row-icon"><StackIcon size={22} aria-hidden="true" /></div>
                    <div><h3>{template.name}</h3><p>
                      {template.shiftCount} shift{template.shiftCount === 1 ? "" : "s"}
                    </p></div>
                  </div>
                  <div className="st-template-actions">
                    <ScheduleCopyForm actorId={session.id} label="Apply to this week" ariaLabel={`Apply ${template.name} to ${weekLabel}`} className="button st-apply-button" command={{operationId:randomUUID(),kind:"TEMPLATE",weekStart,templateId:template.id}}><ArrowRightIcon size={18} aria-hidden="true" /></ScheduleCopyForm>
                    <form action={archiveTemplateAction}>
                      <input type="hidden" name="weekStart" value={weekStart} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <TemplateSubmit label="Archive" pendingLabel="Archiving…" ariaLabel={`Archive ${template.name}`} className="button ghost st-archive-button">
                        <ArchiveIcon size={18} aria-hidden="true" />
                      </TemplateSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
            <div className="st-library-guidance"><p>Each shift is checked before it is added. Conflicts and unavailable employees are skipped.</p><p>Archiving removes a template from this list. Existing shifts stay in your schedule.</p></div>
          </> : (
            <div className="st-empty-state">
              <div className="st-panel-icon"><StackIcon size={32} weight="duotone" aria-hidden="true" /></div>
              <h3>Your next week starts here</h3>
              <p>Save a week you would like to reuse. Your templates will appear here, ready for your next schedule.</p>
              <TemplateNameLink>Name your first template <ArrowRightIcon size={18} aria-hidden="true" /></TemplateNameLink>
            </div>
          )}
        </article>
      </section>
      </TemplateMotion>
    </div>
  </ScopedReadFrame>);
}
