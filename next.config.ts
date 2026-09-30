import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import pkg from "./package.json";

// Short commit of this build: Cloudflare Workers Builds sets WORKERS_CI_COMMIT_SHA;
// locally fall back to git.
function commit() {
  try {
    return (process.env.WORKERS_CI_COMMIT_SHA ?? execSync("git rev-parse HEAD").toString()).trim().slice(0, 7);
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_COMMIT: commit(),
  },
  experimental: {
    // Receipts/manuals are uploaded through server actions; the bucket caps files at 20MB.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
