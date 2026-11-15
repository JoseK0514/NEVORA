import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/session";
import { OwnerOnlyNotice } from "@/components/owner-only-notice";
import type { UserRole } from "@/lib/domain";

/** A Manager only lands here from an Owner's page; an Employee or Lead from an Owner's or Manager's page. */
function restrictedTitle(role: UserRole) {
  return role === "MANAGER" ? "That page is for Owners" : "That page is for Owners and Managers";
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: restrictedTitle((await requireSession()).role) };
}

/** Review Nov 14 (AR-18, RA-7): where `requireRoles` sends a signed-in person whose role cannot open a page (an old link,
 * a bookmark). It says who the page is for and how to get access, in the notice Payroll and Settings already use, in
 * place of a silent move to Home. It reads nothing but the session, and it grants nothing: the closed page was never
 * rendered. */
export default async function RestrictedPage() {
  const session = await requireSession();
  return <OwnerOnlyNotice title={restrictedTitle(session.role)} help="Ask your Owner if you need access." next={{ href: "/app", label: "Go to Home" }} />;
}
