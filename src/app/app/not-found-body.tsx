'use client';
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { BButtonLink, BState, BStateScreen } from "@/components/owner-b/b-kit";
import { usePortalLang } from "@/lib/i18n/portal-lang";
import { SHELL_WORDS, navLabel } from "@/components/shell-copy";

/** The signed-in 404's band and card (see not-found.tsx), in the person's language. */
export function NotFoundBody() {
  const lang = usePortalLang(), W = SHELL_WORDS[lang];
  return <BStateScreen title={W.pageNotFound} titleId="not-found-title" back={{ href: "/app", label: navLabel("Home", lang) }}>
    <BState kind="empty" icon={<MagnifyingGlassIcon weight="bold" />} title={W.notFoundTitle} line={W.notFoundLine}>
      <div className="b-state-actions b-closed-actions">
        <BButtonLink href="/app" kind="teal">{W.goHome}</BButtonLink>
        <Link className="b-closed-also" href="/app/schedule">{W.openSchedule}</Link>
      </div>
    </BState>
  </BStateScreen>;
}
