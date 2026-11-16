import { notFound } from "next/navigation";
import { readFeatureFlags } from "@/lib/feature-flags";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { readOperationalAuthority, withOperationalCompany } from "@/lib/company-access/operational-scope.server";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import { getWorkspace } from "@/lib/data/workspaces";
import { listLocations } from "@/lib/data/locations";
import { coverageUuid } from "@/lib/owner-advisor/coverage-actions";
import { CorpCard, CorpPage, CorpTitle } from "@/components/corp/corp";
import { BState } from "@/components/owner-b/b-kit";
import { WeeklyPage } from "@/components/owner-advisor/weekly/weekly-page";

export const metadata = { title: "Weekly plan" };

/* Rondo's weekly plan (contract docs/handoffs/2026-11-16-rondo-weekly-ui-contract.md in Codex's candidate). The page is
 * behind the parent adviser's door: a company-wide Owner with NEVORA_OWNER_ADVISOR_ENABLED. With the weekly switch off it
 * still opens, for checking an approval already made; new comparisons and approvals are off. The API decides every read
 * and action; this page only reads the workspace's zone and active locations through the existing company read. */
export default async function WeeklyPlanPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  if (session.role !== "OWNER" || !readFeatureFlags(process.env).ownerAdvisor) notFound();
  const proof = await requireSessionMutationProof();
  const authority = await readOperationalAuthority(proof);
  if (authority.state !== "ready" || authority.role !== "OWNER" || authority.scope?.mode !== "COMPANY") notFound();
  // The registry gains `ownerAdvisorWeekly` at assembly; until then the exact server name is read here, never enabled.
  const weeklyEnabled = process.env.NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED === "true";
  const params = await searchParams;
  const review = typeof params.review === "string" && coverageUuid(params.review) ? params.review.toLowerCase() : null;
  const read = await withOperationalCompany(proof, async () => Promise.all([getWorkspace(), listLocations()]));
  if (read.state !== "ready") return <CorpPage className="c-page--narrow" labelledBy="wk-title">
    <CorpTitle id="wk-title" title="Weekly plan" />
    <CorpCard as="div"><BState kind="failed" alert title="Couldn’t open weekly planning" line="Your access or the connection changed. Check it, then try again." action={{ label: "Try again", href: review ? `/app/ai-manager/weekly?review=${review}` : "/app/ai-manager/weekly" }} /></CorpCard>
  </CorpPage>;
  const [workspace, locations] = read.data;
  return <WeeklyPage timeZone={workspace.timeZone} currentWeek={weekStartFor(businessDate(new Date(), workspace.timeZone))}
    locations={locations.map(location => ({ id: location.id, name: location.name }))} weeklyEnabled={weeklyEnabled} reviewId={review} />;
}
