"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AirplaneIcon } from "@phosphor-icons/react/dist/ssr/Airplane";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { BellIcon } from "@phosphor-icons/react/dist/ssr/Bell";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { SectionTabs } from "@/components/section-tabs";
import { SigBand, SigChevron, SigDay, SigHead, SigLinkRow, SigPage } from "@/components/signature/signature";
import { SigButton, SigPendingLabel } from "@/components/signature/sig-button";
import { EmployeeSubmitButton } from "@/components/employee-submit-button";
import { SigAvatar, SigBanner, SigCard, SigCardRow, SigEmpty, SigField, SigFieldGroup, SigList, SigPill, SigRow, SigSkeleton, SigTabs } from "@/components/signature/sig-components";
import { SigSheet, SigToast } from "@/components/signature/sig-overlays";
import timeStyles from "@/components/employee-time-signature.module.css";
import offStyles from "@/app/app/requests/time-off-signature.module.css";

/* /ui-preview/signature: every Signature component in every state on one page, on the real classes and modules (no
 * copies). Fictional people, times and dates only; links stay on this page and nothing is sent anywhere.
 *
 * States: rest, pending and disabled are drawn live with the real attributes. Hover, press and focus cannot be forced
 * honestly with CSS, so those cells are live controls labelled "Hover / press / Tab to me"; the QA screenshots capture
 * them with a real pointer and real Tab presses. The pending demo switch puts every live control into pending without
 * a server, and the two "Try it" forms run a real 2.5s client action so useFormStatus drives the submit button. */

const here = "/ui-preview/signature";
const tabs = { label: "Reference", items: [
  { href: here, label: "Components" },
  { href: `${here}?tab=rows`, label: "Rows" },
  { href: `${here}?tab=forms`, label: "Forms" },
  { href: `${here}?tab=band`, label: "Band" },
] };
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function Cell({ label, children, note }: { label: string; children?: ReactNode; note?: ReactNode }) {
  return <div className="sgp-cell">
    <span className="sgp-cap">{label}</span>
    <div className="sgp-slot">{children ?? <span className="sgp-na">{note ?? "No style for this state"}</span>}</div>
  </div>;
}

function Matrix({ id, title, spec, children }: { id: string; title: string; spec: ReactNode; children: ReactNode }) {
  return <div className="sgp-matrix" role="group" aria-labelledby={`${id}-t`} data-variant={id}>
    <div className="sgp-mhead"><b id={`${id}-t`}>{title}</b><small>{spec}</small></div>
    <div className="sgp-grid">{children}</div>
  </div>;
}

/** The demo "Save" that really goes pending: a client action that waits 2.5s, so EmployeeSubmitButton's
 * useFormStatus drives the button exactly as it does on Availability and Time off. */
function TryItForm({ label, pendingText, onDone }: { label: string; pendingText: string; onDone: () => void }) {
  return <form action={async () => { await wait(2500); onDone(); }} className="sgp-try">
    <EmployeeSubmitButton className="sg-cta" pendingText={pendingText}>{label}</EmployeeSubmitButton>
  </form>;
}

