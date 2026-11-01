import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

/** Owner premium P2 (Oct 31): "Add to Home Screen" from the sign-in page installs the app, not a bare bookmark: the same
 * manifest, NEVORA wordmark icon, title and white chrome as the signed-in app. Kept out of the root layout so the Clocker
 * keeps its own Home Screen identity. */
export const metadata: Metadata = {
  manifest: "/fuel-portal.webmanifest",
  appleWebApp: { capable: true, title: "NEVORA" },
  icons: { apple: [{ url: "/icons/fuel-apple-180.png", sizes: "180x180", type: "image/png" }] },
};

export const viewport: Viewport = { themeColor: "#FFFFFF" };

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
