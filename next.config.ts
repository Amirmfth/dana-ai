import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
   allowedDevOrigins: [
    "192.168.1.119",
    "192.168.1.165"
  ],
};

export default nextConfig;
