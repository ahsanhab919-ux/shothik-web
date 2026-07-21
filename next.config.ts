import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

// Standalone repo extraction: the app root is the repository root here.
const turbopackRoot = fileURLToPath(new URL("./", import.meta.url));
const externalApiOrigin =
  (process.env.NEXT_PUBLIC_API_URL || "https://shothik.work").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker image (only .next/standalone is needed in runner)
  output: "standalone",
  // Enable React Compiler for automatic memoization (React 19)
  reactCompiler: true,
  serverExternalPackages: ["pdf-parse", "@llamaindex/liteparse"],
  turbopack: {
    root: turbopackRoot,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        // Restrict Convex image serving to /files/** path to prevent open-redirect abuse
        protocol: "https",
        hostname: "*.convex.site",
        pathname: "/files/**",
      },
      {
        protocol: "https",
        hostname: "www.google.com",
        pathname: "/s2/favicons/**",
      },
    ],
  },
  allowedDevOrigins: [
    "localhost",
    "localhost:5000",
    "127.0.0.1",
    "127.0.0.1:5000",
    "0.0.0.0",
    "0.0.0.0:5000",
    "*.replit.dev",
    "*.replit.app",
    "*.pike.replit.dev",
    "*.spock.replit.dev",
    "*.kirk.replit.dev",
  ],
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: "/api/:path*",
          destination: `${externalApiOrigin}/api/:path*`,
        },
        {
          source: "/paraphrase/:path*",
          destination: `${externalApiOrigin}/paraphrase/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
