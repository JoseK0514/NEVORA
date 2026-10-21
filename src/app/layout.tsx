import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NUVORA_BRAND } from "../lib/brand";
import "./globals.css";
import "./typeface-theme.css";
import "./mobile-workforce.css";
import "./employee-mobile-corporate.css";
import "../components/signature/components.css";

export const metadata: Metadata = {
  title: NUVORA_BRAND.metadataTitle,
  description: NUVORA_BRAND.metadataDescription,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const TEXT_SCALE_SCRIPT = `(function(){var d=document.documentElement;function s(){var f=parseFloat(getComputedStyle(d).fontSize)||16;d.style.setProperty('--nv-text-scale',String(f/16));var p=f/16*100,n=[100,125,150,200].reduce(function(a,b){return Math.abs(b-p)<Math.abs(a-p)?b:a;});d.setAttribute('data-text-step',String(n));}s();function w(){try{var p=document.createElement('i');p.setAttribute('aria-hidden','true');p.style.cssText='position:absolute;left:0;top:0;width:1rem;height:0;visibility:hidden;pointer-events:none';document.body.appendChild(p);new ResizeObserver(s).observe(p);}catch(e){}}if(document.body)w();else document.addEventListener('DOMContentLoaded',w);})();`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  if(process.env.NODE_ENV!=='production')await (await import('../lib/dev/inspection.server')).forceInspectionError('global');
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* P3-ST-20: loading placeholders grow with the reader's text size like the pages they stand in for. This tells CSS the
            text scale (root font size ÷ 16) and its nearest measured step (100, 125, 150 or 200%) before first paint, and again whenever the text size changes. Nothing else. */}
        <script dangerouslySetInnerHTML={{ __html: TEXT_SCALE_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
