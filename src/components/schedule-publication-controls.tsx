import "./quiet/u2.css";
import Link from "next/link";
import { publishScheduleAction } from "@/app/app/schedule/actions";
import { U2Submit } from "./quiet/u2-sheets";
import type { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";

type Readiness = Awaited<ReturnType<typeof getSchedulePublishReadiness>>;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* T-9 (Team U2, Oct 25, 2026): the Plan sheet's "Publish" group. One row per location ("Main Office · Draft · 42 shifts")
 * with a small Publish pill; the pre-publish review says how many shifts go out (UX-O-16). Same publish action and fields
 * (weekStart, locationId, confirmWarnings). */
export function SchedulePublicationControls({weekStart,locations,review,status,shiftCounts}:{
  weekStart:string;
  locations:{id:string;shortName:string}[];
  review?:{locationId:string;readiness:Readiness};
  /** Each location's state this week ("DRAFT", "PUBLISHED", "NONE"); null when the read failed. */
  status?:(locationId:string)=>string|null;
  /** Shifts on each location's week (draft or published), for "Draft · 42 shifts". */
  shiftCounts?:Record<string,number>;
}) {
  return <section className="u2-publish" aria-labelledby="u2-publish-title">
    <div className="q-grp"><h2 id="u2-publish-title">Publish</h2></div>
    <ul className="q-list">
      {locations.map(location=>{
        const readiness=review?.locationId===location.id ? review.readiness : undefined;
        const state=status?.(location.id) ?? null;
        const count=shiftCounts?.[location.id];
        const shifts=count===undefined?null:plural(count,"shift","shifts");
        const detail=state==="PUBLISHED"?["Published",shifts].filter(Boolean).join(" · "):state==="DRAFT"?["Draft",shifts].filter(Boolean).join(" · "):state==="NONE"?"Nothing to publish":shifts??undefined;
        const form=(anyway:boolean,className:string,label:string)=><form action={publishScheduleAction} className="u2-publish__form">
          <input type="hidden" name="weekStart" value={weekStart}/>
          <input type="hidden" name="locationId" value={location.id}/>
          {anyway ? <input type="hidden" name="confirmWarnings" value="yes"/>:null}
          <U2Submit className={className} pendingText="Publishing…" ariaLabel={`Publish ${location.shortName}${anyway?" anyway":""}`}>{label}</U2Submit>
        </form>;
        return <li key={location.id} className="u2-publish__item">
          <div className="q-row">
            <span className="q-rt"><b>{location.shortName}</b>{detail?<i>{detail}</i>:null}</span>
            {readiness?.hasWarnings||state==="NONE"?null:form(false,`q-bs${state==="DRAFT"?" q-bs--go":""}`,state==="PUBLISHED"?"Publish again":"Publish")}
          </div>
          {readiness?.hasWarnings ? <div className="u2-publish__review" role="status">
            <p className="u2-publish__lead">{`Review ${location.shortName} before publishing.${count!==undefined?` You’re about to publish ${plural(count,"shift","shifts")}.`:""}`}</p>
            <ul className="u2-publish__issues">
              {readiness.coverageGaps>0 ? <li>{readiness.coverageGaps} uncovered coverage blocks.</li>:null}
              {readiness.missingLeadBlocks>0 ? <li>{readiness.missingLeadBlocks} blocks missing a designated lead.</li>:null}
              {readiness.positionNeedsSetup ? <li>Position requirements need setup.</li>:null}
              {readiness.staffingNeedsSetup ? <li>Staffing requirements need setup.</li>:null}
              {readiness.coverageNeedsSetup ? <li>Coverage windows need setup.</li>:null}
              {readiness.underTargetCount>0 ? <li>{readiness.underTargetCount} employees below their weekly hour target.</li>:null}
              {readiness.overTargetCount>0 ? <li>{readiness.overTargetCount} employees above their weekly hour target.</li>:null}
              {readiness.unconfiguredTargetCount>0 ? <li>{readiness.unconfiguredTargetCount} employees without a weekly hour target.</li>:null}
            </ul>
            <p className="q-help">Hours count the whole week across locations. Publishing shows this week to the team.</p>
            {form(true,"q-btn",`Publish ${location.shortName} anyway`)}
            <Link className="q-btn q-btn--sec" href={`/app/schedule?week=${encodeURIComponent(weekStart)}&location=${encodeURIComponent(location.id)}`}>Back to the draft</Link>
          </div>:null}
        </li>;
      })}
    </ul>
    {!locations.length ? <p className="q-empty">No active locations to publish.</p>:null}
  </section>;
}
