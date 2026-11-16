import "./owner-b.css";
import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";
import { BOffline } from "./b-offline";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { WifiSlashIcon } from "@phosphor-icons/react/dist/ssr/WifiSlash";
import { PauseIcon } from "@phosphor-icons/react/dist/ssr/Pause";
import { LockSimpleIcon } from "@phosphor-icons/react/dist/ssr/LockSimple";
import { TrayIcon } from "@phosphor-icons/react/dist/ssr/Tray";
import { faceTint } from "@/lib/face-tint";

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

export type BLiveItem = { label: ReactNode; value: ReactNode; small?: ReactNode; dot?: "live" | "warn"; href?: string; aria?: string;
  /** Closing F1 (NV-006): a figure that filters the list below it (a toggle; `pressed` while the filter is on). */
  onSelect?: () => void; pressed?: boolean;
  /** A short line under the figure; Employee desktop shows it (employee-b-desktop.css), phones don't. */
  meta?: ReactNode };
/** Live figures on frosted glass (two to three columns). A figure with `href` opens its list. Review B1 (NV-005): a list
 * of tiles (a link may not sit between a <dl>'s group and its term), each label read before its value. */
export function BLive({ items, label }: { items: BLiveItem[]; label: string }) {
  return <ul className="b-live b-glass" aria-label={label}>{items.map((item, index) => {
    const body = <>
      <span className="b-live__l">{item.dot ? <span className={`b-dot b-dot--${item.dot}`} aria-hidden="true" /> : null}{item.label}</span>
      <span className="b-live__v">{item.value}{item.small ? <small>{item.small}</small> : null}</span>
      {item.meta ? <span className="b-live__m">{item.meta}</span> : null}
    </>;
    return item.href ? <li key={index} className="b-live__i"><Link className="b-live__a" href={item.href} aria-label={item.aria}>{body}</Link></li>
      : item.onSelect ? <li key={index} className="b-live__i"><button type="button" className="b-live__a b-live__btn" aria-pressed={item.pressed ? "true" : "false"} aria-label={item.aria} onClick={item.onSelect}>{body}</button></li>
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
export function BRow({ lead, title, chip, sub, end, trail, href, onClick, chevron, label, actions, extra }: {
  lead?: ReactNode; title: ReactNode; chip?: ReactNode; sub?: ReactNode; end?: ReactNode; trail?: ReactNode; href?: string; onClick?: () => void; chevron?: boolean; label?: string;
  actions?: ReactNode; extra?: ReactNode;
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
    {showChev ? <CaretRightIcon className="b-chev" size={18} weight="bold" aria-hidden="true" /> : null}
  </>;
  const cls = actions ? "b-row b-row--wrap" : "b-row";
  // A row with its own buttons keeps them outside the row's link, so each control is its own target.
  if (trail || actions) return <li className="b-li"><div className={cls}>
    {href ? <Link className="b-row__hit" href={href} aria-label={label}>{body}</Link> : <div className="b-row__hit">{body}</div>}
    {trail ? <span className="b-row__trail">{trail}</span> : null}
    {actions ? <span className="b-row__acts">{actions}</span> : null}
  </div></li>;
  if (href) return <li className="b-li"><Link className={`${cls} b-row--link`} href={href} aria-label={label}>{body}</Link></li>;
  if (onClick) return <li className="b-li"><button type="button" className={`${cls} b-row--link`} aria-label={label} onClick={onClick}>{body}</button></li>;
  return <li className="b-li"><div className={cls} role={label ? "group" : undefined} aria-label={label}>{body}</div></li>;
}

export type BTone = "grey" | "amber" | "red" | "green" | "teal";
export function BChip({ tone = "grey", children, label }: { tone?: BTone; children: ReactNode; label?: string }) {
  // Review B1 (NV-111): aria-label on a plain span is ignored, so a longer meaning is screen-reader text.
  return label ? <span className={`b-chip b-chip--${tone}`}><span aria-hidden="true">{children}</span><span className="b-sr">{label}</span></span>
    : <span className={`b-chip b-chip--${tone}`}>{children}</span>;
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

/** A round 36px icon on a soft tint (things, not people). */
export function BIcon({ tone = "teal", children }: { tone?: BTone; children: ReactNode }) {
  return <span className={`b-ico b-ico--${tone}`} aria-hidden="true">{children}</span>;
}

type BtnKind = "teal" | "ghost" | "quiet" | "white" | "glass" | "danger";
const btn = (kind: BtnKind, full?: boolean, big?: boolean) => `b-btn b-btn--${kind}${full ? " b-btn--full" : ""}${big ? " b-btn--big" : ""}`;
export function BButtonLink({ href, kind = "teal", full, big, children, label, prefetch }: { href: string; kind?: BtnKind; full?: boolean; big?: boolean; children: ReactNode; label?: string; prefetch?: boolean }) {
  return <Link className={btn(kind, full, big)} href={href} aria-label={label} prefetch={prefetch}>{children}</Link>;
}
export function BButton({ kind = "teal", full, big, children, label, onClick, disabled, type = "button", name, value }: { kind?: BtnKind; full?: boolean; big?: boolean; children: ReactNode; label?: string; onClick?: () => void; disabled?: boolean; type?: "button" | "submit"; name?: string; value?: string }) {
  return <button className={btn(kind, full, big)} type={type} aria-label={label} onClick={onClick} disabled={disabled} name={name} value={value}>{children}</button>;
}

/** The dark ink tile for money moments (Home's Payday). */
export function BInk({ children, label }: { children: ReactNode; label: string }) {
  return <section className="b-ink" aria-label={label}>{children}</section>;
}

/** A quiet 13px line under the cards. */
export function BNote({ children }: { children: ReactNode }) {
  return <p className="b-note">{children}</p>;
}

/** One row of chips that filter the list under it. */
export function BFilters({ label, items }: { label: string; items: { key: string; label: ReactNode; count?: number; current?: boolean; onSelect: () => void }[] }) {
  return <div className="b-filters" role="group" aria-label={label}>{items.map(item =>
    <button key={item.key} type="button" aria-pressed={item.current ? "true" : "false"} onClick={item.onSelect}>{item.label}{item.count !== undefined ? <b>{item.count}</b> : null}</button>)}</div>;
}

/** "12:00 AM – 7:00 AM" reads "12–7 AM"; "3:30 PM – 11:00 PM" reads "3:30–11 PM"; "9:00 AM – 5:00 PM" reads "9 AM – 5 PM".
 * Anything it can't read is returned as it is. */
export function compactRange(text: string) {
  const times = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?[\s\u00a0\u202f]*([AP]M)/g)];
  if (times.length !== 2) return text;
  const short = (match: RegExpMatchArray) => `${match[1]}${match[2] && match[2] !== "00" ? `:${match[2]}` : ""}`;
  const [a, b] = times;
  const compact = a[3] === b[3] ? `${short(a)}–${short(b)}\u00a0${b[3]}` : `${short(a)}\u00a0${a[3]} – ${short(b)}\u00a0${b[3]}`;
  // Only the two times change: a position before them ("Barista 1:00 PM – 3:00 PM") stays.
  return text.slice(0, a.index) + compact + text.slice((b.index ?? 0) + b[0].length);
}

/** Jose (Nov 15, 2026, item 5): a time range is short on a phone ("3–4:30 PM") and full from 768px ("3:00 PM – 4:30 PM").
 * Both forms are rendered and the B sheets show one (b-foundation.css), so nothing shifts after hydration. */
export function BWhen({ text }: { text: string }) {
  const short = compactRange(text);
  if (short === text) return <>{text}</>;
  return <><span className="b-when-s">{short}</span><span className="b-when-f">{text}</span></>;
}

/** "Good morning/afternoon/evening" in the workspace's zone. */
export function partOfDay(timeZone?: string, now = new Date()) {
  let hour = now.getHours();
  try { if (timeZone) hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)); } catch { /* the device's hour */ }
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** One state card (review B2, NV-075): a 48px icon circle (grey while loading, locked or empty, amber offline or paused, red
 * when something failed), a 16/22 title, one line, and one teal recovery pill, left-aligned. Say the state once. */
export type BStateKind = "failed" | "offline" | "paused" | "locked" | "loading" | "empty";
const STATE_LOOK: Record<BStateKind, { tone: BTone; icon: ReactNode }> = {
  failed: { tone: "red", icon: <WarningCircleIcon weight="bold" /> },
  offline: { tone: "amber", icon: <WifiSlashIcon weight="bold" /> },
  paused: { tone: "amber", icon: <PauseIcon weight="bold" /> },
  locked: { tone: "grey", icon: <LockSimpleIcon weight="bold" /> },
  loading: { tone: "grey", icon: <span className="b-spin" /> },
  // Review B5 (NV-254): nothing here yet; pass the page's own glyph as `icon`. Nov 14 inspection (SY-023): without one the
  // card shows an empty tray, never the warning glyph (that is the failed kind's).
  empty: { tone: "grey", icon: <TrayIcon weight="bold" /> },
};
/** Review F2/F5 (NV-074) and Phase 2 (package D): a page's loading placeholder in Direction B. It keeps the page's frame:
 * the band at the height the page will have, the page's title when it is known (a bar when it is not), the strip the page
 * carries on its band, and card-shaped blocks where its cards will be. Without a shape it is the first version: a title
 * bar and two cards of #ECEEEF bars. The bars are static (no shimmer), so reduced motion needs nothing more.
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
  shell?: "management" | "employee" };
const LOADING_CARDS: BLoadingCard[] = [{ head: true, lines: 3 }, { head: true, lines: 3 }];
const SKEL_WIDTHS = ["52%", "40%", "60%", "46%", "36%", "56%", "44%", "50%"];
export function BLoadingScreen({ title, back, sub, strip, action, band, frame = "rail", lift = true, cards = LOADING_CARDS, state, shell }: BLoadingShape = {}) {
  return <div className={back ? "b-screen b-screen--back" : "b-screen"} data-b-load="" data-b-shell={shell} data-b-band={typeof band === "number" ? "own" : band}
    style={typeof band === "number" ? { ["--b-band-own" as string]: `${band}px` } : undefined} data-b-frame={state ? "state" : frame} data-b-lift={lift && !state ? "" : undefined} data-b-under={lift ? undefined : ""}>
    <header className="b-hero">
      {back ? <span className="b-skel b-skel--back" aria-hidden="true" /> : null}
      <div className="b-title">
        <div className="b-title__text">
          <h1>{title ?? <span className="b-skel b-skel--title" aria-hidden="true" />}{state ? null : <span className="b-sr">{title ? " " : ""}Loading…</span>}</h1>
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

export function BState({ kind, title, line, action, children, icon, alert, silent }: { kind: BStateKind; title?: ReactNode; line?: ReactNode;
  action?: { label: ReactNode; onClick?: () => void; href?: string; busy?: boolean }; children?: ReactNode; icon?: ReactNode; alert?: boolean;
  /** No live region here: the screen says its message once in its own alert (the route error pages), and this card is
   * the visible copy. */
  silent?: boolean }) {
  const look = STATE_LOOK[kind];
  return <div className="b-statecard" data-kind={kind} role={silent ? undefined : alert ? "alert" : "status"} aria-busy={kind === "loading" || action?.busy || undefined}>
    <BIcon tone={look.tone}>{icon ?? look.icon}</BIcon>
    <div className="b-statecard__main">
      {title ? <p className="b-statecard__t">{title}</p> : null}
      {line ? <p className="b-statecard__s">{line}</p> : null}
      {children}
      {action ? action.href ? <BButtonLink href={action.href} kind="teal">{action.label}</BButtonLink>
        : <BButton kind="teal" onClick={action.onClick} disabled={action.busy}>{action.busy ? "Checking…" : action.label}</BButton> : null}
    </div>
  </div>;
}
