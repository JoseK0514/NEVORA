import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CircleIcon } from "@phosphor-icons/react/dist/ssr/Circle";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { BrandWordmark } from "@/components/brand-mark";
import { KeepSelectedVisible } from "./keep-selected-visible";

/* NEVORA kit: shared pieces for the premium direction (phase 1).
 * Presentation only. Callers pass already-authorized, already-formatted data;
 * nothing here fetches, decides or mutates. Styles live in ./kit.css. */

export type KitTone = "neutral" | "review" | "done" | "urgent";

const statusGlyph: Record<KitTone, typeof CircleIcon> = {
  neutral: CircleIcon,
  review: ClockIcon,
  done: CheckCircleIcon,
  urgent: WarningCircleIcon,
};

/** The page frame: grey canvas, teal band on top, cards overlapping it. */
export function KitPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `nv-page ${className}` : "nv-page"}>{children}</div>;
}

/** Watermark drawn from the NEVORA mark: the open chevron with its filled apex. */
function MastheadMark() {
  return (
    <svg className="nv-masthead__mark" viewBox="0 0 240 240" fill="none" aria-hidden="true" focusable="false">
      <path d="M24 216 120 30l96 186" stroke="currentColor" strokeWidth="26" strokeLinejoin="miter" />
      <path d="M120 120 154 186H86z" fill="currentColor" />
    </svg>
  );
}

export type MastheadProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  /** Back link that names where it goes ("Inbox", "Timecards"). Replaces the wordmark. */
  back?: { href: string; label: string };
  /** Small text after the wordmark, e.g. the role ("Manager"). */
  product?: ReactNode;
  actions?: ReactNode;
  extra?: ReactNode;
  titleId?: string;
};

export function Masthead({ eyebrow, title, summary, back, product, actions, extra, titleId }: MastheadProps) {
  return (
    <header className="nv-masthead">
      <MastheadMark />
      <div className="nv-masthead__bar">
        {back ? (
          <Link className="nv-masthead__back" href={back.href}>
            <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
            {back.label}
          </Link>
        ) : (
          <span className="nv-masthead__brand">
            <BrandWordmark />
            {product ? <span className="nv-masthead__product">{product}</span> : null}
          </span>
        )}
        {actions ? <div className="nv-masthead__actions">{actions}</div> : null}
      </div>
      <div className="nv-masthead__body">
        {eyebrow ? <p className="nv-masthead__eyebrow">{eyebrow}</p> : null}
        <h1 className="nv-masthead__title" id={titleId}>{title}</h1>
        {summary ? <p className="nv-masthead__summary">{summary}</p> : null}
      </div>
      {extra ? <div className="nv-masthead__extra">{extra}</div> : null}
    </header>
  );
}

export type PageBandProps = {
  eyebrow?: ReactNode;
  title: ReactNode;
  summary?: ReactNode;
  /** Back names where it goes (F6), e.g. { href: "/app/inbox?filter=requests", label: "Inbox" }. */
  back?: { href: string; label: string };
  /** A small control at the top right of the band, e.g. Refresh. */
  aside?: ReactNode;
  extra?: ReactNode;
  titleId?: string;
  /** false when the page starts with a toolbar rather than a card: the band ends before the content. */
  overlap?: boolean;
};

/** The teal band for a page inside the app shell. Marks the page with data-nv-band so the
 * shell header joins it. Exactly one h1. */
export function PageBand({ eyebrow, title, summary, back, aside, extra, titleId, overlap = true }: PageBandProps) {
  return (
    <header className={overlap ? "nv-masthead nv-pageband" : "nv-masthead nv-pageband nv-pageband--flat"} data-nv-band="">
      <MastheadMark />
      {back ? (
        <div className="nv-pageband__bar">
          <Link className="nv-masthead__back" href={back.href}>
            <CaretLeftIcon size={20} weight="bold" aria-hidden="true" />
            {back.label}
          </Link>
          {aside}
        </div>
      ) : null}
      <div className="nv-masthead__body">
        {eyebrow || (aside && !back) ? <div className="nv-pageband__eyebrow-row">
          {eyebrow ? <p className="nv-masthead__eyebrow">{eyebrow}</p> : <span />}
          {!back ? aside : null}
        </div> : null}
        <h1 className="nv-masthead__title" id={titleId} suppressHydrationWarning>{title}</h1>
        {summary ? <p className="nv-masthead__summary">{summary}</p> : null}
      </div>
      {extra ? <div className="nv-masthead__extra">{extra}</div> : null}
    </header>
  );
}

