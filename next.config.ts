import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
};

export default nextConfig;

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
