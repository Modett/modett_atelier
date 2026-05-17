import path   from 'path'
import type { NextConfig } from 'next'

// Geo / currency cookies: middleware uses CF-IPCountry when proxied through
// Cloudflare, otherwise x-vercel-ip-country on Vercel. Optional
// NEXT_PUBLIC_DEFAULT_COUNTRY / NEXT_PUBLIC_DEFAULT_CURRENCY for fallbacks.
// Development forces LK/LKR in middleware.

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Required: lets Next.js compile packages/ui TypeScript directly
  transpilePackages: ['@modett/ui'],

  // Required for monorepo: Vercel needs to trace files
  // across workspace boundaries during deployment build
  outputFileTracingRoot: path.join(__dirname, '../../'),

  images: {
    // WebP-first: AVIF encoding on Vercel image optimisation adds latency on
    // cold requests. WebP is fast to encode, widely supported, and produces
    // files 25–35% smaller than JPEG at equivalent quality.
    formats: ['image/webp'],

    // Cache optimised images for 30 days. Next.js defaults to 60 s, which
    // causes the optimisation server to re-process the same image repeatedly.
    // 2_592_000 = 30 × 24 × 60 × 60 seconds.
    minimumCacheTTL: 2592000,

    // Viewport breakpoints used for srcset generation. Limiting to common
    // sizes reduces the number of variants Vercel generates and caches.
    deviceSizes: [640, 768, 1024, 1280, 1440, 1920],

    // Fixed-width image sizes (thumbnails, avatars, product cards).
    imageSizes: [64, 128, 256, 384],

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
        // Cloudflare R2 — Modett production custom domain
        // Configure in R2 bucket settings > Custom Domains
        protocol: 'https',
        hostname: 'images.modett.com',
      },
      {
        // Cloudflare R2 — dev seed bucket (exact host + pathname for optimizer)
        protocol: 'https',
        hostname: 'pub-8804bb39c26f4399a33c5a5d1c2182f9.r2.dev',
        port: '',
        pathname: '/**',
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
