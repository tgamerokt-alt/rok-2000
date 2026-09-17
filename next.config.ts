import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Default position (bottom-left) sits right on top of our sidebar's
  // language switcher — move it out of the way.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
