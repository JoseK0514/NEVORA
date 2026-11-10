import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { OwnerOnlyNotice } from "@/components/owner-only-notice";
import { listEmployees } from "@/lib/data/employees";

/** Every Settings page is for Owners (each page still checks its own role). PD9 / UX10: anyone else who opens one by link
 * sees why, instead of landing on Home with no word. The page itself is never rendered for them. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  // Review B2 (NV-137): the notice names the workspace's Owners, who can change a setting for this person.
  if (session.role !== "OWNER") {
    const owners = await listEmployees().then(list => list.filter(employee => employee.role === "OWNER" && employee.active !== false).map(employee => `${employee.firstName} ${employee.lastName}`.trim())).catch(() => []);
    return <OwnerOnlyNotice title="Settings" reason="Settings are for Owners" help="Ask an Owner if you need a change here." ownersCan="change a setting for you" owners={owners} />;
  }
  return children;
}