/** Content that overlaps a band. */
export function KitStack({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ? `nv-content ${className}` : "nv-content"}>{children}</div>;
}

export function KitContent({ children, label }: { children: ReactNode; label?: string }) {
  return <main className="nv-content" aria-label={label}>{children}</main>;
}

/** 44px icon button for the band. The label is required; the dot is decoration and the label says why. */
export function IconButton({ label, children, href, dot = false }: { label: string; children: ReactNode; href?: string; dot?: boolean }) {
  const inner = <>{children}{dot ? <span className="nv-icon-button__dot" aria-hidden="true" /> : null}</>;
  return href
    ? <Link className="nv-icon-button" href={href} aria-label={label}>{inner}</Link>
    : <button className="nv-icon-button" type="button" aria-label={label}>{inner}</button>;
}

export type CardProps = {
  title?: ReactNode;
  /** The heading's spoken name when its visible content has extra parts (a count badge). */
  titleLabel?: string;
  meta?: ReactNode;
  children: ReactNode;
  foot?: ReactNode;
  /** Section landmark name; defaults to the visible title via aria-labelledby. */
  id?: string;
};

export function Card({ title, titleLabel, meta, children, foot, id }: CardProps) {
  const headingId = id && title ? `${id}-title` : undefined;
  return (
    <section className="nv-card" id={id} aria-labelledby={headingId}>
      {title || meta ? (
        <div className="nv-card__head">
          {title ? <h2 className="nv-card__title" id={headingId} aria-label={titleLabel}>{title}</h2> : <span />}
          {meta ? <span className="nv-card__meta">{meta}</span> : null}
        </div>
      ) : null}
      {children}
      {foot ? <div className="nv-card__foot">{foot}</div> : null}
    </section>
  );
}

export function CardBody({ children }: { children: ReactNode }) {
  return <div className="nv-card__body">{children}</div>;
}

