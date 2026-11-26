import { esTime } from '../employee-b/es-format';
import "./owner-b.css";
import { OfflineGlyph } from "./b-glyphs";
import Link from "next/link";
import { isValidElement, cloneElement } from "react";
import type { ReactNode, CSSProperties, Ref, MouseEventHandler } from "react";
import { BOffline } from "./b-offline";
import { BRetryButton } from "./b-retry-button";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowsLeftRight";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { HourglassMediumIcon } from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import { QuestionIcon } from "@phosphor-icons/react/dist/ssr/Question";
import { faceTint } from "@/lib/face-tint";
import { keepWhole } from "@/lib/keep-whole";
import { joinTimeRange } from "@/lib/date-utils";

/* Direction B (Jose approved Nov 5, 2026; mock "NEVORA mobile, Direction B"): the Owner and Manager phone screens. Each page
 * renders one `BScreen` as the first child of its CorpPage; on a phone under the shell's data-nv-b it replaces the page's
 * other children, and on tablets and desktop it is not shown, so those layouts are unchanged. Presentation only: callers
 * pass the same authorized, formatted data and the same links and actions as the page around it. */

export function BScreen({ children, ink, back }: { children: ReactNode; ink?: boolean; back?: boolean }) {
  return <div className={`b-screen${ink ? " b-screen--ink" : ""}${back ? " b-screen--back" : ""}`}>{children}</div>;
}

