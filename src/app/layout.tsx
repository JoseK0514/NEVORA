import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NUVORA_BRAND } from "../lib/brand";
import "./globals.css";
import "./typeface-theme.css";

export const metadata: Metadata = {
  title: NUVORA_BRAND.metadataTitle,
  description: NUVORA_BRAND.metadataDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
