import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return ["/fuel-portal-sw.js", "/fuel-portal.webmanifest"].map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        ...(source.endsWith(".js") ? [{ key: "Content-Type", value: "application/javascript; charset=utf-8" }] : []),
      ],
    }));
  },
};

export default nextConfig;
