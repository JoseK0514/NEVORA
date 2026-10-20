import Link from "next/link";
import { keepWhole } from "@/lib/keep-whole";
import { ALL_MODULES_ON, type EnabledModules } from "@/lib/workspace-presentation/modules";
import styles from "./request-hub.module.css";

/* Requests in the Signature style (Jose approved the eight Signature pages on Oct 20, 2026; the target is
 * docs/product/specs/employee-style/signature/sig-requests.png). A deep-teal band that says what is waiting; on the
 * soft-white sheet the one main action, the person's own time-off requests (waiting, then decided), the other ways
 * to start a request, and the help. Routes are unchanged; the requests are the same own-request read the Time off
 * page uses. */

export type HubTimeOffRequest = {
  id: string; status: string; startDate: string; endDate: string;
  startTime?: string | null; endTime?: string | null; createdAt: string;
};

const utc = (date: string) => new Date(`${date}T12:00:00Z`);
const monthDay = (date: string) => new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(utc(date));

/** "Oct 29 – 30", "Oct 30 – Nov 2" or "Fri, Nov 13". */
function rangeLabel(request: HubTimeOffRequest) {
  if (request.startDate === request.endDate) return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(utc(request.startDate));
  const sameMonth = request.startDate.slice(0, 7) === request.endDate.slice(0, 7);
  return `${monthDay(request.startDate)} – ${sameMonth ? Number(request.endDate.slice(8)) : monthDay(request.endDate)}`;
}

function lengthLabel(request: HubTimeOffRequest) {
  if (request.startTime && request.endTime) return "Part of a day";
  const days = Math.round((utc(request.endDate).getTime() - utc(request.startDate).getTime()) / 86_400_000) + 1;
  return days === 1 ? "Full day" : `${days} full days`;
}

const stateOf = (status: string) => status === "PENDING" ? { word: "Waiting", tone: styles.r6Wait }
  : status === "APPROVED" ? { word: "Approved", tone: styles.r6Good }
  : status === "DENIED" ? { word: "Declined", tone: styles.r6No }
  : { word: "Withdrawn", tone: styles.r6Quiet };

function Chevron() {
  return <svg className={styles.r6Chevron} width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" focusable="false"><path d="m1 1 5 5-5 5"/></svg>;
}

function Mark() {
  return <svg className={styles.r6Mark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path className={styles.r6MarkL} d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.r6MarkT} d="M146 330 L180 266 L214 330 Z"/></svg>;
}