/** The brand hero: the shell's header floats over its top; the title, one white action and live figures sit on it. */
export function BHero({ title, titleId, eyebrow, sub, right, back, children, big, offlineInTitle }: {
  title: ReactNode; titleId?: string; eyebrow?: ReactNode; sub?: ReactNode; right?: ReactNode; children?: ReactNode;
  /** A pushed page's way back; `close` (a form's Cancel) draws an X instead of the back chevron. */
  back?: { href: string; label: string; close?: boolean };
  /** Home's 34px sentence instead of a 30px page title. */
  big?: boolean;
  /** The title itself says the page is offline, so the offline pill isn't drawn under it. */
  offlineInTitle?: boolean;
}) {
  return <header className="b-hero">
    {back ? <Link className="b-back" href={back.href}><span className="b-back__ic b-glass" aria-hidden="true">{back.close ? <XIcon size={20} weight="bold" /> : <CaretLeftIcon size={20} weight="bold" />}</span>{back.label}</Link> : null}
    <div className={big ? "b-title b-title--big" : "b-title"}>
      <div className="b-title__text">
        {eyebrow ? <p className="b-eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId} tabIndex={titleId ? -1 : undefined}>{title}</h1>
        {sub ? <p className="b-sub">{sub}</p> : null}
        <BOffline said={offlineInTitle} />
      </div>
      {right ? <div className="b-title__right">{right}</div> : null}
    </div>
    {children}
  </header>;
}

export type BLiveItem = { label: ReactNode; value: ReactNode; small?: ReactNode; dot?: "live" | "warn"; href?: string;
  /** Closing F1 (NV-006): a figure that filters the list below it (a toggle; `pressed` while the filter is on). */
  onSelect?: () => void; pressed?: boolean;
  /** A short line under the figure; Employee desktop shows it (employee-b-desktop.css), phones don't. */
  meta?: ReactNode };
/** Live figures on frosted glass (two to three columns). A figure with `href` opens its list. Review B1 (NV-005): a list
 * of tiles (a link may not sit between a <dl>'s group and its term), each label read before its value. */
export function BLive({ items, label }: { items: BLiveItem[]; label: string }) {
  return <ul className="b-live b-glass" aria-label={label}>{items.map((item, index) => {
    // Gaps G45 (Nov 23, 2026): a space between the label, the figure and its line, so a tile's name reads "Not clocked in 0",
    // never "Not clocked in0". Final fixes K7: a bare space between flex items is dropped from the layout and from the name,
    // so the space is screen-reader text (a no-break space, which nothing collapses); it draws nothing.
    // The tile's name is its visible words (label in name), so a tile takes no aria-label.
    const gap = <span className="b-sr">{"\u00a0"}</span>;
    const body = <>
      <span className="b-live__l">{item.dot ? <span className={`b-dot b-dot--${item.dot}`} aria-hidden="true" /> : null}{item.label}</span>{gap}
      <span className="b-live__v">{item.value}{item.small ? <small>{item.small}</small> : null}</span>
      {item.meta ? <>{gap}<span className="b-live__m">{item.meta}</span></> : null}
    </>;
    return item.href ? <li key={index} className="b-live__i"><Link className="b-live__a" href={item.href}>{body}</Link></li>
      : item.onSelect ? <li key={index} className="b-live__i"><button type="button" className="b-live__a b-live__btn" aria-pressed={item.pressed ? "true" : "false"} onClick={item.onSelect}>{body}</button></li>
      : <li key={index} className="b-live__i">{body}</li>;
  })}</ul>;
}

/** A segmented control on glass: links or buttons, one white thumb. */
export function BSeg({ label, items }: { label: string; items: { key: string; label: ReactNode; href?: string; onSelect?: () => void; current?: boolean; aria?: string }[] }) {
  return <nav className="b-seg b-glass" aria-label={label} style={{ "--n": items.length } as CSSProperties}>
    {items.map(item => item.href
      ? <Link key={item.key} href={item.href} aria-current={item.current ? "page" : undefined} aria-label={item.aria}>{item.label}</Link>
      : <button key={item.key} type="button" aria-pressed={item.current ? "true" : "false"} aria-label={item.aria} onClick={item.onSelect}>{item.label}</button>)}
  </nav>;
}

/** The white cards that lift over the hero. */
export function BStack({ children }: { children: ReactNode }) {
  return <div className="b-stack">{children}</div>;
}

export function BCard({ title, count, link, meta, children, id, label, chip }: { title?: ReactNode; count?: ReactNode; link?: { href: string; label: ReactNode; aria?: string }; meta?: ReactNode; children?: ReactNode; id?: string; label?: string; chip?: ReactNode }) {
  const headId = id && title ? `${id}-h` : undefined;
  return <section className="b-card" id={id} aria-labelledby={headId} aria-label={headId ? undefined : label}>
    {title ? <div className="b-card__h"><h2 id={headId}>{title}{count !== undefined && count !== null ? <span className="b-pill">{count}</span> : null}</h2>
      {link ? <Link className="b-card__a" href={link.href} aria-label={link.aria}>{link.label}</Link> : meta ? <span className="b-card__meta">{meta}</span> : chip ?? null}</div> : null}
    {children}
  </section>;
}

export function BList({ children, label }: { children: ReactNode; label?: string }) {
  return <ul className="b-list" aria-label={label}>{children}</ul>;
}

/** One row: lead (avatar, icon or day), a title (with an optional chip beside it) over a 13.5px line, then a trailing value,
 * button or chevron. `wrap` puts `actions` on their own line under the text. */
export function BRow({ lead, title, chip, sub, end, trail, href, onLinkClick, onClick, chevron, label, actions, extra }: {
  lead?: ReactNode; title: ReactNode; chip?: ReactNode; sub?: ReactNode; end?: ReactNode; trail?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; label?: string;
  actions?: ReactNode; extra?: ReactNode; onLinkClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  const showChev = chevron ?? (!!(href || onClick) && !trail);
  const body = <>
    {lead ?? null}
    <span className="b-row__tx">
      <span className="b-row__t"><span className="b-row__tt">{title}</span>{chip ?? null}</span>
      {sub ? <span className="b-row__s">{sub}</span> : null}
      {extra ?? null}
    </span>
    {end ? <span className="b-row__end">{end}</span> : null}
    {/* Phase 9: the row chevron is the inline glyph size (16px) in the field edge (owner-b.css), on every row. */}
    {showChev ? <CaretRightIcon className="b-chev" size={16} weight="bold" aria-hidden="true" /> : null}
  </>;
  const cls = actions ? "b-row b-row--wrap" : "b-row";
  // A row with its own buttons keeps them outside the row's link, so each control is its own target.
  if (trail || actions) return <li className="b-li"><div className={cls}>
    {href ? <Link className="b-row__hit" href={href} aria-label={label}>{body}</Link> : <div className="b-row__hit">{body}</div>}
    {trail ? <span className="b-row__trail">{trail}</span> : null}
    {actions ? <span className="b-row__acts">{actions}</span> : null}
  </div></li>;
  if (href) return <li className="b-li"><Link className={`${cls} b-row--link`} href={href} aria-label={label} onClick={onLinkClick}>{body}</Link></li>;
  if (onClick) return <li className="b-li"><button type="button" className={`${cls} b-row--link`} aria-label={label} onClick={onClick}>{body}</button></li>;
  return <li className="b-li"><div className={cls} role={label ? "group" : undefined} aria-label={label}>{body}</div></li>;
}

export type BTone = "grey" | "amber" | "red" | "green" | "teal";

/* Phase 9 (Nov 18, 2026): one status label (owner-b.css, "One status label").
 * - BChip: an exception that needs someone. 22px, 12/16 600, tabular figures, never wraps, a 1px edge in its own ink at
 *   16% (a system edge in High Contrast). `dot` marks a live state (someone is, or should be, on the clock right now);
 *   `icon` is only for a red ("stop") or green ("check") chip that stands alone outside a row (a card header, the band, a
 *   week's state line), so the two colours colour-blind readers confuse are told apart by shape. On the band (BHero) a
 *   chip is solid white with its tone's ink and no edge.
 * - BStatusText: the expected state ("Clocked in", "Off today", "In progress"), quiet grey text where a chip would sit,
 *   with an optional live dot.
 * - BCount: the one inline count (a card title, a filter, "At least 7"). BCard's `count` draws the same pill. */
const liveDot = (tone: BTone) => <span className="b-ldot" data-tone={tone} aria-hidden="true" />;
export function BChip({ tone = "grey", children, label, dot, icon }: { tone?: BTone; children: ReactNode; label?: string;
  /** A live state: a 6px dot in the tone's solid colour before the words. */
  dot?: boolean;
  /** A standalone red or green chip: "stop" draws WarningCircle (red), "check" draws Check (green), 12px. */
  icon?: "check" | "stop" }) {
  // Review B1 (NV-111): aria-label on a plain span is ignored, so a longer meaning is screen-reader text.
  const words = label ? <><span aria-hidden="true">{children}</span><span className="b-sr">{label}</span></> : children;
  if (!dot && !icon) return <span className={`b-chip b-chip--${tone}`}>{words}</span>;
  const glyph = icon === "check" ? <CheckIcon weight="bold" aria-hidden="true" /> : icon === "stop" ? <WarningCircleIcon weight="bold" aria-hidden="true" /> : null;
  return <span className={`b-chip b-chip--${tone}`} data-dot={dot ? "" : undefined} data-icon={icon}>{dot ? liveDot(tone) : glyph}{words}</span>;
}
/** The normal state, said quietly: 13.5/18 500 grey, tabular, one line, at the row's end. `dot` is the live dot. */
export function BStatusText({ children, dot, label }: { children: ReactNode; dot?: BTone; label?: string }) {
  return <span className="b-status" data-dot={dot}>{dot ? liveDot(dot) : null}{label ? <><span aria-hidden="true">{children}</span><span className="b-sr">{label}</span></> : children}</span>;
}
/** The one inline count: 20px, 12/16 700 tabular, teal on teal-50 (amber for "For you"); inside a segmented control
 * it follows the control (the label's colour at 16%, teal on the white thumb). `label` says what is counted. */
export function BCount({ children, label, tone }: { children: ReactNode; label?: string; tone?: "amber" }) {
  return <span className="b-count" data-tone={tone}>{label ? <><span aria-hidden="true">{children}</span><span className="b-sr">{label}</span></> : children}</span>;
}

/* Phase 9: one glyph per meaning (spec 2.2). Notes, notices and state cards draw these, bold, so a meaning always has the
 * same shape: the triangle is amber's "check", the circle red's "stop". */
export type BMeaning = "info" | "privacy" | "wait" | "check" | "unknown" | "offline" | "stop" | "done" | "locked" | "empty";
/** `solid` (premium pass, Nov 20, 2026; Jose's pick 4): the duotone cut, for a glyph that stands in its own circle
 * (BCallout). The tick has no second tone, so "done" keeps its bold line. */
export function BGlyph({ meaning, solid }: { meaning: BMeaning; solid?: boolean }) {
  const weight = solid ? "duotone" : "bold";
  switch (meaning) {
    case "info": return <InfoIcon weight={weight} aria-hidden="true" />;
    case "privacy": return <ShieldCheckIcon weight={weight} aria-hidden="true" />;
    case "wait": return <HourglassMediumIcon weight={weight} aria-hidden="true" />;
    case "check": return <WarningIcon weight={weight} aria-hidden="true" />;
    case "unknown": return <QuestionIcon weight={weight} aria-hidden="true" />;
    case "offline": return solid ? <OfflineGlyph /> : <WifiSlashIcon weight={weight} aria-hidden="true" />;
    case "stop": return <WarningCircleIcon weight={weight} aria-hidden="true" />;
    case "done": return <CheckIcon weight="bold" aria-hidden="true" />;
    case "locked": return <LockSimpleIcon weight={weight} aria-hidden="true" />;
    case "empty": return <TrayIcon weight={weight} aria-hidden="true" />;
  }
}
const CALLOUT_MEANING: Record<BTone, BMeaning> = { teal: "info", amber: "check", red: "stop", green: "done", grey: "locked" };

/** An email address that wraps whole: a break opportunity only after "@" (owner-b.css keeps `overflow-wrap:
 * break-word`), so "support@" ends a line and "thevelani.com" starts the next, never "support@theve-". */
export function BEmail({ address }: { address: string }) {
  const at = address.indexOf("@");
  return at < 0 ? <>{address}</> : <>{address.slice(0, at + 1)}<wbr />{address.slice(at + 1)}</>;
}

export type BCalloutAction = { label: ReactNode; href?: string; onClick?: () => void; aria?: string };
/** Phase 9: the one note inside a white card (spec 2.2): a tint with a 1px edge in its tone, an 18px bare glyph on the
 * first line's capitals, an optional 600 ink title, a 14.5/20 ink2 body, at most one quiet teal action. Tones: teal
 * information, amber wait or check, red stop, green done (server confirmed only), grey locked or set by someone else.
 * `icon` picks the meaning's glyph when it is not the tone's first one (teal "privacy", amber "wait", "unknown",
 * "offline"). A link in the body is teal with an underline; pass an email through BEmail. On the canvas use a notice
 * card instead, and on the band never a tinted box. `role` only when the note appears after an action. */
export function BCallout({ tone, icon, title, children, action, id, role, heading }: { tone: BTone; icon?: BMeaning; title?: ReactNode; children?: ReactNode;
  action?: BCalloutAction | ReactNode; id?: string; role?: "status" | "alert";
  /** The note is what its card is about: its title is the card's heading (same look). */
  heading?: "h2" | "h3" }) {
  const act = action === undefined || action === null || action === false ? null
    : isValidElement(action) || typeof action !== "object" || !("label" in (action as object)) ? <div className="b-callout__act">{action as ReactNode}</div>
    : (() => { const a = action as BCalloutAction; return a.href
      ? <Link className="b-callout__a" href={a.href} aria-label={a.aria}>{a.label}</Link>
      : <button type="button" className="b-callout__a" aria-label={a.aria} onClick={a.onClick}>{a.label}</button>; })();
  return <div className="b-callout" data-tone={tone} id={id} role={role}>
    <span className="b-callout__ic" aria-hidden="true"><BGlyph meaning={icon ?? CALLOUT_MEANING[tone]} solid /></span>
    {title ? heading === "h2" ? <h2 className="b-callout__t">{title}</h2> : heading === "h3" ? <h3 className="b-callout__t">{title}</h3> : <p className="b-callout__t">{title}</p> : null}
    {children !== undefined && children !== null && children !== false ? <div className="b-callout__b">{children}</div> : null}
    {act}
  </div>;
}

/* Faces: initials on one of six soft tints, picked from the name so a person keeps their colour on every screen. */
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // The first two words, as the rest of the app draws initials ("b Fictional QA" is BF on every screen).
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
export function BAvatar({ name, size = 36, ring, open }: { name?: string; size?: number; ring?: "late" | "on"; open?: boolean }) {
  if (open || !name) return <span className="b-av b-av--open" style={{ "--s": `${size}px` } as CSSProperties} aria-hidden="true" />;
  const [bg, fg] = faceTint(name);
  return <span className={`b-av${ring ? ` b-av--${ring}` : ""}`} style={{ "--s": `${size}px`, background: bg, color: fg } as CSSProperties} aria-hidden="true">{initialsOf(name)}</span>;
}
export function BFaces({ names, size = 32 }: { names: string[]; size?: number }) {
  return <span className="b-faces" aria-hidden="true">{names.slice(0, 2).map(name => <BAvatar key={name} name={name} size={size} />)}</span>;
}

/** A round 36px icon on a soft tint (things, not people). Phase 9: the glyph is half its circle, so `size` picks one of
 * the six round containers: 32 (glyph 16: add rows, account rows), 36 (18: a row's lead, the default), 40 (20: glass
 * controls on a phone's band), 44 (20: call and message), 48 (22: a state card), 56 (28: a finish). The tint says what
 * the row means: teal opens or informs, amber waits on you, red stops, green is done, grey has nothing to do now. */
export function BIcon({ tone = "teal", children, size }: { tone?: BTone; children: ReactNode; size?: 32 | 36 | 40 | 44 | 48 | 56 }) {
  // Premium pass (Nov 20, 2026; Jose's pick 4): a glyph inside a circle is Phosphor's duotone cut, whatever weight the
  // caller wrote (navigation, buttons and bare glyphs keep bold). A child that is not one icon element is left as it is.
  const glyph = !isValidElement<{ weight?: string; solid?: boolean }>(children) || typeof children.type === "string" ? children
    : children.type === BGlyph ? cloneElement(children, { solid: true }) : children.props.weight === "bold" ? cloneElement(children, { weight: "duotone" }) : children;
  return <span className={`b-ico b-ico--${tone}`} data-size={size && size !== 36 ? size : undefined} aria-hidden="true">{glyph}</span>;
}

export type BtnKind = "teal" | "ghost" | "quiet" | "white" | "glass" | "danger";
const btn = (kind: BtnKind, full?: boolean, big?: boolean) => `b-btn b-btn--${kind}${full ? " b-btn--full" : ""}${big ? " b-btn--big" : ""}`;
export function BButtonLink({ href, kind = "teal", full, big, children, label, prefetch }: { href: string; kind?: BtnKind; full?: boolean; big?: boolean; children: ReactNode; label?: string; prefetch?: boolean }) {
  return <Link className={btn(kind, full, big)} href={href} aria-label={label} prefetch={prefetch}>{children}</Link>;
}
/** Phase 7 (package C): the one spinner. A ring in the current text colour (b-foundation.css, b-shimmer.css): 20px in a
 * state card's icon circle, `small` (16px) beside words. It turns only when motion is allowed; it is decoration, so the
 * words beside it and aria-busy on its control carry the state. */
export function BSpin({ small }: { small?: boolean }) {
  return <span className={small ? "b-spin b-spin--sm" : "b-spin"} aria-hidden="true" />;
}
/** Phase 7 (package C): a busy control's words. The label and the busy words share one grid cell (b-shimmer.css), so the
 * control is as wide as the longer of the two before, during and after: nothing shifts. The hidden one is
 * visibility:hidden, which also keeps it out of the accessible name. The spinner exists only while busy. */
export function BBusyLabel({ busy, busyLabel, children }: { busy: boolean; busyLabel?: ReactNode; children: ReactNode }) {
  return <span className="b-busy">
    <span className="b-busy__idle" data-b-off={busy ? "" : undefined}>{children}</span>
    <span className="b-busy__on" data-b-off={busy ? undefined : ""} aria-hidden={busy ? undefined : true}>{busy ? <BSpin small /> : <span className="b-spin-slot" aria-hidden="true" />}{busyLabel ?? children}</span>
  </span>;
}
/** `busy` (Phase 7, package C): the button is working. It keeps its width and shows the spinner with `busyLabel` (its own
 * label when none is given), sets aria-busy and takes no second press. Leave `busy` out for a button that never waits. */
/** `keepFocus` (Nov 26, 2026): while busy the button stays focusable (aria-disabled, and presses are ignored) instead of
 * `disabled`, which would drop keyboard focus to the page; for Try again, where focus must stay put if it fails again. */
export function BButton({ kind = "teal", full, big, children, label, onClick, disabled, type = "button", name, value, busy, busyLabel, keepFocus }: { kind?: BtnKind; full?: boolean; big?: boolean; children: ReactNode; label?: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; name?: string; value?: string; busy?: boolean; busyLabel?: ReactNode; keepFocus?: boolean }) {
  const held = keepFocus && busy;
  return <button className={btn(kind, full, big)} type={type} aria-label={label} aria-busy={busy || undefined} aria-disabled={held || undefined} onClick={held ? undefined : onClick} disabled={disabled || (busy && !keepFocus) || undefined} name={name} value={value}>
    {busy === undefined ? children : <BBusyLabel busy={busy} busyLabel={busyLabel}>{children}</BBusyLabel>}</button>;
}

/** The dark ink tile for money moments (Home's Payday). */
export function BInk({ children, label }: { children: ReactNode; label: string }) {
  return <section className="b-ink" aria-label={label}>{children}</section>;
}

/** A quiet 13.5/18 grey line that qualifies a card, on the card's text edge. Phase 9: put it inside the BCard, after its
 * content, and it is that card's footer (12px above, 16px below, the card's 18px inset, 22px from 768px); left under a
 * card on the canvas it keeps the card's text edge as before. */
export function BNote({ children, id }: { children: ReactNode; id?: string }) {
  return <p className="b-note" id={id}>{children}</p>;
}

/** One row of chips that filter the list under it. */
export function BFilters({ label, items }: { label: string; items: { key: string; label: ReactNode; count?: number; current?: boolean; onSelect: () => void }[] }) {
  return <div className="b-filters" role="group" aria-label={label}>{items.map(item =>
    <button key={item.key} type="button" aria-pressed={item.current ? "true" : "false"} onClick={item.onSelect}>{item.label}{item.count !== undefined ? <b>{item.count}</b> : null}</button>)}</div>;
}

/** Jose (Nov 23, 2026): one time format everywhere. A range of two times reads in full, "7:00 AM – 3:00 PM": minutes on
 * both ends, AM or PM on both ends and a spaced en dash, whatever form it arrives in ("7–3 PM", "9 AM – 5 PM",
 * "12:00 AM–7:00 AM"). A position before the times ("Barista 1:00 PM – 3:00 PM") stays. Anything it can't read is
 * returned as it is. Text that came kept whole (keepWhole) goes back kept whole. (The name is older: until Nov 23 this
 * wrote the short phone form "7–3 PM".) */
export function compactRange(text: string) {
  const out = fullRange(text);
  return out !== text && /[\u00a0\u202f]/.test(text) ? keepWhole(out) : out;
}
function fullRange(text: string) {
  const times = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?[\s\u00a0\u2009\u202f]*([AP]M)/g)];
  if (times.length === 2) {
    const [a, b] = times;
    const full = (match: RegExpMatchArray) => `${Number(match[1])}:${match[2] ?? "00"} ${match[3]}`;
    return text.slice(0, a.index) + joinTimeRange(full(a), full(b)) + text.slice((b.index ?? 0) + b[0].length);
  }
  // "7–3 PM", "3:30–11 PM": one AM/PM written for both ends.
  const shared = text.match(/(\d{1,2})(?::(\d{2}))?[\s\u00a0\u2009\u202f]*[\u2013-][\s\u00a0\u2009\u202f]*(\d{1,2})(?::(\d{2}))?[\s\u00a0\u2009\u202f]*([AP]M)/);
  if (times.length === 1 && shared && shared.index !== undefined && (shared.index === 0 || !/[\d:]/.test(text[shared.index - 1]))) {
    const [, h1, m1, h2, m2, mark] = shared;
    return text.slice(0, shared.index) + joinTimeRange(`${Number(h1)}:${m1 ?? "00"} ${mark}`, `${Number(h2)}:${m2 ?? "00"} ${mark}`) + text.slice(shared.index + shared[0].length);
  }
  return text;
}

