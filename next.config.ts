import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Receipts/manuals are uploaded through server actions; the bucket caps files at 20MB.
    serverActions: { bodySizeLimit: "21mb" },
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
