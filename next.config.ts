import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/hold",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