/** A time range in a row or a title: the full form at every width ("3:00 PM – 4:30 PM"; Jose, Nov 23, 2026, replacing
 * the Nov 15 short phone form). Each time stays whole and the line breaks only after the dash, so a narrow line shows
 * "11:30 PM –" over "12:00 AM", never "11:30" over "PM" or a line that starts with the dash. */
export function BWhen({ text, lang = "en" }: { text: string; lang?: "en" | "es" }) {
  const range = compactRange(text);
  return <>{lang === "es" ? esTime(range) : keepWhole(range)}</>;
}

/** Final polish (Nov 20, 2026): the two people of a swap in a row title, "Ana Colon ⇄ James Ortiz" with the glyph the
 * Shift requests rows lead with (Phosphor ArrowsLeftRight, bold, the 16px inline size) in place of a thin text arrow.
 * It is read "Ana Colon and James Ortiz". Each name stays whole; the glyph stays with the first name. */
export function BSwapNames({ a, b, lang = "en" }: { a: string; b: string; lang?: "en" | "es" }) {
  const spanish = lang === "es";
  const separator = spanish
    ? new Intl.ListFormat("es-PR").formatToParts([a, b]).find(part => part.type === "literal")?.value
    : " and ";
  return <span className="b-swapnames">
    <span className="b-swapnames__a">{spanish ? a : a.replace(/ /g, "\u00a0")}<ArrowsLeftRightIcon className="b-swapnames__ic" size={16} weight="bold" aria-hidden="true" /></span>
    <span className="b-sr">{separator}</span><span>{spanish ? b : b.replace(/ /g, "\u00a0")}</span>
  </span>;
}

