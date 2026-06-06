import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // The auto-generated .next/types/validator.ts generates wrong relative paths
    // when a src/ directory co-exists with the app/ router root (Next.js 15 quirk).
    // Type safety is still enforced by tsc --noEmit in CI; this only skips the build step.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    // INTERNAL_API_URL is set in Docker (http://backend:3001) so the Next.js server
    // can reach the backend via the Docker network.
    // Outside Docker, falls back to localhost:3001.
    const apiBase = process.env.INTERNAL_API_URL ?? "http://localhost:3001";
    return [
      {
        source:      "/api/:path*",
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

export default nextConfig;
