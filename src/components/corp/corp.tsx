import "./corp.css";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { BrandWordmark } from "@/components/brand-mark";
import { NUVORA_BRAND } from "@/lib/brand";

/* NEVORA corporate kit (approved Oct 26, 2026; docs/product/specs/corporate-mockups). Presentation only: callers pass
 * authorized, formatted data and keep their own actions. Each piece reproduces one element of the approved boards. */

type Tone = "teal" | "amber" | "blue" | "red" | "neutral";

/** A page on the grey canvas: 16px gutters, 12px between cards. */
export function CorpPage({ children, label, labelledBy, className }: { children: ReactNode; label?: string; labelledBy?: string; className?: string }) {
  return <div className={className ? `c-page ${className}` : "c-page"} data-nv-page="" data-corp="" aria-label={label} aria-labelledby={labelledBy}>{children}</div>;
}

/** 22/600 page title, an optional 13px line under it and optional controls on its right. */
export function CorpTitle({ title, sub, actions, id }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; id?: string }) {
  return <header className="c-title">
    <div className="c-title__row"><h1 id={id}>{title}</h1>{actions ? <div className="c-title__actions">{actions}</div> : null}</div>
    {sub ? <span className="c-title__sub">{sub}</span> : null}
  </header>;
}

/** A white card. With a label it opens with a 44px header row (label left; a link, pill or text right). */
export function CorpCard({ label, aside, children, footer, id, ariaLabel, alert, as = "section" }: {
  label?: ReactNode; aside?: ReactNode; children?: ReactNode; footer?: ReactNode; id?: string; ariaLabel?: string; alert?: boolean; as?: "section" | "div";
}) {
  const headingId = id && label ? `${id}-label` : undefined;
  const Tag = as;
  return <Tag id={id} className={alert ? "c-card c-card--alert" : "c-card"} aria-labelledby={ariaLabel ? undefined : headingId} aria-label={ariaLabel}>
    {label ? <div className="c-card__head"><h2 className="c-card__label" id={headingId}>{label}</h2>{aside ? <div className="c-card__aside">{aside}</div> : null}</div> : null}
    {children}
    {footer ? <div className="c-card__foot">{footer}</div> : null}
  </Tag>;
}

