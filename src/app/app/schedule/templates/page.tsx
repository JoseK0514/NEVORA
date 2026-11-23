import { routeTitle } from "@/app/app/route-titles";
import {scopedObservation} from '@/lib/company-access/observation';
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
import { readPortalLanguage } from "@/lib/activation/language.server";
import { scheduleWords, weekRange, type ScheduleLang } from "../schedule-copy";
import { CorpCard, CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import "../schedule-tools.css";
import { getWorkspace } from "@/lib/data/workspaces";
import { BState } from "@/components/owner-b/b-kit";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { businessDate } from "@/lib/business-time";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { isValidWeekStart, weekStartFor } from "@/lib/date-utils";
import { listScheduleTemplates } from "@/lib/data/schedule-templates";
import {
  archiveTemplateAction,
  saveTemplateAction,
} from "@/app/app/schedule/templates/actions";

/** Review B1 (NV-022): the page title in the tab and for screen readers. Review Nov 14 (AR-15): the page's own name, as in
 * the menus and its heading. */
export const generateMetadata = routeTitle("templates");

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
  const proof=await requireSessionMutationProof();
  let lang:ScheduleLang='en';try{lang=(await readPortalLanguage(proof)).language;}catch{/* English */}
  const t=scheduleWords(lang).templates;
  const weekLabel = weekRange(weekStart, lang);
  const source=await withOperationalCompany(proof,()=>listScheduleTemplates(proof));
  if(source.state==='unavailable')return <OperationalUnavailable lang={lang} title={t.unavailable} reason={source.reason}/>;
  const templates=source.data;
  const hasFeedback = Boolean(params.error || params.saved || params.archived || params.applied !== undefined);

  // Phase 2 (Schedule tools, C7, Nov 23, 2026): Direction B for real. The Corp page the B layer draws as the band and
  // white cards, like Copy receipt. The band names the week once; Saved weeks lists each template (its name and how many
  // shifts) with Apply and Archive; New template saves this week. Same reads, forms, confirm and copy command as before.
  const shortWeek = weekRange(weekStart, lang);
  return (<ScopedReadFrame observation={scopedObservation(source)}>
    <CorpPage className="c-tpl c-page--narrow" labelledBy="tpl-title" lang={lang === "es" ? "es" : undefined}>
      <CorpNav back={{ href: `/app/schedule?week=${weekStart}`, label: t.schedule }} title={t.title} titleId="tpl-title" phoneOnly />
      {/* The band's one line on a phone (Who's working and Time corrections do the same); CorpTitle carries it from 768px. */}
      <p className="c-phone-sub" aria-hidden="true">{keepWhole(t.weekOf(shortWeek))}</p>
      <CorpTitle title={t.title} wide sub={keepWhole(t.weekOf(shortWeek))} />

      {hasFeedback ? <TemplateFeedback key={JSON.stringify(params)}>
        {params.error ? <p className="c-tpl__msg c-tpl__msg--error form-error" role="alert">{params.error === "save"
          ? t.errorSave
          : params.error === "unavailable" ? t.errorUnavailable : t.errorInvalid}</p> : null}
        {params.saved ? <p className="c-tpl__msg form-success" role="status">{t.saved}</p> : null}
        {params.archived ? <p className="c-tpl__msg form-success" role="status">{t.archived}</p> : null}
        {params.applied !== undefined ? <p role="status" className={`c-tpl__msg ${Number(params.skipped ?? 0) || Number(params.warnings ?? 0) ? "c-tpl__msg--warn form-warning" : "form-success"}`}>
          {t.applied(params.applied)}
          {Number(params.skipped ?? 0) ? t.appliedSkipped(params.skipped!) : ""}
          {Number(params.warnings ?? 0) ? t.appliedWarnings(params.warnings!) : ""}
          {" "}<Link className="c-link" href={`/app/schedule?week=${weekStart}`}>{t.reviewSchedule}</Link></p> : null}
      </TemplateFeedback> : null}

      {/* Closing F1 (NV-084): no saved weeks is the kit's empty card (a tinted icon, the state and what a template is for). */}
      {templates.length ? <CorpCard id="st-library" label={t.savedWeeks} count={templates.length}>
        <ul className="c-rows c-tpl__list" aria-labelledby="st-library-label">
          {templates.map((template, index) => <li className="c-tpl__item" key={template.id}>
            <div className="c-tpl__text"><span className="c-tpl__name">{template.name}</span><span className="c-tpl__count"><b>{t.shifts(template.shiftCount)}</b></span></div>
            <div className="c-tpl__acts">
              <ActionForm action={archiveTemplateAction} className="c-tpl__form" failure={t.archiveFailure} confirm={{ prompt: t.archivePrompt(template.name), keepLabel: t.keep }} submit={{ label: t.archive, pendingLabel: t.archiving, ariaLabel: t.archiveAria(template.name), className: "c-btn c-btn--secondary", kind: "danger" }}>
                <input type="hidden" name="weekStart" value={weekStart} />
                <input type="hidden" name="templateId" value={template.id} />
              </ActionForm>
              <ScheduleCopyForm actorId={session.id} label={t.apply} ariaLabel={t.applyAria(template.name, weekLabel)} className={index === 0 ? "c-btn" : "c-btn c-btn--secondary"} command={{operationId:randomUUID(),kind:"TEMPLATE",weekStart,templateId:template.id}} />
            </div>
          </li>)}
        </ul>
      </CorpCard>
        : <CorpCard id="st-library" ariaLabel={t.savedWeeks}><BState kind="empty" icon={<CalendarBlankIcon weight="bold" />} title={t.emptyTitle}
          line={t.emptyLine} /></CorpCard>}

      <CorpCard id="st-save" label={t.newTemplate}>
        <ActionForm action={saveTemplateAction} className="c-tpl__save" failure={t.saveFailure} submit={{ label: t.save, pendingLabel: t.saving, ariaLabel: t.saveAria, className: templates.length ? "c-btn c-btn--secondary" : "c-btn" }}>
          <input type="hidden" name="weekStart" value={weekStart} />
          <div className="c-field">
            <label className="c-field__label" htmlFor="st-template-name">{t.name}</label>
            <input id="st-template-name" className="c-in" name="name" placeholder={t.namePlaceholder} minLength={3} maxLength={50} required />
          </div>
        </ActionForm>
      </CorpCard>
    </CorpPage>
  </ScopedReadFrame>);
}
