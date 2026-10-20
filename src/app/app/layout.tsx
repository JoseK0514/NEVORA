import "./portal-design-system.css";
import "./portal-refinement.css";
import "./portal-gusto.css";
import "./portal-desktop.css";
import "./portal-motion.css";
import "@/components/kit/kit.css";
import "./portal-premium.css";
// One stylesheet per parallel session (Oct 19), loaded after the shared premium layer.
import "./premium-profile.css";
import "./premium-wave-a.css";
import "./premium-wave-b.css";
import "./premium-wave-c.css";
import "./premium-desktop.css";
// Clean Manager and Owner app (v3): loaded last, scoped to those roles by the shell's data-nv-clean.
import "./premium-clean-manager.css";
import "./clean-manager/schedule.css";
import "./clean-manager/timecards.css";
import "./clean-manager/insights.css";
import "./clean-manager/updates.css";
import "./clean-manager/notifications.css";
import {cookies} from "next/headers";
import {createHash} from "node:crypto";
import {employeeViewAuthority} from "@/lib/employee-view-authority.server";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { preload } from "react-dom";
import { AppShell } from "@/components/app-shell";
import { readNotificationConfig } from "@/lib/notifications/config";
import { getWorkspace } from "@/lib/data/workspaces";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import { currentBrand } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { DEFAULT_TOKENS } from "@/lib/workspace-presentation/derive";
import { PasskeyOffer } from "@/components/passkeys/passkey-offer";

export const metadata: Metadata = {
  manifest: "/fuel-portal.webmanifest",
  appleWebApp: { capable: true, title: "NEVORA" },
  icons: { apple: [{ url: "/icons/fuel-apple-180.png", sizes: "180x180", type: "image/png" }] },
};

/** The browser chrome follows the company header colour (B1). */
export async function generateViewport(): Promise<Viewport> {
  return { themeColor: (await currentBrand()).tokens?.masthead ?? DEFAULT_TOKENS.masthead };
}

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  // Wave C ST-11: fetch Inter with the page, so the first visit doesn't paint in a fallback font and then rewrap.
  preload("/fonts/typeface/inter/variable.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  const session = await requireSession();
  const workspace = await getWorkspace();
  const payrollCapabilities = payrollFeatureEnabled() ? await readPayrollCapabilities(await requireSessionMutationProof()) : undefined;

  const proof = await requireSessionMutationProof();
  const preferenceCookie = "nevora_sidebar_" + createHash("sha256").update(workspace.id + ":" + session.id).digest("hex").slice(0,16);
  const initialCollapsed = (await cookies()).get(preferenceCookie)?.value === "collapsed";
  const brand = await currentBrand();
  return (
    <AppShell
      key={session.id}
      workspaceName={workspace.name}
      initialCollapsed={initialCollapsed}
      preferenceCookie={preferenceCookie}
      notificationAuthority={employeeViewAuthority(proof,"notifications")}
      notificationsEnabled={readNotificationConfig(process.env).featureEnabled}
      payrollCapabilities={payrollCapabilities}
      brand={{ style: brand.style, logoUrl: brand.logoUrl }}
      presentation={{ modules: brand.modules, words: wordPreset(brand.words).en }}
      user={{
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
      }}
    >
      {children}
      {/* Face ID offer after a password sign-in (hidden unless NEXT_PUBLIC_NEVORA_PASSKEYS=on). */}
      <PasskeyOffer />
    </AppShell>
  );
}
