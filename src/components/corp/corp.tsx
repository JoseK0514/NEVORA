import { faceTint } from "@/lib/face-tint";
import "./corp.css";
import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes, CSSProperties } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { BrandWordmark } from "@/components/brand-mark";
import { NUVORA_BRAND } from "@/lib/brand";
import { CorpBackLink, CorpLoadFailed } from "./corp-client";
import { ActionMenu } from "@/components/action-menu";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";

export { CorpBackLink, CorpRetryButton, CorpLoadFailed, leaveRow } from "./corp-client";
export { RANGE_DASH, periodRange, payDay, daysBetween, hoursText, minutesText } from "./corp-format";

/* NEVORA corporate kit (approved Oct 26, 2026; docs/product/specs/corporate-mockups). Presentation only: callers pass
 * authorized, formatted data and keep their own actions. Each piece reproduces one element of the approved boards. */

/** `blue` is retired (Nov 1 upscale: blue is not in the NEVORA palette); a pill passed it reads as grey text. */
type Tone = "teal" | "amber" | "blue" | "red" | "neutral";

/* Nov 1 upscale (kit consistency 1): one count style, "Label N" with N at 13/600 #6B7075 and never in parentheses. A label
 * written the old way ("Team (9)", "Waiting (2)") is split here, so every caller of CorpCard, CorpSection and
 * CorpSegments gets the new form without a change. */
const COUNTED = /^(.*\S)\s*\((\d[\d,]*)\)$/;
/** "Team (9)" becomes "Team" and a kit count; anything else is returned as it is. */
export function countLabel(label: ReactNode): ReactNode {
  if (typeof label !== "string") return label;
  const match = COUNTED.exec(label);
  return match ? <>{match[1]}<CorpCount>{match[2]}</CorpCount></> : label;
}
const withCount = (label: ReactNode, count?: ReactNode) => count === undefined || count === null || count === ""
  ? countLabel(label) : <>{label}<CorpCount>{count}</CorpCount></>;

/** A page on the grey canvas: 16px gutters, 12px between cards. */
export function CorpPage({ children, label, labelledBy, className }: { children: ReactNode; label?: string; labelledBy?: string; className?: string }) {
  return <div className={className ? `c-page ${className}` : "c-page"} data-nv-page="" data-corp="" aria-label={label} aria-labelledby={labelledBy}>{children}</div>;
}

/** The page title (round 2, R1/R4): 24/30 600 on a phone, 28/34 on tablets and desktop, in a 40px title row at the same
 * height on every page; its actions (`actions`) sit in that row on the right. An optional 13px line 4px under it. */
/** `wide`: a pushed page's title for tablets and desktop; on a phone its CorpNav (phoneOnly) shows the title instead. */
/** `subAside`: a control on the subtitle's line, right ("All locations ▾"). */
/** `focusTarget`: the page moves focus to this title after an in-page navigation, so it takes `tabIndex={-1}`. */
export function CorpTitle({ title, sub, actions, id, wide, subAside, focusTarget }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; id?: string; wide?: boolean; subAside?: ReactNode; focusTarget?: boolean }) {
  return <header className={wide ? "c-title c-title--wide" : "c-title"}>
    <div className="c-title__row"><h1 id={id} tabIndex={focusTarget ? -1 : undefined}>{title}</h1>{actions ? <div className="c-title__actions">{actions}</div> : null}</div>
    {subAside ? <div className="c-title__subrow"><span className="c-title__sub">{sub}</span>{subAside}</div> : sub ? <span className="c-title__sub">{sub}</span> : null}
  </header>;
}

/** A white card. With a label it opens with a 44px header row (label left; a link, pill or text right). `count` follows the
 * label as "Label N" (Nov 1 upscale). `failed`: part of the card's data didn't load, so the header's right side says
 * "Couldn't load · Try again" (Try again refreshes the page's data) in place of `aside`. */
