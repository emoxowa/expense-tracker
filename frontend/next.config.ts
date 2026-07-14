import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Позволяет использовать пакет @expence-tracker/shared из монорепо напрямую.
  transpilePackages: ['@expence-tracker/shared'],
};

export default nextConfig;
