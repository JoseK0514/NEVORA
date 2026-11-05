import "./owner-b.css";
import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";

/* Direction B (Jose approved Nov 5, 2026; mock "NEVORA mobile, Direction B"): the Owner and Manager phone screens. Each page
 * renders one `BScreen` as the first child of its CorpPage; on a phone under the shell's data-nv-b it replaces the page's
 * other children, and on tablets and desktop it is not shown, so those layouts are unchanged. Presentation only: callers
 * pass the same authorized, formatted data and the same links and actions as the page around it. */

export function BScreen({ children, ink, back }: { children: ReactNode; ink?: boolean; back?: boolean }) {
  return <div className={`b-screen${ink ? " b-screen--ink" : ""}${back ? " b-screen--back" : ""}`}>{children}</div>;
}

/** The brand hero: the shell's header floats over its top; the title, one white action and live figures sit on it. */
export function BHero({ title, titleId, eyebrow, sub, right, back, children, big }: {
  title: ReactNode; titleId?: string; eyebrow?: ReactNode; sub?: ReactNode; right?: ReactNode; back?: { href: string; label: string }; children?: ReactNode;
  /** Home's 34px sentence instead of a 30px page title. */
  big?: boolean;
}) {
  return <header className="b-hero">
    {back ? <Link className="b-back" href={back.href}><span className="b-back__ic b-glass" aria-hidden="true"><CaretLeftIcon size={20} weight="bold" /></span>{back.label}</Link> : null}
    <div className={big ? "b-title b-title--big" : "b-title"}>
      <div className="b-title__text">
        {eyebrow ? <p className="b-eyebrow">{eyebrow}</p> : null}
        <h1 id={titleId}>{title}</h1>
        {sub ? <p className="b-sub">{sub}</p> : null}
      </div>
      {right ? <div className="b-title__right">{right}</div> : null}
    </div>
    {children}
  </header>;
}

export type BLiveItem = { label: ReactNode; value: ReactNode; small?: ReactNode; dot?: "live" | "warn"; href?: string; aria?: string };
/** Live figures on frosted glass (two to three columns). A figure with `href` opens its list. */
export function BLive({ items, label }: { items: BLiveItem[]; label: string }) {
  return <dl className="b-live b-glass" aria-label={label}>{items.map((item, index) => {
    const body = <>
      <dt className="b-live__l">{item.dot ? <span className={`b-dot b-dot--${item.dot}`} aria-hidden="true" /> : null}{item.label}</dt>
      <dd className="b-live__v">{item.value}{item.small ? <small>{item.small}</small> : null}</dd>
    </>;
    return item.href ? <div key={index} className="b-live__i"><Link className="b-live__a" href={item.href} aria-label={item.aria}>{body}</Link></div>
      : <div key={index} className="b-live__i">{body}</div>;
  })}</dl>;
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

export function BCard({ title, count, link, meta, children, id, label, chip }: { title?: ReactNode; count?: ReactNode; link?: { href: string; label: string; aria?: string }; meta?: ReactNode; children?: ReactNode; id?: string; label?: string; chip?: ReactNode }) {
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
  return <li className="b-li"><div className={cls} aria-label={label}>{body}</div></li>;
}

export type BTone = "grey" | "amber" | "red" | "green" | "teal";
export function BChip({ tone = "grey", children, label }: { tone?: BTone; children: ReactNode; label?: string }) {
  return <span className={`b-chip b-chip--${tone}`} aria-label={label}>{children}</span>;
}

/* Faces: initials on one of six soft tints, picked from the name so a person keeps their colour on every screen. */
const TINTS = [["#E4ECF7", "#2C4A7A"], ["#E7F2EC", "#22603F"], ["#EEE7F7", "#5B3D8F"], ["#F6EBE1", "#7A4A22"], ["#FBE8EC", "#8A2E44"], ["#E6F0F6", "#1F5670"]] as const;
export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  // The first two words, as the rest of the app draws initials ("b Fictional QA" is BF on every screen).
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}
export function BAvatar({ name, size = 36, ring, open }: { name?: string; size?: number; ring?: "late" | "on"; open?: boolean }) {
  if (open || !name) return <span className="b-av b-av--open" style={{ "--s": `${size}px` } as CSSProperties} aria-hidden="true" />;
  let hash = 0; for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = TINTS[hash % TINTS.length];
  return <span className={`b-av${ring ? ` b-av--${ring}` : ""}`} style={{ "--s": `${size}px`, background: bg, color: fg } as CSSProperties} aria-hidden="true">{initialsOf(name)}</span>;
}
export function BFaces({ names, size = 32 }: { names: string[]; size?: number }) {
  return <span className="b-faces" aria-hidden="true">{names.slice(0, 2).map(name => <BAvatar key={name} name={name} size={size} />)}</span>;
}

/** A round 36px icon on a soft tint (things, not people). */
export function BIcon({ tone = "teal", children }: { tone?: BTone; children: ReactNode }) {
  return <span className={`b-ico b-ico--${tone}`} aria-hidden="true">{children}</span>;
}

type BtnKind = "teal" | "ghost" | "quiet" | "white" | "glass";
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

/** "Good morning/afternoon/evening" in the workspace's zone. */
export function partOfDay(timeZone?: string, now = new Date()) {
  let hour = now.getHours();
  try { if (timeZone) hour = Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now)); } catch { /* the device's hour */ }
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