/** Premium pass FA (final verification A #10, B #8): a line of facts joined by "·" ("Tue, Nov 24 · 12:00 PM – 8:00 PM ·
 * Calle Loíza") that wraps only between facts and never leaves a dot at the start or the end of a line. Each fact is one
 * unit (a time range or "Payday Fri, Nov 6" moves whole); every fact after the first carries its dot in a 13px slot that
 * is cut off when the fact starts a line (b-foundation.css, .b-segs). Empty facts are dropped. The text between facts is
 * still " · " for a screen reader and a copy (visually hidden; the drawn dot is the slot's). */
export function BSegs({ parts, className }: { parts: ReactNode[]; className?: string }) {
  const shown = parts.filter(part => part !== null && part !== undefined && part !== false && part !== "");
  return <span className={className ? `b-segs ${className}` : "b-segs"}>{shown.map((part, index) => <span key={index} className="b-segs__i">
    {index ? <span className="b-sr"> · </span> : null}{typeof part === "string" ? keepWhole(part) : part}</span>)}</span>;
}
/** The same for a sentence already joined with " · " (a server-formatted line). */
export function BSegsText({ text, className }: { text: string; className?: string }) {
  return <BSegs parts={text.split(/[\s\u00a0]+·[\s\u00a0]+/)} className={className} />;
}

