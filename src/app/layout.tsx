import type { Metadata } from "next";
import type { ReactNode } from "react";
import { NUVORA_BRAND } from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: NUVORA_BRAND.metadataTitle,
  description: NUVORA_BRAND.metadataDescription,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
