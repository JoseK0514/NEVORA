import type { ReactNode } from "react";
import Link from "next/link";
import { QuietBar, QuietHeader, QuietNav } from "@/components/quiet/quiet";
import { BDoneMark, BGlyph, BIcon, type BMeaning, type BTone } from "@/components/owner-b/b-kit";
import { FocusClear, PillTracks } from "./wave-c-focus";
import "./settings-corp.css";

/* Wave C (Phase 3.5): the one frame and form pieces every Settings page, Account recovery and
 * Clocker recovery share. Presentation only; each page keeps its own data, actions and checks.
 * Styles: src/app/app/premium-wave-c.css (prefix wc-). */

export type SettingsFrameProps = {
  title: ReactNode;
  summary?: ReactNode;
  eyebrow?: ReactNode;
  /** Back names where it goes. Settings pages return to Settings, the one place that lists them (Owner premium A9). */
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

export function SettingsFrame({ title, summary, eyebrow: _eyebrow, back = { href: "/app/settings", label: "Settings" }, bandAside, aside: _aside, width = "wide", settingsCrumb = true, className, save, modal, children }: SettingsFrameProps & {
  /** Quiet (v4): the page's Save sits at the top right and submits this form id. */
  /** card: on tablets and desktop the form shows its own Save in its card's footer and the bar's Save is hidden (review F4,
   * NV-102: Jose, "Save at the bottom of the card"); phones keep the bar's Save. */
  save?: { form: string; label?: string; disabled?: boolean; card?: boolean };
  /** Quiet (v4): a create page is a sheet: Cancel, the title in the bar, and the submit at the top right. */
  /** card: as save.card, for Cancel and the submit (the form shows both in its card's footer on tablets and desktop). */
  modal?: { cancelHref: string; form: string; submitLabel: string; disabled?: boolean; card?: boolean };
}) {
  // Quiet (v4, approved Oct 23): back and Save in the bar, the title, then the page. No band, no guidance column.
  // Release 1 (boards O-Locations, O-Breaks): on a phone the bar names the page ("‹ More   Locations") and the large
  // title is for screen readers only; tablets and desktop show the large title with the bar's action beside it.
  void _eyebrow; void _aside;
  return (
    // Owner premium A7: every Settings page is one column, so it takes the kit's 720px desktop width (c-page--narrow).
    <div className={className ? `q-page wc-page c-page--narrow ${className}` : "q-page wc-page c-page--narrow"} data-nv-page="" data-q-sheet={modal ? "" : undefined} data-wc-width={width} data-wc-crumb={settingsCrumb ? "settings" : undefined} data-wc-save={save?.card || modal?.card ? "card" : undefined}>
      {modal ? <QuietNav left={<Link className="q-nav__l q-nav__l--teal" href={modal.cancelHref}>Cancel</Link>} title={title}
          right={<button type="submit" form={modal.form} className="q-nav__r q-nav__r--b" disabled={modal.disabled}>{modal.submitLabel}</button>} />
        : back ? <QuietNav back={back} title={title} right={save ? <button type="submit" form={save.form} className="q-nav__r q-nav__r--b" disabled={save.disabled}>{save.label ?? "Save"}</button> : bandAside} />
        : <QuietBar>{save ? <button type="submit" form={save.form} className="q-nav__r q-nav__r--b" disabled={save.disabled}>{save.label ?? "Save"}</button> : bandAside}</QuietBar>}
      {modal ? <h1 className="q-sr">{title}</h1> : <QuietHeader title={title} sub={summary} />}
      <FocusClear />
      <PillTracks />
      <div className="wc-content">{children}</div>
    </div>
  );
}

export type NoticeTone = "done" | "urgent" | "info";

/** Phase 9 (spec 2.1, 2.2): the result stands on the page's canvas under the form's card, so it is the kit's notice card:
 * a white 22px card, the meaning's bold glyph in a 36px tinted circle (green done, red stop, teal information), a 600
 * title over a grey line, and its one action under the words. The words and the action are the callers'. A done notice
 * (the server confirmed the save) carries the app's one done mark, BDoneMark at its 36px row size, in place of the tinted circle. */
const noticeLook: Record<NoticeTone, { tone: BTone; meaning: BMeaning }> = {
  done: { tone: "green", meaning: "done" }, urgent: { tone: "red", meaning: "stop" }, info: { tone: "teal", meaning: "info" },
};

/** Feedback after an action: a short title and the sentence, in words (red only when something failed). */
export function Notice({ tone, title, children, action }: { tone: NoticeTone; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const look = noticeLook[tone];
  return (
    <div className="b-card wc-note" data-tone={tone}>
      <div className="b-notice">
        {tone === "done" ? <BDoneMark /> : <BIcon tone={look.tone}><BGlyph meaning={look.meaning} /></BIcon>}
        <span className="b-notice__tx">
          {title ? <span className="b-notice__t">{title}</span> : null}
          {children ? <span className="b-notice__s">{children}</span> : null}
          {action ? <span className="wc-note__act">{action}</span> : null}
        </span>
      </div>
    </div>
  );
}

/** A fact that isn't a field: a one-line row, label on the left and value on the right. */
export function Fact({ label, value, note }: { label: ReactNode; value: ReactNode; note?: ReactNode; icon?: ReactNode }) {
  return (
    <div className={note ? "q-row q-fact" : "q-row q-row--one q-fact"}>
      <span className="q-rt"><b>{label}</b>{note ? <i>{note}</i> : null}</span>
      <span className="q-rv q-rv--l">{value}</span>
    </div>
  );
}

/** Quiet (v4): guidance moved out of the pages; kept so callers compile. */
export function GuideCard(props: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  void props;
  return null;
}

/** Empty, no-match and unavailable states: one grey sentence and one action. */
export function EmptyState({ title, titleId, children, action, headingLevel = 2 }: {
  icon: ReactNode; title: ReactNode; titleId?: string; children: ReactNode; action?: ReactNode; headingLevel?: 2 | 3; tone?: "neutral" | "urgent";
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <div className="q-emptyblock wc-empty">
      <Heading className="q-emptyblock__title" id={titleId}>{title}</Heading>
      <p className="q-empty">{children}</p>
      {action ? <div className="q-emptyblock__action">{action}</div> : null}
    </div>
  );
}
