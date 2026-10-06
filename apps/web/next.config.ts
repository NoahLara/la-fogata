import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

// Lets a phone on the local network open the dev server (http://<this computer's address>:3000) and get its assets
// and hot reload. The computer's own network addresses are allowed by default; DEV_ORIGINS adds more (comma
// separated, for example a tunnel's host name). Dev server only; builds ignore it.
const ownAddresses = Object.values(networkInterfaces())
  .flat()
  .filter((entry) => entry?.family === "IPv4" && !entry.internal)
  .map((entry) => entry?.address ?? "");

const extra = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  transpilePackages: ["@fogata/shared"],
  allowedDevOrigins: [...ownAddresses.filter(Boolean), "*.local", ...extra],
  poweredByHeader: false,
};

export default nextConfig;