/** "Good morning/afternoon/evening" in the workspace's zone. */
export function partOfDay(timeZone?: string, now = new Date()) {
  let hour = now.getHours();
  try { if (timeZone) hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)); } catch { /* the device's hour */ }
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** One state card (review B2, NV-075): a 48px icon circle (grey while loading, locked or empty, amber offline or paused, red
 * when something failed), a 16/22 title, one line, and one teal recovery pill, left-aligned. Say the state once. */
export type BStateKind = "failed" | "offline" | "paused" | "locked" | "loading" | "empty" | "done";
const STATE_LOOK: Record<BStateKind, { tone: BTone; icon: ReactNode }> = {
  failed: { tone: "red", icon: <WarningCircleIcon weight="bold" /> },
  offline: { tone: "amber", icon: <WifiSlashIcon weight="bold" /> },
  // Premium pass FA (final verification A #12): paused waits, so it is the wait glyph (HourglassMedium); Pause's two bars
  // read as a media control and were outside the one-glyph-per-meaning set.
  paused: { tone: "amber", icon: <HourglassMediumIcon weight="bold" /> },
  locked: { tone: "grey", icon: <LockSimpleIcon weight="bold" /> },
  loading: { tone: "grey", icon: <BSpin /> },
  // Review B5 (NV-254): nothing here yet; pass the page's own glyph as `icon`. Nov 14 inspection (SY-023): without one the
  // card shows an empty tray, never the warning glyph (that is the failed kind's).
  empty: { tone: "grey", icon: <TrayIcon weight="bold" /> },
  // Phase 7 (moments): the server confirmed it. The mark is BDoneMark, drawn by BState itself.
  done: { tone: "green", icon: <CheckIcon weight="bold" /> },
};
/** Phase 7 (moments): the one success mark of the signed-in app, a green-50 circle with a bold green check. It settles
 * once (b-moments.css: transform and opacity, --b-dur-enter) and is simply there under reduced motion. Decorative: the
 * words beside it carry the result. `children` is the one allowed extra (a gated `Celebration` ring). */
