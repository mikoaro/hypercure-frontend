import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ... any other config you have ...

  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // REMOVED: eslint block is no longer supported in Next.js 16
};

export default nextConfig;