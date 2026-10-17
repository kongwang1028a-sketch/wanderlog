import type { NextConfig } from "next";

const githubPages = process.env.GITHUB_PAGES === "1"
const basePath = process.env.BASE_PATH || ""

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  cacheComponents: !githubPages,
  partialPrefetching: !githubPages,
  ...(githubPages
    ? {
        output: "export" as const,
        distDir: "out",
        images: { unoptimized: true },
      }
    : {}),
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
