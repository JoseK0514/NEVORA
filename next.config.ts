import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    const portal = ["/fuel-portal-sw.js", "/fuel-portal.webmanifest"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        ...(source.endsWith(".js") ? [{ key: "Content-Type", value: "application/javascript; charset=utf-8" }] : []),
      ],
    }));
    const clocker = ["/clocker/:path*", "/app/settings/clocker/:path*", "/api/clocker/:path*"].map(source => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-store, private" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        { key: "X-Content-Type-Options", value: "nosniff" },
      ],
    }));
    return [...portal, ...clocker];
  },
};

export default nextConfig;
