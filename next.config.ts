import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // The parent folder contains another project's lockfile; pin the root to this app.
  turbopack: { root: path.resolve(__dirname) },
  // Native image library must not be bundled
  serverExternalPackages: ['sharp'],
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.devtunnels.ms",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: ["*.trycloudflare.com", "localhost:3000"],
    },
  },
};

export default nextConfig;
