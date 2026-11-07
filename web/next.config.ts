import type { NextConfig } from "next";

// The browser talks only to this origin; /api/* is proxied to the FastAPI backend.
const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
