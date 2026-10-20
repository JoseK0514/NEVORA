import type { ReactNode } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { InfoIcon } from "@phosphor-icons/react/dist/ssr/Info";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { PageBand } from "@/components/kit/kit";
import { FocusClear, PillTracks } from "./wave-c-focus";

/* Wave C (Phase 3.5): the one frame and form pieces every Settings page, Account recovery and
 * Clocker recovery share. Presentation only; each page keeps its own data, actions and checks.
 * Styles: src/app/app/premium-wave-c.css (prefix wc-). */

export type SettingsFrameProps = {
  title: ReactNode;
  summary?: ReactNode;
  eyebrow?: ReactNode;
  /** Back names where it goes. Settings pages return to Settings. */
  back?: { href: string; label: string } | null;
  /** A small control at the top right of the band (an Add link). */
  bandAside?: ReactNode;
  /** Guidance beside the form on wide screens, after it on phones. */
  aside?: ReactNode;
  /** The desktop top bar already links to Settings here, so a Back to Settings is left out there (recovery pages: false). */
  settingsCrumb?: boolean;
  /** "narrow" keeps a single form column readable on wide screens. */
  width?: "narrow" | "wide";
  className?: string;
  children: ReactNode;
};

export function SettingsFrame({ title, summary, eyebrow, back = { href: "/app/settings", label: "Settings" }, bandAside, aside, width = "wide", settingsCrumb = true, className, children }: SettingsFrameProps) {
  return (
    <div className={className ? `nv-page wc-page ${className}` : "nv-page wc-page"} data-nv-page="" data-wc-width={width} data-wc-crumb={settingsCrumb ? "settings" : undefined}>
      <PageBand eyebrow={eyebrow} title={title} summary={summary} back={back ?? undefined} aside={bandAside} />
      <FocusClear />
      <PillTracks />
      <div className="nv-content wc-content">
        {aside ? <div className="wc-layout"><div className="wc-main">{children}</div><aside className="wc-aside" aria-label="About this page">{aside}</aside></div> : children}
      </div>
    </div>
  );
}

export type NoticeTone = "done" | "urgent" | "info";
const noticeGlyph = { done: CheckCircleIcon, urgent: WarningCircleIcon, info: InfoIcon };

/** Feedback after an action: an icon, a short title and the sentence. Never colour alone. */
export function Notice({ tone, title, children, action }: { tone: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const Glyph = noticeGlyph[tone];
  return (
    <div className="wc-notice" data-tone={tone}>
      <Glyph className="wc-notice__icon" size={20} weight="fill" aria-hidden="true" />
      <div className="wc-notice__text">
        {title ? <strong className="wc-notice__title">{title}</strong> : null}
        {children ? <p className="wc-notice__body">{children}</p> : null}
        {action ? <div className="wc-notice__action">{action}</div> : null}
      </div>
    </div>
  );
}

/** A fact that isn't a field: label above, value below (e.g. "Workweek starts"). */
export function Fact({ label, value, note, icon }: { label: ReactNode; value: ReactNode; note?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="wc-fact">
      {icon ? <span className="wc-fact__icon" aria-hidden="true">{icon}</span> : null}
      <div>
        <span className="wc-fact__label">{label}</span>
        <span className="wc-fact__value">{value}</span>
        {note ? <span className="wc-fact__note">{note}</span> : null}
      </div>
    </div>
  );
}

/** Guidance card for the aside: a title, a sentence or two, an optional link. */
export function GuideCard({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="nv-card wc-guide">
      <h2 className="nv-card__title">{title}</h2>
      <div className="wc-guide__body">{children}</div>
      {action ? <div className="wc-guide__action">{action}</div> : null}
    </section>
  );
}

/** Empty, no-match and unavailable states inside a card: a tile, a title, a sentence, one action. */
export function EmptyState({ icon, title, titleId, children, action, headingLevel = 2, tone = "neutral" }: {
  icon: ReactNode; title: ReactNode; titleId?: string; children: ReactNode; action?: ReactNode; headingLevel?: 2 | 3; tone?: "neutral" | "urgent";
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="wc-empty">
      <span className="nv-tile" data-tone={tone} aria-hidden="true">{icon}</span>
      <Heading className="nv-card__title" id={titleId}>{title}</Heading>
      <p className="wc-empty__text">{children}</p>
      {action ? <div className="wc-empty__action">{action}</div> : null}
    </div>
  );
}
