import Link from "next/link";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { SigChevron } from "./signature";

/* The Signature component set (server-safe). Rows, cards and pills render the existing `sg-*` classes, so they look
 * exactly like the hand-written markup and are styled inside a SigPage (`.sgRoot`). Fields, tabs, banners, empty
 * states, avatars and skeletons are new `sig-*` pieces styled in components.css from the --sig-* tokens, so they work
 * on any Signature surface (employee app, sign-in, Clocker). SigSheet and SigToast live in sig-overlays.tsx. */

const cx = (...names: (string | false | null | undefined)[]) => names.filter(Boolean).join(" ");

/* ── Lists and rows ──────────────────────────────────────────────────────── */

/** A white list group (`.sg-list`). Children are SigRow items. */
export function SigList({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return <ul className={cx("sg-list", className)} aria-label={label}>{children}</ul>;
}

type SigRowProps = {
  title: ReactNode;
  /** Second line, quieter. */
  sub?: ReactNode;
  /** A tile, SigDay or avatar on the left. */
  leading?: ReactNode;
  /** A pill or value on the right; defaults to a chevron when the row links somewhere. */
  trailing?: ReactNode;
  href?: string;
  onClick?: () => void;
};

/** One row of a SigList: a link (href), a button (onClick) or plain content. The whole row is the tap target. */
export function SigRow({ title, sub, leading, trailing, href, onClick }: SigRowProps) {
  const body = <>{leading}<span className="sg-copy"><b>{title}</b>{sub ? <span>{sub}</span> : null}</span>{trailing ?? (href || onClick ? <SigChevron /> : null)}</>;
  return <li>{href ? <Link className="sg-row" href={href}>{body}</Link>
    : onClick ? <button type="button" className="sg-row sig-row-button" onClick={onClick}>{body}</button>
    : <div className="sg-row">{body}</div>}</li>;
}

/* ── Cards ───────────────────────────────────────────────────────────────── */

export type SigCardTone = "default" | "tint" | "amber";

/** A white card (`.sg-card`) with an optional head (tile, title, pill), body and foot. `flush` drops the body padding
 * for SigCardRow children, which carry their own. */
export function SigCard({ tone = "default", head, children, foot, footTone, className, label, flush = false }: {
  tone?: SigCardTone; head?: ReactNode; children?: ReactNode; foot?: ReactNode; footTone?: "amber"; className?: string; label?: string; flush?: boolean;
}) {
  return <section className={cx("sg-card", className)} data-tone={tone === "default" ? undefined : tone} aria-label={label}>
    {head ? <div className="sg-card-head">{head}</div> : null}
    {children ? flush ? children : <div className="sg-card-body">{children}</div> : null}
    {foot ? <p className="sg-card-foot" data-tone={footTone}>{foot}</p> : null}
  </section>;
}

/** A row inside a SigCard (`.sg-r`): a SigDay or tile, a title line with an optional pill, and quieter lines. */
export function SigCardRow({ href, leading, title, pill, lines = [] }: { href?: string; leading?: ReactNode; title: ReactNode; pill?: ReactNode; lines?: ReactNode[] }) {
  const body = <>{leading}<span className="sg-copy"><span className="sg-t1"><b>{title}</b>{pill}</span>{lines.map((line, index) => <span key={index}>{line}</span>)}</span></>;
  return href ? <Link className="sg-r" href={href}>{body}</Link> : <div className="sg-r">{body}</div>;
}

/* ── Pills ───────────────────────────────────────────────────────────────── */

export type SigPillTone = "neutral" | "teal" | "amber";

/** A status pill (`.sg-pill`). Always words, never colour alone: "Approved", "Waiting", "Withdrawn". */
export function SigPill({ tone = "neutral", children }: { tone?: SigPillTone; children: ReactNode }) {
  return <span className="sg-pill" data-tone={tone === "neutral" ? undefined : tone}>{children}</span>;
}

/* ── Tabs ────────────────────────────────────────────────────────────────── */

export type SigTabItem = { href: string; label: ReactNode; current?: boolean; count?: number };

/** Navigation tabs. `band`: pills on the deep band; `page`: a segmented control on the sheet. Links, not ARIA tabs:
 * each one is a route, and the current one carries aria-current="page". */
export function SigTabs({ label, items, variant = "page" }: { label: string; items: SigTabItem[]; variant?: "band" | "page" }) {
  return <nav className="sig-tabs" data-variant={variant} aria-label={label}>
    <ul>{items.map(item => <li key={item.href}>
      <Link className="sig-tabs__link" href={item.href} aria-current={item.current ? "page" : undefined}>
        {item.label}{item.count !== undefined ? <em>{item.count}</em> : null}
      </Link>
    </li>)}</ul>
  </nav>;
}

/* ── Banners and empty states ────────────────────────────────────────────── */

export type SigBannerTone = "info" | "review" | "urgent" | "done";

/** A page-level message. `urgent` is announced at once (role=alert); the others politely (role=status). The title
 * says what happened; the body says what to do. */
export function SigBanner({ tone = "info", icon, title, children, action }: { tone?: SigBannerTone; icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return <div className="sig-banner" data-tone={tone} role={tone === "urgent" ? "alert" : "status"}>
    {icon ? <span className="sig-banner__icon" aria-hidden="true">{icon}</span> : null}
    <div className="sig-banner__copy"><strong>{title}</strong>{children ? <p>{children}</p> : null}{action ? <div className="sig-banner__action">{action}</div> : null}</div>
  </div>;
}

/** Nothing here yet: an icon tile, a short title, one line on why, and the next step. */
export function SigEmpty({ icon, title, children, action }: { icon?: ReactNode; title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return <div className="sig-empty">
    {icon ? <span className="sig-empty__tile" aria-hidden="true">{icon}</span> : null}
    <strong>{title}</strong>
    {children ? <p>{children}</p> : null}
    {action ? <div className="sig-empty__action">{action}</div> : null}
  </div>;
}

/* ── Avatar ──────────────────────────────────────────────────────────────── */

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? "").join("");

/** A person: their photo, or initials in deep teal on a mint wash (11.5:1). Decorative by default (the name is
 * usually written next to it); pass `labelled` when it stands alone. */
export function SigAvatar({ name, src, size = 40, labelled = false }: { name: string; src?: string; size?: 32 | 40 | 56; labelled?: boolean }) {
  const a11y = labelled ? { role: "img" as const, "aria-label": name } : { "aria-hidden": true as const };
  return <span className="sig-avatar" data-size={size} {...a11y}>
    {/* eslint-disable-next-line @next/next/no-img-element -- avatars come from arbitrary storage URLs at fixed small sizes */}
    {src ? <img src={src} alt="" width={size} height={size} /> : initialsOf(name)}
  </span>;
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */

/** Placeholder lines while content loads. Hidden from screen readers: mark the loading region aria-busy instead. The
 * shimmer stops under reduced motion. */
export function SigSkeleton({ lines = 3, tile = false }: { lines?: number; tile?: boolean }) {
  return <div className="sig-skeleton" aria-hidden="true">
    {tile ? <span className="sig-skeleton__tile" /> : null}
    <span className="sig-skeleton__lines">{Array.from({ length: lines }, (_, index) => <span key={index} />)}</span>
  </div>;
}

/* ── Fields ──────────────────────────────────────────────────────────────── */

/** A group of fields drawn as one white card (the sign-in card style): fields stacked with hairlines between them.
 * With a legend it is a fieldset. */
export function SigFieldGroup({ legend, children, disabled }: { legend?: ReactNode; children: ReactNode; disabled?: boolean }) {
  return legend
    ? <fieldset className="sig-fieldgroup" disabled={disabled}><legend className="sig-fieldgroup__legend">{legend}</legend><div className="sig-fieldgroup__card">{children}</div></fieldset>
    : <div className="sig-fieldgroup"><div className="sig-fieldgroup__card">{children}</div></div>;
}

type FieldControlProps = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" };

/** One field: a tracked-caps label, the control (an input, select or textarea passed as the only child), a hint and
 * an error. The control gets its id, aria-describedby and aria-invalid from here. */
export function SigField({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactElement<FieldControlProps> }) {
  const hintId = hint ? `${id}-hint` : undefined, errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = Children.only(children);
  return <div className="sig-field" data-invalid={error ? "" : undefined}>
    <label className="sig-field__label" htmlFor={id}>{label}</label>
    {isValidElement(control) ? cloneElement(control, { id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined }) : control}
    {hint ? <p className="sig-field__hint" id={hintId}>{hint}</p> : null}
    {error ? <p className="sig-field__error" id={errorId}>{error}</p> : null}
  </div>;
}
