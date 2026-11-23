"use client";

import Link from "next/link";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { scheduleCopy } from "./schedule-copy";
import { publishScheduleAction } from "@/app/app/schedule/actions";
import { EmployeeSubmitButton } from "./employee-submit-button";
import { UnconfirmedActionForm } from "./unconfirmed-action-form";
import type { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";

type Readiness = Awaited<ReturnType<typeof getSchedulePublishReadiness>>;

/** Per-location publishing (the planning panel). Publishing a location also sends the week's held edits to published
 * days, so while any are held the panel sends the Owner to Build and publish, which lists them first. */
export function SchedulePublicationControls({weekStart,locations,review,held}:{
  weekStart:string;
  locations:{id:string;shortName:string}[];
  review?:{locationId:string;readiness:Readiness};
  /** Edits to published days waiting to be published (from the pending-changes read). */
  held?:{count:number};
}) {
  const t = scheduleCopy(usePortalLang()).publish;
  if(held) return <section className="schedule-publication-controls" aria-label={t.label}>
    <div className="schedule-publication-held" role="status">
      <p><strong>{held.count ? t.notPublished(held.count) : t.changesNotPublished}</strong></p>
      <p>{t.heldLine}</p>
    </div>
    <Link className="button secondary compact-button" href={`/app/schedule/publish?week=${encodeURIComponent(weekStart)}`}>{t.reviewChanges}</Link>
  </section>;
  return <section className="schedule-publication-controls" aria-label={t.label}>
    {locations.map(location=>{
      const readiness=review?.locationId===location.id ? review.readiness : undefined;
      return <div className="schedule-publication-location" key={location.id}>
        <strong>{location.shortName}</strong>
        {readiness?.hasWarnings ? <div className="schedule-publication-review" role="status">
          <p>{t.reviewBefore(location.shortName)}</p>
          <ul>
            {readiness.coverageGaps>0 ? <li>{t.coverageGaps(readiness.coverageGaps)}</li>:null}
            {readiness.missingLeadBlocks>0 ? <li>{t.missingLead(readiness.missingLeadBlocks)}</li>:null}
            {readiness.positionNeedsSetup ? <li>{t.positionSetup}</li>:null}
            {readiness.staffingNeedsSetup ? <li>{t.staffingSetup}</li>:null}
            {readiness.coverageNeedsSetup ? <li>{t.coverageSetup}</li>:null}
            {readiness.underTargetCount>0 ? <li>{t.under(readiness.underTargetCount)}</li>:null}
            {readiness.overTargetCount>0 ? <li>{t.over(readiness.overTargetCount)}</li>:null}
            {readiness.unconfiguredTargetCount>0 ? <li>{t.noTarget(readiness.unconfiguredTargetCount)}</li>:null}
          </ul>
          <p>{t.hoursNote}</p>
        </div>:null}
        <UnconfirmedActionForm action={publishScheduleAction} unconfirmed={{
          title: t.unconfirmed(location.shortName),
          check: { label: t.checkSchedule, href: `/app/schedule?week=${encodeURIComponent(weekStart)}&location=${encodeURIComponent(location.id)}` } }}>
          <input type="hidden" name="weekStart" value={weekStart}/>
          <input type="hidden" name="locationId" value={location.id}/>
          {readiness?.hasWarnings ? <input type="hidden" name="confirmWarnings" value="yes"/>:null}
          <EmployeeSubmitButton className="button secondary compact-button" pendingText={t.publishing}>
            {t.publishPlace(location.shortName)}{readiness?.hasWarnings ? t.anyway:""}
          </EmployeeSubmitButton>
        </UnconfirmedActionForm>
        {readiness?.hasWarnings ? <Link className="button ghost compact-button" href={`/app/schedule?week=${encodeURIComponent(weekStart)}&location=${encodeURIComponent(location.id)}`}>{t.returnToDraft}</Link>:null}
      </div>;
    })}
    {!locations.length ? <p>{t.noLocations}</p>:null}
  </section>;
}
