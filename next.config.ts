import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Short commit of this build: Cloudflare Workers Builds sets WORKERS_CI_COMMIT_SHA;
// a local production build falls back to git. `next dev` shows "dev" because the
// running code usually isn't a commit yet (and this file is only read at startup).
function commit() {
  if (process.env.NODE_ENV === "development") return "dev";
  try {
    return (process.env.WORKERS_CI_COMMIT_SHA ?? execSync("git rev-parse HEAD").toString()).trim().slice(0, 7);
  } catch {
    return "";
  }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_COMMIT: commit() },
  // Accounts are created by the first Google/Discord login on /login.
  async redirects() {
    return [{ source: "/signup", destination: "/login", permanent: true }];
  },
  experimental: {
    // Receipts/manuals are uploaded through server actions; the bucket caps files at 20MB.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
