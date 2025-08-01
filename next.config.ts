import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals = [...config.externals, 'canvas', 'jsdom'];
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['chartjs-node-canvas']
  }
};

export default nextConfig;
