import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Pins the workspace root to this project's own directory — needed while
  // this folder lives nested inside another Node project (which has its own
  // lockfile), so Turbopack doesn't guess the wrong root. Harmless once this
  // folder is moved out on its own; there'd be no other lockfile to confuse it.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
