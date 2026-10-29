import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // The build cache retains original sources, including erased local-only code.
  // Keep production artifacts free of that source material as well as bundles.
  experimental: { turbopackFileSystemCacheForBuild: false },
  logging: {incomingRequests: {ignore: [/^\/api\/calendar\//, /^\/(?:api\/auth\/)?activate(?:[/?]|$)/]}},
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
    const activation = ['/activate', '/api/auth/activate'].map(source => ({
      source,
      headers: [
        {key:'Cache-Control',value:'no-store, private'},
        {key:'Referrer-Policy',value:'no-referrer'},
        {key:'X-Content-Type-Options',value:'nosniff'},
        {key:'X-Frame-Options',value:'DENY'},
        {key:'Content-Security-Policy',value:[
          "default-src 'self'", "script-src 'self' 'unsafe-inline'"+(process.env.NODE_ENV==='development'?" 'unsafe-eval'":''),
          "style-src 'self' 'unsafe-inline'", "img-src 'self' data:", "font-src 'self'", "connect-src 'self'",
          "form-action 'self'", "base-uri 'none'", "object-src 'none'", "frame-ancestors 'none'",
        ].join('; ')},
      ],
    }));
    return [...portal, ...clocker, ...activation];
  },
};

export default nextConfig;
