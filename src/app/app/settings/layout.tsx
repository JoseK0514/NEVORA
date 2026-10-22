import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { OwnerOnlyNotice } from "@/components/owner-only-notice";

/** Every Settings page is for Owners (each page still checks its own role). PD9 / UX10: anyone else who opens one by link
 * sees why, instead of landing on Home with no word. The page itself is never rendered for them. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  if (session.role !== "OWNER") return <OwnerOnlyNotice title="Settings" reason="Only Owners can open Settings." />;
  return children;
}
