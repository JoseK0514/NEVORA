import type { ReactNode } from "react";
import { CorpNav, CorpPage, CorpTitle } from "@/components/corp/corp";
import "./settings-corp.css";
import "./settings-b.css";

/* Settings in Direction B (Nov 23, 2026). The pages under Settings use the same frame, cards and rows as Settings itself:
 * the corporate kit that the Direction B layers dress (band, white raised cards, 36px icon circles, outlined fields, the
 * solid teal button). On a phone the band carries "‹ Settings" and the page's title (CorpNav, phone only); on tablets
 * and desktop the large title sits on the band (CorpTitle, wide). Presentation only: every page keeps its own reads,
 * checks and actions. */

export type SettingsBack = { href: string; label: string };

export function SettingsPageB({ title, titleId = "settings-page-title", back = { href: "/app/settings", label: "Settings" }, sub, phoneRight, actions, className, children }: {
  title: ReactNode;
  titleId?: string;
  /** Where the phone band's back link goes; Settings, unless the page sits under another Settings page. */
  back?: SettingsBack;
  /** One grey line under the title (tablets and desktop; the phone band keeps the title alone). */
  sub?: ReactNode;
  /** The phone band's one action (Save, Add), right of the title. */
  phoneRight?: ReactNode;
  /** Tablets and desktop: an action on the title's row. */
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <CorpPage className={className ? `c-page--narrow c-setb ${className}` : "c-page--narrow c-setb"} labelledBy={titleId}>
      <CorpNav back={back} title={title} titleId={`${titleId}-nav`} right={phoneRight} phoneOnly />
      <CorpTitle id={titleId} title={title} sub={sub} actions={actions} wide />
      {children}
    </CorpPage>
  );
}