export function BDoneMark({ children, still, on }: { children?: ReactNode;
  /** A done state that was already true when the page opened (a confirmed week read from the server): no motion. */
  still?: boolean;
  /** The mark sits on a tinted block, so its circle is white. */
  on?: "tint" }) {
  // Final polish (Nov 21, 2026; Jose: the check mark "more premium and with motion"): the mark draws its own tick, one
  // round-capped stroke with pathLength 1, so the sheet can draw it in (b-moments.css) after the disc settles.
  return <span className="b-ico b-ico--green b-donemark" data-still={still ? "" : undefined} data-on={on} aria-hidden="true"><svg className="b-donemark__tick" viewBox="0 0 24 24" fill="none" focusable="false"><path d="M5.5 12.75l4.25 4.25L18.5 7.75" pathLength={1} stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" /></svg>{children}</span>;
}
/** Review F2/F5 (NV-074) and Phase 2 (package D): a page's loading placeholder in Direction B. It keeps the page's frame:
 * the band at the height the page will have, the page's title when it is known (a bar when it is not), the strip the page
 * carries on its band, and card-shaped blocks where its cards will be. Without a shape it is the first version: a title
 * bar and two cards of #ECEEEF bars. Phase 7 (package C): when motion is allowed and loading lasts longer than 300ms, one
 * soft light band crosses the bars (b-shimmer.css keys on [data-b-load] and .b-skel, so every placeholder gets it from
 * here and no page asks for it). With reduced motion the bars are static, as Phase 2 built them.
 * - band: where the band ends on tablets and desktop ("short", "sub" or "strip", the three heights in b-tokens.css). A
 *   main tab leaves it out and keeps its own loaded height (b-foundation.css, --b-ph-band). Phones keep their heights.
 *   A number is a page that ends its band off the ladder (Payroll, 314): the same px from the top of the window.
 * - frame: "rail" is Home's two columns, "rail-desktop" the same from 1024px and one column on tablets (Team), "wide"
 *   the full grid, "pair" two equal columns from 1024px, "read" one reading column, "state" a state card's width.
 * - lift: the first card overlaps the band (Home and the main tabs); without it the cards start under the band
 *   (data-b-under, which stays when a state card replaces the cards, so the band keeps its height).
 * The access check (ScopedReadFrame) and a route's loading.tsx (CorpSkeleton) both draw it through BRouteLoading. */
