import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The build cache retains original sources, including erased local-only code.
  // Keep production artifacts free of that source material as well as bundles.
  experimental: { turbopackFileSystemCacheForBuild: false },
  logging: {incomingRequests: {ignore: [/^\/api\/calendar\//]}},
  async headers() {
    const portal = ["/fuel-portal-sw.js", "/fuel-portal.webmanifest"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        ...(source.endsWith(".js") ? [{ key: "Content-Type", value: "application/javascript; charset=utf-8" }] : []),
      ],
    }));
    const clocker = ["/clocker/:path*", "/app/settings/clocker/:path*", "/api/clocker/:path*", "/forgot-access", "/reset-access", "/app/account-recovery", "/app/clocker-recovery"].map(source => ({
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
