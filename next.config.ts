import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  /** Hide the corner “N” / Issues / Turbopack panel in local dev (not shown in production builds). */
  devIndicators: false,
};

export default nextConfig;
