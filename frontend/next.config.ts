import type { NextConfig } from "next";

const searxngProxyBase =
  process.env.SEARXNG_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_SEARXNG_BASE_URL ??
  "http://localhost:8080";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/searxng/:path*",
        destination: `${searxngProxyBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
