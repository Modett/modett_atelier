import type { Metadata } from 'next'
import { ProductDetailPage } from '@/components/storefront/ProductDetailPage'
import { productImageVariantUrl } from '@/lib/productImageUrl'

const API_BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  try {
    const res = await fetch(`${API_BASE_URL}/catalog/products/${slug}`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) return { title: 'Product | Modett' }

    const json = await res.json()
    const product = json?.data?.product

    return {
      title: `${product?.displayName ?? 'Product'} | Modett`,
      description:
        product?.description ?? 'Crafted with intention. Built to last.',
      openGraph: {
        images: product?.keyImage?.url
          ? [{ url: productImageVariantUrl(product.keyImage.url, 'full') }]
          : [],
      },
    }
  } catch {
    return { title: 'Product | Modett' }
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  return <ProductDetailPage slug={slug} />
}