function RequestRow({ request, sentOn, showState = true }: { request: HubTimeOffRequest; sentOn: (at: string) => string; showState?: boolean }) {
  const state = stateOf(request.status);
  const date = utc(request.startDate);
  return <li>
    <Link href={`/app/requests?tab=my#request-${encodeURIComponent(request.id)}`} className={styles.r6Row}>
      <time className={styles.r6Day} dateTime={request.startDate} aria-hidden="true"><small>{new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short" }).format(date)}</small><strong>{date.getUTCDate()}</strong></time>
      <span className={styles.r6Copy}>
        <strong>{keepWhole(rangeLabel(request))}</strong>
        <span>{lengthLabel(request)}{request.status === "PENDING" && sentOn(request.createdAt) ? ` · Sent ${sentOn(request.createdAt)}` : ""}</span>
      </span>
      {/* Under "Waiting" the heading already says it; decided rows name their outcome. */}
      <span className={`${styles.r6State} ${state.tone}${showState ? "" : " nv-sr"}`}>{state.word}</span>
      <Chevron />
    </Link>
  </li>;
}

export function RequestHub({ modules = ALL_MODULES_ON, requests, timeZone = "UTC" }: {
  modules?: EnabledModules;
  /** The person's own time-off requests, newest first; null when they couldn't be read. Omitted when time off is off. */
  requests?: readonly HubTimeOffRequest[] | null;
  timeZone?: string;
}) {
  const purpose = modules.timeOff && modules.marketplace ? "Ask for time off or change a shift." : modules.timeOff ? "Ask for time off." : modules.marketplace ? "Change one of your shifts." : "Tell your manager when you can work.";
  const sentOn = (at: string) => { try { return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(new Date(at)); } catch { return ""; } };
  const waiting = (requests ?? []).filter(request => request.status === "PENDING");
  const decided = (requests ?? []).filter(request => request.status !== "PENDING").slice(0, 3);
  const eyebrow = modules.timeOff && requests ? (waiting.length ? `${waiting.length} waiting for approval` : "Nothing waiting") : "Requests";
  return (
    <div className={styles.r6Root}>
      <header className={styles.r6Band}>
        <Mark />
        <p className={styles.r6Eyebrow}>{eyebrow}</p>
        <h1>Requests</h1>
        <p className={styles.r6Summary}>{purpose}</p>
      </header>
      <div className={styles.r6Sheet}>
        {modules.timeOff ? <Link href="/app/requests?tab=new" className={styles.r6Primary}>
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 6v12M6 12h12"/></svg>Request time off
        </Link> : null}

        {modules.timeOff ? requests === null
          ? <section className={styles.r6Section} aria-labelledby="request-hub-track">
            <header className={styles.r6Head}><h2 id="request-hub-track">My time off</h2></header>
            <div className={styles.r6Empty} role="status"><strong>Couldn’t load your requests</strong><span>Open My time-off requests to see them.</span><Link href="/app/requests?tab=my" className={styles.r6Link}>My time-off requests</Link></div>
          </section>
          : <>
            {waiting.length ? <section className={styles.r6Section} aria-labelledby="request-hub-waiting">
              <header className={styles.r6Head}><h2 id="request-hub-waiting">Waiting</h2></header>
              <ul className={styles.r6List}>{waiting.map(request => <RequestRow key={request.id} request={request} sentOn={sentOn} showState={false} />)}</ul>
            </section> : null}
            <section className={styles.r6Section} aria-labelledby="request-hub-track">
              <header className={styles.r6Head}><h2 id="request-hub-track">{waiting.length ? "Decided" : "My time off"}</h2></header>
              <ul className={styles.r6List}>
                {decided.map(request => <RequestRow key={request.id} request={request} sentOn={sentOn} />)}
                {!decided.length && !waiting.length ? <li className={styles.r6None}>No time-off requests yet.</li> : null}
                <li><Link href="/app/requests?tab=my" className={styles.r6LinkRow}><span><b>My time-off requests</b><small>{requests && requests.length ? `All ${requests.length}, with their history` : "Waiting, approved and past requests"}</small></span><Chevron /></Link></li>
              </ul>
            </section>
          </> : null}

        <section className={styles.r6Section} aria-labelledby="request-hub-start">
          <header className={styles.r6Head}><h2 id="request-hub-start">More requests</h2></header>
          <ul className={styles.r6List}>
            {modules.marketplace ? <li><Link href="/app/schedule?intent=swap" className={styles.r6LinkRow}><span><b>Swap a shift</b><small>Or offer it for coverage. Starts in My schedule</small></span><Chevron /></Link></li> : null}
            {modules.marketplace ? <li><Link href="/app/exchange?tab=requests" className={styles.r6LinkRow}><span><b>My shift requests</b><small>Swaps, coverage and Unable to work</small></span><Chevron /></Link></li> : null}
            <li><Link href="/app/availability" className={styles.r6LinkRow}><span><b>Update availability</b><small>When you can and can’t work</small></span><Chevron /></Link></li>
          </ul>
        </section>

        {modules.timeOff && modules.marketplace ? <details className={styles.r6Help}>
          <summary><span>Which request should I use?</span><Chevron /></summary>
          <div className={styles.r6HelpBody}>
            <p><strong>Time off</strong> is for a date or time range you need away from work.</p>
            <p><strong>Shift requests</strong> are for changes to a specific scheduled shift, including swaps, coverage and Unable to work.</p>
            <p>To swap a shift or say you’re unable to work, start from your scheduled shift.</p>
            <Link href="/app/schedule" className={styles.r6Link}>Open my schedule</Link>
          </div>
        </details> : null}
      </div>
    </div>
  );
}