export function CorpCard({ label, count, aside, children, footer, id, ariaLabel, alert, failed, as = "section" }: {
  label?: ReactNode; count?: ReactNode; aside?: ReactNode; children?: ReactNode; footer?: ReactNode; id?: string; ariaLabel?: string; alert?: boolean; failed?: boolean; as?: "section" | "div";
}) {
  const headingId = id && label ? `${id}-label` : undefined;
  const Tag = as;
  const right = failed ? <CorpLoadFailed /> : aside;
  return <Tag id={id} className={alert ? "c-card c-card--alert" : "c-card"} aria-labelledby={ariaLabel ? undefined : headingId} aria-label={ariaLabel}>
    {label ? <div className="c-card__head"><h2 className="c-card__label" id={headingId}>{withCount(label, count)}</h2>{right ? <div className="c-card__aside">{right}</div> : null}</div> : null}
    {children}
    {footer ? <div className="c-card__foot">{footer}</div> : null}
  </Tag>;
}

export function CorpBody({ children, tight }: { children: ReactNode; tight?: boolean }) {
  return <div className={tight ? "c-card__body c-card__body--tight" : "c-card__body"}>{children}</div>;
}

/** A filled status pill, for EXCEPTIONS ONLY (round 2, R3): something the person must notice or act on that the row's
 * words don't already say ("Correction", "Overdue"). A default or expected state ("Published", "Due Mon, Nov 2", "Needs
 * setup", "Live", "Waiting", "Not filled") is grey text: use CorpMeta. Red appears once per screen at most: prefer
 * tone="neutral", and keep "red" for the one real problem. */
/** Nov 1 upscale (kit consistency 5): on Employee pages amber and blue pills read as grey text too (corp-employee-bridge.css),
 * and `blue` reads as grey text everywhere. */
export function CorpPill({ tone = "neutral", dot, children, label }: { tone?: Tone; dot?: boolean; children: ReactNode; label?: string }) {
  return <span className={`c-pill c-pill--${tone}`} aria-label={label}>{dot ? <span className="c-pill__dot" aria-hidden="true" /> : null}{children}</span>;
}

export function CorpBadge({ count, label }: { count: number; label?: string }) {
  return <span className="c-badge" aria-label={label}>{count > 99 ? "99+" : count}</span>;
}

