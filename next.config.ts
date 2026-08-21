import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'amcvauzaplpftsgnhwrb.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    localPatterns: [
      {
        pathname: '/api/google-places/photo',
      },
    ],
  },
};

export default nextConfig;
