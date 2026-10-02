import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fogata/shared"],
  // Lets a phone on the local network load the dev server's assets and HMR. Dev server only; builds ignore it.
  allowedDevOrigins: ["192.168.1.12"],
};

export default nextConfig;
