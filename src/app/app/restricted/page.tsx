import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { OwnerOnlyNotice } from "@/components/owner-only-notice";
import type { UserRole } from "@/lib/domain";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import type { PortalLang } from "@/lib/i18n/portal-lang";
import { ROUTE_PAGES_COPY } from "../route-pages-copy";

/** A Manager only lands here from an Owner's page; an Employee or Lead from an Owner's or Manager's page. */
function restrictedTitle(role: UserRole, lang: PortalLang = "en") {
  const t = ROUTE_PAGES_COPY[lang].restricted;
  return role === "MANAGER" ? t.managerTitle : t.otherTitle;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: restrictedTitle((await requireSession()).role, await readPageLang()) };
}

/** Review Nov 14 (AR-18, RA-7): where `requireRoles` sends a signed-in person whose role cannot open a page (an old link,
 * a bookmark). It says who the page is for and how to get access, in the notice Payroll and Settings already use, in
 * place of a silent move to Home. It reads nothing but the session, and it grants nothing: the closed page was never
 * rendered. */
export default async function RestrictedPage() {
  const session = await requireSession();
  const lang = await readPageLang(), t = ROUTE_PAGES_COPY[lang].restricted;
  // Phase 3 (MG-015): a Manager sees the one state screen at every width. Phase 4 (EM-019): an Employee or Lead does too,
  // so the way on is the tinted pill on every closed page.
  return <OwnerOnlyNotice state lang={lang} title={restrictedTitle(session.role, lang)} help={t.help} next={{ href: "/app", label: t.home }} />;
}
