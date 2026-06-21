import type { NextConfig } from "next";

// Build identifier used for client-side stale-tab detection (see components/VersionWatcher).
// On Vercel this is the deploying commit SHA; locally it falls back to "dev" (no reloads).
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
};

export default nextConfig;
