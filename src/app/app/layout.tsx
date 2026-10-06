import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { readNotificationConfig } from "@/lib/notifications/config";
import { getWorkspace } from "@/lib/data/workspaces";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  manifest: "/fuel-portal.webmanifest",
  appleWebApp: { capable: true, title: "NEVORA" },
  icons: { apple: [{ url: "/icons/fuel-apple-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#20232D" };

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const workspace = await getWorkspace();

  return (
    <AppShell
      key={session.id}
      workspaceName={workspace.name}
      notificationsEnabled={readNotificationConfig(process.env).featureEnabled}
      user={{
        firstName: session.firstName,
        lastName: session.lastName,
        role: session.role,
      }}
    >
      {children}
    </AppShell>
  );
}
