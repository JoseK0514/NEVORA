import "./portal-design-system.css";
import {cookies} from "next/headers";
import {createHash} from "node:crypto";
import {employeeViewAuthority} from "@/lib/employee-view-authority.server";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { readNotificationConfig } from "@/lib/notifications/config";
import { getWorkspace } from "@/lib/data/workspaces";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { payrollFeatureEnabled, readPayrollCapabilities } from '@/lib/payroll/service';
import {readOperationalAuthority} from '@/lib/company-access/operational-scope.server';

export const metadata: Metadata = {
  manifest: "/fuel-portal.webmanifest",
  appleWebApp: { capable: true, title: "NEVORA" },
  icons: { apple: [{ url: "/icons/fuel-apple-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#20232D" };

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const workspace = await getWorkspace();
  const proof = await requireSessionMutationProof();
  const [operationalAuthority,payrollCapabilities]=await Promise.all([readOperationalAuthority(proof),payrollFeatureEnabled()?readPayrollCapabilities(proof):Promise.resolve(undefined)]);
  const preferenceCookie = "nevora_sidebar_" + createHash("sha256").update(workspace.id + ":" + session.id).digest("hex").slice(0,16);
  const initialCollapsed = (await cookies()).get(preferenceCookie)?.value === "collapsed";
  return (
    <AppShell
      key={session.id}
      workspaceName={workspace.name}
      initialCollapsed={initialCollapsed}
      preferenceCookie={preferenceCookie}
      notificationAuthority={employeeViewAuthority(proof,"notifications")}
      notificationsEnabled={readNotificationConfig(process.env).featureEnabled}
      payrollCapabilities={payrollCapabilities}
      operationalAuthority={operationalAuthority}
      user={{
        id: session.id,
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
      }}
    >
      {children}
    </AppShell>
  );
}
