import type { NextConfig } from "next";

// The browser talks only to this origin; /api/* is proxied to the FastAPI backend.
const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  // The proxy's default 30 s timeout is too short for speech generated on a laptop GPU.
  experimental: { proxyTimeout: 120_000 },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
