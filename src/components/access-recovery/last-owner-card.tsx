"use client";

import type { Ref } from "react";
import Link from "next/link";
import { CrownSimpleIcon } from "@phosphor-icons/react/dist/ssr/CrownSimple";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import type { AuthLang } from "@/lib/auth-copy";
import { BButtonLink, BState } from "@/components/owner-b/b-kit";
import { ACCESS_COPY } from "./copy";
import { SupportReference } from "./support-reference";
import "./access-recovery.css";

/** The server refused a personal deletion with LAST_OWNER (contract "Personal deletion and workplace closure"): no
 * request was created and no session ended. A calm state card, not an error: why a workplace needs an Owner, that
 * nothing was deleted, and the two real paths. Path one is a deliberate retry after another Owner can sign in; path two
 * is the existing support address for the separate company closure, which writing to us does not perform by itself.
 * It never shows a `DEL-…` reference: there is no request. */
export function LastOwnerCard({ supportEmail, teamHref = "/app/employees", keepHref = "/app/profile", lang = "en", outcomeRef, supportReference = null }: {
  supportEmail: string;
  /** Where another Owner is added or their invitation is sent again. Null when the reader can't reach it. */
  teamHref?: string | null; keepHref?: string; lang?: AuthLang; outcomeRef?: Ref<HTMLDivElement>;
  /** The reference of this one refusal, when the server gave one (none today). */
  supportReference?: string | null;
}) {
  const t = ACCESS_COPY[lang].lastOwner;
  const mail = `mailto:${supportEmail}?subject=${encodeURIComponent(t.closeSubject)}`;
  return <section className="ar-lastowner" aria-labelledby="last-owner-title" lang={lang === "en" ? undefined : lang}>
    <div className="b-card ar-lastowner__card" ref={outcomeRef} tabIndex={-1} role="status" aria-labelledby="last-owner-title" aria-describedby="last-owner-why last-owner-safe">
      <BState kind="paused" silent icon={<CrownSimpleIcon weight="bold" />} title={<span id="last-owner-title">{t.title}</span>} line={<span id="last-owner-why">{t.why}</span>}>
        <p className="ar-safe" id="last-owner-safe"><CheckCircleIcon size={16} weight="bold" aria-hidden="true" /><span>{t.nothing}</span></p>
      </BState>
      <h2 className="ar-lastowner__label" id="last-owner-paths">{t.pathsLabel}</h2>
      <ol className="ar-paths" aria-labelledby="last-owner-paths">
        <li className="ar-path">
          <span className="ar-path__n" aria-hidden="true">1</span>
          <div className="ar-path__main"><h3>{t.addTitle}</h3><p>{t.addBody}</p>
            {teamHref ? <BButtonLink href={teamHref} kind="teal">{t.addAction}</BButtonLink> : null}</div>
        </li>
        <li className="ar-path">
          <span className="ar-path__n" aria-hidden="true">2</span>
          <div className="ar-path__main"><h3>{t.closeTitle}</h3><p>{t.closeBody}</p>
            <a className="b-btn b-btn--ghost" href={mail}>{t.closeAction}</a>
            <p className="ar-path__mail">{supportEmail}</p></div>
        </li>
      </ol>
      <SupportReference reference={supportReference} lang={lang} id="last-owner-reference" />
    </div>
    <Link className="ar-quiet" href={keepHref}>{t.keep}</Link>
  </section>;
}
