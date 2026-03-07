import path   from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Required: lets Next.js compile packages/ui TypeScript directly
  transpilePackages: ['@modett/ui'],

  // Required for monorepo: Vercel needs to trace files
  // across workspace boundaries during deployment build
  outputFileTracingRoot: path.join(__dirname, '../../'),

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        // Cloudflare R2 — product photography storage
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        // Cloudflare R2 custom domain (configure when ready)
        protocol: 'https',
        hostname: '**.modett.com',
      },
    ],
  },

  // Vercel handles compression at the CDN layer
  compress: false,
}

export default nextConfig