export function CorpBody({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return <div className={tight ? "c-card__body c-card__body--tight" : "c-card__body"}>{children}</div>;
}

/** A filled status pill. */
export function CorpPill({ tone = "neutral", dot, children, label }: { tone?: Tone; dot?: boolean; children: ReactNode; label?: string }) {
  return <span className={`c-pill c-pill--${tone}`} aria-label={label}>{dot ? <span className="c-pill__dot" aria-hidden="true" /> : null}{children}</span>;
}

export function CorpBadge({ count, label }: { count: number; label?: string }) {
  return <span className="c-badge" aria-label={label}>{count > 99 ? "99+" : count}</span>;
}

export function CorpAvatar({ initials, grey, large, open }: { initials?: string; grey?: boolean; large?: boolean; open?: boolean }) {
  return <span className={`c-av${grey ? " c-av--grey" : ""}${large ? " c-av--l" : ""}${open ? " c-av--open" : ""}`} aria-hidden="true">{initials}</span>;
}

export type CorpRowProps = {
  title: ReactNode;
  detail?: ReactNode;
  /** Right side of the detail line (usually a pill), so the time stays on one line. */
  detailEnd?: ReactNode;
  /** A fixed 52px left column ("Thu 29"). */
  lead?: ReactNode;
  avatar?: ReactNode;
  icon?: ReactNode;
  value?: ReactNode;
  valueTone?: "soft" | "teal" | "red" | "amber";
  /** Trailing pills, badges or controls. */
  trail?: ReactNode;
  href?: string;
  onClick?: () => void;
  chevron?: boolean;
  bold?: boolean;
  danger?: boolean;
  one?: boolean;
  tall?: boolean;
  label?: string;
  id?: string;
  prefetch?: boolean;
  /** A plain anchor (downloads and API routes are never prefetched as pages). */
  native?: boolean;
  disabled?: boolean;
  current?: boolean;
};

/** One list row: optional lead column, avatar or icon; title and 13px detail; value, trail and chevron on the right. */
export function CorpRow({ title, detail, detailEnd, lead, avatar, icon, value, valueTone, trail, href, onClick, chevron, bold, danger, one, tall, label, id, prefetch, native, disabled, current }: CorpRowProps) {
  const className = `c-row${one ?? !detail ? " c-row--one" : ""}${tall ? " c-row--tall" : ""}${danger ? " c-row--danger" : ""}`;
  const showChev = chevron ?? (!!(href || onClick) && !trail && !disabled);
  const body = <>
    {lead !== undefined && lead !== null ? <span className="c-row__lead">{lead}</span> : null}
    {avatar ?? null}
    {icon ? <span className="c-row__icon" aria-hidden="true">{icon}</span> : null}
    <span className="c-row__main">
      <span className={bold ? "c-row__title c-row__title--b" : "c-row__title"}>{title}</span>
      {detail || detailEnd ? <span className="c-row__detail"><span>{detail}</span>{detailEnd ?? null}</span> : null}
    </span>
    {value !== undefined && value !== null && value !== "" ? <span className={valueTone ? `c-row__value c-row__value--${valueTone}` : "c-row__value"}>{value}</span> : null}
    {trail ? <span className="c-row__trail">{trail}</span> : null}
    {showChev ? <CaretRightIcon className="c-chev" weight="bold" aria-hidden="true" /> : null}
  </>;
  if (href && !disabled) return native
    ? <a id={id} className={className} href={href} aria-label={label} aria-current={current ? "page" : undefined}>{body}</a>
    : <Link id={id} className={className} href={href} aria-label={label} prefetch={prefetch} aria-current={current ? "page" : undefined}>{body}</Link>;
  if (onClick && !disabled) return <button id={id} type="button" className={className} aria-label={label} onClick={onClick}>{body}</button>;
  return <div id={id} className={className} aria-label={label} aria-disabled={disabled || undefined}>{body}</div>;
}

/** Rows inside a card, as a list. */
export function CorpRows({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="c-rows" aria-label={label}>{children}</ul>;
}

type BtnKind = "primary" | "secondary" | "neutral" | "danger";
type BtnSize = "lg" | "md" | "sm" | "xs";
const btnClass = (kind: BtnKind = "primary", size: BtnSize = "lg", full?: boolean) =>
  `c-btn${kind !== "primary" ? ` c-btn--${kind}` : ""}${size !== "lg" ? ` c-btn--${size}` : ""}${full ? " c-btn--full" : ""}`;

export function CorpButton({ kind, size, full, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: BtnKind; size?: BtnSize; full?: boolean }) {
  return <button type="button" {...props} className={className ? `${btnClass(kind, size, full)} ${className}` : btnClass(kind, size, full)} />;
}

export function CorpButtonLink({ href, kind, size, full, className, prefetch, native, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; kind?: BtnKind; size?: BtnSize; full?: boolean; prefetch?: boolean; native?: boolean }) {
  const cls = className ? `${btnClass(kind, size, full)} ${className}` : btnClass(kind, size, full);
  return native ? <a href={href} {...props} className={cls} /> : <Link href={href} prefetch={prefetch} {...props} className={cls} />;
}

/** A teal text link (13/600 in a card header; `large` for a 15/600 row action). */
export function CorpLink({ href, children, large, label, prefetch }: { href: string; children: ReactNode; large?: boolean; label?: string; prefetch?: boolean }) {
  return <Link href={href} className={large ? "c-link c-link--l" : "c-link"} aria-label={label} prefetch={prefetch}>{children}</Link>;
}

/** Equal stat columns with a hairline between ("Clocked in 7 of 9 · Late 1 · Open shifts 1"). */
export function CorpStats({ items }: { items: { label: ReactNode; value: ReactNode; tone?: "red" | "amber" | "teal" }[] }) {
  return <dl className="c-stats">{items.map((item, index) => <div className="c-stat" key={index}>
    <dt className="c-stat__label">{item.label}</dt>
    <dd className={item.tone ? `c-stat__value c-stat__value--${item.tone}` : "c-stat__value"}>{item.value}</dd>
  </div>)}</dl>;
}

/** Segmented control made of links (or buttons via `onSelect`). */
export function CorpSegments({ label, items }: { label: string; items: { key?: string; href?: string; onSelect?: () => void; label: ReactNode; current?: boolean; ariaLabel?: string }[] }) {
  return <nav className="c-seg" aria-label={label}>
    {items.map((item, index) => item.href
      ? <Link key={item.key ?? item.href} href={item.href} aria-current={item.current ? "page" : undefined} aria-label={item.ariaLabel}>{item.label}</Link>
      : <button key={item.key ?? index} type="button" aria-pressed={item.current ? "true" : "false"} aria-label={item.ariaLabel} onClick={item.onSelect}>{item.label}</button>)}
  </nav>;
}

/** Label above a control, optional help under it. */
export function CorpField({ label, htmlFor, help, error, children }: { label: ReactNode; htmlFor?: string; help?: ReactNode; error?: ReactNode; children: ReactNode }) {
  return <div className="c-field">
    {htmlFor ? <label className="c-field__label" htmlFor={htmlFor}>{label}</label> : <span className="c-field__label">{label}</span>}
    {children}
    {error ? <span className="c-error" role="alert">{error}</span> : help ? <span className="c-field__help">{help}</span> : null}
  </div>;
}

export function CorpNote({ children, center, icon }: { children: ReactNode; center?: boolean; icon?: ReactNode }) {
  return <p className={center ? "c-note c-note--center" : "c-note"}>{icon ?? null}<span>{children}</span></p>;
}

/** A pushed page's white header: "‹ Back" left, the title centred, an optional action right. */
export function CorpNav({ back, title, right, titleId }: { back?: { href: string; label: string }; title?: ReactNode; right?: ReactNode; titleId?: string }) {
  return <div className="c-nav">
    {back ? <Link className="c-nav__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{back.label}</Link> : <span />}
    {title ? <h1 className="c-nav__title" id={titleId}>{title}</h1> : <span />}
    <span className="c-nav__right">{right ?? null}</span>
  </div>;
}

/** The NEVORA wordmark with WORKFORCE centred under it (no flame icon). */
export function CorpLockup({ large, href, label = NUVORA_BRAND.homeAriaLabel }: { large?: boolean; href?: string; label?: string }) {
  const inner = <><BrandWordmark /><span className="c-lockup__word" aria-hidden="true">{NUVORA_BRAND.module}</span></>;
  const cls = large ? "c-lockup c-lockup--l" : "c-lockup";
  return href ? <Link href={href} className={cls} aria-label={label}>{inner}</Link> : <span className={cls} role="img" aria-label={`NEVORA ${NUVORA_BRAND.module}`}>{inner}</span>;
}
