import "./quiet.css";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";

/* NEVORA "Quiet" (v4, approved 2026-10-23). Presentation only: callers pass authorized, formatted data.
 * Each piece reproduces one element of docs/product/specs/owner-v4-quiet/kit4.css. */

export function QuietPage({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return <div className={className ? `q-page ${className}` : "q-page"} data-nv-page="" aria-label={label}>{children}</div>;
}

/** A top-level tab's bar: optional workspace name on the left, icon actions on the right. */
export function QuietBar({ org, start, children }: { org?: ReactNode; start?: ReactNode; children?: ReactNode }) {
  return <div className="q-bar">{org ? <span className="q-bar__org">{org}</span> : start ?? null}<span className="q-bar__sp" />{children}</div>;
}

/** A bar icon link (28 by 44, a 44 by 44 hit area). */
export function QuietBarIcon({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return <Link className="q-bar__icon" href={href} aria-label={label}>{children}</Link>;
}

/** A pushed page's bar: back (or Cancel) on the left, an optional title, an optional action on the right. */
export function QuietNav({ back, left, title, right }: { back?: { href: string; label: string }; left?: ReactNode; title?: ReactNode; right?: ReactNode }) {
  return <div className="q-nav">
    {back ? <Link className="q-nav__l" href={back.href}><CaretLeftIcon className="q-ic q-ic--s" aria-hidden="true" />{back.label}</Link> : left ?? <span />}
    {title ? <span className="q-nav__t">{title}</span> : <span />}
    {right ?? <span />}
  </div>;
}

export function QuietHeader({ title, sub, titleId }: { title: ReactNode; sub?: ReactNode; titleId?: string }) {
  return <div className="q-hd"><h1 id={titleId}>{title}</h1>{sub ? <p>{sub}</p> : null}</div>;
}

/** A 20pt section ("Needs you") with its rows. */
export function QuietSection({ title, aside, id, children }: { title: ReactNode; aside?: ReactNode; id?: string; children?: ReactNode }) {
  const headingId = id ? `${id}-title` : undefined;
  return <section id={id} aria-labelledby={headingId}>
    <div className="q-sec"><h2 id={headingId}>{title}</h2>{aside ? <span className="q-sec__aside">{aside}</span> : null}</div>
    {children}
  </section>;
}

/** A 15pt grey group label ("Main Office") with its rows. */
export function QuietGroup({ label, id, tight, children }: { label?: ReactNode; id?: string; tight?: boolean; children?: ReactNode }) {
  const headingId = id && label ? `${id}-title` : undefined;
  return <section id={id} aria-labelledby={headingId}>
    {label ? <div className={tight ? "q-grp q-grp--m" : "q-grp"}><h2 id={headingId}>{label}</h2></div> : null}
    {children}
  </section>;
}

export function QuietList({ label, children, style }: { label?: string; children: ReactNode; style?: CSSProperties }) {
  return <ul className="q-list" aria-label={label} style={style}>{children}</ul>;
}

export type QuietRowProps = {
  title: ReactNode;
  detail?: ReactNode;
  value?: ReactNode;
  /** l: 17pt grey · ph: placeholder · ink · go: teal · alert: the one red */
  tone?: "l" | "ph" | "ink" | "go" | "alert";
  /** Initials for a grey avatar, "open" for an open-shift ring, or any node. */
  avatar?: string | "open" | ReactNode;
  href?: string;
  /** A trailing control (a toggle, a small button). */
  control?: ReactNode;
  chevron?: boolean;
  label?: string;
  /** 52pt single-line row. Defaults to single line when there is no detail. */
  one?: boolean;
  id?: string;
  /** The row element alone, without its list item (a row followed by its own actions). */
  bare?: boolean;
  /** v5 One look: a 24pt line icon before the title (the divider still starts at the margin). */
  icon?: ReactNode;
  /** v5 One look: "tint" draws the avatar as a teal-tinted circle (a row that needs you); "danger" makes the title red. */
  variant?: "tint" | "danger";
};

export function QuietRow({ title, detail, value, tone, avatar, href, control, chevron, label, one, id, bare, icon, variant }: QuietRowProps) {
  const leading = avatar === undefined || avatar === null ? null
    : avatar === "open" ? <span className="q-av q-av--open" aria-hidden="true"><PlusIcon className="q-ic" aria-hidden="true" /></span>
    : typeof avatar === "string" ? <span className={variant === "tint" ? "q-av q-av--tint" : "q-av"} aria-hidden="true">{avatar}</span>
    : variant === "tint" ? <span className="q-av q-av--tint" aria-hidden="true">{avatar}</span> : avatar;
  const single = one ?? !detail;
  const className = `q-row${single ? " q-row--one" : ""}${leading ? " q-row--av" : ""}${variant === "danger" ? " q-row--danger" : ""}`;
  const showChev = chevron ?? (!!href && !control);
  const body = <>
    {leading}
    {icon ? <span className="q-row__ic" aria-hidden="true">{icon}</span> : null}
    <span className="q-rt"><b>{title}</b>{detail ? <i>{detail}</i> : null}</span>
    {value !== undefined && value !== null && value !== "" ? <span className={`q-rv${tone ? ` q-rv--${tone}` : ""}`}>{value}</span> : null}
    {control}
    {showChev ? <CaretRightIcon className="q-chev" aria-hidden="true" /> : null}
  </>;
  const row = href ? <Link className={className} href={href} aria-label={label}>{body}</Link> : <div className={className} aria-label={label}>{body}</div>;
  return bare ? row : <li id={id}>{row}</li>;
}

/** Quiet (v4) loading shape: the page's large title and grouped rows, static (no shimmer), so a placeholder and the page it
 * becomes look like one page. Shown only in the Quiet shell (quiet.css); elsewhere the older placeholder stays. */
export function QuietSkeleton({ rows = 6 }: { rows?: number }) {
  return <div className="q-page q-skel-page" aria-hidden="true">
    <div className="q-skel__nav" />
    <div className="q-skel__title"><i /><i /></div>
    <ul className="q-skel__rows">{Array.from({ length: rows }, (_, index) => <li key={index}><b /><span><i /><i /></span></li>)}</ul>
  </div>;
}

export function initialsOf(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
}

/** Segmented control made of real links. */
export function QuietSegments({ label, items }: { label: string; items: { href: string; label: ReactNode; current?: boolean; ariaLabel?: string }[] }) {
  return <nav className="q-seg" aria-label={label}>
    {items.map(item => <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} aria-label={item.ariaLabel}>{item.label}</Link>)}
  </nav>;
}

/** How long ago something was sent: "12 min ago", "2 h ago", "3 d ago" (short: "12 min", "2 h", "3 d"). */
export function agoLabel(at: string, now: string, short = false) {
  const minutes = Math.max(0, Math.floor((Date.parse(now) - Date.parse(at)) / 60_000));
  const text = minutes < 1 ? "now" : minutes < 60 ? `${minutes} min` : minutes < 1440 ? `${Math.floor(minutes / 60)} h` : `${Math.floor(minutes / 1440)} d`;
  return text === "now" ? "Just now" : short ? text : `${text} ago`;
}

/** "Thu, Oct 29" from a calendar date (YYYY-MM-DD). */
export function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

/** "Oct 19 – 25", or "Oct 26 – Nov 1" across a month end. */
export function weekLabel(weekStart: string) {
  const end = new Date(Date.parse(`${weekStart}T12:00:00Z`) + 6 * 86_400_000).toISOString().slice(0, 10);
  const month = (date: string) => new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  const day = (date: string) => Number(date.slice(8));
  return `${month(weekStart)} ${day(weekStart)} – ${month(end) === month(weekStart) ? "" : `${month(end)} `}${day(end)}`;
}
