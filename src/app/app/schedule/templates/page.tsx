import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { randomUUID } from "node:crypto";
import { requireSessionMutationProof } from "@/lib/auth/session";
import Link from "next/link";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { StackIcon } from "@phosphor-icons/react/dist/ssr/Stack";
import { CopySimpleIcon } from "@phosphor-icons/react/dist/ssr/CopySimple";
import { ArchiveIcon } from "@phosphor-icons/react/dist/ssr/Archive";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { PageBand, Tile } from "@/components/kit/kit";
import { keepWhole } from "@/lib/keep-whole";
import { TemplateFeedback, TemplateMotion, TemplateNameLink, WeekPending } from "@/components/schedule-template-controls";
import { ActionForm } from "@/components/wave-b-forms";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { addDays, formatWeekRange, isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { listScheduleTemplates } from "@/lib/data/schedule-templates";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/app/schedule/templates/actions";

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
  const templates = await listScheduleTemplates(await requireSessionMutationProof());
  const hasFeedback = Boolean(params.error || params.saved || params.archived || params.applied !== undefined);

  return (
    <div className="nv-page wb-page wb-templates" data-nv-page="">
      <PageBand
        back={{ href: `/app/schedule?week=${weekStart}`, label: "Schedule" }}
        title="Templates"
        summary="Keep the weeks that work. Reuse them when you plan your next schedule."
      />

      <div className="nv-content">
      <section className="nv-card" aria-label="Selected schedule week">
        <div className="wb-week">
          <div className="wb-week__label">
            <span className="wb-note">Selected week</span>
            <strong className="wb-week__value">{keepWhole(`${weekLabel}, ${weekStart.slice(0, 4)}`)}</strong>
            <span className="wb-note">Save from or apply to this week.</span>
            <span className="wb-week__loading" role="status">Loading the week…</span>
          </div>
          <nav className="wb-week__nav" aria-label="Choose schedule week">
            <Link className="wb-week__arrow" href={templateUrl(addDays(weekStart, -7))} aria-label="Previous week">
              <CaretLeftIcon size={20} weight="bold" aria-hidden="true" /><WeekPending />
            </Link>
            <Link className="wb-week__today" href={templateUrl(currentWeek)} aria-current={weekStart === currentWeek ? "date" : undefined}>This week<WeekPending /></Link>
            <Link className="wb-week__arrow" href={templateUrl(addDays(weekStart, 7))} aria-label="Next week">
              <CaretRightIcon size={20} weight="bold" aria-hidden="true" /><WeekPending />
            </Link>
          </nav>
        </div>
      </section>

      {hasFeedback ? <TemplateFeedback key={JSON.stringify(params)}>
      {params.error ? (
        <p className="form-error" role="alert">
          <WarningCircleIcon size={22} aria-hidden="true" />
          <span>{params.error === "save"
            ? "That template could not be saved. The name may already be in use."
            : params.error === "unavailable"
              ? "That template is no longer available. Choose an active template."
              : "Enter a valid template name and schedule week."}</span>
        </p>
      ) : null}
      {params.saved ? <p className="form-success" role="status"><CheckCircleIcon size={22} weight="fill" aria-hidden="true" /><span>Template saved.</span></p> : null}
      {params.archived ? <p className="form-success" role="status"><CheckCircleIcon size={22} weight="fill" aria-hidden="true" /><span>Template archived.</span></p> : null}
      {params.applied !== undefined ? (
        <p role="status" className={Number(params.skipped ?? 0) || Number(params.warnings ?? 0) ? "form-warning" : "form-success"}>
          {Number(params.skipped ?? 0) || Number(params.warnings ?? 0) ? <WarningCircleIcon size={22} aria-hidden="true" /> : <CheckCircleIcon size={22} weight="fill" aria-hidden="true" />}
          <span>Applied {params.applied} shift{params.applied === "1" ? "" : "s"}.
          {Number(params.skipped ?? 0)
            ? ` ${params.skipped} skipped because of current conflicts or unavailable employees.`
            : ""}
          {Number(params.warnings ?? 0)
            ? ` ${params.warnings} added with a warning to review.`
            : ""}
          {" "}<Link className="nv-link" href={`/app/schedule?week=${weekStart}`}>Review schedule</Link></span>
        </p>
      ) : null}
      </TemplateFeedback> : null}

      <TemplateMotion>
      <div className="wb-templates-layout">
        <section className="nv-card" aria-labelledby="st-save-title" data-template-entrance>
          <div className="nv-card__head"><h2 className="nv-card__title" id="st-save-title">Save this week</h2></div>
          <div className="wb-body">
            <p className="wb-note">Turn the selected week into a reusable schedule pattern.</p>
            <ActionForm action={saveTemplateAction} className="wb-form" failure="Template not saved. Check your connection and try again; your name is kept." submit={{ label: "Save template", pendingLabel: "Saving template…", className: "nv-btn", kind: "primary", icon: <CopySimpleIcon size={20} aria-hidden="true" /> }}>
              <input type="hidden" name="weekStart" value={weekStart} />
              <div className="wb-field">
                <label htmlFor="st-template-name">Template name</label>
                <input
                  id="st-template-name"
                  className="wb-control"
                  name="name"
                  placeholder="Regular week"
                  minLength={3}
                  maxLength={50}
                  required
                  aria-describedby="st-name-hint"
                />
                <p id="st-name-hint" className="wb-help">Use 3 to 50 characters.</p>
              </div>
            </ActionForm>
            <div className="wb-box"><p className="wb-strong wb-strong--small">What gets saved</p><p className="wb-note">Employee assignments, locations, shift times, notes and designated leads.</p></div>
          </div>
        </section>

        <section className="nv-card" aria-labelledby="st-library-title" data-template-entrance>
          <div className="nv-card__head">
            <h2 className="nv-card__title" id="st-library-title">Saved templates</h2>
            <span className="nv-card__meta" aria-label={`${templates.length} saved templates`}>{templates.length} saved</span>
          </div>

          {templates.length ? <>
            <p className="wb-note wb-card-lead">Choose a pattern for {keepWhole(weekLabel)}.</p>
            <ul className="wb-template-list">
              {templates.map((template) => (
                <li key={template.id}>
                  <div className="wb-template-identity">
                    <Tile tone="neutral"><StackIcon size={22} /></Tile>
                    <div><h3 className="wb-record__title">{template.name}</h3><p className="wb-record__meta">
                      {template.shiftCount} shift{template.shiftCount === 1 ? "" : "s"}
                    </p></div>
                  </div>
                  <div className="wb-template-actions">
                    <ScheduleCopyForm actorId={session.id} label="Apply to this week" ariaLabel={`Apply ${template.name} to ${weekLabel}`} className="nv-btn wb-apply" command={{operationId:randomUUID(),kind:"TEMPLATE",weekStart,templateId:template.id}}><ArrowRightIcon size={20} aria-hidden="true" /></ScheduleCopyForm>
                    <ActionForm action={archiveTemplateAction} className="wb-archive" failure="Template not archived. Check your connection and try again." confirm={{ prompt: `Archive ${template.name}? Shifts already in your schedule stay.`, keepLabel: "Keep template" }} submit={{ label: "Archive", pendingLabel: "Archiving…", ariaLabel: `Archive ${template.name}`, className: "nv-btn", kind: "secondary", icon: <ArchiveIcon size={20} aria-hidden="true" /> }}>
                      <input type="hidden" name="weekStart" value={weekStart} />
                      <input type="hidden" name="templateId" value={template.id} />
                    </ActionForm>
                  </div>
                </li>
              ))}
            </ul>
            <div className="nv-card__foot wb-foot-stack"><p>Each shift is checked before it’s added. Conflicts and unavailable employees are skipped.</p><p>Archiving removes a template from this list. Existing shifts stay in your schedule.</p></div>
          </> : (
            <div className="wb-body wb-empty">
              <Tile tone="neutral"><StackIcon size={22} /></Tile>
              <h3 className="wb-strong">Your next week starts here</h3>
              <p className="wb-note">Save a week you’d like to reuse. Your templates appear here, ready for your next schedule.</p>
              <div className="wb-actions"><TemplateNameLink>Name your first template <ArrowRightIcon size={20} aria-hidden="true" /></TemplateNameLink></div>
            </div>
          )}
        </section>
      </div>
      </TemplateMotion>
      </div>
    </div>
  );
}
