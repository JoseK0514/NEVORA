import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NUVORA_BRAND } from "../lib/brand";
import "./globals.css";
import "./typeface-theme.css";
import "./mobile-workforce.css";
import "./employee-mobile-corporate.css";

export const metadata: Metadata = {
  title: NUVORA_BRAND.metadataTitle,
  description: NUVORA_BRAND.metadataDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  if(process.env.NODE_ENV!=='production')await (await import('../lib/dev/inspection.server')).forceInspectionError('global');
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
