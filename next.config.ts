import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // Handle React Native dependencies that don't exist in web environment
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "react-native": false,
      "react-native-fs": false,
      "react-native-get-random-values": false,
      "react-native-keychain": false,
    };

    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Exclude demo folder from build
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  experimental: {
    // Exclude the demo folder from TypeScript compilation
    typedRoutes: false,
  },
};

export default nextConfig;