export function SignaturePreview() {
  const [pendingDemo, setPendingDemo] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const tryPending = () => {
    setBusy(true); setSaved(null);
    timer.current = setTimeout(() => { setBusy(false); setSaved("Saved. Nothing left this page."); }, 2500);
  };
  const live = pendingDemo || busy;

  return <div className="app-shell nevora-portal sgp" data-nv-e5="">
    <main className="page-frame" id="main-content" tabIndex={-1}>
      <SectionTabs group={tabs} pathname={here} />
      <SigPage band={<SigBand eyebrow="Reference · fictional data" live>
        <h1 className="sg-word">Signature</h1>
        <p className="sg-sub"><span>Every component, every state.</span><span><b>Tab</b> through the band.</span></p>
        <div className="sgp-bandrow">
          <Link className="sg-band-link" href="#sgp-buttons">Buttons<CaretRightIcon size={14} aria-hidden="true" /></Link>
          <Link className="sg-band-link" href="#sgp-rows">Rows <em>3</em><CaretRightIcon size={14} aria-hidden="true" /></Link>
          <button type="button" className="sg-band-link" aria-pressed={pendingDemo} onClick={() => setPendingDemo(value => !value)} data-qa="pending-toggle">
            Pending demo: {pendingDemo ? "on" : "off"}
          </button>
        </div>
      </SigBand>}>

        {/* ── Buttons ─────────────────────────────────────────────────────────── */}
        <SigHead id="sgp-buttons" title="Buttons" aside="Rest · hover / press / Tab · pending · disabled" />
        <div className="sg-card sgp-pad">
          <Matrix id="primary" title="SigButton primary" spec="variant=primary">
            <Cell label="Rest"><SigButton>Submit request</SigButton></Cell>
            <Cell label="Hover / press / Tab to me"><SigButton pending={live} pendingText="Saving…" data-qa="live-primary">Submit request</SigButton></Cell>
            <Cell label="Pending"><SigButton pending pendingText="Saving…">Submit request</SigButton></Cell>
            <Cell label="Disabled"><SigButton disabled>Submit request</SigButton></Cell>
          </Matrix>
          <Matrix id="secondary" title="SigButton secondary" spec="variant=secondary">
            <Cell label="Rest"><SigButton variant="secondary">Add a note</SigButton></Cell>
            <Cell label="Hover / press / Tab to me"><SigButton variant="secondary" pending={live} pendingText="Adding…" data-qa="live-secondary">Add a note</SigButton></Cell>
            <Cell label="Pending"><SigButton variant="secondary" pending pendingText="Adding…">Add a note</SigButton></Cell>
            <Cell label="Disabled"><SigButton variant="secondary" disabled>Add a note</SigButton></Cell>
          </Matrix>
          <Matrix id="link" title="SigButton link" spec="variant=link">
            <Cell label="Rest"><SigButton variant="link">Cancel</SigButton></Cell>
            <Cell label="Hover / press / Tab to me"><SigButton variant="link" pending={live} pendingText="Cancelling…" data-qa="live-link">Cancel</SigButton></Cell>
            <Cell label="Pending"><SigButton variant="link" pending pendingText="Cancelling…">Cancel</SigButton></Cell>
            <Cell label="Disabled"><SigButton variant="link" disabled>Cancel</SigButton></Cell>
          </Matrix>
          <Matrix id="href" title="SigButton as a link" spec="href, primary">
            <Cell label="Rest"><SigButton href="#sgp-buttons">Request time off</SigButton></Cell>
            <Cell label="Hover / press / Tab to me"><SigButton href="#sgp-buttons" pending={live} pendingText="Opening…" data-qa="live-href">Request time off</SigButton></Cell>
            <Cell label="Pending"><SigButton href="#sgp-buttons" pending pendingText="Opening…">Request time off</SigButton></Cell>
            <Cell label="Disabled"><SigButton href="#sgp-buttons" disabled>Request time off</SigButton></Cell>
          </Matrix>
          <Matrix id="round" title="Round icon" spec=".sg-round">
            <Cell label="Rest"><a className="sg-round" href="#sgp-buttons" aria-label="Edit, rest"><PencilSimpleIcon size={20} aria-hidden="true" /></a></Cell>
            <Cell label="Hover / press / Tab to me"><a className="sg-round" href="#sgp-buttons" aria-label="Edit" data-qa="live-round"><PencilSimpleIcon size={20} aria-hidden="true" /></a></Cell>
            <Cell label="Pending" note="No pending style for .sg-round" />
            <Cell label="Disabled"><button type="button" className="sg-round" disabled aria-label="Edit, disabled"><PencilSimpleIcon size={20} aria-hidden="true" /></button></Cell>
          </Matrix>
        </div>

        <SigHead id="sgp-band-buttons" title="On the band" aside="Light focus ring expected" />
        <div className="sgp-band-host">
          <SigBand eyebrow="Band link" mark={false}>
            <div className="sgp-grid sgp-grid--band">
              <Cell label="Rest"><Link className="sg-band-link" href="#sgp-band-buttons">My requests <em>2</em><CaretRightIcon size={14} aria-hidden="true" /></Link></Cell>
              <Cell label="Hover / press / Tab to me"><Link className="sg-band-link" href="#sgp-band-buttons" data-qa="live-band-link"><PlusIcon size={14} aria-hidden="true" />New request</Link></Cell>
              <Cell label="Pending" note="No pending style for .sg-band-link" />
              <Cell label="Disabled" note="Links have no disabled state" />
            </div>
          </SigBand>
        </div>

        <SigHead id="sgp-legacy" title="Classes pages still use" aside="Until they move to SigButton" />
        <div className="sg-card sgp-pad">
          <Matrix id="cta" title="Full-width action" spec=".sg-cta (EmployeeSubmitButton markup)">
            <Cell label="Rest"><button type="button" className="sg-cta sgp-inline"><SigPendingLabel className="nv-label-swap" pending={false} pendingText="Saving…">Save usual week</SigPendingLabel></button></Cell>
            <Cell label="Hover / press / Tab to me"><button type="button" className="sg-cta sgp-inline" aria-busy={live || undefined} aria-disabled={live || undefined} data-qa="live-cta"><SigPendingLabel className="nv-label-swap" pending={live} pendingText="Saving…">Save usual week</SigPendingLabel></button></Cell>
            <Cell label="Pending"><button type="button" className="sg-cta sgp-inline" aria-busy aria-disabled><SigPendingLabel className="nv-label-swap" pending pendingText="Saving…">Save usual week</SigPendingLabel></button></Cell>
            <Cell label="Disabled"><button type="button" className="sg-cta sgp-inline" disabled><SigPendingLabel className="nv-label-swap" pending={false} pendingText="Saving…">Save usual week</SigPendingLabel></button></Cell>
          </Matrix>
          <Matrix id="ghost" title="Full-width ghost" spec='.sg-cta[data-kind="ghost"]'>
            <Cell label="Rest"><button type="button" className="sg-cta sgp-inline" data-kind="ghost">Withdraw</button></Cell>
            <Cell label="Hover / press / Tab to me"><button type="button" className="sg-cta sgp-inline" data-kind="ghost" data-qa="live-ghost">Withdraw</button></Cell>
            <Cell label="Pending" note="No pending markup on the ghost" />
            <Cell label="Disabled"><button type="button" className="sg-cta sgp-inline" data-kind="ghost" disabled>Withdraw</button></Cell>
          </Matrix>
          <Matrix id="pill" title="Pill action" spec=".sg-primary">
            <Cell label="Rest"><a className="sg-primary" href="#sgp-legacy">Review</a></Cell>
            <Cell label="Hover / press / Tab to me"><a className="sg-primary" href="#sgp-legacy" data-qa="live-pill">Review</a></Cell>
            <Cell label="Pending" note="No pending style for .sg-primary" />
            <Cell label="Disabled" note="No disabled style for .sg-primary" />
          </Matrix>
          <Matrix id="sglink" title="Text link" spec=".sg-link">
            <Cell label="Rest"><button type="button" className="sg-link">Reset changes</button></Cell>
            <Cell label="Hover / press / Tab to me"><button type="button" className="sg-link" data-qa="live-sglink">Reset changes</button></Cell>
            <Cell label="Pending" note="No pending style for .sg-link" />
            <Cell label="Disabled"><button type="button" className="sg-link" disabled>Reset changes</button></Cell>
          </Matrix>
        </div>

        <SigHead id="sgp-try" title="Try pending" aside="No server: a 2.5s pause" />
        <div className="sg-card sgp-pad sgp-trybox">
          <TryItForm label="Save usual week" pendingText="Saving…" onDone={() => setSaved("Saved. Nothing left this page.")} />
          <SigButton pending={busy} pendingText="Submitting request…" onClick={tryPending} data-qa="try-sigbutton">Submit request</SigButton>
          <p className="sg-after" role="status" aria-live="polite">{busy ? "Working…" : saved ?? "Press a button to see it work."}</p>
        </div>

        {/* ── Rows ────────────────────────────────────────────────────────────── */}
        <SigHead id="sgp-rows" title="Rows" count={3} aside="Hover / press / Tab to me" />
        <div className="sg-card">
          <a className="sg-r" href="#sgp-rows" data-qa="live-row">
            <SigDay top="Oct" day={27} />
            <span className="sg-copy"><span className="sg-t1"><b>Time off</b><span className="sg-pill" data-tone="amber">Waiting</span></span><span>Mon, Oct 27 – Tue, Oct 28</span><span>Sent Oct 20</span></span>
          </a>
          <a className="sg-r" href="#sgp-rows">
            <SigDay top="Nov" day={3} />
            <span className="sg-copy"><span className="sg-t1"><b>Shift swap</b><span className="sg-pill" data-tone="teal">Approved</span></span><span>With Jordan Vega · 8:00 AM – 4:00 PM</span></span>
          </a>
          <a className="sg-r" href="#sgp-rows">
            <SigDay top="Nov" day={14} />
            <span className="sg-copy"><span className="sg-t1"><b>Part of a day</b><span className="sg-pill">Withdrawn</span></span><span>Fri, Nov 14 · 1:00 – 3:00 PM</span></span>
          </a>
        </div>
        <SigHead id="sgp-list" title="List and link rows" aside=".sg-list · SigLinkRow · .sg-row" />
        <ul className="sg-list">
          <li><SigLinkRow href="#sgp-list" title="Availability" sub="Your usual week" /></li>
          <li><SigLinkRow href="#sgp-list" title="Pay statements" sub="Latest: Oct 17" trailing={<span className="sg-pill">New</span>} /></li>
          <li><a className="sg-row" href="#sgp-list"><span className="sg-tile"><ClockIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>My time</b><span>32h 15m this week</span></span><SigChevron /></a></li>
        </ul>
        <p className="sg-quiet"><span>Updated 9:41 AM</span><button type="button" className="sg-link">Refresh</button></p>

        {/* ── Tiles, pills, ticket ────────────────────────────────────────────── */}
        <SigHead id="sgp-tiles" title="Tiles and pills" />
        <div className="sg-card">
          <div className="sg-card-head"><span className="sg-tile"><AirplaneIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>Tile, default</b><span>.sg-tile</span></span><span className="sg-pill">Default</span></div>
          <div className="sg-card-head"><span className="sg-tile" data-tone="amber"><BellIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>Tile, amber</b><span>data-tone=&quot;amber&quot;</span></span><span className="sg-pill" data-tone="amber">Waiting</span></div>
          <div className="sg-card-head sgp-tint"><span className="sg-tile" data-tone="white"><ArrowsLeftRightIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>Tile, white</b><span>On a tinted card</span></span><span className="sg-pill" data-tone="teal">Approved</span></div>
          <p className="sg-card-foot" data-tone="amber"><BellIcon size={18} aria-hidden="true" />Amber card foot: one thing needs you.</p>
        </div>
        <p className="sg-note"><i aria-hidden="true" />No chip or filter-chip component exists in Signature yet; pills are status only.</p>

        <SigHead id="sgp-ticket" title="Ticket" aside="Filled and empty figure" />
        <div className="sg-card">
          <div className="sg-card-head"><span className="sg-tile"><CalendarBlankIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>Filled</b><span>Oct 27 – 28</span></span></div>
          <div className="sg-ticket">
            <div><small>From</small><b aria-hidden="true">27</b><span>Monday</span><span>Oct 2026</span></div>
            <i aria-hidden="true"><ArrowRightIcon size={18} /></i>
            <div><small>To</small><b aria-hidden="true">28</b><span>Tuesday</span><span>Oct 2026</span></div>
          </div>
          <p className="sg-card-foot"><CalendarBlankIcon size={18} aria-hidden="true" />Tap a date to change it</p>
        </div>
        <div className="sg-card">
          <div className="sg-card-head"><span className="sg-tile"><CalendarBlankIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>Empty figure</b><span>b[data-empty]</span></span></div>
          <div className="sg-ticket" data-qa="empty-ticket">
            <div><small>From</small><b data-empty="" aria-hidden="true">—</b><span>Choose a date</span></div>
            <i aria-hidden="true"><ArrowRightIcon size={18} /></i>
            <div><small>To</small><b data-empty="" aria-hidden="true">—</b><span>Choose a date</span></div>
          </div>
        </div>

        {/* ── Forms ───────────────────────────────────────────────────────────── */}
        <SigHead id="sgp-forms" title="Form group" aside="The two Signature field styles in use" />
        <div className={`${timeStyles.mtPanel} sgp-form-host`}>
          <form className="employee-time-correction-form" onSubmit={event => event.preventDefault()} aria-label="Fictional correction">
            <label htmlFor="sgp-reason">Reason<select id="sgp-reason" name="reason" defaultValue="forgot"><option value="forgot">I forgot to clock out</option><option value="device">The tablet was offline</option><option value="other">Something else</option></select></label>
            <label htmlFor="sgp-time">Clock-out time<input id="sgp-time" name="time" type="time" defaultValue="16:05" /></label>
            <label htmlFor="sgp-note">Note for your manager<textarea id="sgp-note" name="note" defaultValue="Left from the side door at 4:05." aria-describedby="sgp-note-help" /></label>
            <p id="sgp-note-help" className="sgp-help">Helper: only include details you want to share.</p>
          </form>
        </div>
        <div className="sg-card sgp-times">
          <div className={offStyles.toTimes}>
            <label><span>From</span><input type="time" defaultValue="15:00" aria-label="From, fictional" /></label>
            <i aria-hidden="true"><ArrowRightIcon size={16} /></i>
            <label><span>Until</span><input type="time" defaultValue="13:00" aria-label="Until, fictional" aria-invalid="true" aria-describedby="sgp-time-error" /></label>
          </div>
          <p className={offStyles.toError} id="sgp-time-error" role="alert">End time must be after start time.</p>
          <p className="sg-card-foot"><CalendarBlankIcon size={18} aria-hidden="true" />Helper: one date and the hours you need away</p>
        </div>
        <div className="sg-alert"><strong>Error, block</strong>Your request wasn’t sent. Check your connection and send it again.</div>
        {/* ── Component set ─────────────────────────────────────────────────── */}
        <SigHead id="sgp-set" title="Component set" aside="sig-components.tsx · sig-overlays.tsx" />
        <div className="sgp-pad sgp-stack">
          <SigTabs label="Page tabs, fictional" items={[{ href: `${here}#sgp-set`, label: "Mine", current: true, count: 3 }, { href: `${here}?tab=new#sgp-set`, label: "New" }, { href: `${here}?tab=team#sgp-set`, label: "Team" }]} />
        </div>
        <SigList label="SigList, fictional">
          <SigRow href={`${here}#sgp-set`} leading={<SigAvatar name="Jordan Vega" />} title="Jordan Vega" sub="Swap request · Nov 3" trailing={<SigPill tone="amber">Waiting</SigPill>} />
          <SigRow onClick={() => setToast("Refreshed just now.")} leading={<SigAvatar name="Priya Shah" size={40} />} title="Button row" sub="Shows a toast" />
          <SigRow title="Plain row" sub="No action" />
        </SigList>
        <SigCard flush label="SigCard, fictional" head={<><span className="sg-tile"><AirplaneIcon size={20} aria-hidden="true" /></span><span className="sg-copy"><b>SigCard</b><span>Head, rows and foot</span></span><SigPill tone="teal">Approved</SigPill></>}
          foot={<><BellIcon size={18} aria-hidden="true" />Foot: one quiet note</>}>
          <SigCardRow leading={<SigDay top="Nov" day={14} />} title="Part of a day" pill={<SigPill>Withdrawn</SigPill>} lines={["Fri, Nov 14 · 1:00 – 3:00 PM"]} />
        </SigCard>
        <div className="sgp-pad sgp-stack">
          <SigBanner tone="info" icon={<InfoIcon size={20} />} title="Info banner">Your manager publishes next week on Friday.</SigBanner>
          <SigBanner tone="review" icon={<WarningCircleIcon size={20} />} title="Review banner" action={<SigButton variant="link">Review the change</SigButton>}>Your Tuesday shift moved to 9:00 AM.</SigBanner>
          <SigBanner tone="urgent" icon={<WarningCircleIcon size={20} />} title="Not sent">Check your connection and send it again.</SigBanner>
          <SigBanner tone="done" icon={<CheckCircleIcon size={20} />} title="Request sent">You will hear back by Friday.</SigBanner>
        </div>
        <div className="sg-card"><SigEmpty icon={<TrayIcon size={26} />} title="No requests yet" action={<SigButton variant="secondary" href={`${here}#sgp-set`}>Request time off</SigButton>}>Time off and swaps you send show up here.</SigEmpty></div>
        <div className="sg-card" role="status" aria-busy="true" aria-label="Loading example"><SigSkeleton tile /><SigSkeleton tile lines={2} /></div>
        <div className="sgp-pad">
          <SigFieldGroup legend="SigFieldGroup">
            <SigField id="sgp-f-name" label="Preferred name" hint="Shown to your team"><input defaultValue="Alex" /></SigField>
            <SigField id="sgp-f-phone" label="Mobile number" error="Enter a 10-digit number"><input type="tel" defaultValue="555 01" /></SigField>
            <SigField id="sgp-f-shift" label="Usual shift"><select defaultValue="day"><option value="day">Day</option><option value="night">Night</option></select></SigField>
          </SigFieldGroup>
        </div>
        <div className="sgp-pad sgp-stack">
          <SigButton variant="secondary" onClick={() => setSheetOpen(true)}>Open a sheet</SigButton>
          <SigButton variant="secondary" onClick={() => setToast("Request withdrawn.")}>Show a toast</SigButton>
        </div>
        <SigSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filter shifts">
          <SigFieldGroup>
            <SigField id="sgp-s-where" label="Location"><select defaultValue="north"><option value="north">Northside</option><option value="east">Eastgate</option></select></SigField>
          </SigFieldGroup>
          <div className="sgp-stack sgp-sheet-actions"><SigButton onClick={() => setSheetOpen(false)}>Show shifts</SigButton></div>
        </SigSheet>
        {toast ? <SigToast message={toast} action={{ label: "Undo", onClick: () => setToast(null) }} onDismiss={() => setToast(null)} /> : null}
        <p className="sg-after">Fictional data. Nothing on this page reaches a live record.</p>
      </SigPage>
    </main>
  </div>;
}
