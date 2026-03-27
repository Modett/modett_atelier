import type { Metadata } from 'next'
import { CollectionPage } from '@/components/storefront/CollectionPage'

export const metadata: Metadata = {
  title:       'Collections | Modett',
  description: 'Shop Modett\u2019s complete collection of premium fashion pieces crafted for the woman with quiet confidence.',
}

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; size?: string }>
}) {
  const params = await searchParams

  return (
    <CollectionPage
      initialCategory={params.category}
      initialSort={params.sort}
      initialSizes={params.size?.split(',') ?? []}
      pageTitle="Collection"
    />
  )
}