/** `name` gives the face its own tint (the same as Direction B's BAvatar), drawn where the Owner/Manager Direction B shell is on. */
export function CorpAvatar({ initials, grey, large, open, name }: { initials?: string; grey?: boolean; large?: boolean; open?: boolean; name?: string }) {
  const tint = name && !grey && !open ? faceTint(name) : null;
  return <span className={`c-av${grey ? " c-av--grey" : ""}${large ? " c-av--l" : ""}${open ? " c-av--open" : ""}${tint ? " c-av--tint" : ""}`}
    style={tint ? { "--av-bg": tint[0], "--av-fg": tint[1] } as CSSProperties : undefined} aria-hidden="true">{initials}</span>;
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
  /** Values are 15/400 #6B7075 (Nov 1 upscale); `ink` is for a key figure that must read as ink. `soft` is the default look. */
  valueTone?: "soft" | "ink" | "teal" | "red" | "amber";
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

/** Equal stat columns with a hairline between ("Clocked in 7 of 9 · Late 1 · Open shifts 1"). Values are key figures,
 * 20/26 600 with tabular figures (R1, R2). Figures are ink: a `tone` is for the screen's one real problem only (R3). */
/** Round 2 (Home builder's request): a stat with `href` is a link to its list (hover #F7F8F8, press #EDEEEF, an inset
 * teal focus ring); `ariaLabel` names it when the label and figure alone don't ("3 open shifts"). */
/** Nov 1 upscale (kit consistency 7): a figure that hasn't arrived or couldn't load ("…", "Not available", null) shows
 * CORP_NO_VALUE, an em dash in #A7ACB1; the reason goes in a 13px line or the card header, never in the figure's slot. */
export function CorpStats({ items }: { items: { label: ReactNode; value: ReactNode; tone?: "red" | "amber" | "teal"; href?: string; ariaLabel?: string }[] }) {
  return <dl className="c-stats">{items.map((item, index) => {
    const none = noValue(item.value);
    const inner = <>
      <dt className="c-stat__label">{item.label}</dt>
      <dd className={none ? "c-stat__value c-stat__value--none" : item.tone ? `c-stat__value c-stat__value--${item.tone}` : "c-stat__value"}>{none ? CORP_NO_VALUE : item.value}</dd>
    </>;
    return item.href
      ? <div className="c-stat c-stat--link" key={index}><Link className="c-stat__link" href={item.href} aria-label={item.ariaLabel}>{inner}</Link></div>
      : <div className="c-stat" key={index}>{inner}</div>;
  })}</dl>;
}

/** The figure for a stat that has no value to show (loading or failed): an em dash, drawn #A7ACB1 by .c-stat__value--none. */
export const CORP_NO_VALUE = "—";
const noValue = (value: ReactNode) => value === null || value === undefined || value === "" || value === "…" || value === "..." || value === CORP_NO_VALUE;

/** A stat figure with no value (for a page that builds its own stat markup): `<span className="c-stat__value c-stat__value--none">`. */
export function CorpNoValue({ label = "Not available" }: { label?: string }) {
  return <span className="c-stat__value c-stat__value--none" aria-label={label}>{CORP_NO_VALUE}</span>;
}

/** Segmented control made of links (or buttons via `onSelect`). Round 2 (R12): one white thumb slides to the current
 * segment (200ms on the kit curve; no travel with reduced motion). The thumb is CSS, from --n and --i set here; the shell's
 * CorpMotion carries it across a page change that remounts the control. */
export function CorpSegments({ label, items }: { label: string; items: { key?: string; href?: string; onSelect?: () => void; label: ReactNode; current?: boolean; ariaLabel?: string }[] }) {
  const current = items.findIndex(item => item.current);
  const style = { "--n": items.length, "--i": Math.max(0, current) } as CSSProperties;
  return <nav className="c-seg" aria-label={label} data-slide="" data-slide-none={current < 0 ? "" : undefined} style={style}>
    {items.map((item, index) => item.href
      ? <Link key={item.key ?? item.href} href={item.href} aria-current={item.current ? "page" : undefined} aria-label={item.ariaLabel}>{countLabel(item.label)}</Link>
      : <button key={item.key ?? index} type="button" aria-pressed={item.current ? "true" : "false"} aria-label={item.ariaLabel} onClick={item.onSelect}>{countLabel(item.label)}</button>)}
  </nav>;
}

/** Label above a control, optional help under it. */
export function CorpField({ label, htmlFor, help, error, errorId, children }: { label: ReactNode; htmlFor?: string; help?: ReactNode; error?: ReactNode; errorId?: string; children: ReactNode }) {
  return <div className="c-field">
    {htmlFor ? <label className="c-field__label" htmlFor={htmlFor}>{label}</label> : <span className="c-field__label">{label}</span>}
    {children}
    {error ? <span className="c-error" id={errorId} role="alert">{error}</span> : help ? <span className="c-field__help">{help}</span> : null}
  </div>;
}

export function CorpNote({ children, center, icon }: { children: ReactNode; center?: boolean; icon?: ReactNode }) {
  return <p className={center ? "c-note c-note--center" : "c-note"}>{icon ?? null}<span>{children}</span></p>;
}

/** A pushed page's white header: "‹ Back" left, the title centred, an optional action right. */
/** `phoneOnly`: shown on a phone only (tablets and desktop have the sidebar, so the page keeps its CorpTitle there). */
export function CorpNav({ back, title, right, titleId, phoneOnly }: { back?: { href: string; label: string }; title?: ReactNode; right?: ReactNode; titleId?: string; phoneOnly?: boolean }) {
  return <div className={phoneOnly ? "c-nav c-nav--phone" : "c-nav"}>
    {back ? <CorpBackLink className="c-nav__back" href={back.href}><CaretLeftIcon className="c-ic" weight="bold" aria-hidden="true" />{back.label}</CorpBackLink> : <span />}
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

/** The one empty state (Owner premium A10; Nov 1 upscale, kit consistency 6). A left-aligned card: a 15/600 title, one
 * 13px grey line that says what happens next, and an optional teal next-step link (`link`, 13/500 with a caret). `action`
 * (a secondary button) stays for pages that need a button; prefer `link`. No icon or illustration. Inside a list card use
 * CorpEmptyRow instead: one 56px row. */
export function CorpEmpty({ title, body, action, link, label }: { title: ReactNode; body?: ReactNode; action?: ReactNode; link?: { href: string; label: ReactNode }; label?: string }) {
  return <section className="c-card" aria-label={label}>
    <div className="c-empty c-empty--card">
      <span className="c-empty__title">{title}</span>
      {body ? <span className="c-empty__body">{body}</span> : null}
      {link ? <span className="c-empty__next"><Link className="c-link" href={link.href}>{link.label}<CaretRightIcon className="c-link__chev" weight="bold" aria-hidden="true" /></Link></span> : null}
      {action ? <span className="c-empty__action">{action}</span> : null}
    </div>
  </section>;
}

/** An empty list inside a list card: one 56px row of 15/400 #6B7075 text ("No decided requests yet"). `as="li"` inside a
 * CorpRows list. */
export function CorpEmptyRow({ children, as = "div" }: { children: ReactNode; as?: "div" | "li" }) {
  const Tag = as;
  return <Tag className="c-empty c-empty--row">{children}</Tag>;
}

/** Owner premium P3 (phone-native L3): the one failure style. Title ("Couldn't load timecards"), one 13px line and an
 * action (usually <CorpRetryButton />, which refreshes the page's data). */
export function CorpErrorCard({ title, body = "Check your connection, then try again.", action, live = true }: { title: ReactNode; body?: ReactNode; action?: ReactNode; live?: boolean }) {
  return <section className="c-card c-error-card" role={live ? "alert" : undefined}>
    <span className="c-error-card__title">{title}</span>
    {body ? <span className="c-error-card__body">{body}</span> : null}
    {action ? <span className="c-error-card__action">{action}</span> : null}
  </section>;
}

/** Owner premium A7 (visual-craft E): a form card's footer on tablets and desktop. Destructive text action far left; Cancel
 * (secondary) and the primary on the right, auto width. Hidden on phones, where the header's Cancel and Save are used. */
export function CorpFormFooter({ children, danger }: { children: ReactNode; danger?: ReactNode }) {
  return <div className="c-form-foot">{danger ?? null}{children}</div>;
}

/* ---------------------------------------------------------------------------------------------------------------------
 * Round 2 (Oct 31, 2026; ROUND2-PLAN.md R2, R3, R5, R12). Presentation only.
 * ------------------------------------------------------------------------------------------------------------------- */

// No lookbehind: Safari before 16.4 cannot parse it, and this module loads on every page.
const DASH_PATTERN = /\s+[–—-]\s+|([0-9apmAPM.])[–—](?=[0-9])/g;
const AMPM = /(\d)(\s?)(AM|PM|am|pm|a\.m\.|p\.m\.|a|p)(?![A-Za-z])/g;
const THIN = "\u2009", NARROW = "\u202F";

/** R2: "8:00 AM – 4:00 PM" as text, with thin spaces round the en dash (for aria-labels, titles and plain strings). */
export function timeRangeText(start: string, end: string) {
  return `${start}${THIN}–${THIN}${end}`;
}

/** R2: splits an already formatted time or range into kit spans: AM/PM (and the short "a"/"p" of "12a – 6a") at 0.8em 500
 * #4A4F54 joined to its digits by a narrow no-break space, and thin spaces round the en dash. The words never change; only
 * spacing and size do, so a page passes the string it already shows. */
export function timeParts(text: string): ReactNode[] {
  const spaced = text.replace(DASH_PATTERN, (_match, before?: string) => `${before ?? ""}${THIN}–${THIN}`);
  const parts: ReactNode[] = [];
  let last = 0, key = 0;
  for (const match of spaced.matchAll(AMPM)) {
    const at = match.index ?? 0;
    parts.push(spaced.slice(last, at) + match[1] + (match[2] ? NARROW : ""));
    parts.push(<span key={key++} className="c-ampm">{match[3]}</span>);
    last = at + match[0].length;
  }
  parts.push(spaced.slice(last));
  return parts.filter(part => part !== "");
}

/** R2, the shift-time signature: a time, a range or a date set with tabular, case-sensitive figures. Pass the formatted
 * string as children ("8:00 AM – 4:00 PM", "12a – 6a", "Mon, Nov 2"), or `start` and `end` for a range. */
export function CorpTime({ children, start, end, className, label }: { children?: string; start?: string; end?: string; className?: string; label?: string }) {
  const text = start !== undefined && end !== undefined ? timeRangeText(start, end) : children ?? start ?? "";
  return <span className={className ? `c-time ${className}` : "c-time"} aria-label={label}>{timeParts(text)}</span>;
}

/** R2: a duration ("8 h 2 min", "151 h") with its units at 0.85em grey and tabular figures. Children is the formatted text. */
export function CorpDuration({ children, className }: { children: string; className?: string }) {
  const parts: ReactNode[] = [];
  let last = 0, key = 0;
  for (const match of children.matchAll(/(\d)(\s?)(h|min|m|hr|hrs)(?![A-Za-z])/g)) {
    const at = match.index ?? 0;
    parts.push(children.slice(last, at) + match[1] + (match[2] ? NARROW : ""));
    parts.push(<span key={key++} className="c-unit">{match[3]}</span>);
    last = at + match[0].length;
  }
  parts.push(children.slice(last));
  return <span className={className ? `c-num ${className}` : "c-num"}>{parts.filter(part => part !== "")}</span>;
}

/** R3: a default state as grey text (13/18 500 #6B7075), where a pill used to be ("Published", "Due Mon, Nov 2"). */
export function CorpMeta({ children, label }: { children: ReactNode; label?: string }) {
  return <span className="c-meta" aria-label={label}>{children}</span>;
}

/** R5: a group of cards with its label above them (13/18 500 grey, on the card's edge), for list pages (Settings, More, Team, Pay
 * history, Things to do): no 44px header strip. Groups are 32px apart; cards in a group 12px. `aside` sits on the label's
 * line, right (a "See all" link). */
/* Nov 1 upscale (kit consistency 2): the label sits on the card's left edge (inset 0), 13/18 500 #6B7075, 8px above the
 * card and 32px under the previous group; `count` follows it as "Label N". */
export function CorpSection({ label, count, aside, id, children, ariaLabel }: { label?: ReactNode; count?: ReactNode; aside?: ReactNode; id?: string; children: ReactNode; ariaLabel?: string }) {
  const headingId = id && label ? `${id}-label` : undefined;
  const heading = label ? <h2 className="c-section__label" id={headingId}>{withCount(label, count)}</h2> : null;
  return <section id={id} className="c-section" aria-labelledby={ariaLabel ? undefined : headingId} aria-label={ariaLabel}>
    {heading && aside ? <div className="c-section__head">{heading}<span className="c-card__aside">{aside}</span></div> : heading}
    {children}
  </section>;
}

/** R12: a row of tabs that are pages (links). The current tab is ink over a 2px teal line that slides between tabs. */
export function CorpTabs({ label, items }: { label: string; items: { href: string; label: ReactNode; current?: boolean; ariaLabel?: string }[] }) {
  return <nav className="c-tabs" aria-label={label} data-c-tabs="">
    {items.map(item => <Link key={item.href} href={item.href} aria-current={item.current ? "page" : undefined} aria-label={item.ariaLabel}>{item.label}</Link>)}
  </nav>;
}

/** A count after a label ("Open shifts 3"): 13/600 #6B7075 with tabular figures, 6px after the label, in place of "(3)". */
export function CorpCount({ children, label }: { children: ReactNode; label?: string }) {
  return <span className="c-count c-num" aria-label={label}>{children}</span>;
}

/** A sub-head inside a card, for a second kind of row in the same card ("Missed clock-ins" under "Open shifts"). */
export function CorpCardSub({ children, id }: { children: ReactNode; id?: string }) {
  return <h3 className="c-card__sub" id={id}>{children}</h3>;
}

/** A secondary button that opens a menu ("This week so far ▾"): the kit's secondary style with a 16px caret; the menu is
 * the kit's ActionMenu (a popover on wide screens, a sheet with a centred title and Done on a phone). */
export function CorpMenuButton({ id, label, title, ariaLabel, align, children }: { id: string; label: string; title?: string; ariaLabel?: string; align?: "start" | "end"; children: ReactNode }) {
  return <ActionMenu id={id} label={label} ariaLabel={ariaLabel} title={title ?? label} align={align}
    triggerClassName="c-btn c-btn--secondary c-btn--menu"
    triggerContent={<>{label}<CaretDownIcon className="c-btn__caret" size={16} aria-hidden="true" /></>}>{children}</ActionMenu>;
}
