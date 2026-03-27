import path   from 'path'
import type { NextConfig } from 'next'

// Geo-IP detection via Cloudflare CF-IPCountry header (set automatically on any
// domain proxied through Cloudflare — no configuration required).
// In development: country is hardcoded to LK (Sri Lanka) in middleware.ts.
// In production:  remove the DEV_COUNTRY / DEV_CURRENCY override in middleware.ts
//                 and CF-IPCountry will be used automatically.

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
        // Cloudflare R2 — public bucket URL (wildcard)
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        // Cloudflare R2 — dev seed bucket (exact)
        protocol: 'https',
        hostname: 'pub-8804bb39c26f4399a33c5a5d1c2182f9.r2.dev',
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
