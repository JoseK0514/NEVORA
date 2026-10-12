import {ScheduleCopyForm} from '@/components/schedule-copy-form';
import { randomUUID } from "node:crypto";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {  formatWeekRange, isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { listScheduleTemplates } from "@/lib/data/schedule-templates";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/app/schedule/templates/actions";

function validWeek(value?: string) {
  return (
    value && isValidWeekStart(value)
  );
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
  const weekStart = validWeek(params.week) ? params.week! : currentWeek;
  const templates = await listScheduleTemplates(await requireSessionMutationProof());

  return (
    <div className="template-page">
      <PageHeader
        eyebrow="Schedule shortcuts"
        title="Schedule templates"
        description={`Save a strong schedule pattern and reuse it for ${formatWeekRange(weekStart)} with all normal conflict checks.`}
        actions={
          <Link className="button secondary" href={`/app/schedule?week=${weekStart}`}>
            Back to Schedule
          </Link>
        }
      />

      {params.error ? (
        <p className="form-error">
          {params.error === "save"
            ? "That template could not be saved. The name may already be in use."
            : params.error === "unavailable"
              ? "That template is no longer available. Choose an active template."
              : "Enter a valid template name and schedule week."}
        </p>
      ) : null}
      {params.saved ? <p className="form-success">Template saved.</p> : null}
      {params.archived ? <p className="form-success">Template archived.</p> : null}
      {params.applied !== undefined ? (
        <p className={Number(params.skipped ?? 0) ? "form-warning" : "form-success"}>
          Applied {params.applied} shift{params.applied === "1" ? "" : "s"}.
          {Number(params.skipped ?? 0)
            ? ` ${params.skipped} skipped because of current conflicts or unavailable employees.`
            : ""}
          {Number(params.warnings ?? 0)
            ? ` ${params.warnings} applied with manager warnings.`
            : ""}
        </p>
      ) : null}

      <section className="content-grid two template-layout">
        <article className="panel template-save-panel">
          <p className="eyebrow">Create template</p>
          <h2>Save this week</h2>
          <p className="muted">
            Saves employee assignments, locations, shift times, notes, and designated leads.
          </p>

          <form action={saveTemplateAction} className="employee-form">
            <input type="hidden" name="weekStart" value={weekStart} />
            <label>
              Template name
              <input
                name="name"
                placeholder="Normal Week"
                minLength={3}
                maxLength={50}
                required
              />
            </label>
            <button className="button primary" type="submit">
              Save Current Week
            </button>
          </form>
        </article>

        <article className="panel template-list-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Saved templates</p>
              <h2>Reuse a pattern</h2>
            </div>
          </div>

          {templates.length ? (
            <div className="template-list">
              {templates.map((template) => (
                <div className="template-row" key={template.id}>
                  <div>
                    <strong>{template.name}</strong>
                    <span>
                      {template.shiftCount} shift{template.shiftCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="template-actions">
                    <ScheduleCopyForm actorId={session.id} label='Apply' command={{operationId:randomUUID(),kind:'TEMPLATE',weekStart,templateId:template.id}} />
                    <form action={archiveTemplateAction}>
                      <input type="hidden" name="weekStart" value={weekStart} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <button className="button ghost" type="submit">
                        Archive
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>No templates yet.</strong>
              <span>Save a completed week to create your first one.</span>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
