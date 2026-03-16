import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All pages are client-rendered — static export for single-port deployment
  output: "export",
  // Trailing slashes for static file serving compatibility
  trailingSlash: true,
};

export default nextConfig;
