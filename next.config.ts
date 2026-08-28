import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/hold",
        permanent: false,
      },
      {
        source: "/12-questions",
        destination: "/guide",
        permanent: false,
      },
      {
        source: "/questions",
        destination: "/guide",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
