import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LocalStorage owns learning state; API credentials remain in Node route handlers.
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
