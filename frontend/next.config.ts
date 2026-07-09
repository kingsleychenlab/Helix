import type { NextConfig } from "next";
import path from "node:path";

const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  // Pin the workspace/tracing root to this folder. Without this, Next walks up
  // the directory tree (into ~/Desktop) which can be permission-restricted.
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
