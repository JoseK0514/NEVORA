import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { NoteIcon } from "@phosphor-icons/react/dist/ssr/Note";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { SigBand, SigHead, SigPage } from "./signature";
import styles from "./system-state.module.css";

/* The employee app's system screens in the Signature style (phase 4, approved Oct 20, 2026; target
 * docs/product/specs/employee-style/signature/phase-4/p4b-board-c.png). The shared screens stay for other roles; the
 * employee shell shows these instead (employee-style.css). */

const places = [
  { href: "/app", label: "Home", sub: "Today and what’s next", Icon: HouseIcon },
  { href: "/app/schedule", label: "My schedule", sub: "This week’s shifts", Icon: CalendarBlankIcon },
  { href: "/app/requests/hub", label: "Requests", sub: "Time off and shift changes", Icon: NoteIcon },
];

export function SignatureNotFound() {
  return <SigPage className={styles.ssRoot} band={<SigBand eyebrow="Error 404">
    <b className={styles.ss404} aria-hidden="true">404</b>
    <h1 className="sg-head2">Page<br />not found</h1>
    <p className="sg-sub"><span>The link may be old, mistyped, or not available to your account.</span></p>
  </SigBand>}>
    <SigHead id="ss-places" title="Pick up where you left off" />
    <ul className="sg-card" aria-labelledby="ss-places">{places.map(({ href, label, sub, Icon }) => <li key={href}>
      <Link className={`sg-r ${styles.ssRow}`} href={href}><span className="sg-tile" aria-hidden="true"><Icon size={22} /></span>
        <span className="sg-copy"><b>{label}</b><span>{sub}</span></span><CaretRightIcon className={styles.ssChev} size={16} aria-hidden="true" /></Link>
    </li>)}</ul>
  </SigPage>;
}

export function SignatureError({ action }: { action: ReactNode }) {
  return <SigPage className={styles.ssRoot} band={<SigBand eyebrow="Error" mark={false}>
    <span className={styles.ssOrb} aria-hidden="true"><WarningIcon size={32} /></span>
    <h1 className="sg-head2">This page<br />didn’t load</h1>
    <p className="sg-sub"><span>Nothing was changed. Check your connection, then try again.</span></p>
  </SigBand>}>
    <p className="nv-sr" role="alert">This page didn’t load. Nothing was changed. Check your connection, then try again.</p>
    {action}
    <div className="sg-center"><Link className="sg-link" href="/app">Go to Home</Link></div>
    <p className="sg-after">Still stuck? Sign out and back in, or ask your manager.</p>
  </SigPage>;
}
