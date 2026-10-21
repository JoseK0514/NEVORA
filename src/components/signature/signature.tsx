import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./signature.module.css";
import { SigFade } from "./sig-fade";

/* The employee Signature frame (Jose approved Signature, Oct 20, 2026; spec:
 * docs/product/specs/employee-style/signature/SIGNATURE-SPEC.md; phase-1 target:
 * docs/product/specs/employee-style/signature/phase-1/p1c-board.png). A deep-teal band whose eyebrow and large light
 * figure carry the page's key fact, then a soft-white sheet of tracked-caps sections and white lists. Shared by the
 * employee pages built in phase 1 and after; `data-sig` lets the shell (section tabs, frame padding) know. */

export { styles as signatureStyles };

export function SigPage({ band, children, className = "" }: { band: ReactNode; children: ReactNode; className?: string }) {
  return <div className={`${styles.sgRoot} ${className}`.trim()} data-sig="" data-sig-surface="light">
    {band}
    <div className={styles.sgSheet} data-sig-sheet="">{children}</div>
  </div>;
}

/** The band: an eyebrow (tracked caps), the hero (a large figure or word), and what follows it. The page's h1 is the
 * hero's label for screen readers when the hero is a figure. */
export function SigBand({ eyebrow, live = false, mark = true, children }: { eyebrow: ReactNode; live?: boolean | "idle"; /** False when the page draws its own Λ (Profile's card). */ mark?: boolean; children: ReactNode }) {
  return <header className={styles.sgBand} data-sig-surface="deep">
    {mark ? <svg className={styles.sgMark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path className={styles.sgMarkL} d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.sgMarkT} d="M146 330 L180 266 L214 330 Z"/></svg> : null}
    <p className={styles.sgEyebrow}>{live ? <i className={live === true ? styles.sgLive : undefined} aria-hidden="true" /> : null}{eyebrow}</p>
    {children}
  </header>;
}

/** "7h 45m" with the units set small; screen readers hear "7 hours 45 minutes". */
export function Duration({ seconds, size = "hero" }: { seconds: number; size?: "hero" | "pair" }) {
  const minutesTotal = Math.max(0, Math.floor(seconds / 60)), hours = Math.floor(minutesTotal / 60), minutes = minutesTotal % 60;
  return <span className={size === "hero" ? styles.sgDurHero : styles.sgDurPair}>
    <SigFade value={`${hours}:${minutes}`}>{hours}<em>h</em> {String(minutes).padStart(2, "0")}<em>m</em></SigFade>
    <span className="nv-sr">{hours} {hours === 1 ? "hour" : "hours"} {minutes} {minutes === 1 ? "minute" : "minutes"}</span>
  </span>;
}

export function SigSection({ id, title, action, children }: { id?: string; title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return <section className={styles.sgSection} aria-labelledby={id}>
    <header className={styles.sgHead}><h2 id={id}>{title}</h2>{action}</header>
    {children}
  </section>;
}

/** Phase 3 section head: a tracked-caps title with its count in a small pill, and an optional note on the right. */
export function SigHead({ id, title, count, aside }: { id?: string; title: ReactNode; count?: number; aside?: ReactNode }) {
  return <div className="sg-h"><h2 id={id}>{title}{count !== undefined ? <em>{count}</em> : null}</h2>{aside ? <span>{aside}</span> : null}</div>;
}

/** "OCT / 12": a date set as a small caps label over a light figure. */
export function SigDay({ top, day }: { top: string; day: string | number }) {
  return <span className="sg-day" aria-hidden="true"><small>{top}</small><strong>{day}</strong></span>;
}

export function SigChevron() {
  return <svg className={styles.sgChevron} width="7" height="12" viewBox="0 0 7 12" aria-hidden="true" focusable="false"><path d="m1 1 5 5-5 5"/></svg>;
}

export function SigLinkRow({ href, title, sub, trailing }: { href: string; title: ReactNode; sub?: ReactNode; trailing?: ReactNode }) {
  return <Link href={href} className={styles.sgLinkRow}><span><b>{title}</b>{sub ? <small>{sub}</small> : null}</span>{trailing ?? <SigChevron />}</Link>;
}

export function DownloadIcon() {
  return <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.sgIcon}><path d="M12 4.5v11M7.5 11 12 15.5 16.5 11M5 19.5h14"/></svg>;
}
