import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LiveKit server SDK uses Node.js crypto — exclude from browser bundle
  serverExternalPackages: ['livekit-server-sdk'],
};

export default nextConfig;
