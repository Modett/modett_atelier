import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Raleway } from 'next/font/google'
import { Analytics }    from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { ShoppingBagDrawer } from '@/components/storefront/ShoppingBagDrawer'
import './globals.css'

const playfairDisplay = Playfair_Display({
  subsets:  ['latin'],
  weight:   ['400', '700', '900'],
  style:    ['normal'],
  variable: '--font-display',
  display:  'swap',
})

const raleway = Raleway({
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display:  'swap',
})

export const metadata: Metadata = {
  title: {
    default:  'Modett — Elegance, Amplified.',
    template: '%s | Modett',
  },
  description:
    'Investment pieces crafted for the woman with quiet confidence. ' +
    'Timeless fashion, natural fabrics, built to last.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://modett.com'
  ),
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#F8F7F4',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${raleway.variable}`}
    >
      <body className="bg-background text-ink antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
            {/* Global overlays — rendered at root level */}
            <ShoppingBagDrawer />
          </AuthProvider>
        </QueryProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
