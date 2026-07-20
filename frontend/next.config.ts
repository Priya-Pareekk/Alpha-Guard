import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "export",
  env: {
    NEXT_PUBLIC_API_URL: "https://alpha-guard-backend.onrender.com",
  },
};

export default nextConfig;