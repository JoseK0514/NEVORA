import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireSession } from "@/lib/auth/session";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();

  return (
    <AppShell
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
