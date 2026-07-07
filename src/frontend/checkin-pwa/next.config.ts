import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // @ts-ignore
  allowedDevOrigins: [
    'endanger-boogeyman-seminar.ngrok-free.dev',
  ],
};

export default nextConfig;
