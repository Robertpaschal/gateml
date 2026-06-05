import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In dev, proxy /api/* → backend. In prod, set NEXT_PUBLIC_API_URL.
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
