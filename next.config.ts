import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview proxy origin to load /_next/* dev assets
  allowedDevOrigins: ["preview-chat-a898bc5e-9073-42d0-98e3-d8bc4779a24a.space-z.ai"],
};

export default nextConfig;