export function Rows({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="nv-rows" aria-label={label}>{children}</ul>;
}

export type RowProps = {
  title: ReactNode;
  meta?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** A Status, shown under the meta so names and dates keep the full width. */
  status?: ReactNode;
  href?: string;
  /** Accessible name for a linked row when the visible text needs context. */
  label?: string;
};

/** One list row. Linked rows show a chevron; plain rows are information only. */
export function Row({ title, meta, leading, trailing, status, href, label }: RowProps) {
  const body = (
    <>
      {leading}
      <span className="nv-row__text">
        <span className="nv-row__title">{title}</span>
        {meta ? <span className="nv-row__meta">{meta}</span> : null}
        {status ? <span className="nv-row__status">{status}</span> : null}
      </span>
      {trailing ? <span className="nv-row__trail">{trailing}</span> : null}
      {href ? <CaretRightIcon className="nv-row__chev" size={18} weight="bold" aria-hidden="true" /> : null}
    </>
  );
  return (
    <li>
      {href
        ? <Link className="nv-row" href={href} aria-label={label} data-leading={leading ? "true" : undefined}>{body}</Link>
        : <div className="nv-row" data-leading={leading ? "true" : undefined}>{body}</div>}
    </li>
  );
}

/** A "·"-separated line that breaks only between its parts (a time range never splits). */
export function MetaParts({ text }: { text: string }) {
  const parts = text.split(" · ");
  if (parts.length < 2) return <>{text}</>;
  // Each part moves to the next line as a unit (and wraps inside only if it can't fit);
  // the separator stays with the part before it, so a line never starts or ends on "·" alone.
  return <>{parts.map((part, index) => <span key={index}><span className="nv-keep">{part}{index < parts.length - 1 ? "\u00a0·" : null}</span>{index < parts.length - 1 ? " " : null}</span>)}</>;
}

export function Avatar({ initials, waiting = false }: { initials: string; waiting?: boolean }) {
  return <span className="nv-avatar" data-waiting={waiting ? "true" : undefined} aria-hidden="true">{initials}</span>;
}

export function Tile({ tone = "neutral", children }: { tone?: KitTone; children: ReactNode }) {
  return <span className="nv-tile" data-tone={tone} aria-hidden="true">{children}</span>;
}

/** A condition, never an action: "Published", "Draft", "Waiting", "Fix". Glyph plus word. */
export function Status({ tone, children }: { tone: KitTone; children: ReactNode }) {
  const Glyph = statusGlyph[tone];
  return (
    <span className="nv-status" data-tone={tone}>
      <Glyph size={14} weight={tone === "neutral" ? "bold" : "fill"} aria-hidden="true" />
      {children}
    </span>
  );
}

/** An action in text: a verb, in the action colour. */
export function KitLink({ href, children, label }: { href: string; children: ReactNode; label?: string }) {
  return <Link className="nv-link" href={href} aria-label={label}>{children}</Link>;
}

export type ButtonProps = {
  children: ReactNode;
  kind?: "primary" | "secondary";
  href?: string;
  block?: boolean;
  /** When set, the button is disabled and this sentence says why, right below it. */
  blockedReason?: ReactNode;
  type?: "button" | "submit";
};

export function Button({ children, kind = "primary", href, block = false, blockedReason, type = "button" }: ButtonProps) {
  const blocked = blockedReason != null;
  const common = { className: "nv-btn", "data-kind": kind, "data-block": block ? "true" : undefined } as const;
  const control = href && !blocked
    ? <Link {...common} href={href}>{children}</Link>
    : <button {...common} type={type} disabled={blocked}>{children}</button>;
  if (!blocked) return control;
  return (
    <div>
      {control}
      <p className="nv-reason"><InfoIcon size={16} weight="bold" aria-hidden="true" />{blockedReason}</p>
    </div>
  );
}

export type NextUpProps = {
  label?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  tone?: KitTone;
  action: { href: string; label: ReactNode };
  secondary?: ReactNode;
};

/** The one hero action on a screen. */
export function NextUp({ label = "Next up", title, body, icon, tone = "review", action, secondary }: NextUpProps) {
  return (
    <section className="nv-card nv-nextup" aria-label={typeof label === "string" ? label : "Next up"}>
      <p className="nv-nextup__label">{label}</p>
      <div className="nv-nextup__main">
        {icon ? <Tile tone={tone}>{icon}</Tile> : null}
        <div>
          <h2 className="nv-nextup__title">{title}</h2>
          {body ? <p className="nv-nextup__body">{body}</p> : null}
        </div>
      </div>
      <div className="nv-nextup__cut" aria-hidden="true" />
      <Button href={action.href} block>{action.label}</Button>
      {secondary}
    </section>
  );
}

/** ariaLabel replaces label and value for screen readers, e.g. "1 person late". */
export type Stat = { label: string; value: ReactNode; href?: string; tone?: "urgent"; ariaLabel?: string };

/** Numbers that say what they count. Each label names the unit or the population. */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="nv-stats" style={{ "--nv-stat-cols": stats.length } as CSSProperties}>
      {stats.map(stat => {
        const inner = (
          <>
            <span className="nv-stat__label" aria-hidden={stat.ariaLabel ? true : undefined}>{stat.label}</span>
            {stat.ariaLabel
              ? <span className="nv-stat__value"><span className="nv-sr">{stat.ariaLabel}</span><span aria-hidden="true">{stat.value}</span></span>
              : <span className="nv-stat__value">{stat.value}</span>}
          </>
        );
        return stat.href
          ? <Link key={stat.label} className="nv-stat" href={stat.href} data-tone={stat.tone}>{inner}</Link>
          : <div key={stat.label} className="nv-stat" data-tone={stat.tone}>{inner}</div>;
      })}
    </div>
  );
}

