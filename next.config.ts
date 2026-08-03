import type { NextConfig } from "next";
import { getSecurityHeaders, type SecurityEnvironment } from "./src/server/http/security-headers";

const environment: SecurityEnvironment = process.env.NODE_ENV === "development" ? "development" : "production";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders({ environment }),
      },
    ];
  },
};

export default nextConfig;
