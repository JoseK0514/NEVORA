import { WholeWordHeading } from "@/components/whole-word-heading";
import type { ReactNode } from "react";
import { CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import "./settings-corp.css";
import "./settings-b.css";

/* Settings in Direction B (Nov 23, 2026). The pages under Settings use the same frame, cards and rows as Settings itself:
 * the corporate kit that the Direction B layers dress (band, white raised cards, 36px icon circles, outlined fields, the
 * solid teal button). On a phone the band carries "‹ Settings" and the page's title (CorpNav, phone only); on tablets
 * and desktop the large title sits on the band (CorpTitle, wide). Presentation only: every page keeps its own reads,
 * checks and actions. */

export type SettingsBack = { href: string; label: ReactNode; ariaLabel?: string };

export function SettingsPageB({ title, wideTitle, titleId = "settings-page-title", back: givenBack, sub, phoneRight, actions, className, lang, children }: {
  title: ReactNode;
  /** Tablets and desktop only: the band's title when it differs from the phone's (a section with tabs names the section,
   * and the selected tab names the page). Defaults to `title`. */
  wideTitle?: ReactNode;
  titleId?: string;
  /** Where the phone band's back link goes; Settings, unless the page sits under another Settings page. `null`: no back
   * link (an in-page editor whose Cancel is its way out). */
  back?: SettingsBack | null;
  /** One grey line under the title (tablets and desktop; the phone band keeps the title alone). */
  sub?: ReactNode;
  /** The phone band's one action (Save, Add), right of the title. */
  phoneRight?: ReactNode;
  /** Tablets and desktop: an action on the title's row. */
  actions?: ReactNode;
  className?: string;
  /** The page's language when it differs from the app's ("es"). */
  lang?: string;
  children: ReactNode;
}) {
  // Signed-in Spanish: the default way back is named in the page's language.
  const back = givenBack === undefined ? { href: "/app/settings", label: lang === "es" ? "Configuración" : "Settings" } : givenBack;
  return (
    <CorpPage className={className ? `c-page--narrow c-setb ${className}` : "c-page--narrow c-setb"} labelledBy={titleId} lang={lang}>
      <CorpNav back={back ?? undefined} title={lang === "es" && typeof title === "string" ? <WholeWordHeading text={title} /> : title} titleId={`${titleId}-nav`} right={phoneRight} phoneOnly />
      <CorpTitle id={titleId} title={wideTitle ?? title} sub={sub} actions={actions} wide />
      {children}
    </CorpPage>
  );
}
