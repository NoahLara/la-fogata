import type { NextConfig } from "next";

// Lets a phone on the local network load the dev server's assets and HMR: set DEV_ORIGINS to its address (comma
// separated), for example DEV_ORIGINS=192.168.1.12. Dev server only; builds ignore it.
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  transpilePackages: ["@fogata/shared"],
  allowedDevOrigins: devOrigins,
  poweredByHeader: false,
};

export default nextConfig;
