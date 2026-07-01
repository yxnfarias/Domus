// Allow Node.js to accept self-signed/corporate proxy certificates in dev
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Compress responses
  compress: true,

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    // Serve modern formats (WebP/AVIF) when using next/image
    formats: ['image/avif', 'image/webp'],
  },

  // Remove console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  experimental: {
    // Tree-shake large icon/animation libs — reduces initial JS bundle
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

module.exports = nextConfig
