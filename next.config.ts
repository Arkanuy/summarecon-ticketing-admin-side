import type { NextConfig } from "next";

/** CORS ditangani src/middleware.ts supaya Origin yang diizinkan bisa dipantulkan. */
const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  /*
   * Next 16 memblokir resource dev (HMR, chunk) yang diminta dari host selain
   * "localhost". Tanpa daftar ini, membuka http://127.0.0.1:3001 membuat hidrasi
   * GAGAL diam-diam: React tidak memasang handler, dan form login jatuh ke submit
   * GET bawaan browser sehingga password masuk ke URL dan log. Hanya berlaku di dev.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