export type BLoadingCard = { head?: boolean; lines?: number; rows?: number; avatar?: boolean; stats?: number; rail?: boolean };
export type BLoadingShape = { title?: ReactNode; back?: boolean; sub?: boolean; strip?: boolean | "figures"; action?: boolean;
  band?: "short" | "sub" | "strip" | number; frame?: "rail" | "rail-desktop" | "wide" | "pair" | "read" | "state"; lift?: boolean; cards?: BLoadingCard[];
  /** A state card in place of the placeholder cards (the page is slow, or the device is offline): the band and the title
   * stay, one card says what is happening, and it is a state card's width. */
  state?: ReactNode;
  /** Whose shell this frame is for, when both are drawn (owner-b.css shows the shell its own). */
  shell?: "management" | "employee";
  /** Phase 7 (package C): the address this placeholder stands in for, so a sheet can give one page's placeholder that
   * page's own phone band (b-shimmer.css; phones have no band ladder). */
  route?: string };
const LOADING_CARDS: BLoadingCard[] = [{ head: true, lines: 3 }, { head: true, lines: 3 }];
const SKEL_WIDTHS = ["52%", "40%", "60%", "46%", "36%", "56%", "44%", "50%"];
export function BLoadingScreen({ title, back, sub, strip, action, band, frame = "rail", lift = true, cards = LOADING_CARDS, state, shell, route, loadingText = "Loading…" }: BLoadingShape & {
  /** Signed-in Spanish: the spoken loading word ("Cargando…"); English when left out. */ loadingText?: string } = {}) {
  return <div className={back ? "b-screen b-screen--back" : "b-screen"} data-b-load="" data-b-shell={shell} data-b-for={route} data-b-band={typeof band === "number" ? "own" : band}
    style={typeof band === "number" ? { ["--b-band-own" as string]: `${band}px` } : undefined} data-b-frame={state ? "state" : frame} data-b-lift={lift && !state ? "" : undefined} data-b-under={lift ? undefined : ""}>
    <header className="b-hero">
      {back ? <span className="b-skel b-skel--back" aria-hidden="true" /> : null}
      <div className="b-title">
        <div className="b-title__text">
          <h1>{title ?? <span className="b-skel b-skel--title" aria-hidden="true" />}{state ? null : <span className="b-sr">{title ? " " : ""}{loadingText}</span>}</h1>
          {sub ? <span className="b-skel b-skel--sub" aria-hidden="true" /> : null}
        </div>
        {action ? <span className="b-skel b-skel--action" aria-hidden="true" /> : null}
      </div>
      {strip ? <span className={strip === "figures" ? "b-skel b-skel--figures" : "b-skel b-skel--strip"} aria-hidden="true" /> : null}
    </header>
    <BStack>{state ? <BCard>{state}</BCard> : cards.map((card, index) => <section key={index} className="b-card" data-b-rail={card.rail ? "" : undefined} aria-hidden="true">
      <div className="b-skel-card">
        {card.head ? <span className="b-skel b-skel--head" /> : null}
        {card.stats ? <div className="b-skel-stats">{Array.from({ length: card.stats }, (_, stat) => <span key={stat}><span className="b-skel b-skel--short" /><span className="b-skel b-skel--figure" /></span>)}</div> : null}
        {Array.from({ length: card.lines ?? 0 }, (_, line) => <span key={line} className={line === (card.lines ?? 0) - 1 && line > 0 ? "b-skel b-skel--short" : "b-skel"} />)}
        {Array.from({ length: card.rows ?? 0 }, (_, row) => <div key={row} className="b-skel-row">
          {card.avatar ? <span className="b-skel b-skel--av" /> : null}
          <span className="b-skel-row__tx"><span className="b-skel" style={{ width: SKEL_WIDTHS[(row + index) % SKEL_WIDTHS.length] }} /><span className="b-skel b-skel--thin" style={{ width: SKEL_WIDTHS[(row + index + 3) % SKEL_WIDTHS.length] }} /></span>
        </div>)}
      </div>
    </section>)}</BStack>
  </div>;
}

