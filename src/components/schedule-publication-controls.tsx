import Link from "next/link";
import { publishScheduleAction } from "@/app/app/schedule/actions";
import { EmployeeSubmitButton } from "./employee-submit-button";
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
  if(held) return <section className="schedule-publication-controls" aria-label="Publish weekly schedule">
    <div className="schedule-publication-held" role="status">
      <p><strong>{held.count ? `${held.count} ${held.count === 1 ? "change" : "changes"} not published` : "Changes not published"}</strong></p>
      <p>Publishing also sends the changes to published days. Review them in Build and publish first.</p>
    </div>
    <Link className="button secondary compact-button" href={`/app/schedule/publish?week=${encodeURIComponent(weekStart)}`}>Review changes</Link>
  </section>;
  return <section className="schedule-publication-controls" aria-label="Publish weekly schedule">
    {locations.map(location=>{
      const readiness=review?.locationId===location.id ? review.readiness : undefined;
      return <div className="schedule-publication-location" key={location.id}>
        <strong>{location.shortName}</strong>
        {readiness?.hasWarnings ? <div className="schedule-publication-review" role="status">
          <p>Review {location.shortName} before publishing this week.</p>
          <ul>
            {readiness.coverageGaps>0 ? <li>{readiness.coverageGaps} uncovered coverage blocks.</li>:null}
            {readiness.missingLeadBlocks>0 ? <li>{readiness.missingLeadBlocks} blocks missing a designated lead.</li>:null}
            {readiness.positionNeedsSetup ? <li>Position requirements need setup.</li>:null}
            {readiness.staffingNeedsSetup ? <li>Staffing requirements need setup.</li>:null}
            {readiness.coverageNeedsSetup ? <li>Coverage windows need setup.</li>:null}
            {readiness.underTargetCount>0 ? <li>{readiness.underTargetCount} employees below their weekly hour target.</li>:null}
            {readiness.overTargetCount>0 ? <li>{readiness.overTargetCount} employees above their weekly hour target.</li>:null}
            {readiness.unconfiguredTargetCount>0 ? <li>{readiness.unconfiguredTargetCount} employees without a weekly hour target.</li>:null}
          </ul>
          <p>Employee hour counts cover the business week across locations. Publishing makes this location’s schedule visible to employees.</p>
        </div>:null}
        <form action={publishScheduleAction}>
          <input type="hidden" name="weekStart" value={weekStart}/>
          <input type="hidden" name="locationId" value={location.id}/>
          {readiness?.hasWarnings ? <input type="hidden" name="confirmWarnings" value="yes"/>:null}
          <EmployeeSubmitButton className="button secondary compact-button" pendingText="Publishing…">
            Publish {location.shortName}{readiness?.hasWarnings ? " anyway":""}
          </EmployeeSubmitButton>
        </form>
        {readiness?.hasWarnings ? <Link className="button ghost compact-button" href={`/app/schedule?week=${encodeURIComponent(weekStart)}&location=${encodeURIComponent(location.id)}`}>Return to draft</Link>:null}
      </div>;
    })}
    {!locations.length ? <p>No active locations are available to publish.</p>:null}
  </section>;
}
