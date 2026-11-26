import { routeTitle } from "@/app/app/route-titles";
import { requireRoles } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { PoliciesScreen } from "@/components/time-off-admin/policies-screen";
import "../settings-corp.css";

export const generateMetadata = routeTitle("timeOffPolicies");

/* PTO screens (Nov 20, 2026): Settings › Time off policies. Owner only (the Settings layout closes it to everyone else);
 * the policies are read and saved in the browser through /api/workforce/settings, which checks the Owner on every write. */
export default async function TimeOffPoliciesPage() {
  await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  let lang: "en" | "es" = "en";
  try { lang = (await readPortalLanguage(proof)).language; } catch { /* English */ }
  return <PoliciesScreen lang={lang} />;
}