/** A whole page that is one state (Phase 2, package D): the band with the page's title and its way back, then one state
 * card, at every width. The band ends at the short height and the card is a state card's width on tablets and desktop
 * (b-tokens.css). The older screens (the access check's paused and failed views, "… unavailable", the error pages) draw
 * through it, so a state looks the same wherever it comes from. `children` is the card's content, a BState. */
export function BStateScreen({ title, titleId, sub, back, children, after, offlineInTitle }: { offlineInTitle?: boolean; title: ReactNode; titleId?: string; sub?: ReactNode; back?: { href: string; label: string }; children: ReactNode; after?: ReactNode }) {
  return <div className={back ? "b-screen b-screen--back" : "b-screen"} data-b-state="" data-b-band="short" data-b-frame="state">
    <BHero title={title} titleId={titleId} sub={sub} back={back} offlineInTitle={offlineInTitle} />
    <BStack><BCard>{children}</BCard>{after ?? null}</BStack>
  </div>;
}

export function BState({ kind, title, line, action, children, icon, alert, silent, size, titleRef, heading, quiet, extra }: { kind: BStateKind; title?: ReactNode; line?: ReactNode;
  /** `busy`: the retry is running; the button keeps its place and shows the spinner with `busyLabel` ("Checking…" when none is given). */
  /** `retry` (English flag A6, Nov 26, 2026): the action is a "Try again"; it shows "Trying again…" while its onClick runs
   * (until a returned promise settles, and at least 600 ms) and ignores a second press. Not used with `busy`. */
  action?: { label: ReactNode; onClick?: () => unknown; href?: string; busy?: boolean; busyLabel?: ReactNode; aria?: string; retry?: boolean }; children?: ReactNode; icon?: ReactNode; alert?: boolean;
  /** No live region here: the screen says its message once in its own alert (the route error pages), and this card is
   * the visible copy. */
  silent?: boolean;
  /** Phase 7 (moments), kind "done" only. "inline" (the default) is a result that replaces the form or row it came from:
   * the state card's own shape, its next step a tinted pill. "finish" ends a flow: the 56px mark over a centred title,
   * one line and the one filled button. */
  size?: "inline" | "finish";
  /** The screen changed under the person: the caller focuses the title through this ref. The title is then what is read,
   * so the card carries no live region (a result is said once). */
  titleRef?: Ref<HTMLElement>;
  /** The title is the section's heading (an h2), for a result that stands where a form's heading stood. */
  heading?: boolean;
  /** A second way on that the screen already had ("Make another request"): a quiet text button or link, never a pill. */
  quiet?: ReactNode;
  /** Inside the done mark: the gated `Celebration` and nothing else. */
  extra?: ReactNode }) {
  const look = STATE_LOOK[kind], done = kind === "done", finish = done && size === "finish";
  const Title = heading ? "h2" : "p";
  const go: BtnKind = done && !finish ? "ghost" : "teal";
  return <div className="b-statecard" data-kind={kind} data-size={done ? (finish ? "finish" : "inline") : undefined} role={silent || titleRef ? undefined : alert ? "alert" : "status"} aria-busy={kind === "loading" || action?.busy || undefined}>
    {done && !icon ? <BDoneMark>{extra}</BDoneMark> : <BIcon tone={look.tone}>{icon ?? look.icon}</BIcon>}
    <div className="b-statecard__main">
      {title ? <Title className="b-statecard__t" ref={titleRef as Ref<HTMLHeadingElement & HTMLParagraphElement>} tabIndex={titleRef ? -1 : undefined}>{title}</Title> : null}
      {line ? <p className="b-statecard__s">{line}</p> : null}
      {children}
      {action ? action.href ? <BButtonLink href={action.href} kind={go} label={action.aria}>{action.label}</BButtonLink>
        : action.retry && action.busy === undefined ? <BRetryButton kind={go} onClick={action.onClick} label={action.aria}>{action.label}</BRetryButton>
        : action.busy === undefined ? <BButton kind={go} onClick={action.onClick as (() => void) | undefined} label={action.aria}>{action.label}</BButton>
        : <BButton kind={go} onClick={action.onClick as (() => void) | undefined} busy={action.busy} busyLabel={action.busyLabel ?? (action.busy ? "Checking…" : undefined)} label={action.aria}>{action.label}</BButton> : null}
      {quiet ?? null}
    </div>
  </div>;
}