export type ProgressProps = {
  label: ReactNode;
  value: number;
  max: number;
  /** The words that carry the value, e.g. "3 of 5 sent". The bar is decoration. */
  valueText: string;
  note?: ReactNode;
  tone?: "review";
};

export function Progress({ label, value, max, valueText, note, tone }: ProgressProps) {
  const safeMax = max > 0 ? max : 1;
  const percent = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));
  return (
    <div className="nv-progress" data-tone={tone}>
      <div className="nv-progress__top">
        <span className="nv-progress__label">{label}</span>
        <span className="nv-progress__value">{valueText}</span>
      </div>
      <span className="nv-progress__track" aria-hidden="true">
        <span className="nv-progress__fill" style={{ width: `${percent}%` }} />
      </span>
      {note ? <span className="nv-progress__note">{note}</span> : null}
    </div>
  );
}

/** Money with smaller cents. The full amount is the accessible name. Never animated. */
export function Money({ amount, currency = "USD", locale = "en-US" }: { amount: number; currency?: string; locale?: string }) {
  const format = new Intl.NumberFormat(locale, { style: "currency", currency });
  const parts = format.formatToParts(amount);
  const fraction = parts.find(part => part.type === "fraction")?.value;
  const whole = parts
    .filter(part => part.type !== "fraction" && part.type !== "decimal")
    .map(part => part.value)
    .join("");
  return (
    <span className="nv-figure">
      <span className="nv-sr">{format.format(amount)}</span>
      <span aria-hidden="true">{whole}</span>
      {fraction ? <span className="nv-figure__minor" aria-hidden="true">.{fraction}</span> : null}
    </span>
  );
}

/** Hours and minutes with small units: "38h 30m", "8h", "45m" (the same as durationText). */
export function Duration({ minutes }: { minutes: number }) {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const spoken = [hours || !rest ? `${hours} ${hours === 1 ? "hour" : "hours"}` : "", rest ? `${rest} ${rest === 1 ? "minute" : "minutes"}` : ""].filter(Boolean).join(" ");
  return (
    <span className="nv-figure">
      <span className="nv-sr">{spoken}</span>
      <span aria-hidden="true">{hours || !rest ? <>{hours}<span className="nv-figure__unit">h</span></> : null}{rest ? <>{hours ? " " : ""}{rest}<span className="nv-figure__unit">m</span></> : null}</span>
    </span>
  );
}

/** "As of 6:14 PM". States: live (green dot), stale (grey), offline (open coral ring). */
export function Freshness({ children, state = "live" }: { children: ReactNode; state?: "live" | "stale" | "offline" }) {
  return <span className="nv-fresh" data-state={state}>{children}</span>;
}

export function FilterPills({ label, items }: { label: string; items: { href: string; label: string; current?: boolean }[] }) {
  return (
    <nav className="nv-filters" aria-label={label}>
      {items.map(item => (
        <Link key={item.href} className="nv-filter" href={item.href} aria-current={item.current ? "page" : undefined}>{item.label}</Link>
      ))}
      <KeepSelectedVisible />
    </nav>
  );
}

/** Sticky bar for a review screen's decision. Sits above the tab bar via --nv-actionbar-offset. */
export function ActionBar({ children, label = "Actions" }: { children: ReactNode; label?: string }) {
  return <div className="nv-actionbar" role="group" aria-label={label}>{children}</div>;
}

export function Toast({ title, meta, icon }: { title: ReactNode; meta?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="nv-toast" role="status">
      {icon ? <span className="nv-toast__icon" aria-hidden="true">{icon}</span> : null}
      <span>
        <span className="nv-toast__title">{title}</span>
        {meta ? <span className="nv-toast__meta">{meta}</span> : null}
      </span>
    </div>
  );
}
