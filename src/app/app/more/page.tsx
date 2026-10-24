import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollFeatureEnabled, readPayrollCapabilities } from "@/lib/payroll/service";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { navigationForRole } from "@/lib/navigation";
import { isManagerRole } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { QuietHeader, QuietList, QuietPage, QuietRow } from "@/components/quiet/quiet";

export const metadata = { title: "More" };

/** Quiet (v4): More is a page. Work first (time, pay, updates), then the account. Only destinations the role has. */
const WORK = ["/app/timecards", "/app/payroll", "/app/reports", "/app/updates", "/app/my-pay"];
const ACCOUNT = ["/app/settings", "/app/profile"];

export default async function MorePage() {
  const session = await requireSession();
  if (!isManagerRole(session.role)) redirect("/app");
  const proof = await requireSessionMutationProof();
  const [operational, payroll, brand] = await Promise.all([
    readOperationalAuthority(proof),
    payrollFeatureEnabled() ? readPayrollCapabilities(proof) : Promise.resolve(undefined),
    currentBrand(),
  ]);
  const navigation = navigationForRole(session.role, payroll, { operational, modules: brand.modules, words: wordPreset(brand.words).en, ownerAdvisorEnabled: process.env.NEVORA_OWNER_ADVISOR_ENABLED === "true" });
  const item = (href: string) => navigation.find(entry => entry.href === href);
  const work = WORK.map(item).filter(entry => entry !== undefined);
  const account = ACCOUNT.map(item).filter(entry => entry !== undefined);
  return <QuietPage>
    <div className="q-bar" aria-hidden="true" />
    <QuietHeader title="More" />
    {work.length ? <QuietList label="Work" style={{ marginTop: 16 }}>
      {work.map(entry => <QuietRow key={entry.href} href={entry.href} title={entry.label} />)}
    </QuietList> : null}
    <QuietList label="Account" style={{ marginTop: 32 }}>
      {account.map(entry => <QuietRow key={entry.href} href={entry.href} title={entry.label} />)}
      <QuietRow href="/support" title="Support" />
    </QuietList>
  </QuietPage>;
}
