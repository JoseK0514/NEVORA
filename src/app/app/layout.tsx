import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { readNotificationConfig } from "@/lib/notifications/config";
import { requireSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  manifest: "/fuel-portal.webmanifest",
  appleWebApp: { capable: true, title: "Nuvora" },
  icons: { apple: [{ url: "/icons/fuel-apple-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#20232D" };

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell
      key={session.id}
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
