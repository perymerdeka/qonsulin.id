import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@uiw/react-md-editor', '@uiw/react-markdown-preview'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "qonsulin.id" },
      { protocol: "https", hostname: "res.cloudinary.com" }
    ]
  }
};

export default nextConfig;
